'use strict';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = window.Pricing;
const { T, PROJECTS, TESTIMONIALS } = window.I18N;

let lang = (localStorage.getItem('lang') || (navigator.language || 'en').slice(0, 2)) === 'de' ? 'de' : 'en';
const t = k => (T[lang][k] ?? T.en[k] ?? k);
const L = o => (o && typeof o === 'object' ? (o[lang] ?? o.en) : o);

function applyStatic() {
  document.documentElement.lang = lang;
  $$('[data-i]').forEach(e => { e.textContent = t(e.dataset.i); });
  $$('[data-i-html]').forEach(e => { e.innerHTML = t(e.dataset.iHtml); });
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}

function renderStack() {
  const g = $('#stackgrid'); if (!g) return; g.innerHTML = '';
  // fixed category order: langs/front/back/mobile/ops/security
  const ICO = ['\uf121', '\uf522', '\uf233', '\uf3cd', '\uf085', '\uf3ed'];
  window.I18N.STACK.forEach((s, i) => g.append(el('div', 'stackcard',
    `<h3><i class="ic fa-solid" aria-hidden="true">${ICO[i] || ''}</i>${esc(t(s.k))}</h3><div class="chips">${s.items.map(x => `<span>${esc(x)}</span>`).join('')}</div>`)));
}

// numbers: read same-origin SVGs (zero external requests) + derive the rest
async function renderStats() {
  const g = $('#statgrid'); if (!g) return;
  let contrib = '—', hours = '—';
  try {
    const svg = await (await fetch('heatmap.svg?v=16')).text();
    contrib = (svg.match(/([\d,]+)\s+GitHub contributions/) || svg.match(/>([\d,]+) contributions/) || [, '—'])[1];
  } catch (e) {}
  try {
    const b = await (await fetch('waka-badge.svg?v=16')).text();
    hours = (b.match(/([\d,]+)\s*hrs/) || [, '—'])[1];
  } catch (e) {}
  const years = new Date().getFullYear() - 2019;
  const cards = [
    { ic: '\uf1d8', num: contrib, lab: t('stats.contrib'), sub: t('stats.contribl') },
    { ic: '\uf017', num: hours, lab: t('stats.hours'), sub: t('stats.hoursl') },
    { ic: '\uf1da', num: String(years), lab: t('stats.years'), sub: t('stats.yearsl') },
    { ic: '\uf135', num: String(PROJECTS.length), lab: t('stats.projects'), sub: t('stats.projectsl') },
  ];
  g.innerHTML = '';
  cards.forEach(c => g.append(el('div', 'statcard',
    `<div class="num"><i class="ic fa-solid" aria-hidden="true">${c.ic}</i>${esc(c.num)}</div><div class="lab">${esc(c.lab)}</div><div class="sub">${esc(c.sub)}</div>`)));
}

function openDetail(p) {
  const dlg = $('#detail');
  const shot = p.shot
    ? `<div class="dtop"><img src="${esc(p.shot)}" alt="${esc(p.name)} screenshot"></div>`
    : `<div class="dtop ph" style="background:${esc(p.tint)}22"><span>${p.emoji}</span></div>`;
  const visit = p.link
    ? `<a class="btn btn-primary" href="${esc(p.link)}" target="_blank" rel="noopener">${lang === 'de' ? 'live ansehen' : 'view live'} ↗</a>`
    : `<span class="dpriv mono">${lang === 'de' ? 'privates Projekt' : 'private project'}</span>`;
  dlg.innerHTML = `<form method="dialog"><button class="dclose" aria-label="close" value="x">✕</button></form>
    ${shot}
    <div class="dbody">
      <h3>${p.emoji ? p.emoji + ' ' : ''}${esc(p.name)}</h3>
      <p>${esc(L(p.long) || L(p.one))}</p>
      <div class="dstack">${(p.stack || []).map(x => `<span>${esc(x)}</span>`).join('')}</div>
      <div class="dacts">${visit}</div>
    </div>`;
  dlg.style.setProperty('--tint', p.tint);
  dlg.showModal();
}

function renderQuotes() {
  const sec = $('#words'), g = $('#quotes');
  const list = TESTIMONIALS || [];
  sec.hidden = list.length === 0;
  if (!list.length) return;
  g.innerHTML = '';
  list.forEach(q => g.append(el('figure', 'quote',
    `<blockquote>“${esc(L(q.quote))}”</blockquote>
     <figcaption><strong>${esc(q.name)}</strong>${q.role ? ` · ${esc(L(q.role))}` : ''}</figcaption>`)));
}

