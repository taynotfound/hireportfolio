'use strict';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = window.Pricing;
const { T, PROJECTS, TESTIMONIALS, STACK } = window.I18N;
const CMS = { sections: null, timeline: null, blocks: null };

const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
                set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = (store.get('lang') || (navigator.language || 'en').slice(0, 2)) === 'de' ? 'de' : 'en';
const t = (k, vars) => { let s = T[lang][k] ?? T.en[k] ?? k; for (const v in vars || {}) s = s.replace('{' + v + '}', vars[v]); return s; };
const L = o => (o && typeof o === 'object' ? (o[lang] || o.en || '') : o);

// ?ref=campaign → count once per session (no cookies, no IPs stored server-side)
function trackRef() {
  const ref = new URLSearchParams(location.search).get('ref');
  if (!ref) return;
  try { if (sessionStorage.getItem('ref_sent')) return; sessionStorage.setItem('ref_sent', '1'); } catch {}
  fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: ref }) }).catch(() => {});
}

function applyStatic() {
  document.documentElement.lang = lang;
  $$('[data-i]').forEach(e => { e.textContent = t(e.dataset.i); });
  $$('[data-i-html]').forEach(e => { e.innerHTML = t(e.dataset.iHtml); });
  $$('[data-i-ph]').forEach(e => { e.placeholder = t(e.dataset.iPh); });
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}

