'use strict';
// märz admin PWA logic: auth gate, lead list, push subscription.
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const api = (u, opt) => fetch(u, Object.assign({ credentials: 'same-origin' }, opt));
let LEADS = [];

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString();
}

// ── auth ──
async function authed() { const r = await api('/api/me'); return r.ok; }
function showGate() { $('#gate').hidden = false; $('#app').hidden = true; $('#tabs').hidden = true; $('#tok').focus(); }
async function login() {
  const token = $('#tok').value.trim(); if (!token) return;
  const r = await api('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
  if (r.ok) { $('#gate').hidden = true; $('#app').hidden = false; start(); }
  else { $('#gerr').textContent = 'Wrong token.'; $('#tok').select(); }
}

// ── leads ──
async function load() {
  const r = await api('/api/contacts'); if (!r.ok) { if (r.status === 401) showGate(); return; }
  LEADS = (await r.json()).items || [];
  stats(); render($('#q').value);
}
function stats() {
  const wk = Date.now() - 7 * 864e5;
  $('#cTotal').textContent = LEADS.length;
  $('#cWeek').textContent = LEADS.filter(l => new Date(l.at) >= wk).length;
  $('#cIrl').textContent = LEADS.filter(l => l.meet === 'irl').length;
  $('#count').textContent = LEADS.length + ' lead' + (LEADS.length === 1 ? '' : 's');
}
function render(q) {
  q = (q || '').toLowerCase().trim();
  const items = q ? LEADS.filter(l => (l.name + ' ' + l.email + ' ' + l.message + ' ' + l.referral).toLowerCase().includes(q)) : LEADS;
  const list = $('#list');
  if (!items.length) {
    list.innerHTML = `<div class="empty"><i class="fa-solid fa-inbox"></i>${LEADS.length ? 'No leads match that search.' : 'No leads yet. They will show up here.'}</div>`;
    return;
  }
  list.innerHTML = items.map(l => {
    const sub = encodeURIComponent('Re: your message to tay.märz');
    const irl = l.meet === 'irl';
    return `<div class="lead">
      <div class="h"><span class="name">${esc(l.name)}</span><span class="when">${ago(l.at)}</span></div>
      <a class="email" href="mailto:${esc(l.email)}?subject=${sub}">${esc(l.email)}</a>
      <div class="msg">${esc(l.message)}</div>
      <div class="meta">
        <span class="tagp"><i class="fa-solid fa-signal"></i>${esc(l.referral)}</span>
        ${l.channel ? `<span class="tagp ch"><i class="fa-solid fa-comment"></i>${esc(l.channel)}</span>` : ''}
        <span class="tagp ${irl ? 'irl' : ''}"><i class="fa-solid fa-${irl ? 'location-dot' : 'video'}"></i>${irl ? 'IRL' + (l.city ? ' · ' + esc(l.city) : '') : 'online'}</span>
        ${l.availability ? `<span class="tagp"><i class="fa-solid fa-clock"></i>${esc(l.availability)}</span>` : ''}
        ${l.phone ? `<span class="tagp"><i class="fa-solid fa-phone"></i>${esc(l.phone)}</span>` : ''}
      </div>
      <div class="acts">
        <a href="mailto:${esc(l.email)}?subject=${sub}"><i class="fa-solid fa-reply"></i> reply</a>
        ${l.phone ? `<a href="tel:${esc(l.phone)}"><i class="fa-solid fa-phone"></i> call</a>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── push ──
const urlB64 = b64 => { const pad = '='.repeat((4 - b64.length % 4) % 4); const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/'); const raw = atob(s); return Uint8Array.from([...raw].map(c => c.charCodeAt(0))); };
async function pushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) { $('#pbanner').hidden = true; return; }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  const on = !!sub && Notification.permission === 'granted';
  $('#pbanner').hidden = on;
  $('#bell').innerHTML = `<i class="fa-solid fa-bell${on ? '' : '-slash'}"></i>`;
}
async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return toast('Push not supported on this browser.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return toast('Notifications blocked.');
  const reg = await navigator.serviceWorker.ready;
  const { key } = await (await api('/api/vapid')).json();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(key) });
  const r = await api('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub) });
  if (r.ok) { toast('Push on ✓ — sending a test…'); await api('/api/test-push', { method: 'POST' }); }
  else toast('Subscribe failed.');
  pushState();
}

// ── content editor (text + pricing) ──
let DEFAULTS = null, OV = { text: {}, pricing: {} };
const deepGet = (o, ...ks) => ks.reduce((x, k) => (x == null ? x : x[k]), o);

async function loadContent() {
  if (DEFAULTS) return;
  const r = await api('/api/admin-content'); if (!r.ok) return;
  const d = await r.json();
  DEFAULTS = d.defaults;
  OV = { text: (d.overrides && d.overrides.text) || {}, pricing: (d.overrides && d.overrides.pricing) || {} };
  renderText(); renderPricing();
}

// group text keys by prefix before first dot
function renderText() {
  const groups = {};
  Object.keys(DEFAULTS.text.en).forEach(k => { const g = k.split('.')[0]; (groups[g] ||= []).push(k); });
  const host = $('#textGroups'); host.innerHTML = '';
  Object.entries(groups).forEach(([g, keys]) => {
    const det = document.createElement('details'); det.className = 'grp'; det.dataset.group = g;
    det.innerHTML = `<summary>${esc(g)} <span class="badge">${keys.length}</span></summary><div class="body"></div>`;
    const body = det.querySelector('.body');
    keys.forEach(k => {
      const fld = document.createElement('div'); fld.className = 'fld'; fld.dataset.key = k;
      const mk = L => {
        const def = DEFAULTS.text[L][k] ?? '';
        const cur = deepGet(OV, 'text', L, k);
        const val = cur != null ? cur : def;
        return `<div><span class="tag">${L}</span><textarea data-lang="${L}" rows="1" placeholder="${esc(def)}">${esc(val)}</textarea></div>`;
      };
      fld.innerHTML = `<label>${esc(k)}</label><div class="langrow">${mk('en')}${mk('de')}</div>`;
      body.append(fld);
    });
    host.append(det);
  });
  host.querySelectorAll('#textGroups textarea').forEach(ta => {
    autoGrow(ta);
    ta.addEventListener('input', () => { autoGrow(ta); markText(ta); });
  });
  textDirty();
}
function markText(ta) {
  const fld = ta.closest('.fld'), k = fld.dataset.key, L = ta.dataset.lang;
  const def = DEFAULTS.text[L][k] ?? '';
  const v = ta.value;
  if (v === def) { (OV.text[L] ||= {}); delete OV.text[L][k]; }
  else { (OV.text[L] ||= {})[k] = v; }
  fld.classList.toggle('changed', v !== def);
  textDirty();
}
function textDirty() {
  const n = ['en', 'de'].reduce((s, L) => s + Object.keys(OV.text[L] || {}).length, 0);
  const st = $('#textSt'); st.textContent = n ? `${n} field${n === 1 ? '' : 's'} changed` : 'no changes';
  st.classList.toggle('dirty', n > 0);
}

function renderPricing() {
  const P = DEFAULTS.pricing;
  const host = $('#priceGroups'); host.innerHTML = '';
  const groupDefs = [
    ['BASES', 'project types', ['price', 'days']],
    ['ADDONS', 'add-ons', ['price']],
    ['SUPPORT', 'support plans', ['monthly']],
  ];
  groupDefs.forEach(([grp, title, fields]) => {
    const det = document.createElement('details'); det.className = 'grp'; det.open = true;
    det.innerHTML = `<summary>${title} <span class="badge">${Object.keys(P[grp]).length}</span></summary><div class="body"></div>`;
    const body = det.querySelector('.body');
    Object.entries(P[grp]).forEach(([key, v]) => {
      const row = document.createElement('div'); row.className = 'prow'; row.dataset.grp = grp; row.dataset.key = key;
      const nums = fields.map(f => {
        const def = v[f], cur = deepGet(OV, 'pricing', grp, key, f);
        const val = cur != null ? cur : def;
        const lbl = f === 'price' ? '€' : f === 'days' ? 'days' : '€/mo';
        return `<div class="num"><label>${lbl}</label><input type="number" min="0" step="1" data-f="${f}" value="${val}"></div>`;
      }).join('');
      row.innerHTML = `<div class="nm">${esc(v.label.en)}<small>${esc(key)}</small></div>${nums}`;
      body.append(row);
    });
    host.append(det);
  });
  // rates
  const rd = document.createElement('details'); rd.className = 'grp'; rd.open = true;
  rd.innerHTML = `<summary>multipliers <span class="badge">2</span></summary><div class="body"></div>`;
  const rbody = rd.querySelector('.body');
  [['rush', 'rush ×', 'Rush delivery surcharge (1.20 = +20%)'], ['retainer', 'retainer ×', 'One-off discount w/ support plan (0.10 = 10% off)']].forEach(([r, lbl, hint]) => {
    const def = DEFAULTS.pricing.RATES[r], cur = deepGet(OV, 'pricing', 'RATES', r);
    const val = cur != null ? cur : def;
    const row = document.createElement('div'); row.className = 'prow'; row.dataset.grp = 'RATES'; row.dataset.key = r;
    row.innerHTML = `<div class="nm">${lbl}<small>${esc(hint)}</small></div><div class="num"><label>factor</label><input type="number" min="0" step="0.01" data-f="_" value="${val}"></div>`;
    rbody.append(row);
  });
  host.append(rd);
  host.querySelectorAll('#priceGroups input').forEach(inp => inp.addEventListener('input', () => markPrice(inp)));
  priceDirty();
}
function markPrice(inp) {
  const row = inp.closest('.prow'), grp = row.dataset.grp, key = row.dataset.key, f = inp.dataset.f;
  const num = Number(inp.value);
  if (grp === 'RATES') {
    const def = DEFAULTS.pricing.RATES[key];
    if (num === def || !(num > 0)) { delete (OV.pricing.RATES || {})[key]; }
    else { (OV.pricing.RATES ||= {})[key] = num; }
  } else {
    const def = DEFAULTS.pricing[grp][key][f];
    (OV.pricing[grp] ||= {}); (OV.pricing[grp][key] ||= {});
    if (num === def || !(num >= 0) || inp.value === '') delete OV.pricing[grp][key][f];
    else OV.pricing[grp][key][f] = num;
    if (!Object.keys(OV.pricing[grp][key]).length) delete OV.pricing[grp][key];
    if (!Object.keys(OV.pricing[grp]).length) delete OV.pricing[grp];
  }
  row.classList.toggle('changed', inp.value !== '' && Number(inp.value) !== (grp === 'RATES' ? DEFAULTS.pricing.RATES[key] : DEFAULTS.pricing[grp][key][f]));
  priceDirty();
}
function priceDirty() {
  let n = 0; const p = OV.pricing || {};
  for (const grp of ['BASES', 'ADDONS', 'SUPPORT']) for (const k in (p[grp] || {})) n += Object.keys(p[grp][k]).length;
  n += Object.keys(p.RATES || {}).length;
  const st = $('#priceSt'); st.textContent = n ? `${n} value${n === 1 ? '' : 's'} changed` : 'no changes';
  st.classList.toggle('dirty', n > 0);
}

async function saveOverrides(which) {
  // prune empty containers before sending
  for (const L of ['en', 'de']) if (OV.text[L] && !Object.keys(OV.text[L]).length) delete OV.text[L];
  const r = await api('/api/overrides', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: OV.text, pricing: OV.pricing }) });
  toast(r.ok ? 'Saved ✓ — live now' : 'Save failed');
}

