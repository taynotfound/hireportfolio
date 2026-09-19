/* Tiny bilingual strings + compact project data. Playful, few words. */
(function (root) {
  'use strict';
  const T = {
    en: {
      'nav.work': 'work', 'nav.price': 'pricing', 'nav.hi': 'say hi',
      'hero.tag': 'available now — can start this week',
      'hero.h': "Hi, I'm Tay.<br>I build the web,<br>and I <em>break it</em> to make it safe.",
      'hero.sub': 'Freelance dev. Coding since 2019, self-taught, one-person whole-stack. Web apps, Android, and the security bits nobody else wants to touch.',
      'hero.cta1': 'Build me a quote', 'hero.cta2': 'see the work',
      'hero.tags': 'JavaScript · Python · Kotlin · SQL · way too much coffee',
      'work.h': 'stuff I actually shipped',
      'price.h': 'what it costs',
      'price.sub': 'Drag the pieces together, watch the number. Real fixed price after we talk — this is just a ballpark.',
      'price.g1': 'start with', 'price.g2': 'add', 'price.g3': 'after launch', 'price.g4': 'in a rush?',
      'price.rush': '<b>rush it</b> — I drop everything, ~40% faster <small>+20%</small>',
      'price.est': 'your ballpark', 'price.from': 'from', 'price.send': 'send me this →',
      'price.note': "ballpark only — you get a real number after a quick chat",
      'ct.h': "got something to build?",
      'ct.sub': "Tell me the gist. I'll come back with a plan, a price, and an honest timeline — usually same day.",
      'ct.name': 'your name', 'ct.email': 'email', 'ct.msg': 'what are we building?', 'ct.send': 'send it →',
      'foot': 'hand-coded · no frameworks · no trackers · lots of coffee',
      'b.days': 'from {n}d', 'b.rush': '+ rush (+20%)', 'b.ret': 'plan discount (−10%)',
      'b.mo': '/mo', 'b.eta': '~{n} working days',
    },
    de: {
      'nav.work': 'projekte', 'nav.price': 'preise', 'nav.hi': 'hallo sagen',
      'hero.tag': 'sofort verfügbar — Start noch diese Woche',
      'hero.h': "Hi, ich bin Tay.<br>Ich baue das Web —<br>und <em>zerlege es</em>, damit's sicher ist.",
      'hero.sub': 'Freelance-Dev. Seit 2019 am Coden, autodidaktisch, Ein-Personen-Full-Stack. Web-Apps, Android und der Security-Kram, den sonst keiner anfassen will.',
      'hero.cta1': 'Angebot bauen', 'hero.cta2': 'zu den Projekten',
      'hero.tags': 'JavaScript · Python · Kotlin · SQL · viel zu viel Kaffee',
      'work.h': 'Sachen, die wirklich live sind',
      'price.h': 'was es kostet',
      'price.sub': 'Bau dir was zusammen, sieh der Zahl zu. Festpreis nach dem Gespräch — das hier ist nur ein Richtwert.',
      'price.g1': 'starte mit', 'price.g2': 'dazu', 'price.g3': 'nach dem Launch', 'price.g4': 'eilig?',
      'price.rush': '<b>Express</b> — ich lass alles liegen, ~40% schneller <small>+20%</small>',
      'price.est': 'dein Richtwert', 'price.from': 'ab', 'price.send': 'schick mir das →',
      'price.note': 'nur ein Richtwert — echte Zahl nach kurzem Gespräch',
      'ct.h': 'was zu bauen?',
      'ct.sub': 'Erzähl mir das Wesentliche. Ich melde mich mit Plan, Preis und ehrlicher Zeit — meist am selben Tag.',
      'ct.name': 'dein Name', 'ct.email': 'E-Mail', 'ct.msg': 'was bauen wir?', 'ct.send': 'abschicken →',
      'foot': 'handgecodet · keine Frameworks · keine Tracker · viel Kaffee',
      'b.days': 'ab {n}T', 'b.rush': '+ Express (+20%)', 'b.ret': 'Plan-Rabatt (−10%)',
      'b.mo': '/Mon.', 'b.eta': '~{n} Arbeitstage',
    },
  };

  // compact projects — emoji instead of walls of text
  const PROJECTS = [
    { name: 'Foxledger', emoji: '🦊', tilt: -2,
      one: { en: 'A banking dashboard for real money. Encrypted, 2FA, paranoid on purpose.',
             de: 'Banking-Dashboard für echtes Geld. Verschlüsselt, 2FA, absichtlich paranoid.' },
      tags: ['Node', '2FA', 'crypto'], shot: null, tint: '#e5484d' },
    { name: 'Déjà Vu', emoji: '🍻', tilt: 1.5,
      one: { en: 'Runs a whole bar — events, menu, galleries, hardened admin panel.',
             de: 'Betreibt eine ganze Bar — Events, Menü, Galerien, gehärteter Adminbereich.' },
      tags: ['Python', 'PWA', 'SQLite'], shot: 'shots/dejavu.webp', tint: '#d9a441' },
    { name: 'Stempelpass', emoji: '🎟️', tilt: -1.5,
      one: { en: 'Digital stamp card that knows nothing about you. Zero tracking.',
             de: 'Digitale Stempelkarte, die nichts über dich weiß. Null Tracking.' },
      tags: ['PWA', 'QR', 'zero-PII'], shot: null, tint: '#46a758' },
    { name: 'FoundList', emoji: '📝', tilt: 2,
      one: { en: 'A native Android app with a hand-made, playful feel. Compose + CI.',
             de: 'Native Android-App mit handgemachtem, verspieltem Look. Compose + CI.' },
      tags: ['Kotlin', 'Compose', 'CI'], shot: null, tint: '#8b7bff' },
    { name: 'EasyThreads', emoji: '🧵', tilt: -1,
      one: { en: 'Live client dashboard on a real API. OAuth, PM2, running in the wild.',
             de: 'Live-Kunden-Dashboard an echter API. OAuth, PM2, im Betrieb.' },
      tags: ['API', 'OAuth', 'PM2'], shot: 'shots/easythreads.webp', tint: '#4a9eff' },
  ];

  const api = { T, PROJECTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.I18N = api;
})(typeof window !== 'undefined' ? window : globalThis);