/* ── home: proof strip, cards, quotes ── */
function renderProof() {
  const items = [[new Date().getFullYear() - 2018 + '+', t('hero.p1')], [PROJECTS.length, t('hero.p2')], ['<24h', t('hero.p3')]];
  $('#proof').innerHTML = items.map(([n, l]) => `<div><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('');
}

function shotHtml(p, cls, lazy) {
  return p.shot
    ? `<div class="${cls}"><img src="${esc(p.shot)}" alt="${esc(p.name)} screenshot"${lazy ? ' loading="lazy"' : ''}></div>`
    : `<div class="${cls} ph" style="background:${esc(p.tint)}22"><span>${p.emoji || '📦'}</span></div>`;
}

function card(p) {
  const c = el('article', 'card');
  c.style.setProperty('--tint', p.tint);
  c.style.transform = `rotate(${Number(p.tilt) || 0}deg)`;
  const visit = p.link
    ? `<a class="visit" href="${esc(p.link)}" target="_blank" rel="noopener">${t('work.visit')}</a>`
    : `<span class="visit">${t('work.private')}</span>`;
  c.innerHTML = `${shotHtml(p, 'top', true)}
    ${p.story ? `<span class="chip-tr"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i>${t('work.case')}</span>` : ''}
    ${p.price ? `<span class="chip-tl">${esc(t('work.from', { p: p.price }))}</span>` : ''}
    <div class="b">
      <h3>${p.emoji ? `<span aria-hidden="true">${p.emoji}</span>` : ''}${esc(p.name)}${visit}</h3>
      <p>${esc(L(p.one))}</p>
      <div class="foot"><div class="tg">${(p.tags || []).map(x => `<span>${esc(x)}</span>`).join('')}</div>
        <span class="more-link">${t('work.details')}</span></div>
    </div>
    <a class="stretch" href="#/p/${esc(p.slug)}" aria-label="${esc(p.name)}, ${t('work.open')}"></a>`;
  return c;
}

function renderCards() {
  const c = $('#cards'); c.innerHTML = '';
  const SHOWN = 6;
  PROJECTS.slice(0, SHOWN).forEach(p => c.append(card(p)));
  if (PROJECTS.length > SHOWN) {
    const d = el('details', 'more');
    d.innerHTML = `<summary>${t('more.work', { n: PROJECTS.length - SHOWN })}</summary>`;
    const grid = el('div', 'cards');
    PROJECTS.slice(SHOWN).forEach(p => grid.append(card(p)));
    d.append(grid); c.append(d);
  }
}

function renderQuotes() {
  $('#words').dataset.empty = TESTIMONIALS.length ? '' : '1';
  $('#quotes').innerHTML = TESTIMONIALS.map(q => {
    const name = `<strong>${esc(q.name)}</strong>`;
    return `<figure class="quote"><blockquote>${esc(L(q.quote))}</blockquote>
      <figcaption><span class="av" aria-hidden="true">${esc(String(q.name).trim()[0] || '?')}</span>
        <span>${q.link ? `<a href="${esc(q.link)}" target="_blank" rel="noopener">${name}</a>` : name}${esc(L(q.role))}</span></figcaption></figure>`;
  }).join('');
}

/* ── about / security subpages ── */
function renderStack() {
  const ICO = ['fa-code', 'fa-palette', 'fa-server', 'fa-mobile-screen', 'fa-gears', 'fa-shield-halved'];
  $('#stackgrid').innerHTML = STACK.map((s, i) => `<div class="stackcard"><h3><i class="ic fa-solid ${ICO[i] || 'fa-cube'}" aria-hidden="true"></i>${esc(t(s.k))}</h3>
    <div class="chips">${s.items.map(x => `<span>${esc(x)}</span>`).join('')}</div></div>`).join('');
}

function renderTimeline() {
  const rows = Array.isArray(CMS.timeline) && CMS.timeline.length ? CMS.timeline
    : ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map(r => ({ year: t('path.' + r + 'y'), en: T.en['path.' + r], de: T.de['path.' + r], now: r === 'r6' }));
  $('#timeline').innerHTML = rows.map(r =>
    `<li${r.now ? ' class="now"' : ''}><span class="ty mono">${esc(r.year)}</span><p>${esc(L({ en: r.en, de: r.de }))}</p></li>`).join('');
}

// numbers: read same-origin SVGs (zero external requests) + derive the rest
let statsCache = null;
async function renderStats() {
  if (!statsCache) {
    statsCache = { contrib: '—', hours: '—' };
    try { const s = await (await fetch('heatmap.svg')).text(); statsCache.contrib = (s.match(/([\d,]+)\s+(?:GitHub )?contributions/) || [, '—'])[1]; } catch {}
    try { const b = await (await fetch('waka-badge.svg')).text(); statsCache.hours = (b.match(/([\d,]+)\s*hrs/) || [, '—'])[1]; } catch {}
  }
  const cards = [
    ['fa-code-commit', statsCache.contrib, 'stats.contrib', 'stats.contribl'],
    ['fa-clock', statsCache.hours, 'stats.hours', 'stats.hoursl'],
    ['fa-calendar', String(new Date().getFullYear() - 2019), 'stats.years', 'stats.yearsl'],
    ['fa-rocket', String(PROJECTS.length), 'stats.projects', 'stats.projectsl'],
  ];
  $('#statgrid').innerHTML = cards.map(([ic, n, lab, sub]) => `<div class="statcard"><i class="ic fa-solid ${ic}" aria-hidden="true"></i>
    <div class="num">${esc(n)}</div><div class="lab">${esc(t(lab))}</div><div class="sub">${esc(t(sub))}</div></div>`).join('');
}

function buildSubpages() {
  const mk = (host, ids) => {
    const h = document.getElementById(host);
    const wrap = el('div', 'wrap');
    wrap.innerHTML = `<a class="pback" href="#/" data-i="sub.back">${t('sub.back')}</a>`;
    ids.forEach(id => wrap.append(document.getElementById(id)));
    h.append(wrap);
  };
  mk('page-about', ['path', 'stats', 'stack']);
  mk('page-security', ['sec']);
}

/* ── project page ── */
function renderProject(p) {
  const i = PROJECTS.indexOf(p), prev = PROJECTS[i - 1], next = PROJECTS[i + 1];
  const host = $('#proj');
  host.style.setProperty('--tint', p.tint);
  const story = p.story ? `<div class="dstory">${['why', 'did', 'out'].map(k =>
    `<div><span>${t('work.' + k)}</span><p>${esc(L(p.story[k]))}</p></div>`).join('')}</div>` : '';
  host.innerHTML = `<div class="wrap ppage">
    <a class="pback" href="#work">${t('work.back')}</a>
    ${shotHtml(p, 'ptop', false)}
    <div class="pmeta"><span>${esc(p.year)}</span>${p.story ? `<span class="cs">${t('work.case')}</span>` : ''}${(p.tags || []).map(x => `<span>${esc(x)}</span>`).join('')}</div>
    <h1>${p.emoji ? p.emoji + ' ' : ''}${esc(p.name)}</h1>
    <p class="plead">${esc(L(p.long) || L(p.one))}</p>
    ${story}
    ${p.stack && p.stack.length ? `<h2>${t('work.stack')}</h2><div class="dstack">${p.stack.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
    <div class="dacts">${p.link
      ? `<a class="btn btn-primary" href="${esc(p.link)}" target="_blank" rel="noopener">${t('work.live')}<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`
      : `<span class="dpriv"><i class="fa-solid fa-lock" aria-hidden="true"></i>${t('work.privateLong')}</span>`}
      <a class="btn btn-ghost" href="#hi">${t('nav.hi')}</a></div>
    <nav class="pnav">
      ${prev ? `<a href="#/p/${esc(prev.slug)}"><small>${t('work.prev')}</small><b>${esc(prev.name)}</b></a>` : ''}
      ${next ? `<a class="next" href="#/p/${esc(next.slug)}"><small>${t('work.next')}</small><b>${esc(next.name)}</b></a>` : ''}
    </nav>
  </div>`;
  document.title = `${p.name} · Tay März`;
}

/* ── hash router: #/p/<slug>, #/about, #/security, else home (+ in-page anchors) ── */
function route() {
  const h = location.hash;
  const m = h.match(/^#\/p\/([\w-]+)/);
  const p = m && PROJECTS.find(x => x.slug === m[1]);
  const page = p ? 'proj' : h === '#/about' ? 'page-about' : h === '#/security' ? 'page-security' : 'home';
  ['home', 'proj', 'page-about', 'page-security'].forEach(id => { document.getElementById(id).hidden = id !== page; });
  $$('.nav-links a').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === h));
  $('#nav').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
  if (p) renderProject(p);
  document.title = p ? document.title : page === 'home' ? 'Tay März · dev for hire'
    : t(page === 'page-about' ? 'nav.about' : 'nav.security') + ' · Tay März';
  const anchor = page === 'home' && h.length > 1 && !h.startsWith('#/') && document.getElementById(h.slice(1));
  if (anchor) anchor.scrollIntoView();
  else window.scrollTo({ top: 0, behavior: 'instant' });
  reveal();
}

/* ── package builder ── */
const state = { base: 'webapp', addons: new Set(['auth']), support: 'basic', rush: false };

// keep state valid even if admin removed the base/support/addon it defaulted to
function clampState() {
  if (!P.BASES[state.base]) state.base = Object.keys(P.BASES)[0];
  if (!P.SUPPORT[state.support]) state.support = Object.keys(P.SUPPORT)[0];
  for (const a of [...state.addons]) if (!P.ADDONS[a]) state.addons.delete(a);
}

function buildOptions() {
  const row = (host, type, name, entries, checked, price, onChange) => {
    host.innerHTML = '';
    entries.forEach(([k, v]) => {
      const o = el('label', 'opt', `<input type="${type}" name="${name}" value="${esc(k)}"${checked(k) ? ' checked' : ''}>
        <div class="box"><div class="t">${esc(L(v.label))}</div><span class="pr">${price(v)}</span></div>`);
      o.querySelector('input').addEventListener('change', e => { onChange(k, e.target.checked); update(); });
      host.append(o);
    });
  };
  row($('#baseRow'), 'radio', 'base', Object.entries(P.BASES), k => k === state.base,
    v => `${P.eur(v.price)} · ${t('b.days', { n: v.days })}`, k => { state.base = k; });
  row($('#addonRow'), 'checkbox', 'addon', Object.entries(P.ADDONS), k => state.addons.has(k),
    v => '+' + P.eur(v.price), (k, on) => { on ? state.addons.add(k) : state.addons.delete(k); });
  row($('#supRow'), 'radio', 'sup', Object.entries(P.SUPPORT), k => k === state.support,
    v => (v.monthly ? P.eur(v.monthly) + t('b.mo') : '€0'), k => { state.support = k; });
  $('#rush').checked = state.rush;
}

function update() {
  const q = P.quote({ base: state.base, addons: [...state.addons], support: state.support, rush: state.rush });
  const line = (cls, a, b) => `<div class="sl${cls}"><span>${a}</span><span>${b}</span></div>`;
  $('#sitems').innerHTML = line('', esc(L(q.base.label)), P.eur(q.base.price))
    + q.addons.map(a => line(' dim', '+ ' + esc(L(a.label)), P.eur(a.price))).join('')
    + (q.rush ? line(' dim', t('b.rush'), '') : '');
  $('#sdisc').innerHTML = q.discount ? line(' disc', t('b.ret'), '−' + P.eur(q.discount)) : '';
  $('#stot').textContent = P.eur(q.oneOff);
  $('#smo').hidden = !q.monthly;
  $('#smo').textContent = `+ ${P.eur(q.monthly)}${t('b.mo')}`;
  $('#seta').textContent = t('b.eta', { n: q.days });
  $('#scta').dataset.summary = `${L(q.base.label)}${q.addons.length ? ' + ' + q.addons.map(a => L(a.label)).join(', ') : ''}`
    + `${q.rush ? ' (rush)' : ''}, ${P.eur(q.oneOff)}${q.monthly ? ' + ' + P.eur(q.monthly) + t('b.mo') : ''}`;
}

/* ── contact form ── */
function wireForm() {
  const f = $('#cf'), n = $('#fn'), meet = $('#meetFields'), btn = f.querySelector('button[type=submit]');
  const say = (cls, msg) => { n.className = 'fn ' + cls; n.textContent = msg; };
  f.addEventListener('change', e => { if (e.target.name === 'meet') meet.hidden = f.meet.value !== 'irl'; });
  f.addEventListener('input', e => e.target.classList.remove('bad'));
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const v = id => $(id).value.trim(), irl = f.meet.value === 'irl';
    const checks = [['#cN', v('#cN'), 'ct.e.name'], ['#cE', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('#cE')), 'ct.e.email'],
      ['#cM', v('#cM'), 'ct.e.msg'], ['#cR', v('#cR'), 'ct.e.ref'], ['#cP', !irl || v('#cP'), 'ct.e.phone']];
    const bad = checks.find(c => !c[1]);
    if (bad) { $(bad[0]).classList.add('bad'); $(bad[0]).focus(); return say('err', t(bad[2])); }
    const payload = { name: v('#cN'), email: v('#cE'), message: v('#cM'), referral: v('#cR'), channel: $('#cCh').value,
      company: $('#cH').value, meet: f.meet.value, city: irl ? $('#cC').value : '', availability: irl ? v('#cA') : '', phone: irl ? v('#cP') : '' };
    btn.disabled = true; say('', '');
    try {
      const r = await fetch('/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(r.status);
      say('ok', t('ct.ok')); f.reset(); meet.hidden = true;
    } catch { say('err', t('ct.err')); }
    btn.disabled = false;
  });
  // "send me this" in the builder pre-fills the message
  $('#scta').addEventListener('click', e => {
    const m = $('#cM');
    if (!m.value.trim()) m.value = `${t('price.intro')}: ${e.currentTarget.dataset.summary || ''}\n\n`;
  });
}

