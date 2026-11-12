'use strict';

const projects = {
  "titina": {
    "title": "Casa Titina",
    "category": "01 / OSPITALITÀ",
    "intro": "La presenza digitale di una casa vacanze, pensata per accompagnare chi cerca il suo prossimo soggiorno.",
    "sections": [
      [
        "L’obiettivo",
        "Presentare la struttura e rendere semplice il passaggio dalle informazioni alla richiesta di soggiorno."
      ],
      [
        "Il percorso",
        [
          "Fotografie e informazioni sulla casa.",
          "Scelta delle date e preventivo in base agli ospiti nell’applicazione locale.",
          "Gestione delle richieste in un’area riservata."
        ]
      ],
      [
        "Apri il progetto",
        "Scopri gli obiettivi e le funzionalità del progetto nella scheda dedicata."
      ]
    ],
    "demo": "progetti/titina.html",
    "demoLabel": "Apri Casa Titina",
    "action": "Parliamo di un sito per la tua attività"
  },
  "daale": {
    "title": "Outlet DAALE",
    "category": "02 / E-COMMERCE",
    "intro": "Un progetto di e-commerce che unisce la consultazione del catalogo alle operazioni di gestione.",
    "sections": [
      [
        "L’obiettivo",
        "Organizzare prodotti e acquisti in un percorso riconoscibile, dalla scoperta del catalogo al carrello."
      ],
      [
        "Il progetto",
        [
          "Catalogo prodotti e schede di dettaglio.",
          "Carrello e gestione degli ordini.",
          "Pannello amministrativo e dati gestiti dal server."
        ]
      ],
      [
        "Apri il progetto",
        "Scopri gli obiettivi e le funzionalità del progetto nella scheda dedicata."
      ]
    ],
    "demo": "progetti/daale.html",
    "demoLabel": "Apri Outlet DAALE",
    "action": "Parliamo del tuo e-commerce"
  }
};

const menu = document.querySelector('.menu-toggle');
const navigation = document.getElementById('navigation');
const dialog = document.getElementById('projectDialog');
let opener;

function closeMenu() {
  menu.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('open');
}

menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('open', open);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});

const cards = [...document.querySelectorAll('.project')];
const filters = [...document.querySelectorAll('[data-filter]')];
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(other => {
    const active = other === button;
    other.classList.toggle('active', active);
    other.setAttribute('aria-pressed', String(active));
  });
  cards.forEach(card => {
    card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
  });
  const count = cards.filter(card => !card.hidden).length;
  document.getElementById('filterCount').textContent = `${count} ${count === 1 ? 'progetto' : 'progetti'}`;
}));

function createElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function showProject(button) {
  const project = projects[button.dataset.project];
  if (!project) return;
  opener = button;
  document.getElementById('dialogTitle').textContent = project.title;
  document.getElementById('dialogCategory').textContent = project.category;
  document.getElementById('dialogIntro').textContent = project.intro;
  const content = document.getElementById('dialogContent');
  content.replaceChildren();
  project.sections.forEach(([title, text]) => {
    const section = createElement('section', '', 'dialog-section');
    const body = createElement(Array.isArray(text) ? 'ul' : 'p');
    if (Array.isArray(text)) text.forEach(item => body.append(createElement('li', item)));
    else body.textContent = text;
    section.append(createElement('h3', title), body);
    content.append(section);
  });
  const actions = document.getElementById('dialogActions');
  actions.replaceChildren();
  const demo = createElement('a', project.demoLabel || 'Scopri il progetto', 'button button-orange');
  demo.href = project.demo;
  demo.target = '_blank';
  demo.rel = 'noopener noreferrer';
  const contact = createElement('a', project.action, 'text-link');
  contact.href = '#contatti';
  contact.addEventListener('click', () => dialog.close());
  actions.append(demo, contact);
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

document.querySelectorAll('[data-project]').forEach(button => {
  button.addEventListener('click', () => showProject(button));
});
document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const box = dialog.getBoundingClientRect();
  const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  if (event.target === dialog && outside) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.style.overflow = '';
  opener?.focus({preventScroll: true});
});

const email = 'acogoni06@gmail.com';
document.getElementById('copyEmail').addEventListener('click', async () => {
  const status = document.getElementById('copyStatus');
  try {
    await navigator.clipboard.writeText(email);
    status.textContent = 'Indirizzo email copiato.';
  } catch {
    status.textContent = 'Puoi selezionare e copiare l’indirizzo email qui sopra.';
  }
});

document.getElementById('contactForm').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('contactName').value.trim();
  const message = document.getElementById('contactMessage').value.trim();
  const status = document.getElementById('contactStatus');
  if (!name || !message) {
    status.textContent = 'Inserisci il tuo nome e qualche dettaglio sul progetto.';
    return;
  }
  const subject = document.getElementById('contactType').value;
  const body = `Ciao Alessio,\n\nsono ${name}.\n\n${message}\n\nA presto,\n${name}`;
  location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  status.textContent = '';
});
document.getElementById('year').textContent = new Date().getFullYear();
