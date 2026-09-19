/* Bilingual strings (EN/DE) + content data. Consumed by app.js.
   Static UI strings use data-i / data-i-html on elements; content arrays render via app.js. */
(function (root) {
  'use strict';

  const T = {
    en: {
      'nav.services': 'Services', 'nav.work': 'Work', 'nav.pricing': 'Pricing', 'nav.contact': 'Get in touch',
      'hero.avail': '\u25cf available now — I can start on your project this week',
      'hero.h1': 'I build software that ships <em>lean</em> and stays <em>private</em>.',
      'hero.lead': "I'm Tay — a full-stack developer. I take projects from an empty folder to a running product: web apps, Android apps, and the security-critical parts most people would rather not touch. <b>One person, whole stack, no agency markup.</b>",
      'hero.cta1': 'Estimate a project', 'hero.cta2': "See what I've built",
      'hero.facts': '<b>writes:</b> <span class="k">JavaScript \u00b7 TypeScript \u00b7 Python \u00b7 Kotlin \u00b7 SQL</span><br><b>ships:</b> <span class="k">web apps \u00b7 Android \u00b7 PWAs \u00b7 hardened auth \u00b7 self-hosting</span><br><b>never ships:</b> <span class="k">third-party trackers</span>',
      'svc.title': 'What I take on', 'svc.sub': 'The whole build, or the awkward parts other people got stuck on. Either works.',
      'work.title': "Things I've shipped", 'work.sub': "A slice of what's in production right now — fintech, hospitality, mobile. Built and still maintained, mostly solo.",
      'price.title': 'Roughly what it costs', 'price.sub': "Pick what you're after and watch the number move. It's a ballpark to start a conversation — you get a fixed price after we actually talk.",
      'price.g1': 'start with', 'price.g2': 'bolt on', 'price.g3': 'after launch', 'price.g4': 'in a hurry?',
      'price.rush': '<b>Rush it</b> — I clear the decks, ~40% faster <small>+20% on the build</small>',
      'price.est': '// your estimate', 'price.from': 'build, from', 'price.send': 'Send me this',
      'price.note': 'ballpark only — real number after a quick call',
      'proc.title': 'How working together goes',
      'ct.title': "Tell me what you're building", 'ct.sub': "Give me the gist. I'll come back with a plan, a fixed price, and an honest timeline — usually inside a day.",
      'ct.name': 'your name', 'ct.email': 'email', 'ct.msg': 'what do you want to build?', 'ct.submit': 'Send it over',
      'ct.aside.h': 'Straight answers, no runaround',
      'ct.aside.p': 'You deal with the person writing the code — not a project manager relaying messages. Fast replies, fixed quotes, and code that\u2019s yours to keep.',
      'foot.tag': 'hand-written \u00b7 no frameworks \u00b7 no trackers',
      // builder dynamic bits
      'b.days': 'from {n} days', 'b.rushline': '+ rush (+20%)', 'b.retainer': 'retainer (\u221210%)',
      'b.buildfrom': 'build, from', 'b.mo': '/mo support', 'b.eta': '~{n} working days',
    },
    de: {
      'nav.services': 'Leistungen', 'nav.work': 'Projekte', 'nav.pricing': 'Preise', 'nav.contact': 'Kontakt',
      'hero.avail': '\u25cf sofort verf\u00fcgbar — ich kann diese Woche mit deinem Projekt starten',
      'hero.h1': 'Ich baue Software, die <em>schlank</em> l\u00e4uft und <em>privat</em> bleibt.',
      'hero.lead': 'Ich bin Tay — Full-Stack-Entwickler. Ich bringe Projekte vom leeren Ordner zum laufenden Produkt: Web-Apps, Android-Apps und die sicherheitskritischen Teile, die die meisten lieber nicht anfassen. <b>Eine Person, der ganze Stack, kein Agentur-Aufschlag.</b>',
      'hero.cta1': 'Projekt kalkulieren', 'hero.cta2': 'Meine Projekte ansehen',
      'hero.facts': '<b>schreibt:</b> <span class="k">JavaScript \u00b7 TypeScript \u00b7 Python \u00b7 Kotlin \u00b7 SQL</span><br><b>liefert:</b> <span class="k">Web-Apps \u00b7 Android \u00b7 PWAs \u00b7 sichere Logins \u00b7 Self-Hosting</span><br><b>liefert nie:</b> <span class="k">Third-Party-Tracker</span>',
      'svc.title': 'Was ich \u00fcbernehme', 'svc.sub': 'Das ganze Projekt — oder die kniffligen Stellen, an denen andere h\u00e4ngengeblieben sind. Beides geht.',
      'work.title': 'Was ich schon gebaut habe', 'work.sub': 'Ein Ausschnitt dessen, was gerade produktiv l\u00e4uft — Fintech, Gastro, Mobile. Gebaut und weiter gepflegt, meist allein.',
      'price.title': 'Was es ungef\u00e4hr kostet', 'price.sub': 'W\u00e4hle aus, was du brauchst, und sieh der Zahl beim Wachsen zu. Ein Richtwert f\u00fcr den Einstieg — den Festpreis gibt\u2019s, nachdem wir gesprochen haben.',
      'price.g1': 'starte mit', 'price.g2': 'erg\u00e4nze', 'price.g3': 'nach dem Launch', 'price.g4': 'eilig?',
      'price.rush': '<b>Express</b> — ich r\u00e4ume alles frei, ~40% schneller <small>+20% auf den Bau</small>',
      'price.est': '// deine Sch\u00e4tzung', 'price.from': 'Bau, ab', 'price.send': 'Schick mir das',
      'price.note': 'nur ein Richtwert — echte Zahl nach kurzem Gespr\u00e4ch',
      'proc.title': 'So l\u00e4uft die Zusammenarbeit',
      'ct.title': 'Erz\u00e4hl mir, was du bauen willst', 'ct.sub': 'Gib mir das Wesentliche. Ich melde mich mit Plan, Festpreis und ehrlicher Zeitsch\u00e4tzung — meist innerhalb eines Tages.',
      'ct.name': 'dein Name', 'ct.email': 'E-Mail', 'ct.msg': 'was willst du bauen?', 'ct.submit': 'Absenden',
      'ct.aside.h': 'Klare Antworten, kein Hin und Her',
      'ct.aside.p': 'Du sprichst mit der Person, die den Code schreibt — nicht mit einem Projektmanager, der Nachrichten weiterreicht. Schnelle Antworten, Festpreise und Code, der dir geh\u00f6rt.',
      'foot.tag': 'handgeschrieben \u00b7 keine Frameworks \u00b7 keine Tracker',
      'b.days': 'ab {n} Tagen', 'b.rushline': '+ Express (+20%)', 'b.retainer': 'Retainer (\u221210%)',
      'b.buildfrom': 'Bau, ab', 'b.mo': '/Mon. Support', 'b.eta': '~{n} Arbeitstage',
    },
  };

  const SERVICES = [
    { h: { en: 'Web apps & dashboards', de: 'Web-Apps & Dashboards' },
      p: { en: "Reactive UIs backed by real APIs and databases. No React-by-reflex — vanilla where it keeps things fast, a framework only when it earns its weight.",
           de: 'Reaktive Oberfl\u00e4chen mit echten APIs und Datenbanken. Kein React aus Reflex — Vanilla, wo es schnell bleibt, ein Framework nur, wenn es sich lohnt.' } },
    { h: { en: 'Android apps', de: 'Android-Apps' },
      p: { en: "Native Kotlin and Jetpack Compose, Material design that doesn\u2019t look stock, CI that spits out signed APKs on every push.",
           de: 'Natives Kotlin und Jetpack Compose, Material-Design, das nicht nach Vorlage aussieht, CI, die bei jedem Push signierte APKs baut.' } },
    { h: { en: 'Login & security', de: 'Login & Sicherheit' },
      p: { en: "The stuff that keeps you off the news: 2FA, brute-force lockouts, session hardening, and full audits.",
           de: 'Das, was dich aus den Schlagzeilen h\u00e4lt: 2FA, Brute-Force-Sperren, geh\u00e4rtete Sessions und komplette Audits.' } },
    { h: { en: 'PWAs & performance', de: 'PWAs & Performance' },
      p: { en: "Installable, offline-capable, loads before you blink. Privacy-first analytics if you want numbers, none if you don\u2019t.",
           de: 'Installierbar, offline-f\u00e4hig, l\u00e4dt schneller als du blinzelst. Datenschutzfreundliche Analytics auf Wunsch — oder gar keine.' } },
    { h: { en: 'Booking & loyalty', de: 'Buchung & Treue' },
      p: { en: "QR check-ins, stamp cards, reservation flows, self-service admin panels. Real systems running in a real bar right now.",
           de: 'QR-Check-ins, Stempelkarten, Reservierungen, Self-Service-Adminbereiche. Echte Systeme, die gerade in einer echten Bar laufen.' } },
    { h: { en: 'Keeping it alive', de: 'Am Laufen halten' },
      p: { en: "Updates, backups, monitoring, and the 11pm \u201cit\u2019s down\u201d fix. Optional, but the reason clients stick around.",
           de: 'Updates, Backups, Monitoring und der \u201ees ist offline\u201c-Fix um 23 Uhr. Optional, aber der Grund, warum Kunden bleiben.' } },
  ];

  const PROJECTS = [
    { name: 'Foxledger', kind: { en: 'personal finance · fintech', de: 'Finanzen · Fintech' },
      p: { en: 'A self-hosted banking dashboard handling real account data. Encrypted at rest, hardened auth, and a UI clean enough to actually use daily.',
           de: 'Ein selbst gehostetes Banking-Dashboard mit echten Kontodaten. Verschl\u00fcsselt gespeichert, geh\u00e4rtetes Login und ein UI, das man t\u00e4glich gern nutzt.' },
      stack: ['Node.js', 'Auth + 2FA', 'encryption', 'dashboard'],
      mock: { u: 'foxledger · private', big: '€ 4.812,60', lock: { en: '\uD83D\uDD12 encrypted · screenshot withheld', de: '\uD83D\uDD12 verschl\u00fcsselt · Screenshot zur\u00fcckgehalten' } } },
    { name: 'Déjà Vu', kind: { en: 'bar platform · hospitality', de: 'Bar-Plattform · Gastro' },
      p: { en: 'Runs a bar end to end: live status board, events and tournaments, menu editor, photo galleries, and an admin panel with per-account brute-force lockout.',
           de: 'Betreibt eine Bar komplett: Live-Status, Events und Turniere, Men\u00fc-Editor, Fotogalerien und ein Adminbereich mit Brute-Force-Sperre pro Konto.' },
      stack: ['Python', 'SQLite/WAL', 'PWA', 'admin CMS'], shot: 'shots/dejavu.webp' },
    { name: 'Stempelpass', kind: { en: 'loyalty · privacy', de: 'Treue · Datenschutz' },
      p: { en: 'A digital stamp card that knows nothing about you — no email, no name, no tracking. QR points, password-only login, separate apps for guests and staff.',
           de: 'Eine digitale Stempelkarte, die nichts \u00fcber dich wei\u00df — keine E-Mail, kein Name, kein Tracking. QR-Punkte, reines Passwort-Login, getrennte Apps f\u00fcr G\u00e4ste und Team.' },
      stack: ['PWA', 'QR', 'zero-PII', 'no trackers'],
      mock: { u: 'stempelpass · pwa', big: '● ● ● ● ○ ○', lock: { en: '7 / 10 stamps · no personal data', de: '7 / 10 Stempel · keine personenbezogenen Daten' } } },
    { name: 'FoundList', kind: { en: 'productivity · android', de: 'Produktivit\u00e4t · Android' },
      p: { en: 'A native Android app with a deliberately playful, hand-made feel — Compose UI, Hilt, Room, and a CI pipeline building signed releases without a local SDK in sight.',
           de: 'Eine native Android-App mit bewusst verspieltem, handgemachtem Look — Compose-UI, Hilt, Room und eine CI-Pipeline, die signierte Releases ohne lokales SDK baut.' },
      stack: ['Kotlin', 'Compose', 'Room', 'CI/CD'],
      mock: { u: 'foundlist · android', big: '✓ todo · ✎ notes', lock: { en: 'built on CI · signed APK', de: 'per CI gebaut · signierte APK' } } },
    { name: 'EasyThreads', kind: { en: 'ops dashboard · client work', de: 'Ops-Dashboard · Kundenprojekt' },
      p: { en: 'A production dashboard wired to a live external API, OAuth-gated, deployed under PM2 and maintained in the wild. Adapts to real endpoints handed over mid-build.',
           de: 'Ein produktives Dashboard an einer echten externen API, OAuth-gesch\u00fctzt, unter PM2 deployt und im Betrieb gepflegt. Passt sich echten Endpoints an, die mitten im Bau kommen.' },
      stack: ['API', 'OAuth', 'PM2', 'realtime'], shot: 'shots/easythreads.webp' },
  ];

  const STEPS = [
    { h: { en: 'We talk', de: 'Wir reden' },
      p: { en: 'A free call to figure out what you actually need — which is often not what the brief says. You leave with a plan and a fixed price.',
           de: 'Ein kostenloses Gespr\u00e4ch, um herauszufinden, was du wirklich brauchst — oft nicht das, was im Briefing steht. Du gehst mit Plan und Festpreis raus.' } },
    { h: { en: 'I build, you watch', de: 'Ich baue, du siehst zu' },
      p: { en: 'Short iterations with live preview links. You steer as it takes shape instead of praying at the end.',
           de: 'Kurze Iterationen mit Live-Vorschau-Links. Du steuerst mit, w\u00e4hrend es entsteht, statt am Ende zu hoffen.' } },
    { h: { en: 'It goes live', de: 'Es geht live' },
      p: { en: 'Tested, hardened, deployed to your infrastructure, documented, and handed over. Keys included.',
           de: 'Getestet, geh\u00e4rtet, auf deine Infrastruktur deployt, dokumentiert und \u00fcbergeben. Schl\u00fcssel inklusive.' } },
    { h: { en: 'I stick around', de: 'Ich bleibe dabei' },
      p: { en: 'If you want. Updates, monitoring, and priority fixes on a plan — or a clean handoff and we part as friends.',
           de: 'Wenn du willst. Updates, Monitoring und Priorit\u00e4ts-Fixes im Plan — oder eine saubere \u00dcbergabe und wir bleiben Freunde.' } },
  ];

  const CT_LIST = {
    en: ['fixed quotes, no surprise invoices', 'privacy & security in by default', 'you own the code and the servers', 'support plans if you want one'],
    de: ['Festpreise, keine \u00dcberraschungs-Rechnungen', 'Datenschutz & Sicherheit von Haus aus', 'Code und Server geh\u00f6ren dir', 'Support-Pl\u00e4ne auf Wunsch'],
  };

  const api = { T, SERVICES, PROJECTS, STEPS, CT_LIST };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.I18N = api;
})(typeof window !== 'undefined' ? window : globalThis);
