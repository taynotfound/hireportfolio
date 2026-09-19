'use strict';
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = window.Pricing;

/* ── content data (first-person, specific, not marketing-generic) ── */
const SERVICES = [
  { h: 'Web apps & dashboards', p: 'Reactive UIs backed by real APIs and databases. No React-by-reflex — vanilla where it keeps things fast, a framework only when it earns its weight.' },
  { h: 'Android apps', p: 'Native Kotlin and Jetpack Compose, Material design that doesn\u2019t look stock, CI that spits out signed APKs on every push.' },
  { h: 'Login & security', p: 'The stuff that keeps you off the news: 2FA, brute-force lockouts, session hardening, and full audits. I\u2019ve pentested my own banking app and lived.' },
  { h: 'PWAs & performance', p: 'Installable, offline-capable, loads before you blink. Privacy-first analytics if you want numbers, none if you don\u2019t.' },
  { h: 'Booking & loyalty', p: 'QR check-ins, stamp cards, reservation flows, self-service admin panels. Real systems running in a real bar right now.' },
  { h: 'Keeping it alive', p: 'Updates, backups, monitoring, and the 11pm \u201cit\u2019s down\u201d fix. Optional, but the reason clients stick around.' },
];

const PROJECTS = [
  { name: 'Foxledger', kind: 'personal finance · fintech', p: 'A self-hosted banking dashboard handling real account data. Encrypted at rest, hardened auth, and a UI clean enough to actually use daily. This is the one I lose sleep over so nobody else has to.', stack: ['Node.js', 'Auth + 2FA', 'encryption', 'dashboard'] },
  { name: 'Déjà Vu', kind: 'bar platform · hospitality', p: 'Runs a Göttingen bar end to end: live status board, events and tournaments, menu editor, photo galleries, and an admin panel with per-account brute-force lockout I wrote and then tried to break.', stack: ['Python', 'SQLite/WAL', 'PWA', 'admin CMS'] },
  { name: 'Stempelpass', kind: 'loyalty · privacy', p: 'A digital stamp card that knows nothing about you — no email, no name, no tracking. QR points, password-only login, and separate installable apps for guests and staff.', stack: ['PWA', 'QR', 'zero-PII', 'no trackers'] },
  { name: 'FoundList', kind: 'productivity · android', p: 'A native Android app with a deliberately playful, hand-made feel — Compose UI, Hilt, Room, and a CI pipeline building signed releases without a local SDK in sight.', stack: ['Kotlin', 'Compose', 'Room', 'CI/CD'] },
  { name: 'EasyThreads', kind: 'ops dashboard · client work', p: 'A production dashboard wired to a live external API, OAuth-gated, deployed under PM2 and maintained in the wild. Adapts to real endpoints handed over mid-build — because that\u2019s how it actually goes.', stack: ['API', 'OAuth', 'PM2', 'realtime'] },
  { name: 'Faultline', kind: 'publishing · self-hosted', p: 'A news site where every byte is local — fonts, icons, images, all of it. No CDN, no third-party request, plus an automated editorial pipeline keeping it fed.', stack: ['self-hosted', 'automation', 'SEO', 'zero-CDN'] },
];

const STEPS = [
  { h: 'We talk', p: 'A free call to figure out what you actually need — which is often not what the brief says. You leave with a plan and a fixed price.' },
  { h: 'I build, you watch', p: 'Short iterations with live preview links. You steer as it takes shape instead of praying at the end.' },
  { h: 'It goes live', p: 'Tested, hardened, deployed to your infrastructure, documented, and handed over. Keys included.' },
  { h: 'I stick around', p: 'If you want. Updates, monitoring, and priority fixes on a plan — or a clean handoff and we part as friends.' },
];

/* ── render ── */
function render() {
  const sg = $('#servicesGrid');
  SERVICES.forEach((s, i) => sg.append(el('div', 'svc',
    `<div class="ix mono">${String(i + 1).padStart(2, '0')}</div><div><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></div>`)));

  const pg = $('#projGrid');
  PROJECTS.forEach(pr => pg.append(el('div', 'proj',
    `<div class="proj-meta"><div class="name">${esc(pr.name)}</div><div class="kind mono">${esc(pr.kind)}</div></div>
     <div class="proj-body"><p>${esc(pr.p)}</p><div class="stack mono">${pr.stack.map(t => `<span>${esc(t)}</span>`).join('')}</div></div>`)));

  const st = $('#stepsGrid');
  STEPS.forEach((s, i) => st.append(el('div', 'step',
    `<div class="n mono">0${i + 1}</div><div><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></div>`)));

  $('#year').textContent = new Date().getFullYear();
}

