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

// --- Traffic Source (?ref=) Listener ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

    if (ref) {
        // Use sessionStorage so refreshing the page doesn't spam duplicate counts
        if (!sessionStorage.getItem('tracked_ref')) {
            sessionStorage.setItem('tracked_ref', ref);
            
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: ref })
            }).catch(err => console.error('Tracking failed:', err));
        }
    }
});

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
    const svg = await (await fetch('heatmap.svg?v=24')).text();
    contrib = (svg.match(/([\d,]+)\s+GitHub contributions/) || svg.match(/>([\d,]+) contributions/) || [, '—'])[1];
  } catch (e) {}
  try {
    const b = await (await fetch('waka-badge.svg?v=24')).text();
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

function renderProject(p) {
  const wrap = $('#proj');
  const shot = p.shot
    ? `<div class="ptop"><img src="${esc(p.shot)}" alt="${esc(p.name)} screenshot"></div>`
    : `<div class="ptop ph" style="background:${esc(p.tint)}22"><span>${p.emoji}</span></div>`;
  const visit = p.link
    ? `<a class="btn btn-primary" href="${esc(p.link)}" target="_blank" rel="noopener">${lang === 'de' ? 'live ansehen' : 'view live'} ↗</a>`
    : `<span class="dpriv mono">${lang === 'de' ? 'privates Projekt' : 'private project'}</span>`;
  const sl = lang === 'de'
    ? { p: 'das Problem', d: 'was ich gemacht habe', o: 'das Ergebnis' }
    : { p: 'the problem', d: 'what I did', o: 'the outcome' };
  const story = p.story ? `<div class="dstory">
      <div><span>${sl.p}</span><p>${esc(L(p.story.why))}</p></div>
      <div><span>${sl.d}</span><p>${esc(L(p.story.did))}</p></div>
      <div><span>${sl.o}</span><p>${esc(L(p.story.out))}</p></div>
    </div>` : '';
  const back = lang === 'de' ? '← zurück zu den Projekten' : '← back to work';
  wrap.style.setProperty('--tint', p.tint);
  wrap.innerHTML = `<div class="wrap ppage">
    <a class="pback mono" href="#/">${back}</a>
    ${shot}
    <h1>${p.emoji ? p.emoji + ' ' : ''}${esc(p.name)}</h1>
    <p class="plead">${esc(L(p.long) || L(p.one))}</p>
    ${story}
    <div class="dstack">${(p.stack || []).map(x => `<span>${esc(x)}</span>`).join('')}</div>
    <div class="dacts">${visit}</div>
  </div>`;
  document.title = `${p.name} · Tay März`;
}

// hash router: #/p/<slug> project page, #/about, #/security, else home
const SUBPAGES = ['page-about', 'page-security'];
function hideAll() {
  $('#home').hidden = true; $('#proj').hidden = true;
  SUBPAGES.forEach(id => { const e = document.getElementById(id); if (e) e.hidden = true; });
}
function relocateSubpages() {
  const mk = (host, backKey, titleKey, ids) => {
    const h = document.getElementById(host); if (!h || h.dataset.built) return;
    const back = el('a', 'pback mono'); back.href = '#/'; back.dataset.i = 'sub.back'; back.textContent = t('sub.back');
    const wrap = el('div', 'wrap subwrap');
    wrap.append(back);
    ids.forEach(id => { const s = document.getElementById(id); if (s) wrap.append(s); });
    h.append(wrap); h.dataset.built = '1';
  };
  mk('page-about', 'sub.back', null, ['path', 'stats', 'stack']);
  mk('page-security', 'sub.back', null, ['sec']);
}
function route() {
  const m = location.hash.match(/^#\/p\/([\w-]+)/);
  const p = m && PROJECTS.find(x => x.slug === m[1]);
  hideAll();
  if (p) {
    renderProject(p); $('#proj').hidden = false; window.scrollTo(0, 0);
  } else if (location.hash === '#/about') {
    $('#page-about').hidden = false; document.title = t('nav.about') + ' · Tay März'; window.scrollTo(0, 0);
  } else if (location.hash === '#/security') {
    $('#page-security').hidden = false; document.title = t('nav.security') + ' · Tay März'; window.scrollTo(0, 0);
  } else {
    $('#home').hidden = false;
    document.title = 'Tay März · dev for hire';
    if (location.hash && location.hash.length > 1 && !location.hash.startsWith('#/')) {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView();
    }
  }
}


function renderQuotes() {
  const sec = $('#words'), g = $('#quotes');
  const list = TESTIMONIALS || [];
  sec.hidden = list.length === 0;
  if (!list.length) return;
  g.innerHTML = '';
  list.forEach(q => {
    const who = q.link
      ? `<a href="${esc(q.link)}" target="_blank" rel="noopener"><strong>${esc(q.name)}</strong></a>`
      : `<strong>${esc(q.name)}</strong>`;
    g.append(el('figure', 'quote',
      `<blockquote>“${esc(L(q.quote))}”</blockquote>
       <figcaption>${who}${q.role ? ` · ${esc(L(q.role))}` : ''}</figcaption>`));
  });
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
    const badge = p.story
      ? `<span class="cbadge mono"><i class="ic fa-solid" aria-hidden="true">&#xf0eb;</i>${lang === 'de' ? 'Case Study' : 'case study'}</span>`
      : '';
    const price = p.price
      ? `<span class="cprice mono">${lang === 'de' ? 'ab ' : 'from '}${esc(p.price)}</span>` : '';
    const inner =
      `${top}${badge}${price}<div class="b"><h3>${p.emoji ? `<span>${p.emoji}</span>` : ''}${esc(p.name)}${visit}</h3>
       <p>${esc(L(p.one))}</p>
       <div class="tg">${p.tags.map(x => `<span>${esc(x)}</span>`).join('')}</div>
       <span class="more-link mono">${lang === 'de' ? 'Details' : 'details'} →</span></div>`;
    const card = el('a', 'card', inner);
    card.href = `#/p/${p.slug}`;
    card.setAttribute('aria-label', `${p.name}, ${lang === 'de' ? 'Details öffnen' : 'open details'}`);
    // visit chip links out directly without navigating to the project page
    if (p.link) card.querySelector('.visit').outerHTML = `<a class="visit mono" href="${esc(p.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${lang === 'de' ? 'ansehen' : 'visit'} ↗</a>`;
    card.style.setProperty('--tint', p.tint);
    card.style.transform = `rotate(${p.tilt}deg)`;
    return card;
  };
  // case studies (projects with a story) float to the front, order otherwise preserved
  const ordered = PROJECTS.map((p, i) => [p, i])
    .sort((a, b) => (b[0].story ? 1 : 0) - (a[0].story ? 1 : 0) || a[1] - b[1])
    .map(x => x[0]);
  ordered.slice(0, 6).forEach(p => c.append(mk(p)));       // 6 headliners, case studies first
  if (ordered.length > 6) {
    const d = el('details', 'more');
    d.innerHTML = `<summary>${t('more.work').replace('{n}', ordered.length - 6)}</summary>`;
    const grid = el('div', 'cards');
    ordered.slice(6).forEach(p => grid.append(mk(p)));
    d.append(grid); c.append(d);
  }
}

/* ── builder ── */
const state = { base: 'webapp', addons: new Set(['auth']), support: 'basic', rush: false };

// keep state valid even if admin removed the base/support/addon it defaulted to
function clampState() {
  if (!P.BASES[state.base]) state.base = Object.keys(P.BASES)[0];
  if (!P.SUPPORT[state.support]) state.support = Object.keys(P.SUPPORT)[0];
  for (const a of [...state.addons]) if (!P.ADDONS[a]) state.addons.delete(a);
}

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
  $('#scta').dataset.summary = `${L(q.base.label)}${q.addons.length ? ' + ' + q.addons.map(a => L(a.label)).join(', ') : ''}${q.rush ? ' (rush)' : ''}, ${P.eur(q.oneOff)}${q.monthly ? ' + ' + P.eur(q.monthly) + '/mo' : ''}`;
}

