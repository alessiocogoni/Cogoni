/*
 * Animazioni della home: comparsa allo scorrimento, barra di avanzamento,
 * navbar che si compatta, parallasse della prima schermata e inclinazione delle schede.
 * Se il visitatore ha scelto "riduci animazioni", non fa nulla e la pagina resta statica.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Vetrina dei progetti (funziona anche senza animazioni) ---------- */
  const showcase = document.querySelector('.showcase');
  if (showcase) {
    const cards = Array.from(showcase.querySelectorAll('.showcase-card'));
    const dots = Array.from(showcase.querySelectorAll('.showcase-dot'));
    const total = cards.length;
    let current = 0;
    let timer = null;

    function render() {
      cards.forEach((card, i) => {
        const pos = (i - current + total) % total;
        card.dataset.pos = pos < 3 ? String(pos) : 'x';
        card.tabIndex = pos === 0 ? 0 : -1;
        card.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      });
      dots.forEach((dot, i) => {
        const active = i === current;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-pressed', String(active));
      });
    }
    function go(index) { current = (index + total) % total; render(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function play() {
      stop();
      if (reduced || total < 2) return;
      timer = setInterval(() => go(current + 1), 4800);
    }
    showcase.classList.add('is-live');
    render();
    play();

    dots.forEach((dot, i) => dot.addEventListener('click', () => { go(i); play(); }));
    showcase.addEventListener('pointerenter', stop);
    showcase.addEventListener('pointerleave', play);
    showcase.addEventListener('focusin', stop);
    showcase.addEventListener('focusout', play);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));

    // Clic: la scheda dietro passa avanti, quella davanti apre il progetto con un'animazione.
    cards.forEach((card, i) => {
      card.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
        if (card.dataset.pos !== '0') { event.preventDefault(); go(i); play(); return; }
        if (reduced) return;
        event.preventDefault();
        const veil = document.createElement('div');
        veil.className = 'enter-veil ' + card.dataset.demo;
        veil.style.setProperty('--x', (event.clientX || window.innerWidth / 2) + 'px');
        veil.style.setProperty('--y', (event.clientY || window.innerHeight / 2) + 'px');
        veil.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.textContent = card.dataset.name;
        veil.append(label);
        document.body.append(veil);
        requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('on')));
        setTimeout(() => { window.location.href = card.href; }, 900);
      });
    });
    // Tornando indietro dal progetto la pagina non deve restare coperta.
    window.addEventListener('pageshow', () => document.querySelectorAll('.enter-veil').forEach(v => v.remove()));
  }

  if (reduced) return;

  /* ---------- Barra di avanzamento + navbar compatta ---------- */
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);
  const topbar = document.querySelector('.topbar');
  let ticking = false;

  function onScroll() {
    const max = root.scrollHeight - window.innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
    if (topbar) topbar.classList.toggle('is-scrolled', window.scrollY > 40);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Comparsa degli elementi mentre si scorre ---------- */
  const groups = [
    ['.section-heading', 0, ''],
    ['.work-toolbar', .1, ''],
    ['.project', .12, ''],
    ['.about-mark', 0, 'reveal-left'],
    ['.about-copy > *', .08, 'reveal-right'],
    ['.process-grid article', .14, ''],
    ['.social-card', .12, ''],
    ['.contact-intro', 0, 'reveal-left'],
    ['.contact form', .15, 'reveal-right'],
    ['.contact-logo', .25, 'reveal-right']
  ];
  const targets = [];
  groups.forEach(([selector, step, extra]) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      if (el.offsetParent === null && getComputedStyle(el).display === 'none') return; // elemento nascosto su questo schermo
      el.classList.add('reveal');
      if (extra) el.classList.add(extra);
      el.style.setProperty('--d', (i * step).toFixed(2) + 's');
      targets.push(el);
    });
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    // Si nasconde solo dopo aver registrato gli elementi, così nulla resta invisibile per errore.
    targets.forEach(el => io.observe(el));
    root.classList.add('anim-ready');
  } else {
    targets.forEach(el => el.classList.add('in'));
  }

  /* ---------- Parallasse della prima schermata ---------- */
  const art = document.querySelector('.hero-art');
  if (art && finePointer) {
    const hero = document.querySelector('.hero');
    hero.addEventListener('pointermove', event => {
      const r = hero.getBoundingClientRect();
      art.style.setProperty('--mx', (((event.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      art.style.setProperty('--my', (((event.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    hero.addEventListener('pointerleave', () => {
      art.style.setProperty('--mx', 0);
      art.style.setProperty('--my', 0);
    });
  }

  /* ---------- Inclinazione 3D delle schede progetto ---------- */
  if (finePointer) {
    document.querySelectorAll('.project-cover').forEach(card => {
      card.addEventListener('pointermove', event => {
        const r = card.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width - 0.5;
        const y = (event.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }
})();
