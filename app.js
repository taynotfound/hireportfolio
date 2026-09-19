'use strict';
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = window.Pricing;

/* ── content data ── */
const STACK = ['JavaScript', 'TypeScript', 'Python', 'Kotlin', 'Node.js', 'SQLite / SQL', 'PWA', 'Cloudflare', 'REST APIs', 'Jetpack Compose', 'Security / Auth', 'Vanilla CSS'];

const ICON = {
  web: '<path d="M352 256c0 22.2-1.2 43.6-3.3 64H163.3c-2.2-20.4-3.3-41.8-3.3-64s1.2-43.6 3.3-64H348.7c2.2 20.4 3.3 41.8 3.3 64zm28.8-64H503.9c5.3 20.5 8.1 41.9 8.1 64s-2.8 43.5-8.1 64H380.8c2.1-20.6 3.2-42 3.2-64s-1.1-43.4-3.2-64zm112.6-32H376.7c-10-63.9-29.8-117.4-55.3-151.6 78.3 20.7 142 77.5 171.9 151.6zm-149.1 0H167.7c6.1-36.4 15.5-68.6 27-94.7 10.5-23.6 22.2-40.7 33.5-51.5C239.4 3.2 248.7 0 256 0s16.6 3.2 27.8 13.8c11.3 10.8 23 27.9 33.5 51.5 11.6 26 20.9 58.2 27 94.7zm-209 0H18.6C48.6 85.9 112.2 29.1 190.6 8.4 165.1 42.6 145.3 96.1 135.3 160zM8.1 192H131.2c-2.1 20.6-3.2 42-3.2 64s1.1 43.4 3.2 64H8.1C2.8 299.5 0 278.1 0 256s2.8-43.5 8.1-64zM194.7 446.6c-11.6-26-20.9-58.2-27-94.6H344.3c-6.1 36.4-15.5 68.6-27 94.6-10.5 23.6-22.2 40.7-33.5 51.5C272.6 508.8 263.3 512 256 512s-16.6-3.2-27.8-13.8c-11.3-10.8-23-27.9-33.5-51.5zM135.3 352c10 63.9 29.8 117.4 55.3 151.6C112.2 482.9 48.6 426.1 18.6 352H135.3zm358.1 0c-30 74.1-93.6 130.9-171.9 151.6 25.5-34.2 45.3-87.7 55.3-151.6H493.4z"/>',
  app: '<path d="M16 64C16 28.7 44.7 0 80 0H304c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H80c-35.3 0-64-28.7-64-64V64zM224 448a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>',
  shield: '<path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z"/>',
  bolt: '<path d="M0 256L28.5 28c2-16 15.6-28 31.8-28H228.9c15 0 27.1 12.1 27.1 27.1c0 3.2-.6 6.5-1.7 9.5L208 160H347.3c20.2 0 36.7 16.4 36.7 36.7c0 7.4-2.2 14.6-6.4 20.7l-192.2 281c-5.9 8.6-15.6 13.7-25.9 13.7h-9.2c-14.5 0-25.4-13.3-23.6-27.9L153 336H30.9C13.8 336 0 322.2 0 305.1c0-3.9 .7-7.7 2.2-11.4L0 256z"/>',
  cart: '<path d="M0 24C0 10.7 10.7 0 24 0H69.5c22 0 41.5 12.8 50.6 32h411c26.3 0 45.5 25 38.6 50.4l-41 152.3c-8.5 31.4-37 53.3-69.5 53.3H170.7l5.4 28.5c2.2 11.3 12.1 19.5 23.6 19.5H488c13.3 0 24 10.7 24 24s-10.7 24-24 24H199.7c-34.6 0-64.3-24.6-70.7-58.5L77.4 54.5c-.7-3.8-4-6.5-7.9-6.5H24C10.7 48 0 37.3 0 24zM128 464a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm336-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/>',
  gauge: '<path d="M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM288 96a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM256 416c35.3 0 64-28.7 64-64c0-17.4-6.9-33.2-18.1-44.7L366 161.7c5.3-12.1-.2-26.3-12.3-31.6s-26.3 .2-31.6 12.3L258 288.3c-.7 0-1.3 0-2 0c-35.3 0-64 28.7-64 64s28.7 64 64 64z"/>',
};

