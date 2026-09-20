'use strict';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = window.Pricing;
const { T, PROJECTS } = window.I18N;

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
  window.I18N.STACK.forEach(s => {
    g.append(el('div', 'stackcard',
      `<h3>${esc(t(s.k))}</h3><div class="chips">${s.items.map(x => `<span>${esc(x)}</span>`).join('')}</div>`));
  });
}

// numbers: read same-origin SVGs (zero external requests) + derive the rest
async function renderStats() {
  const g = $('#statgrid'); if (!g) return;
  let contrib = '—', hours = '—';
  try {
    const svg = await (await fetch('heatmap.svg?v=4')).text();
    contrib = (svg.match(/([\d,]+)\s+GitHub contributions/) || svg.match(/>([\d,]+) contributions/) || [, '—'])[1];
  } catch (e) {}
  try {
    const b = await (await fetch('waka-badge.svg?v=4')).text();
    hours = (b.match(/([\d,]+)\s*hrs/) || [, '—'])[1];
  } catch (e) {}
  const years = new Date().getFullYear() - 2019;
  const cards = [
    { num: contrib, lab: t('stats.contrib'), sub: t('stats.contribl') },
    { num: hours, lab: t('stats.hours'), sub: t('stats.hoursl') },
    { num: String(years), lab: t('stats.years'), sub: t('stats.yearsl') },
    { num: String(PROJECTS.length), lab: t('stats.projects'), sub: t('stats.projectsl') },
  ];
  g.innerHTML = '';
  cards.forEach(c => g.append(el('div', 'statcard',
    `<div class="num">${esc(c.num)}</div><div class="lab">${esc(c.lab)}</div><div class="sub">${esc(c.sub)}</div>`)));
}

/* ── project detail overlay ── */
function openDetail(p) {
  let d = $('#detail');
  if (!d) { d = el('div', 'detail'); d.id = 'detail'; document.body.append(d); }
  const shot = p.shot ? `<img class="hero-shot" src="${esc(p.shot)}" alt="${esc(p.name)}">` : '';
  const visit = p.link ? `<a class="btn btn-primary" href="${esc(p.link)}" target="_blank" rel="noopener">${t('work.visit')}</a>` : '';
  d.innerHTML =
    `<button class="dclose" aria-label="close">✕</button>
     <div class="box">${shot}
       <div class="body">
         <button class="dback">${t('work.back')}</button>
         <div class="meta"><span>${p.emoji} ${esc(p.name)}</span><span>${t('work.year')}: ${p.year}</span></div>
         <h2>${esc(p.name)}</h2>
         <p class="lead">${esc(L(p.long || p.one))}</p>
         <div class="meta">${(p.stack || p.tags).map(x => `<span>${esc(x)}</span>`).join('')}</div>
         <div style="margin-top:1.2rem">${visit}</div>
       </div></div>`;
  d.classList.add('open');
  document.body.style.overflow = 'hidden';
  const close = () => { d.classList.remove('open'); document.body.style.overflow = ''; };
  d.querySelector('.dclose').onclick = close;
  d.querySelector('.dback').onclick = close;
  d.onclick = e => { if (e.target === d) close(); };
}

function renderCards() {
  const c = $('#cards'); c.innerHTML = '';
  PROJECTS.forEach(p => {
    const top = p.shot
      ? `<div class="top"><img src="${esc(p.shot)}" alt="${esc(p.name)} screenshot" loading="lazy"></div>`
      : `<div class="top ph" style="background:${esc(p.tint)}22"><span>${p.emoji}</span></div>`;
    const visit = p.link
      ? `<span class="visit mono">${lang === 'de' ? 'ansehen' : 'visit'} ↗</span>`
      : `<span class="visit mono off">${lang === 'de' ? 'privat' : 'private'}</span>`;
    const inner =
      `${top}<div class="b"><h3>${p.emoji ? `<span>${p.emoji}</span>` : ''}${esc(p.name)}${visit}</h3>
       <p>${esc(L(p.one))}</p>
       <div class="tg">${p.tags.map(x => `<span>${esc(x)}</span>`).join('')}
         <button class="detail-btn visit mono" type="button">${t('work.detail')} →</button></div></div>`;
    const card = el('div', 'card', inner);
    card.style.setProperty('--tint', p.tint);
    card.style.transform = `rotate(${p.tilt}deg)`;
    // clicking the card body opens detail; the visit chip still deep-links out
    card.addEventListener('click', e => {
      if (e.target.closest('.visit.mono:not(.detail-btn)') && p.link) { window.open(p.link, '_blank', 'noopener'); return; }
      openDetail(p);
    });
    if (p.link) card.style.cursor = 'pointer';
    c.append(card);
  });
}

/* ── builder ── */
const state = { base: 'webapp', addons: new Set(['auth']), support: 'basic', rush: false };

function buildOptions() {
  const bR = $('#baseRow'); bR.innerHTML = '';
  Object.entries(P.BASES).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="radio" name="base" value="${k}"${k === state.base ? ' checked' : ''}>
       <div class="box"><div class="t">${esc(L(v.label))} <span class="pr">${P.eur(v.price)}</span></div><div class="d">${t('b.days').replace('{n}', v.days)}</div></div>`);
    o.querySelector('input').addEventListener('change', () => { state.base = k; update(); });
    bR.append(o);
  });
  const aR = $('#addonRow'); aR.innerHTML = '';
  Object.entries(P.ADDONS).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="checkbox" value="${k}"${state.addons.has(k) ? ' checked' : ''}>
       <div class="box"><div class="t">${esc(L(v.label))} <span class="pr">+${P.eur(v.price)}</span></div></div>`);
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
    const payload = { name, email, message: msg, referral: ref, meet: f.meet.value,
      city: irl ? $('#cC').value : '', availability: irl ? $('#cA').value.trim() : '', phone: irl ? phone : '' };
    try {
      const r = await fetch('/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('bad status');
      n.className = 'fn mono ok'; n.textContent = M.ok; f.reset(); meetFields.hidden = true;
    } catch (err) { n.className = 'fn mono err'; n.textContent = M.err; }
  });
}

function setLang(x) { if (x === lang) return; lang = x; localStorage.setItem('lang', x); applyStatic(); renderCards(); renderStack(); renderStats(); buildOptions(); update(); }

document.addEventListener('DOMContentLoaded', () => {
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  applyStatic(); renderCards(); renderStack(); renderStats(); buildOptions(); update(); wireForm();
  $('#yr').textContent = new Date().getFullYear();
});