/* ── package builder ── */
const state = { base: 'webapp', addons: new Set(['auth', 'design']), support: 'basic', rush: false };

function buildOptions() {
  const baseRow = $('#baseRow');
  Object.entries(P.BASES).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="radio" name="base" value="${k}"${k === state.base ? ' checked' : ''}>
       <div class="box"><div class="t">${esc(v.label)} <span class="pr">${P.eur(v.price)}</span></div><div class="d">from ${v.days} days</div></div>`);
    o.querySelector('input').addEventListener('change', () => { state.base = k; update(); });
    baseRow.append(o);
  });

  const addonRow = $('#addonRow');
  Object.entries(P.ADDONS).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="checkbox" value="${k}"${state.addons.has(k) ? ' checked' : ''}>
       <div class="box"><div class="t">${esc(v.label)} <span class="pr">+${P.eur(v.price)}</span></div></div>`);
    o.querySelector('input').addEventListener('change', e => { e.target.checked ? state.addons.add(k) : state.addons.delete(k); update(); });
    addonRow.append(o);
  });

  const supRow = $('#supportRow');
  Object.entries(P.SUPPORT).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="radio" name="support" value="${k}"${k === state.support ? ' checked' : ''}>
       <div class="box"><div class="t">${esc(v.label)} ${v.monthly ? `<span class="pr">${P.eur(v.monthly)}/mo</span>` : ''}</div></div>`);
    o.querySelector('input').addEventListener('change', () => { state.support = k; update(); });
    supRow.append(o);
  });

  $('#rushToggle').addEventListener('change', e => { state.rush = e.target.checked; update(); });
}

function update() {
  const q = P.quote({ base: state.base, addons: [...state.addons], support: state.support, rush: state.rush });

  const items = $('#sumItems');
  items.innerHTML = '';
  items.append(el('div', 'sum-line', `<span>${esc(q.base.label)}</span><span>${P.eur(q.base.price)}</span>`));
  q.addons.forEach(a => items.append(el('div', 'sum-line dim', `<span>+ ${esc(a.label)}</span><span>${P.eur(a.price)}</span>`)));
  if (q.rush) items.append(el('div', 'sum-line dim', `<span>+ rush (+25%)</span><span></span>`));

  $('#sumDiscount').innerHTML = q.discount
    ? `<div class="sum-line disc"><span>retainer (\u221210%)</span><span>\u2212${P.eur(q.discount)}</span></div>` : '';

  $('#sumTotal').textContent = P.eur(q.oneOff);

  const mo = $('#sumMonthly');
  if (q.monthly) { mo.style.display = 'block'; mo.textContent = `+ ${P.eur(q.monthly)}/mo support`; }
  else mo.style.display = 'none';

  $('#sumEta').textContent = `~${q.days} working days`;

  $('#sumCta').dataset.summary = `${q.base.label}${q.addons.length ? ' + ' + q.addons.map(a => a.label).join(', ') : ''}${q.rush ? ' (rush)' : ''} — ${P.eur(q.oneOff)}${q.monthly ? ' + ' + P.eur(q.monthly) + '/mo' : ''}`;
}

document.addEventListener('click', e => {
  const cta = e.target.closest('#sumCta');
  if (!cta) return;
  const msg = $('#cMsg');
  if (msg && !msg.value.trim()) msg.value = `Hi Tay — I'd like a quote for: ${cta.dataset.summary || ''}.\n\nA bit more about the project:\n`;
});

/* ── contact form (front-end validation; POST target is a placeholder) ── */
function wireForm() {
  const form = $('#contactForm'), note = $('#formNote');
  form.addEventListener('submit', e => {
    e.preventDefault();
    note.className = 'form-note mono';
    if ($('#cHoney').value) return;
    const name = $('#cName').value.trim(), email = $('#cEmail').value.trim(), msg = $('#cMsg').value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !emailOk || !msg) {
      note.className = 'form-note mono err';
      note.textContent = !name ? 'need a name to reply to.' : !emailOk ? 'that email looks off.' : 'tell me a bit about the project.';
      return;
    }
    // ponytail: no backend wired yet — placeholder success. Point form.action at a real
    // endpoint (mailto / Formspree / own handler) when deploying.
    note.className = 'form-note mono ok';
    note.textContent = 'ready to send — wire up a form endpoint to deliver it.';
    form.reset();
  });
}

/* ── scroll reveal (subtle opacity only) ── */
function wireReveal() {
  if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach(r => r.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(r => io.observe(r));
  setTimeout(() => document.querySelectorAll('.reveal:not(.in)').forEach(r => r.classList.add('in')), 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  render();
  buildOptions();
  update();
  wireForm();
  wireReveal();
});
