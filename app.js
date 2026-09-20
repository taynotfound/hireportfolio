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
       <div class="tg">${p.tags.map(x => `<span>${esc(x)}</span>`).join('')}</div></div>`;
    const card = p.link
      ? el('a', 'card', inner)
      : el('div', 'card', inner);
    if (p.link) { card.href = p.link; card.target = '_blank'; card.rel = 'noopener'; }
    card.style.setProperty('--tint', p.tint);
    card.style.transform = `rotate(${p.tilt}deg)`;
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
  f.addEventListener('submit', e => {
    e.preventDefault(); n.className = 'fn mono';
    if ($('#cH').value) return;
    const name = $('#cN').value.trim(), email = $('#cE').value.trim(), msg = $('#cM').value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const M = lang === 'de'
      ? { n: 'Name fehlt.', e: 'E-Mail sieht komisch aus.', m: 'Erzähl kurz vom Projekt.', ok: 'Bereit — verbinde ein Formular-Backend, um es zu senden.' }
      : { n: 'need a name.', e: 'that email looks off.', m: 'tell me about the project.', ok: 'ready — wire a form endpoint to actually deliver it.' };
    if (!name || !ok || !msg) { n.className = 'fn mono err'; n.textContent = !name ? M.n : !ok ? M.e : M.m; return; }
    // ponytail: no backend yet — placeholder success. Point f.action at a real endpoint on deploy.
    n.className = 'fn mono ok'; n.textContent = M.ok; f.reset();
  });
}

function setLang(x) { if (x === lang) return; lang = x; localStorage.setItem('lang', x); applyStatic(); renderCards(); buildOptions(); update(); }

document.addEventListener('DOMContentLoaded', () => {
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  applyStatic(); renderCards(); buildOptions(); update(); wireForm();
  $('#yr').textContent = new Date().getFullYear();
});
