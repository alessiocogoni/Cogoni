# Backend Python e applicazione di gestione

Il backend (`app.py`, Flask) fa due cose:

1. **Riceve i dati dei siti** (modulo contatti del portfolio, prenotazioni di Casa Titina, ordini e registrazioni di Outlet DAALE) e li salva in un database SQLite.
2. **Applicazione di gestione separata** all'indirizzo `/admin`, protetta da password: vedi tutti i dati ricevuti (anche il contenuto completo), filtri per sito e stato, ricerca, archivia, elimina, esporta in CSV. Ti può avvisare anche per email.

I siti su GitHub Pages sono statici e non possono eseguire Python: il backend va messo online su un hosting Python.
Consiglio **PythonAnywhere** (piano gratuito, nessuna carta, il database resta salvato).

## Messa online su PythonAnywhere (circa 10 minuti)

1. Crea un account su https://www.pythonanywhere.com (piano "Beginner", gratuito).
2. Scheda **Files**: crea la cartella `cogoni-backend` e carica `app.py` e `requirements.txt` (oppure, da **Consoles > Bash**: `git clone https://github.com/alessiocogoni/Cogoni` e usa la cartella `backend`).
3. Scheda **Consoles > Bash**: `pip install --user flask`
4. Scheda **Web > Add a new web app** > *Manual configuration* > Python 3.12 o più recente.
5. In **Web**, apri il file *WSGI configuration file* e sostituisci il contenuto con (adatta il percorso e le due password):

```python
import os, sys
sys.path.insert(0, '/home/TUO_UTENTE/cogoni-backend')
os.environ['ADMIN_PASSWORD'] = 'scegli-una-password-lunga'
os.environ['SECRET_KEY'] = 'una-frase-casuale-molto-lunga'
os.environ['DATABASE_PATH'] = '/home/TUO_UTENTE/cogoni-backend/dati.sqlite3'
os.environ['ALLOWED_ORIGINS'] = 'https://alessiocogoni.github.io'
# Facoltativo: email di avviso a ogni nuovo dato (con Gmail serve una "password per le app")
# os.environ.update(SMTP_HOST='smtp.gmail.com', SMTP_USER='tuo@gmail.com', SMTP_PASS='password-per-le-app', NOTIFY_TO='tuo@gmail.com')
from app import app as application
```

6. Premi **Reload**. Apri `https://TUO_UTENTE.pythonanywhere.com/admin` e accedi con la password.
7. Dimmi l'indirizzo `https://TUO_UTENTE.pythonanywhere.com`: lo inserisco in `api-config.js` e da quel momento i siti inviano i dati al backend.
   (Oppure scrivilo tu in `api-config.js`: `window.COGONI_API = 'https://TUO_UTENTE.pythonanywhere.com';`)

## Come provarlo sul tuo computer

```
cd backend
pip install -r requirements.txt
ADMIN_PASSWORD=prova COOKIE_SECURE=0 python app.py     # su Windows: set ADMIN_PASSWORD=prova & set COOKIE_SECURE=0 & python app.py
```
Poi apri http://127.0.0.1:5000/admin.

## Cosa viene salvato

| Sito | Tipo | Dati |
|---|---|---|
| Portfolio | contatto | nome, email, tipo di richiesta, messaggio |
| Casa Titina | prenotazione | nome, email, date, ospiti, servizi, totale |
| Outlet DAALE | ordine, registrazione | cliente, prodotti, importi (mai password o dati di carta) |

## Sicurezza

- Solo il tuo sito può inviare dati dal browser (`ALLOWED_ORIGINS`); limite di invii per indirizzo, campo trappola anti-bot, dimensione massima dei dati.
- `/admin` richiede la password; cookie di sessione protetto; limite ai tentativi di accesso.
- Il modulo del portfolio continua a inviare anche l'email con FormSubmit: se il backend non risponde, il messaggio non va perso.
