"""
Backend Python (Flask) del portfolio di Alessio Cogoni.

- Riceve i dati inviati dai siti (portfolio, Casa Titina, Outlet DAALE) su POST /api/events
  e li salva in un database SQLite.
- Espone un'applicazione di gestione separata su /admin (protetta da password) dove si vedono
  tutti i dati ricevuti, si filtrano, si archiviano, si eliminano e si esportano in CSV.
- Se configurato, invia anche una email di avviso a ogni nuovo dato.

Configurazione tramite variabili d'ambiente (vedi backend/LEGGIMI.md).
"""
import csv
import hmac
import io
import json
import os
import re
import smtplib
import sqlite3
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from email.message import EmailMessage

from flask import Flask, Response, abort, jsonify, redirect, render_template_string, request, session, url_for

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(BASE, "dati.sqlite3"))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
SECRET_KEY = os.environ.get("SECRET_KEY", "")
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in os.environ.get(
    "ALLOWED_ORIGINS", "https://alessiocogoni.github.io").split(",") if o.strip()]
SITES = ("portfolio", "titina", "daale")
STATES = ("nuova", "letta", "archiviata")
MAX_PAYLOAD_BYTES = 20_000

app = Flask(__name__)
app.config.update(
    SECRET_KEY=SECRET_KEY or os.urandom(32),  # senza SECRET_KEY le sessioni admin decadono a ogni riavvio
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=bool(os.environ.get("COOKIE_SECURE", "1") == "1"),
    MAX_CONTENT_LENGTH=64 * 1024,
)

# ---------------------------------------------------------------- database
_db_lock = threading.Lock()


