/*
 * Versione dimostrativa di Casa Titina.
 * Nel sito reale calendario e richieste passano da un server con database.
 * Qui lo stesso comportamento è simulato nel browser: nessun dato viene inviato
 * o salvato altrove, le richieste restano solo in questo browser (localStorage).
 */
(function () {
  'use strict';

  const realFetch = window.fetch.bind(window);
  const KEY = 'titina_demo_requests_v1';
  const PORTFOLIO_URL = '../../index.html#progetti';

  const json = (status, data) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  const iso = d =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  // Periodi già occupati, calcolati rispetto a oggi così il calendario ha sempre date di esempio.
  function range(offsetDays, nights) {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() + offsetDays);
    const end = new Date(start);
    end.setDate(end.getDate() + nights);
    return { checkIn: iso(start), checkOut: iso(end) };
  }
  const occupied = () => [range(18, 6), range(40, 9), range(75, 5)];

  function load() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }
  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(-20)));
    } catch (e) {}
  }

  function readBody(init) {
    try {
      const data = JSON.parse((init && init.body) || '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (e) {
      return {};
    }
  }

  async function handle(url, init) {
    const method = ((init && init.method) || 'GET').toUpperCase();

    if (url.startsWith('/api/availability') && method === 'GET') {
      return json(200, occupied());
    }

    if (url.startsWith('/api/bookings') && method === 'POST') {
      const b = readBody(init);
      if (
        typeof b.guestName !== 'string' || !b.guestName.trim() || b.guestName.length > 100 ||
        typeof b.guestEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.guestEmail) ||
        !Array.isArray(b.extras) || typeof b.requestKey !== 'string'
      ) {
        return json(400, { error: 'Controlla nome, email e servizi selezionati' });
      }
      const list = load();
      const previous = list.find(r => r.requestKey === b.requestKey);
      if (previous) return json(200, { id: previous.id, total: previous.total });

      const extras = [...new Set(b.extras)];
      const quote = window.PricingService && window.PricingService.calculateQuote(b.checkIn, b.checkOut, b.guests, extras);
      if (!quote) return json(400, { error: 'Date o numero di ospiti non validi' });
      if (occupied().some(o => b.checkIn < o.checkOut && b.checkOut > o.checkIn)) {
        return json(409, { error: 'Queste date sono già occupate. Scegli un altro periodo.' });
      }

      const id = 'CT-DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      list.push({
        id, requestKey: b.requestKey, guestName: b.guestName.trim(), guestEmail: b.guestEmail.trim(),
        checkIn: b.checkIn, checkOut: b.checkOut, guests: b.guests, total: quote.total, status: 'Da confermare'
      });
      save(list);
      return json(201, { id, total: quote.total });
    }

    if (url.startsWith('/api/request-status') && method === 'POST') {
      const b = readBody(init);
      const record = load().find(
        r => r.id === String(b.id || '').trim() && r.guestEmail.toLowerCase() === String(b.email || '').trim().toLowerCase()
      );
      if (!record) return json(404, { error: 'Nessuna richiesta trovata: controlla codice ed email' });
      return json(200, {
        id: record.id, checkIn: record.checkIn, checkOut: record.checkOut,
        guests: record.guests, total: record.total, status: record.status
      });
    }

    return json(404, { error: 'Non disponibile nella versione dimostrativa' });
  }

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.startsWith('/api/')) return handle(url, init);
    return realFetch(input, init);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.setAttribute('role', 'note');
    bar.style.cssText =
      'background:#1b4332;color:#fff;font:14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center;';
    bar.append(
      'Versione dimostrativa con dati di prova: le richieste restano solo nel tuo browser e non vengono inviate. '
    );
    const back = document.createElement('a');
    back.href = PORTFOLIO_URL;
    back.textContent = 'Torna al portfolio';
    back.style.cssText = 'color:#fff;font-weight:600;text-decoration:underline;white-space:nowrap;';
    bar.append(back);
    document.body.prepend(bar);
  });
})();
