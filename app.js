'use strict';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = window.Pricing;
const { T, SERVICES, PROJECTS, STEPS, CT_LIST } = window.I18N;

let lang = (localStorage.getItem('lang') || (navigator.language || 'en').slice(0, 2)) === 'de' ? 'de' : 'en';
const t = k => (T[lang][k] ?? T.en[k] ?? k);
const L = o => (o && typeof o === 'object' ? (o[lang] ?? o.en) : o);   // pick localized field

/* ── static string swap (data-i = text, data-i-html = innerHTML) ── */
function applyStatic() {
  document.documentElement.lang = lang;
  $$('[data-i]').forEach(e => { e.textContent = t(e.dataset.i); });
  $$('[data-i-html]').forEach(e => { e.innerHTML = t(e.dataset.iHtml); });
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}

/* ── content sections ── */
function renderContent() {
  const sg = $('#servicesGrid'); sg.innerHTML = '';
  SERVICES.forEach((s, i) => sg.append(el('div', 'svc',
    `<div class="ix mono">${String(i + 1).padStart(2, '0')}</div><div><h3>${esc(L(s.h))}</h3><p>${esc(L(s.p))}</p></div>`)));

  const pg = $('#projGrid'); pg.innerHTML = '';
  PROJECTS.forEach(pr => {
    const figure = pr.shot
      ? `<div class="proj-figure"><img src="${esc(pr.shot)}" alt="${esc(pr.name)} — screenshot" loading="lazy" width="960"></div>`
      : `<div class="proj-figure mock"><div class="bar"><i></i><i></i><i></i><span class="u">${esc(pr.mock.u)}</span></div>
           <div class="body"><div class="big">${esc(pr.mock.big)}</div><div class="row m"></div><div class="row s"></div><div class="lock">${esc(L(pr.mock.lock))}</div></div></div>`;
    pg.append(el('div', 'proj',
      `${figure}
       <div><div class="proj-meta"><div class="name">${esc(pr.name)}</div><div class="kind mono">${esc(L(pr.kind))}</div></div>
       <div class="proj-body"><p>${esc(L(pr.p))}</p><div class="stack mono">${pr.stack.map(x => `<span>${esc(x)}</span>`).join('')}</div></div></div>`));
  });

  const st = $('#stepsGrid'); st.innerHTML = '';
  STEPS.forEach((s, i) => st.append(el('div', 'step',
    `<div class="n mono">0${i + 1}</div><div><h3>${esc(L(s.h))}</h3><p>${esc(L(s.p))}</p></div>`)));

  const cl = $('#ctList'); cl.innerHTML = '';
  CT_LIST[lang].forEach(x => cl.append(el('li', null, esc(x))));

  $('#year').textContent = new Date().getFullYear();
}

/* ── package builder ── */
const state = { base: 'webapp', addons: new Set(['auth', 'design']), support: 'basic', rush: false };

function buildOptions() {
  const baseRow = $('#baseRow'); baseRow.innerHTML = '';
  Object.entries(P.BASES).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="radio" name="base" value="${k}"${k === state.base ? ' checked' : ''}>
       <div class="box"><div class="t">${esc(L(v.label))} <span class="pr">${P.eur(v.price)}</span></div><div class="d">${t('b.days').replace('{n}', v.days)}</div></div>`);
    o.querySelector('input').addEventListener('change', () => { state.base = k; update(); });
    baseRow.append(o);
  });

  const addonRow = $('#addonRow'); addonRow.innerHTML = '';
  Object.entries(P.ADDONS).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="checkbox" value="${k}"${state.addons.has(k) ? ' checked' : ''}>
       <div class="box"><div class="t">${esc(L(v.label))} <span class="pr">+${P.eur(v.price)}</span></div></div>`);
    o.querySelector('input').addEventListener('change', e => { e.target.checked ? state.addons.add(k) : state.addons.delete(k); update(); });
    addonRow.append(o);
  });

  const supRow = $('#supportRow'); supRow.innerHTML = '';
  Object.entries(P.SUPPORT).forEach(([k, v]) => {
    const o = el('label', 'opt',
      `<input type="radio" name="support" value="${k}"${k === state.support ? ' checked' : ''}>
       <div class="box"><div class="t">${esc(L(v.label))} ${v.monthly ? `<span class="pr">${P.eur(v.monthly)}/mo</span>` : ''}</div></div>`);
    o.querySelector('input').addEventListener('change', () => { state.support = k; update(); });
    supRow.append(o);
  });

  $('#rushToggle').checked = state.rush;
  $('#rushToggle').addEventListener('change', e => { state.rush = e.target.checked; update(); });
}