function renderCards() {
  const c = $('#cards'); c.innerHTML = '';
  const mk = p => {
    const top = p.shot
      ? `<div class="top"><img src="${esc(p.shot)}" alt="${esc(p.name)} screenshot" loading="lazy"></div>`
      : `<div class="top ph" style="background:${esc(p.tint)}22"><span>${p.emoji}</span></div>`;
    const visit = p.link
      ? `<span class="visit mono">${lang === 'de' ? 'ansehen' : 'visit'} ↗</span>`
      : `<span class="visit mono off">${lang === 'de' ? 'privat' : 'private'}</span>`;
    const inner =
      `${top}<div class="b"><h3>${p.emoji ? `<span>${p.emoji}</span>` : ''}${esc(p.name)}${visit}</h3>
       <p>${esc(L(p.one))}</p>
       <div class="tg">${p.tags.map(x => `<span>${esc(x)}</span>`).join('')}</div>
       <span class="more-link mono">${lang === 'de' ? 'Details' : 'details'} →</span></div>`;
    const card = el('div', 'card', inner);
    card.tabIndex = 0; card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${p.name} — ${lang === 'de' ? 'Details öffnen' : 'open details'}`);
    const open = () => openDetail(p);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    // visit chip links out directly without triggering the dialog
    if (p.link) card.querySelector('.visit').outerHTML = `<a class="visit mono" href="${esc(p.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${lang === 'de' ? 'ansehen' : 'visit'} ↗</a>`;
    card.style.setProperty('--tint', p.tint);
    card.style.transform = `rotate(${p.tilt}deg)`;
    return card;
  };
  PROJECTS.slice(0, 6).forEach(p => c.append(mk(p)));       // 6 headliners
  if (PROJECTS.length > 6) {
    const d = el('details', 'more');
    d.innerHTML = `<summary>${t('more.work').replace('{n}', PROJECTS.length - 6)}</summary>`;
    const grid = el('div', 'cards');
    PROJECTS.slice(6).forEach(p => grid.append(mk(p)));
    d.append(grid); c.append(d);
  }
}

/* ── builder ── */
const state = { base: 'webapp', addons: new Set(['auth']), support: 'basic', rush: false };

