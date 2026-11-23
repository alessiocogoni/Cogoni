/*
 * Invia una copia dei dati inseriti dai visitatori al backend Python, se configurato.
 * Non blocca mai il sito: se il backend non risponde, restituisce false e basta.
 * Password, token e dati di carta non vengono mai inoltrati.
 */
(function () {
  'use strict';
  var SECRET = /pass|pwd|token|secret|card|cvv|iban/i;

  function clean(value, depth) {
    if (depth > 5) return undefined;
    if (Array.isArray(value)) return value.slice(0, 100).map(function (v) { return clean(v, depth + 1); });
    if (value && typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (k) { if (!SECRET.test(k)) out[k] = clean(value[k], depth + 1); });
      return out;
    }
    return value;
  }

  window.cogoniSend = function (site, kind, data, summary) {
    var base = String(window.COGONI_API || '').replace(/\/+$/, '');
    if (!base || typeof fetch !== 'function') return Promise.resolve(false);
    return fetch(base + '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: site, kind: kind, summary: summary || '', data: clean(data, 0) }),
      keepalive: true
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  };
})();