/* ── admin overrides (text, projects, pricing, testimonials, structure) ── */
async function applyOverrides() {
  let ov; try { ov = await (await fetch('/api/public-overrides')).json(); } catch { return; }
  if (!ov || typeof ov !== 'object') return;
  for (const lg of ['en', 'de']) for (const [k, v] of Object.entries((ov.text || {})[lg] || {}))
    if (typeof v === 'string' && v.trim() && k in T[lg]) T[lg][k] = v;
  if (Array.isArray(ov.projectsFull) && ov.projectsFull.length) PROJECTS.splice(0, PROJECTS.length, ...ov.projectsFull.map(normProject));
  if (Array.isArray(ov.testimonials)) TESTIMONIALS.splice(0, TESTIMONIALS.length, ...ov.testimonials.filter(q => q.name && (q.quote.en || q.quote.de)));
  const pf = ov.pricingFull;
  if (pf && Object.keys(pf.BASES || {}).length && Object.keys(pf.SUPPORT || {}).length) {
    for (const g of ['BASES', 'ADDONS', 'SUPPORT']) { for (const k in P[g]) delete P[g][k]; Object.assign(P[g], pf[g] || {}); }
    Object.assign(P.RATES, pf.RATES || {});
  }
  Object.assign(CMS, { sections: ov.sections, timeline: ov.timeline, blocks: ov.blocks });
}

