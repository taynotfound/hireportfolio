'use strict';
// märz admin PWA logic: auth gate, lead list, push subscription.
const $ = s => document.querySelector(s);
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
function showGate() { $('#gate').hidden = false; $('#app').hidden = true; $('#tok').focus(); }
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

// ── boot ──
function start() { load(); pushState(); }
async function main() {
  if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('/sw.js', { scope: '/admin/' }); } catch (e) { console.warn('sw', e); } }
  $('#login').onclick = login;
  $('#tok').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('#q').addEventListener('input', e => render(e.target.value));
  $('#refresh').onclick = () => { load(); toast('Refreshed'); };
  $('#enablePush').onclick = enablePush;
  $('#bell').onclick = enablePush;
  if (await authed()) { $('#app').hidden = false; start(); } else showGate();
}
main();