function buildOptions() {
  const bR = $('#baseRow'); bR.innerHTML = '';
  Object.entries(P.BASES).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="radio" name="base" value="${k}"${k === state.base ? ' checked' : ''}>
       <div class="box"><div class="t"><span class="tt">${esc(L(v.label))}</span> <span class="pr">${P.eur(v.price)}</span></div><div class="d">${t('b.days').replace('{n}', v.days)}</div></div>`);
    o.querySelector('input').addEventListener('change', () => { state.base = k; update(); });
    bR.append(o);
  });
  const aR = $('#addonRow'); aR.innerHTML = '';
  Object.entries(P.ADDONS).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="checkbox" value="${k}"${state.addons.has(k) ? ' checked' : ''}>
       <div class="box"><div class="t"><span class="tt">${esc(L(v.label))}</span> <span class="pr">+${P.eur(v.price)}</span></div></div>`);
    o.querySelector('input').addEventListener('change', e => { e.target.checked ? state.addons.add(k) : state.addons.delete(k); update(); });
    aR.append(o);
  });
  const sR = $('#supRow'); sR.innerHTML = '';
  Object.entries(P.SUPPORT).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="radio" name="sup" value="${k}"${k === state.support ? ' checked' : ''}>
       <div class="box"><div class="t">${esc(L(v.label))} ${v.monthly ? `<span class="pr">${P.eur(v.monthly)}/mo</span>` : ''}</div></div>`);
    o.querySelector('input').addEventListener('change', () => { state.support = k; update(); });
    sR.append(o);
  });
  $('#rush').checked = state.rush;
  $('#rush').addEventListener('change', e => { state.rush = e.target.checked; update(); });
}

function update() {
  const q = P.quote({ base: state.base, addons: [...state.addons], support: state.support, rush: state.rush });
  const it = $('#sitems'); it.innerHTML = '';
  it.append(el('div', 'sl', `<span>${esc(L(q.base.label))}</span><span>${P.eur(q.base.price)}</span>`));
  q.addons.forEach(a => it.append(el('div', 'sl dim', `<span>+ ${esc(L(a.label))}</span><span>${P.eur(a.price)}</span>`)));
  if (q.rush) it.append(el('div', 'sl dim', `<span>${t('b.rush')}</span><span></span>`));
  $('#sdisc').innerHTML = q.discount ? `<div class="sl disc"><span>${t('b.ret')}</span><span>\u2212${P.eur(q.discount)}</span></div>` : '';
  $('#stot').textContent = P.eur(q.oneOff);
  const mo = $('#smo');
  if (q.monthly) { mo.style.display = 'block'; mo.textContent = `+ ${P.eur(q.monthly)}${t('b.mo')}`; } else mo.style.display = 'none';
  $('#seta').textContent = t('b.eta').replace('{n}', q.days);
  $('#scta').dataset.summary = `${L(q.base.label)}${q.addons.length ? ' + ' + q.addons.map(a => L(a.label)).join(', ') : ''}${q.rush ? ' (rush)' : ''} — ${P.eur(q.oneOff)}${q.monthly ? ' + ' + P.eur(q.monthly) + '/mo' : ''}`;
}

document.addEventListener('click', e => {
  const cta = e.target.closest('#scta'); if (!cta) return;
  const m = $('#cM');
  const intro = lang === 'de' ? 'Hi Tay — Angebot für' : "Hi Tay — quote for";
  if (m && !m.value.trim()) m.value = `${intro}: ${cta.dataset.summary || ''}\n\n`;
});

function wireForm() {
  const f = $('#cf'), n = $('#fn');
  // show town/availability/phone only when "in person" is picked
  const meetFields = $('#meetFields');
  $$('input[name="meet"]').forEach(r => r.addEventListener('change', () => {
    meetFields.hidden = f.meet.value !== 'irl';
  }));
  f.addEventListener('submit', async e => {
    e.preventDefault(); n.className = 'fn mono';
    if ($('#cH').value) return; // honeypot
    const name = $('#cN').value.trim(), email = $('#cE').value.trim(),
          msg = $('#cM').value.trim(), ref = $('#cR').value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const irl = f.meet.value === 'irl';
    const phone = $('#cP').value.trim();
    const M = lang === 'de'
      ? { n: 'Name fehlt.', e: 'E-Mail sieht komisch aus.', m: 'Erzähl kurz vom Projekt.', r: 'Sag mir, wie du mich gefunden hast.', p: 'Für ein Treffen brauche ich deine Nummer.', ok: 'Danke! Ich melde mich meist am selben Tag.', err: 'Konnte nicht senden — schreib mir per Discord oder Mail.' }
      : { n: 'need a name.', e: 'that email looks off.', m: 'tell me about the project.', r: 'tell me how you found me.', p: 'for a meet-up I need your number.', ok: 'thanks! I usually reply the same day.', err: "couldn't send — ping me on discord or email instead." };
    if (!name) return fail(M.n); if (!ok) return fail(M.e);
    if (!msg) return fail(M.m); if (!ref) return fail(M.r);
    if (irl && !phone) return fail(M.p);
    function fail(t) { n.className = 'fn mono err'; n.textContent = t; }
    const payload = { name, email, message: msg, referral: ref, channel: $('#cCh').value, company: $('#cH').value, meet: f.meet.value,
      city: irl ? $('#cC').value : '', availability: irl ? $('#cA').value.trim() : '', phone: irl ? phone : '' };
    try {
      const r = await fetch('/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('bad status');
      n.className = 'fn mono ok'; n.textContent = M.ok; f.reset(); meetFields.hidden = true;
    } catch (err) { n.className = 'fn mono err'; n.textContent = M.err; }
  });
}

function setLang(x) { if (x === lang) return; lang = x; localStorage.setItem('lang', x); applyStatic(); renderCards(); renderStack(); renderStats(); renderQuotes(); buildOptions(); update(); }

document.addEventListener('DOMContentLoaded', () => {
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  applyStatic(); renderCards(); renderStack(); renderStats(); renderQuotes(); buildOptions(); update(); wireForm();
  $('#impressumLink').addEventListener('click', e => { e.preventDefault(); $('#impressum').showModal(); });
  $('#yr').textContent = new Date().getFullYear();
});