def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _db_lock, db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                site TEXT NOT NULL,
                kind TEXT NOT NULL,
                name TEXT,
                email TEXT,
                summary TEXT,
                payload TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'nuova'
            )""")
        conn.execute("CREATE INDEX IF NOT EXISTS ix_events_site ON events(site, status, created_at)")


init_db()

# ---------------------------------------------------------------- utilità
_hits = defaultdict(deque)
_hits_lock = threading.Lock()


def too_many(ip, limit=20, window=3600):
    now = time.time()
    with _hits_lock:
        q = _hits[ip]
        while q and q[0] < now - window:
            q.popleft()
        if len(q) >= limit:
            return True
        q.append(now)
    return False


def client_ip():
    fwd = request.headers.get("X-Forwarded-For", "")
    return (fwd.split(",")[0].strip() or request.remote_addr or "?")


def clip(value, n):
    return str(value if value is not None else "").strip()[:n]


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def cors(resp):
    origin = request.headers.get("Origin", "").rstrip("/")
    if origin and (origin in ALLOWED_ORIGINS or origin.startswith(("http://127.0.0.1", "http://localhost"))):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        resp.headers["Access-Control-Max-Age"] = "86400"
    return resp


@app.after_request
def after(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    if request.path.startswith(("/admin", "/api/admin")):
        resp.headers["Cache-Control"] = "no-store"
        resp.headers.setdefault("X-Frame-Options", "DENY")
    if request.path.startswith("/api/events") or request.path == "/api/contact":
        cors(resp)
    return resp


def notify_by_email(row):
    host = os.environ.get("SMTP_HOST")
    to = os.environ.get("NOTIFY_TO")
    if not host or not to:
        return

    def send():
        try:
            msg = EmailMessage()
            msg["Subject"] = f"[{row['site']}] {row['kind']}: {row['name'] or row['email'] or 'nuovo dato'}"
            msg["From"] = os.environ.get("SMTP_USER", to)
            msg["To"] = to
            if row["email"]:
                msg["Reply-To"] = row["email"]
            msg.set_content(f"{row['summary'] or ''}\n\n{json.dumps(json.loads(row['payload']), ensure_ascii=False, indent=2)}")
            with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587")), timeout=15) as s:
                s.starttls()
                if os.environ.get("SMTP_USER"):
                    s.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASS", ""))
                s.send_message(msg)
        except Exception as exc:  # l'email è un avviso: non deve mai far fallire il salvataggio
            app.logger.warning("Invio email di avviso non riuscito: %s", exc)

    threading.Thread(target=send, daemon=True).start()


def store(site, kind, name, email, summary, payload):
    row = {
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "site": site, "kind": kind, "name": name, "email": email, "summary": summary,
        "payload": json.dumps(payload, ensure_ascii=False),
    }
    with _db_lock, db() as conn:
        cur = conn.execute(
            "INSERT INTO events (created_at, site, kind, name, email, summary, payload) VALUES (?,?,?,?,?,?,?)",
            (row["created_at"], site, kind, name, email, summary, row["payload"]))
        row["id"] = cur.lastrowid
    notify_by_email(row)
    return row["id"]

# ---------------------------------------------------------------- API pubblica


@app.route("/api/health")
def health():
    return jsonify(ok=True)


@app.route("/api/events", methods=["POST", "OPTIONS"])
def api_events():
    if request.method == "OPTIONS":
        return Response(status=204)
    if too_many(client_ip()):
        return jsonify(ok=False, error="Troppe richieste, riprova più tardi."), 429
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(ok=False, error="Dati non validi."), 400
    if data.get("_honey"):  # trappola per i bot: finge di aver accettato
        return jsonify(ok=True)
    site = clip(data.get("site"), 20)
    kind = clip(data.get("kind"), 40) or "evento"
    if site not in SITES:
        return jsonify(ok=False, error="Sito sconosciuto."), 400
    payload = data.get("data", {})
    if not isinstance(payload, (dict, list)):
        return jsonify(ok=False, error="Dati non validi."), 400
    if len(json.dumps(payload, ensure_ascii=False)) > MAX_PAYLOAD_BYTES:
        return jsonify(ok=False, error="Dati troppo grandi."), 413
    p = payload if isinstance(payload, dict) else {}
    name = clip(p.get("name") or p.get("nome") or p.get("fullName") or p.get("customer"), 120) or None
    email = clip(p.get("email"), 160) or None
    if email and not EMAIL_RE.match(email):
        return jsonify(ok=False, error="Email non valida."), 400
    summary = clip(data.get("summary") or p.get("message") or p.get("messaggio"), 600) or None
    new_id = store(site, kind, name, email, summary, payload)
    return jsonify(ok=True, id=new_id), 201


@app.route("/api/contact", methods=["POST", "OPTIONS"])
def api_contact():
    """Comodo per il modulo del portfolio: nome, email, tipo, messaggio."""
    if request.method == "OPTIONS":
        return Response(status=204)
    if too_many(client_ip(), limit=8):
        return jsonify(ok=False, error="Troppe richieste, riprova più tardi."), 429
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        return jsonify(ok=False, error="Dati non validi."), 400
    if d.get("_honey"):
        return jsonify(ok=True)
    name, email = clip(d.get("name"), 100), clip(d.get("email"), 150)
    kind, message = clip(d.get("type"), 100), clip(d.get("message"), 3000)
    if not name or not message:
        return jsonify(ok=False, error="Inserisci nome e messaggio."), 400
    if not EMAIL_RE.match(email):
        return jsonify(ok=False, error="Inserisci un'email valida."), 400
    new_id = store("portfolio", "contatto", name, email, message,
                   {"name": name, "email": email, "tipo": kind, "message": message})
    return jsonify(ok=True, id=new_id), 201

# ---------------------------------------------------------------- area admin


def is_admin():
    return session.get("admin") is True


def need_admin(fn):
    def wrapper(*a, **k):
        if not is_admin():
            if request.path.startswith("/admin/api"):
                return jsonify(ok=False, error="Accesso richiesto"), 401
            return redirect(url_for("admin_login"))
        return fn(*a, **k)
    wrapper.__name__ = fn.__name__
    return wrapper


@app.route("/")
def root():
    return redirect(url_for("admin_home"))


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    error = ""
    if request.method == "POST":
        if too_many("login:" + client_ip(), limit=10, window=900):
            error = "Troppi tentativi. Riprova tra qualche minuto."
        elif ADMIN_PASSWORD and hmac.compare_digest(request.form.get("password", ""), ADMIN_PASSWORD):
            session.clear()
            session["admin"] = True
            session.permanent = True
            return redirect(url_for("admin_home"))
        else:
            error = "Password non corretta." if ADMIN_PASSWORD else "ADMIN_PASSWORD non è impostata sul server."
    return render_template_string(LOGIN_HTML, error=error)


@app.route("/admin/logout", methods=["POST"])
def admin_logout():
    session.clear()
    return redirect(url_for("admin_login"))


@app.route("/admin")
@need_admin
def admin_home():
    return Response(ADMIN_HTML, mimetype="text/html")


def _filters():
    site = request.args.get("site", "")
    status = request.args.get("status", "")
    q = request.args.get("q", "").strip()
    where, args = [], []
    if site in SITES:
        where.append("site = ?"); args.append(site)
    if status in STATES:
        where.append("status = ?"); args.append(status)
    if q:
        like = f"%{q}%"
        where.append("(IFNULL(name,'') LIKE ? OR IFNULL(email,'') LIKE ? OR IFNULL(summary,'') LIKE ? OR payload LIKE ? OR kind LIKE ?)")
        args += [like] * 5
    return (" WHERE " + " AND ".join(where)) if where else "", args


@app.route("/admin/api/events")
@need_admin
def admin_events():
    clause, args = _filters()
    with db() as conn:
        rows = conn.execute(f"SELECT * FROM events{clause} ORDER BY created_at DESC, id DESC LIMIT 500", args).fetchall()
        counts = conn.execute("SELECT site, status, COUNT(*) n FROM events GROUP BY site, status").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["payload"] = json.loads(d["payload"])
        out.append(d)
    stats = {s: {"nuova": 0, "letta": 0, "archiviata": 0} for s in SITES}
    for c in counts:
        if c["site"] in stats:
            stats[c["site"]][c["status"]] = c["n"]
    return jsonify(ok=True, events=out, stats=stats)


@app.route("/admin/api/events/<int:event_id>", methods=["PATCH", "DELETE"])
@need_admin
def admin_event(event_id):
    with _db_lock, db() as conn:
        if request.method == "DELETE":
            conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
            return jsonify(ok=True)
        status = (request.get_json(silent=True) or {}).get("status")
        if status not in STATES:
            return jsonify(ok=False, error="Stato non valido"), 400
        conn.execute("UPDATE events SET status = ? WHERE id = ?", (status, event_id))
    return jsonify(ok=True)


@app.route("/admin/export.csv")
@need_admin
def admin_export():
    clause, args = _filters()
    with db() as conn:
        rows = conn.execute(f"SELECT * FROM events{clause} ORDER BY created_at DESC", args).fetchall()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "data", "sito", "tipo", "nome", "email", "stato", "riepilogo", "dati_completi"])
    for r in rows:
        # prefisso ' contro l'iniezione di formule se il CSV viene aperto in Excel
        safe = lambda v: ("'" + v) if isinstance(v, str) and v[:1] in "=+-@\t\r" else v
        w.writerow([r["id"], r["created_at"], r["site"], safe(r["kind"]), safe(r["name"] or ""), safe(r["email"] or ""),
                    r["status"], safe(r["summary"] or ""), safe(r["payload"])])
    return Response("﻿" + buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=dati-siti.csv"})


BASE_CSS = """
:root{--ink:#0c1127;--paper:#f5f3ec;--gold:#e6c183;--gold2:#c99d57;--line:#ffffff2b;--muted:#b9bfdc}
*{box-sizing:border-box}body{margin:0;min-height:100vh;color:var(--paper);font:16px/1.6 Arial,Helvetica,sans-serif;
background:radial-gradient(ellipse 70% 36% at 88% 5%,#4a48a85c 0,transparent 70%),radial-gradient(ellipse 60% 30% at 6% 40%,#7a3a8a33 0,transparent 70%),
linear-gradient(180deg,#0c1127 0%,#141a40 35%,#1a1a46 65%,#0b0a1c 100%) fixed}
a{color:inherit}h1,h2{margin:0;letter-spacing:-1.2px;line-height:1.1}em{font-family:Georgia,serif;font-weight:400;color:#ecc98f}
.btn{font:600 14px Arial;cursor:pointer;min-height:44px;padding:10px 20px;border-radius:40px;border:1px solid #ffffff40;background:#ffffff0f;color:var(--paper);display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.btn:hover{background:#ffffff1f;border-color:#f4deae99}
.gold{background:linear-gradient(135deg,#f4deae,#c99d57);color:#1d1407;border-color:transparent;box-shadow:0 8px 22px #c99d5755}
.gold:hover{background:linear-gradient(135deg,#fbebc6,#d9ae68)}
input,select{font:inherit;color:var(--paper);background:#1a1f47;border:1px solid #6a72b0;border-radius:12px;min-height:46px;padding:10px 14px;width:100%}
input:focus,select:focus,.btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
"""

LOGIN_HTML = """<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Accesso · Gestione siti</title><style>""" + BASE_CSS + """
main{max-width:440px;margin:12vh auto 0;padding:0 20px}
form{margin-top:28px;padding:30px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(160deg,#ffffff14,#ffffff05);box-shadow:0 24px 60px #0000004a}
label{display:block;font-weight:700;font-size:13px;margin-bottom:8px}.err{color:#ffb59a;margin:14px 0 0;font-size:14px}
</style></head><body><main><h1>Gestione <em>siti</em></h1>
<form method="post"><label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required autofocus>
<button class="btn gold" style="width:100%;margin-top:18px" type="submit">Accedi</button>{% if error %}<p class="err" role="alert">{{ error }}</p>{% endif %}</form></main></body></html>"""

ADMIN_HTML = """<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Gestione siti · Alessio Cogoni</title><style>""" + BASE_CSS + """
header{display:flex;align-items:center;gap:14px;padding:16px clamp(16px,4vw,48px);border-bottom:1px solid var(--line);background:#0d1229d9;position:sticky;top:0;z-index:5;backdrop-filter:blur(10px)}
.logo{font-weight:800;font-size:28px;letter-spacing:-2px;text-decoration:none}.logo span{color:var(--gold)}
header small{font:11px monospace;letter-spacing:1.5px;color:var(--muted)}header .sp{margin-left:auto;display:flex;gap:10px}
main{max-width:1040px;margin:0 auto;padding:34px clamp(16px,4vw,48px) 90px}
h1{font-size:clamp(34px,5vw,54px)}.lead{color:var(--muted);margin:10px 0 28px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:26px}
.stat{padding:18px 20px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(160deg,#ffffff14,#ffffff05);cursor:pointer;text-align:left;color:inherit;font:inherit}
.stat[aria-pressed=true]{border-color:#f4deaecc;background:linear-gradient(160deg,#c99d5530,#ffffff08)}
.stat b{display:block;font-size:34px;letter-spacing:-1.5px;line-height:1.1}.stat span{font:11px monospace;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted)}
.stat i{font-style:normal;color:var(--gold);font-size:13px}
.tools{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px}.tools input{flex:1 1 240px;width:auto}.tools select{width:auto;min-width:160px}
.count{font:12px monospace;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin:0 0 16px}
.req{padding:22px 24px;margin-bottom:14px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(160deg,#ffffff12,#ffffff05)}
.req.nuova{border-color:#e6c183aa;background:linear-gradient(160deg,#c99d5526,#ffffff06)}
.top{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline}.top strong{font-size:19px}.date{margin-left:auto;font:12px monospace;color:var(--muted)}
.tag{font:10px monospace;letter-spacing:1.3px;text-transform:uppercase;padding:4px 10px;border-radius:20px;background:#ffffff1c}.tag.site{background:#8f8cf033}.nuova .tag.st{background:var(--gold);color:#1d1407}
.meta{color:var(--muted);font-size:14px;margin:6px 0 10px;overflow-wrap:anywhere}.sum{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 14px}
details{margin:0 0 14px}summary{cursor:pointer;color:var(--gold);font-size:13px}pre{margin:10px 0 0;padding:14px;border-radius:12px;background:#080b1c;overflow:auto;font-size:12.5px;line-height:1.5;color:#d9ddf3}
.acts{display:flex;flex-wrap:wrap;gap:8px}.acts .btn{min-height:40px;padding:8px 16px;font-size:13px}.acts .del:hover{border-color:#ff9d78;color:#ffb59a}
.empty{text-align:center;color:var(--muted);padding:60px 0}
@media(max-width:700px){.date{margin-left:0;width:100%}.acts .btn{flex:1 1 100%}}
</style></head><body>
<header><a class="logo" href="/admin">ac<span>.</span></a><small>GESTIONE SITI</small>
<div class="sp"><a class="btn" id="csv" href="/admin/export.csv">Esporta CSV</a><form method="post" action="/admin/logout" style="margin:0"><button class="btn" type="submit">Esci</button></form></div></header>
<main><h1>Tutti i dati dei tuoi <em>siti</em></h1><p class="lead">Ogni richiesta, prenotazione o ordine inviato dai visitatori arriva qui.</p>
<div class="stats" id="stats"></div>
<div class="tools"><input id="q" type="search" placeholder="Cerca per nome, email o contenuto" aria-label="Cerca">
<select id="status" aria-label="Stato"><option value="">Tutti gli stati</option><option value="nuova" selected>Nuove</option><option value="letta">Lette</option><option value="archiviata">Archiviate</option></select></div>
<p class="count" id="count" aria-live="polite"></p><div id="list"></div></main>
<script>
const NAMES={portfolio:'Portfolio',titina:'Casa Titina',daale:'Outlet DAALE'};let site='',rows=[];
const $=id=>document.getElementById(id);
function el(t,x,c){const n=document.createElement(t);if(x!=null)n.textContent=x;if(c)n.className=c;return n}
async function api(u,o){const r=await fetch(u,o);if(r.status===401){location.href='/admin/login';throw 0}if(!r.ok)throw new Error(r.status);return r.json()}
function qs(){const p=new URLSearchParams();if(site)p.set('site',site);if($('status').value)p.set('status',$('status').value);if($('q').value.trim())p.set('q',$('q').value.trim());return p.toString()}
async function load(){
  const d=await api('/admin/api/events?'+qs());rows=d.events;$('csv').href='/admin/export.csv?'+qs();
  const box=$('stats');box.replaceChildren();
  const tot=Object.values(d.stats).reduce((a,s)=>a+s.nuova,0);
  const all=el('button',null,'stat');all.type='button';all.setAttribute('aria-pressed',String(site===''));
  all.append(el('span','Tutti i siti'),el('b',String(tot)),el('i','da leggere'));all.onclick=()=>{site='';load()};box.append(all);
  for(const s of Object.keys(NAMES)){const st=d.stats[s],b=el('button',null,'stat');b.type='button';b.setAttribute('aria-pressed',String(site===s));
    b.append(el('span',NAMES[s]),el('b',String(st.nuova)),el('i',`da leggere · ${st.nuova+st.letta+st.archiviata} totali`));b.onclick=()=>{site=s;load()};box.append(b)}
  const n=rows.length;$('count').textContent=n+(n===1?' elemento':' elementi');
  document.title=(tot?`(${tot}) `:'')+'Gestione siti · Alessio Cogoni';
  const list=$('list');list.replaceChildren();
  if(!n){list.append(el('p','Nessun dato qui.','empty'));return}
  for(const r of rows){
    const c=el('article',null,'req '+r.status),top=el('div',null,'top');
    top.append(el('strong',r.name||r.kind),el('span',NAMES[r.site]||r.site,'tag site'),el('span',r.kind,'tag'),el('span',r.status,'tag st'),
      el('span',new Date(r.created_at).toLocaleString('it-IT',{dateStyle:'medium',timeStyle:'short'}),'date'));
    const meta=el('p',null,'meta');if(r.email){const a=el('a',r.email);a.href='mailto:'+r.email;meta.append(a)}
    c.append(top,meta);if(r.summary)c.append(el('p',r.summary,'sum'));
    const det=el('details'),sm=el('summary','Tutti i dati ricevuti');det.append(sm,el('pre',JSON.stringify(r.payload,null,2)));c.append(det);
    const acts=el('div',null,'acts');
    if(r.email){const a=el('a','Rispondi','btn gold');a.href='mailto:'+r.email;a.onclick=()=>{if(r.status==='nuova')set(r,'letta')};acts.append(a)}
    for(const [lab,st] of [['Segna come letta','letta'],['Segna come nuova','nuova'],['Archivia','archiviata']]) if(r.status!==st){const b=el('button',lab,'btn');b.type='button';b.onclick=()=>set(r,st);acts.append(b)}
    const d2=el('button','Elimina','btn del');d2.type='button';d2.onclick=async()=>{if(confirm('Eliminare definitivamente questo dato?')){await api('/admin/api/events/'+r.id,{method:'DELETE'});load()}};acts.append(d2);
    c.append(acts);list.append(c)}
}
async function set(r,status){await api('/admin/api/events/'+r.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});load()}
$('status').onchange=load;let t;$('q').oninput=()=>{clearTimeout(t);t=setTimeout(load,250)};
load();setInterval(()=>{if(!document.hidden)load()},30000);
</script></body></html>"""

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=False)