function update() {
  const q = P.quote({ base: state.base, addons: [...state.addons], support: state.support, rush: state.rush });

  const items = $('#sumItems'); items.innerHTML = '';
  items.append(el('div', 'sum-line', `<span>${esc(L(q.base.label))}</span><span>${P.eur(q.base.price)}</span>`));
  q.addons.forEach(a => items.append(el('div', 'sum-line dim', `<span>+ ${esc(L(a.label))}</span><span>${P.eur(a.price)}</span>`)));
  if (q.rush) items.append(el('div', 'sum-line dim', `<span>${t('b.rushline')}</span><span></span>`));

  $('#sumDiscount').innerHTML = q.discount
    ? `<div class="sum-line disc"><span>${t('b.retainer')}</span><span>\u2212${P.eur(q.discount)}</span></div>` : '';

  $('#sumTotal').textContent = P.eur(q.oneOff);
  $('.sum-total .sub').textContent = t('b.buildfrom');

  const mo = $('#sumMonthly');
  if (q.monthly) { mo.style.display = 'block'; mo.textContent = `+ ${P.eur(q.monthly)}${t('b.mo')}`; }
  else mo.style.display = 'none';

  $('#sumEta').textContent = t('b.eta').replace('{n}', q.days);

  $('#sumCta').dataset.summary = `${L(q.base.label)}${q.addons.length ? ' + ' + q.addons.map(a => L(a.label)).join(', ') : ''}${q.rush ? ' (rush)' : ''} — ${P.eur(q.oneOff)}${q.monthly ? ' + ' + P.eur(q.monthly) + '/mo' : ''}`;
}

/* prefill contact message from the builder */
document.addEventListener('click', e => {
  const cta = e.target.closest('#sumCta');
  if (!cta) return;
  const msg = $('#cMsg');
  const intro = lang === 'de' ? 'Hi Tay — ich h\u00e4tte gern ein Angebot f\u00fcr' : "Hi Tay — I'd like a quote for";
  const more = lang === 'de' ? '\n\nEtwas mehr zum Projekt:\n' : '\n\nA bit more about the project:\n';
  if (msg && !msg.value.trim()) msg.value = `${intro}: ${cta.dataset.summary || ''}.${more}`;
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
    const M = lang === 'de'
      ? { name: 'Ich brauche einen Namen f\u00fcr die Antwort.', email: 'Diese E-Mail sieht komisch aus.', msg: 'Erz\u00e4hl mir kurz vom Projekt.', ok: 'Bereit zum Senden — verbinde ein Formular-Backend, um es zuzustellen.' }
      : { name: 'need a name to reply to.', email: 'that email looks off.', msg: 'tell me a bit about the project.', ok: 'ready to send — wire up a form endpoint to deliver it.' };
    if (!name || !emailOk || !msg) {
      note.className = 'form-note mono err';
      note.textContent = !name ? M.name : !emailOk ? M.email : M.msg;
      return;
    }
    // ponytail: no backend wired yet — placeholder success. Point form.action at a real
    // endpoint (mailto / Formspree / own handler) when deploying.
    note.className = 'form-note mono ok';
    note.textContent = M.ok;
    form.reset();
  });
}

/* ── language toggle ── */
function setLang(next) {
  if (next === lang) return;
  lang = next;
  localStorage.setItem('lang', lang);
  applyStatic();
  renderContent();
  buildOptions();
  update();
}

document.addEventListener('DOMContentLoaded', () => {
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  applyStatic();
  renderContent();
  buildOptions();
  update();
  wireForm();
});