// fill in anything the renderer expects so a half-filled admin entry never breaks the page
function normProject(p) {
  const bi = o => ({ en: (o && (o.en || o.de)) || '', de: (o && (o.de || o.en)) || '' });
  const story = p.story && ['why', 'did', 'out'].some(k => p.story[k] && (p.story[k].en || p.story[k].de));
  return { ...p, emoji: p.emoji || '', tilt: Number(p.tilt) || 0, link: p.link || '', shot: p.shot || '', price: p.price || '',
    tint: p.tint || '#ff5c66', one: bi(p.one), long: bi(p.long), tags: p.tags || [], stack: p.stack || [],
    story: story ? { why: bi(p.story.why), did: bi(p.story.did), out: bi(p.story.out) } : null };
}

function renderBlocks() {
  const host = $('#cms-blocks');
  const list = (CMS.blocks || []).filter(b => b && b.on !== false);
  host.dataset.empty = list.length ? '' : '1';
  host.innerHTML = list.map(b => {
    const title = L({ en: b.title_en, de: b.title_de }), body = L({ en: b.body_en, de: b.body_de });
    return `<section class="cms-block"><div class="wrap">${title ? `<h2 class="sh">${esc(title)}</h2>` : ''}
      ${b.image ? `<img src="${esc(b.image)}" alt="${esc(title)}" loading="lazy">` : ''}${body ? `<p>${esc(body)}</p>` : ''}</div></section>`;
  }).join('');
}