document.addEventListener('click', e => {
  const cta = e.target.closest('#scta'); if (!cta) return;
  const m = $('#cM');
  const intro = lang === 'de' ? 'Hi Tay, Angebot für' : "Hi Tay, quote for";
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
      ? { n: 'Name fehlt.', e: 'E-Mail sieht komisch aus.', m: 'Erzähl kurz vom Projekt.', r: 'Sag mir, wie du mich gefunden hast.', p: 'Für ein Treffen brauche ich deine Nummer.', ok: 'Danke! Ich melde mich meist am selben Tag.', err: 'Konnte nicht senden, schreib mir per Discord oder Mail.' }
      : { n: 'need a name.', e: 'that email looks off.', m: 'tell me about the project.', r: 'tell me how you found me.', p: 'for a meet-up I need your number.', ok: 'thanks! I usually reply the same day.', err: "couldn't send, ping me on discord or email instead." };
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

function setLang(x) { if (x === lang) return; lang = x; localStorage.setItem('lang', x); applyStatic(); renderCards(); renderStack(); renderStats(); renderQuotes(); buildOptions(); update(); applyCms(); route(); }

// Merge admin overrides (text + pricing) over the built-in defaults, in place.
async function applyOverrides() {
  let ov; try { ov = await (await fetch('/api/public-overrides')).json(); } catch { return; }
  if (!ov || typeof ov !== 'object') return;
  if (ov.text) for (const L of ['en', 'de']) if (ov.text[L]) for (const k in ov.text[L]) {
    const v = ov.text[L][k]; if (typeof v === 'string' && v.trim() && T[L] && k in T[L]) T[L][k] = v;
  }
  if (ov.pricing) {
    for (const grp of ['BASES', 'ADDONS', 'SUPPORT']) if (ov.pricing[grp]) for (const key in ov.pricing[grp]) {
      if (!P[grp][key]) continue;                       // only known keys, never inject new
      const src = ov.pricing[grp][key];
      for (const f of ['price', 'days', 'monthly']) if (typeof src[f] === 'number' && src[f] >= 0) P[grp][key][f] = src[f];
    }
    if (ov.pricing.RATES) for (const r of ['rush', 'retainer']) {
      const v = ov.pricing.RATES[r]; if (typeof v === 'number' && v > 0) P.RATES[r] = v;
    }
  }
  // projects: merge editable text fields by slug (never add/remove projects here)
  if (ov.projects) for (const p of PROJECTS) {
    const o = ov.projects[p.slug]; if (!o) continue;
    for (const f of ['name', 'link', 'year']) if (o[f] != null && o[f] !== '') p[f] = o[f];
    for (const f of ['one', 'long']) if (o[f]) for (const L of ['en', 'de']) if (o[f][L] != null && o[f][L] !== '') p[f][L] = o[f][L];
    if (o.story && p.story) for (const s of ['why', 'did', 'out']) if (o.story[s]) for (const L of ['en', 'de'])
      if (o.story[s][L] != null && o.story[s][L] !== '') p.story[s][L] = o.story[s][L];
  }
  // testimonials: full replace (mutate in place, TESTIMONIALS is a const binding)
  if (Array.isArray(ov.testimonials)) {
    const clean = ov.testimonials.filter(t => t && t.quote && (t.quote.en || t.quote.de) && t.name);
    TESTIMONIALS.splice(0, TESTIMONIALS.length, ...clean);
  }
  // ── CMS: full project list (add / remove / reorder / price) replaces PROJECTS in place ──
  if (Array.isArray(ov.projectsFull) && ov.projectsFull.length) {
    const norm = ov.projectsFull.map(p => normProject(p)).filter(Boolean);
    if (norm.length) PROJECTS.splice(0, PROJECTS.length, ...norm);
  }
  // ── CMS: full pricing replace (add / remove base types, add-ons, support plans) ──
  if (ov.pricingFull && typeof ov.pricingFull === 'object') {
    for (const grp of ['BASES', 'ADDONS', 'SUPPORT']) {
      const g = ov.pricingFull[grp];
      if (g && typeof g === 'object' && !Array.isArray(g)) { for (const k in P[grp]) delete P[grp][k]; Object.assign(P[grp], g); }
    }
    if (ov.pricingFull.RATES) for (const r of ['rush', 'retainer']) {
      const v = ov.pricingFull.RATES[r]; if (typeof v === 'number' && v > 0) P.RATES[r] = v;
    }
  }
  // sections/timeline/blocks are applied after the DOM renders — stash for later
  window.__CMS = { sections: ov.sections, timeline: ov.timeline, blocks: ov.blocks };
}

// give an override project object all fields the renderer expects, so partial adds never crash
function normProject(p) {
  if (!p || !p.slug || !p.name) return null;
  const bi = (o, d) => (o && typeof o === 'object') ? { en: o.en || o.de || d, de: o.de || o.en || d } : { en: o || d, de: o || d };
  return {
    name: String(p.name), slug: String(p.slug).replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'p',
    emoji: p.emoji || '📦', tilt: typeof p.tilt === 'number' ? p.tilt : 0,
    year: p.year || new Date().getFullYear(), link: p.link || '',
    tint: /^#[0-9a-f]{3,8}$/i.test(p.tint || '') ? p.tint : '#8a7dff',
    price: (typeof p.price === 'string' || typeof p.price === 'number') ? String(p.price) : '',
    shot: p.shot || '', feat: p.feat,
    one: bi(p.one, ''), long: bi(p.long, ''),
    stack: Array.isArray(p.stack) ? p.stack.slice(0, 12).map(String) : [],
    tags: Array.isArray(p.tags) ? p.tags.slice(0, 8).map(String) : [],
    story: p.story && (p.story.why || p.story.did || p.story.out)
      ? { why: bi(p.story.why, ''), did: bi(p.story.did, ''), out: bi(p.story.out, '') } : null,
  };
}

// apply section enable/reorder, custom timeline, and custom blocks to the live DOM
function applyCms() {
  const cms = window.__CMS || {};
  const home = $('#home'); if (!home) return;
  // timeline rebuild
  if (Array.isArray(cms.timeline) && cms.timeline.length) {
    const ol = $('#path .timeline');
    if (ol) ol.innerHTML = cms.timeline.map(r =>
      `<li${r.now ? ' class="now"' : ''}><span class="ty mono">${esc(r.year || '')}</span><p>${esc(L({ en: r.en, de: r.de }))}</p></li>`).join('');
  }
  // custom blocks: append to a container after existing sections
  if (Array.isArray(cms.blocks) && cms.blocks.length) {
    let host = $('#cms-blocks');
    if (!host) { host = el('div'); host.id = 'cms-blocks'; home.append(host); }
    host.innerHTML = '';
    cms.blocks.filter(b => b && b.on !== false).forEach(b => host.append(renderBlock(b)));
  }
  // section enable + reorder (applied last so it also orders any cms-blocks host)
  if (Array.isArray(cms.sections) && cms.sections.length) {
    const secs = [...cms.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    secs.forEach(s => {
      const node = document.getElementById(s.id);
      if (!node) return;
      node.hidden = s.on === false;
      home.append(node); // re-appending in sorted order reorders them
    });
  }
}

function renderBlock(b) {
  const w = el('section', 'cms-block wrap');
  w.style.cssText = 'padding:3rem 0;max-width:820px;margin:0 auto';
  const title = L({ en: b.title_en, de: b.title_de });
  const bodyT = L({ en: b.body_en, de: b.body_de });
  let html = '';
  if (title) html += `<h2 class="sh">${esc(title)}</h2>`;
  if (b.image) html += `<img src="${esc(b.image)}" alt="${esc(title || '')}" style="max-width:100%;border-radius:14px;margin:1rem 0">`;
  if (bodyT) html += `<p style="color:var(--muted);line-height:1.6;white-space:pre-wrap">${esc(bodyT)}</p>`;
  w.innerHTML = html;
  return w;
}

document.addEventListener('DOMContentLoaded', async () => {
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  await applyOverrides();
  clampState();
  applyStatic(); renderCards(); renderStack(); renderStats(); renderQuotes(); buildOptions();
  try { update(); } catch (e) { console.error('builder update failed', e); }
  wireForm();
  relocateSubpages();
  applyCms();
  $('#impressumLink').addEventListener('click', e => { e.preventDefault(); $('#impressum').showModal(); });
  // Impressum dialog: click backdrop to close
  $('#impressum').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#yr').textContent = new Date().getFullYear();
  window.addEventListener('hashchange', route);
  route();
});