const SERVICES = [
  { i: 'web', h: 'Custom Web Apps', p: 'Dashboards, admin panels, and full platforms — reactive UIs backed by real APIs and databases, built without heavy frameworks so they stay fast and maintainable.' },
  { i: 'app', h: 'Mobile Apps', p: 'Native Android apps in Kotlin & Jetpack Compose with modern Material design, offline support, and CI-built releases.' },
  { i: 'shield', h: 'Security & Auth', p: 'Hardened login systems, 2FA, brute-force protection, and full security audits. Fintech-grade practices applied to every project.' },
  { i: 'bolt', h: 'PWAs & Performance', p: 'Installable, offline-capable progressive web apps that load instantly and feel native — with privacy-first analytics baked in.' },
  { i: 'cart', h: 'Booking & Commerce', p: 'Shops, reservation systems, and loyalty platforms with QR flows, payment integration, and self-service admin.' },
  { i: 'gauge', h: 'Maintenance & Support', p: 'Ongoing updates, monitoring, backups, and priority fixes — keeping your platform healthy long after launch.' },
];

const PROJECTS = [
  { badge: 'b-fintech', bt: 'Fintech', h: 'Foxledger', tag: 'Personal banking & finance platform', p: 'A secure, self-hosted finance dashboard handling real banking data. Hardened auth, encrypted storage, and a clean reactive UI — built to fintech security standards.', tags: ['Node.js', 'Security', 'Dashboard', 'Auth + 2FA'] },
  { badge: 'b-web', bt: 'Web Platform', h: 'Déjà Vu', tag: 'Bar management & guest platform', p: 'A full hospitality platform: live status board, event & tournament management, media galleries, menu editor, and a hardened admin panel with per-account brute-force protection.', tags: ['Python', 'SQLite/WAL', 'PWA', 'Admin CMS'] },
  { badge: 'b-web', bt: 'Web Platform', h: 'Stempelpass', tag: 'Privacy-first loyalty system', p: 'A digital stamp-card platform with zero personal data — QR-based point collection, password-only login, and installable PWAs for both guests and staff.', tags: ['PWA', 'QR', 'Privacy', 'No-tracking'] },
  { badge: 'b-mobile', bt: 'Mobile', h: 'FoundList', tag: 'Android productivity app', p: 'A native Kotlin/Jetpack Compose app with an expressive, playful UI, Hilt DI, Room persistence, and automated CI builds producing signed APKs.', tags: ['Kotlin', 'Compose', 'Room', 'CI/CD'] },
  { badge: 'b-web', bt: 'Web Platform', h: 'EasyThreads Dashboard', tag: 'Client operations dashboard', p: 'A production management dashboard integrating a live external API, real-time data, and OAuth-gated access — deployed and maintained under PM2.', tags: ['API', 'OAuth', 'Dashboard', 'PM2'] },
  { badge: 'b-web', bt: 'Web Platform', h: 'Faultline', tag: 'Self-hosted news & editorial site', p: 'A fully self-hosted publishing platform — every asset local, no CDNs, no third-party requests — with an automated editorial content pipeline.', tags: ['Publishing', 'Self-hosted', 'Automation', 'SEO'] },
];

const STEPS = [
  { h: 'Scope call', p: 'A free, no-pressure call to understand what you need. You leave with a clear plan and a fixed quote.' },
  { h: 'Design & build', p: 'I design and develop in short iterations, sharing live previews so you see progress and steer early.' },
  { h: 'Launch', p: 'Tested, secured, and deployed to your infrastructure — with everything documented and handed over.' },
  { h: 'Support', p: 'Optional ongoing plans for updates, monitoring, and priority fixes as your product grows.' },
];