function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

// ── tabs ──
function switchTab(name) {
  $$('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  ['leads', 'text', 'pricing'].forEach(p => $('#panel-' + p).hidden = p !== name);
  if (name !== 'leads') loadContent();
}


// ── boot ──
function start() { load(); pushState(); $('#tabs').hidden = false; }

async function main() {
  if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('/sw.js', { scope: '/admin/' }); } catch (e) { console.warn('sw', e); } }
  $('#login').onclick = login;
  $('#tok').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('#q').addEventListener('input', e => render(e.target.value));
  $('#refresh').onclick = () => { load(); toast('Refreshed'); };
  $('#enablePush').onclick = enablePush;
  $('#bell').onclick = enablePush;
  $$('#tabs button').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
  $('#textSave').onclick = () => saveOverrides('text');
  $('#priceSave').onclick = () => saveOverrides('pricing');
  $('#textReset').onclick = () => { OV.text = {}; renderText(); toast('Text edits cleared — save to apply'); };
  $('#priceReset').onclick = () => { OV.pricing = {}; renderPricing(); toast('Pricing edits cleared — save to apply'); };
  $('#tq').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    $$('#textGroups .fld').forEach(f => {
      const hit = !q || f.dataset.key.toLowerCase().includes(q) || f.textContent.toLowerCase().includes(q);
      f.style.display = hit ? '' : 'none';
    });
    $$('#textGroups .grp').forEach(g => { if (q) g.open = true; });
  });
  if (await authed()) { $('#app').hidden = false; $('#tabs').hidden = false; start(); } else showGate();
}
main();
