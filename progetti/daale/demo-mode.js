/*
 * Versione dimostrativa di Outlet DAALE.
 * Nel sito reale catalogo, ordini e utenti passano da un server.
 * Qui il server non esiste: le richieste al server vengono rifiutate subito, così il sito usa
 * il catalogo incorporato e conserva carrello, registrazione e ordini di prova solo nel browser.
 * Nessun ordine viene inviato e nessuna email viene spedita.
 */
(function () {
  'use strict';

  window.DAALE_DEMO = true;

  const realFetch = window.fetch.bind(window);
  const PORTFOLIO_URL = '../../index.html#progetti';

  // Inoltra al backend Python (se configurato) ordini e registrazioni fatti nella demo.
  function forwardToBackend(url, init) {
    if (!window.cogoniSend || !init || String(init.method || '').toUpperCase() !== 'POST') return;
    let body;
    try { body = JSON.parse(init.body); } catch (e) { return; }
    if (!body || typeof body !== 'object') return;
    if (url.startsWith('/api/orders')) {
      const c = body.customer || {};
      const name = c.name || c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '';
      window.cogoniSend('daale', 'ordine', Object.assign({ name: name, email: c.email || '' }, body),
        (body.orderName || 'Ordine') + ' — totale € ' + body.total);
    } else if (url.startsWith('/api/auth/register')) {
      window.cogoniSend('daale', 'registrazione', { name: body.name || body.fullName || '', email: body.email || '' }, 'Nuova registrazione');
    }
  }

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    forwardToBackend(url, init);
    if (url.startsWith('/api/') || url.includes('api.php') || url.includes('formsubmit.co')) {
      return Promise.resolve(
        new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } })
      );
    }
    return realFetch(input, init);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.setAttribute('role', 'note');
    bar.style.cssText =
      'background:#111;color:#fff;font:14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center;';
    bar.append(
      'Versione dimostrativa con dati di prova: carrello e ordini restano solo nel tuo browser e non vengono inviati. '
    );
    const back = document.createElement('a');
    back.href = PORTFOLIO_URL;
    back.textContent = 'Torna al portfolio';
    back.style.cssText = 'color:#fff;font-weight:600;text-decoration:underline;white-space:nowrap;';
    bar.append(back);
    document.body.prepend(bar);
  });
})();