// section enable + reorder; sections the admin never saw (new ones) keep their place at the end
function applySections() {
  if (!Array.isArray(CMS.sections) || !CMS.sections.length) return;
  const home = $('#home');
  [...CMS.sections].sort((a, b) => a.order - b.order).forEach(s => {
    const node = document.getElementById(s.id); if (!node || node.parentElement !== home) return;
    node.dataset.off = s.on === false ? '1' : '';
    home.append(node);
  });
}

function syncVisibility() {
  for (const s of $$('#home > section')) s.hidden = !!(s.dataset.off || s.dataset.empty);
}

/* ── scroll reveal ── */
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' })
  : null;
function reveal() {
  if (!io) return;
  $$('.sh, .lede, .card, .quote, .builder, .steps li, .morecard, #cf, .ct-aside, .fcard, .statcard, .stackcard, .timeline li, .sec-out, .sec-check, .heatmap, .cms-block .wrap')
    .forEach(e => { if (!e.classList.contains('rv')) { e.classList.add('rv'); io.observe(e); } });
}

function renderAll() {
  applyStatic(); renderProof(); renderCards(); renderQuotes(); renderStack(); renderTimeline(); renderStats(); renderBlocks();
  buildOptions(); update(); syncVisibility(); reveal();
}

function setLang(x) {
  if (x === lang) return;
  lang = x; store.set('lang', x);
  renderAll();
  if (location.hash.startsWith('#/')) route();
}

document.addEventListener('DOMContentLoaded', async () => {
  trackRef();
  await applyOverrides();
  clampState();
  const blocks = el('section'); blocks.id = 'cms-blocks'; blocks.className = 'cms-wrap'; blocks.style.cssText = 'padding:0;border:0';
  $('#hi').before(blocks);
  buildSubpages();
  applySections();
  renderAll();
  wireForm();

  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $('#rush').addEventListener('change', e => { state.rush = e.target.checked; update(); });
  $('#menuBtn').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  });
  $('#impressumLink').addEventListener('click', e => { e.preventDefault(); $('#impressum').showModal(); });
  $('#impressum').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#yr').textContent = new Date().getFullYear();
  const nav = $('#nav');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });
  addEventListener('hashchange', route);
  route();
});