/* ── render static content ── */
function render() {
  const chips = $('#stackChips');
  chips.append(el('span', 'chip', '<b>Stack:</b>'));
  STACK.forEach(s => chips.append(el('span', 'chip', esc(s))));

  const sg = $('#servicesGrid');
  SERVICES.forEach(s => sg.append(el('div', 'card reveal',
    `<div class="ico"><svg class="ic" viewBox="0 0 512 512" width="22">${ICON[s.i]}</svg></div><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p>`)));

  const pg = $('#projGrid');
  PROJECTS.forEach(pr => {
    const card = el('div', 'proj reveal',
      `<div class="proj-top"><span class="proj-badge ${pr.badge}">${esc(pr.bt)}</span></div>
       <div class="proj-body"><h3>${esc(pr.h)}</h3><div class="tagline">${esc(pr.tag)}</div>
       <p>${esc(pr.p)}</p><div class="tags">${pr.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div></div>`);
    pg.append(card);
  });

  const st = $('#stepsGrid');
  STEPS.forEach((s, i) => st.append(el('div', 'step',
    `<div class="n">${i + 1}</div><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p>`)));

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
  if (q.rush) items.append(el('div', 'sum-line dim', `<span>+ Rush delivery (+25%)</span><span></span>`));

  $('#sumDiscount').innerHTML = q.discount
    ? `<div class="sum-line disc"><span>Retainer discount (−10%)</span><span>−${P.eur(q.discount)}</span></div>` : '';

  $('#sumTotal').textContent = P.eur(q.oneOff);

  const mo = $('#sumMonthly');
  if (q.monthly) { mo.style.display = 'block'; mo.textContent = `+ ${P.eur(q.monthly)}/month support`; }
  else mo.style.display = 'none';

  $('#sumEta').textContent = `Estimated timeline: ~${q.days} working days`;

  // pass the config to the contact form via hash-friendly summary
  $('#sumCta').dataset.summary = `${q.base.label}${q.addons.length ? ' + ' + q.addons.map(a => a.label).join(', ') : ''}${q.rush ? ' (rush)' : ''} — ${P.eur(q.oneOff)}${q.monthly ? ' + ' + P.eur(q.monthly) + '/mo' : ''}`;
}

/* prefill contact message when arriving from the builder */
$('#sumCta') && document.addEventListener('click', e => {
  const cta = e.target.closest('#sumCta');
  if (!cta) return;
  const msg = $('#cMsg');
  if (msg && !msg.value.trim()) msg.value = `Hi Tay, I'd like a quote for: ${cta.dataset.summary || ''}.\n\nHere's a bit more about the project:\n`;
});

/* ── contact form (front-end validation; POST target is a placeholder) ── */
function wireForm() {
  const form = $('#contactForm'), note = $('#formNote');
  form.addEventListener('submit', e => {
    e.preventDefault();
    note.className = 'form-note';
    if ($('#cHoney').value) return;            // honeypot: silently drop bots
    const name = $('#cName').value.trim(), email = $('#cEmail').value.trim(), msg = $('#cMsg').value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !emailOk || !msg) {
      note.className = 'form-note err';
      note.textContent = !name ? 'Please enter your name.' : !emailOk ? 'Please enter a valid email.' : 'Please tell me about your project.';
      return;
    }
    // ponytail: no backend wired yet — placeholder success. Point form.action at a real
    // endpoint (or mailto/Formspree) when deploying.
    note.className = 'form-note ok';
    note.textContent = 'Thanks — your message is ready to send. (Connect a form endpoint to deliver it.)';
    form.reset();
  });
}

/* ── scroll reveal ── */
function wireReveal() {
  if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach(r => r.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(r => io.observe(r));
  // safety net: if anything is still hidden after 3s (missed observer), reveal it
  setTimeout(() => document.querySelectorAll('.reveal:not(.in)').forEach(r => r.classList.add('in')), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  render();
  buildOptions();
  update();
  wireForm();
  wireReveal();
  // reveal observer must also catch dynamically-added .reveal cards
  requestAnimationFrame(wireReveal);
});
