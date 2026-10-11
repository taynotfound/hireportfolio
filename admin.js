'use strict';
// märz admin: auth, leads, push, ?ref= analytics, and the CMS (projects, pricing, testimonials, text, layout).
// One working copy of all content (S) is edited in place; "Publish" sends all of it in one request.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = x => JSON.parse(JSON.stringify(x));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keyOf = s => String(s || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').slice(0, 40);
const api = async (u, opt = {}) => {
  const r = await fetch(u, { credentials: 'same-origin', ...opt });
  if (r.status === 401 && u !== '/api/login') showGate();
  return r;
};
const post = (u, data) => api(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data ?? {}) });

/* ───────────── ui helpers ───────────── */
function toast(msg, kind = 'ok') {
  const t = $('#toast');
  t.className = 'toast show ' + kind;
  t.innerHTML = `<i class="fa-solid fa-${kind === 'err' ? 'circle-exclamation' : 'circle-check'}"></i>${esc(msg)}`;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800);
}

function confirmDlg(title, body, ok = 'OK', danger = false) {
  const d = $('#confirm');
  $('#cfT').textContent = title; $('#cfB').textContent = body;
  $('#cfOk').textContent = ok; $('#cfOk').className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
  d.returnValue = ''; d.showModal();
  return new Promise(res => d.addEventListener('close', () => res(d.returnValue === 'yes'), { once: true }));
}

function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; }

function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// open the hidden file input, upload the pick, resolve with its /uploads path (or null)
function pickImage() {
  const inp = $('#filePick'); inp.value = '';
  return new Promise(res => {
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return res(null);
      toast('Uploading…');
      try {
        const r = await api('/api/upload', { method: 'POST', headers: { 'content-type': f.type || 'application/octet-stream' }, body: f });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || r.status);
        toast('Image uploaded'); res(d.path);
      } catch (e) { toast('Upload failed: ' + e.message, 'err'); res(null); }
    };
    inp.click();
  });
}

function imgPicker(src, onPick, onClear) {
  const w = document.createElement('div'); w.className = 'imgpick';
  w.innerHTML = `<div class="prev${src ? ' has' : ''}" style="${src ? `background-image:url('/${esc(src)}')` : ''}">${src ? '' : 'no image'}</div>
    <div class="btns"><button type="button" class="btn btn-ghost btn-sm" data-a="pick"><i class="fa-solid fa-upload"></i> ${src ? 'Replace' : 'Upload'}</button>
    ${src ? '<button type="button" class="btn btn-danger btn-sm" data-a="clear"><i class="fa-solid fa-xmark"></i> Remove</button>' : ''}</div>`;
  w.querySelector('[data-a=pick]').onclick = async () => { const p = await pickImage(); if (p) onPick(p); };
  const c = w.querySelector('[data-a=clear]'); if (c) c.onclick = onClear;
  return w;
}

// bilingual field pair; get/set read & write the {en,de} object
function biFields(label, obj, multiline, onChange) {
  const w = document.createElement('div'); w.className = 'grid g2';
  w.innerHTML = ['en', 'de'].map(L => `<div class="fld"><label>${esc(label)} <span class="lt">${L}</span></label>
    ${multiline ? `<textarea rows="2" data-l="${L}">${esc(obj[L])}</textarea>` : `<input data-l="${L}" value="${esc(obj[L])}">`}</div>`).join('');
  $$('[data-l]', w).forEach(i => i.addEventListener('input', () => { obj[i.dataset.l] = i.value; if (i.tagName === 'TEXTAREA') autoGrow(i); onChange && onChange(); }));
  return w;
}

const growAll = root => requestAnimationFrame(() => $$('textarea', root).forEach(autoGrow));

/* ───────────── auth ───────────── */
function showGate() { $('#app').hidden = true; $('#gate').hidden = false; $('#tok').focus(); }
async function login(e) {
  e.preventDefault();
  const err = $('#gerr'); err.textContent = '';
  let r;
  try { r = await post('/api/login', { token: $('#tok').value.trim() }); }
  catch (x) { err.textContent = 'Network error: ' + x.message; return; }
  if (!r.ok) { err.textContent = r.status === 401 ? 'Wrong token.' : 'Login failed (' + r.status + ')'; $('#tok').select(); return; }
  $('#tok').value = '';
  start();
}
async function logout() {
  if (dirty() && !await confirmDlg('Log out?', 'You have unpublished changes that will be lost.', 'Log out', true)) return;
  await post('/api/logout'); S = null; location.reload();
}

/* ───────────── leads ───────────── */
let LEADS = [], leadFilter = 'all';
async function loadLeads() {
  const r = await api('/api/contacts'); if (!r.ok) return;
  LEADS = (await r.json()).items || [];
  renderLeads();
}
function renderLeads() {
  const wk = Date.now() - 7 * 864e5;
  const recent = LEADS.filter(l => new Date(l.at) >= wk);
  const refs = {}; LEADS.forEach(l => { const k = (l.referral || '').trim().toLowerCase(); if (k) refs[k] = (refs[k] || 0) + 1; });
  const topRef = Object.entries(refs).sort((a, b) => b[1] - a[1])[0];
  $('#leadKpis').innerHTML = [
    ['inbox', 'Total leads', LEADS.length, LEADS[0] ? 'latest ' + ago(LEADS[0].at) : 'none yet'],
    ['calendar-week', 'Last 7 days', recent.length, ''],
    ['mug-hot', 'Want to meet', LEADS.filter(l => l.meet === 'irl').length, 'in person'],
    ['signal', 'Top referral', topRef ? topRef[0] : '—', topRef ? topRef[1] + ' lead' + (topRef[1] === 1 ? '' : 's') : ''],
  ].map(([i, l, v, s]) => `<div class="kpi"><div class="l"><i class="fa-solid fa-${i}"></i>${l}</div><div class="v" title="${esc(v)}">${esc(v)}</div><div class="s">${esc(s)}</div></div>`).join('');
  const n = $('#nLeads'); n.hidden = !recent.length; n.textContent = recent.length;

  const q = $('#q').value.toLowerCase().trim();
  const items = LEADS.filter(l => (leadFilter === 'all' || (leadFilter === 'week' ? new Date(l.at) >= wk : l.meet === 'irl'))
    && (!q || [l.name, l.email, l.message, l.referral, l.city].join(' ').toLowerCase().includes(q)));
  if (!items.length) {
    $('#list').innerHTML = `<div class="empty"><i class="fa-solid fa-inbox"></i>${LEADS.length ? 'No leads match.' : 'No leads yet. They will show up here (and as a push notification) the moment someone writes.'}</div>`;
    return;
  }
  const sub = encodeURIComponent('Re: your message to tay.märz');
  $('#list').innerHTML = items.map(l => {
    const irl = l.meet === 'irl';
    return `<article class="lead" data-id="${esc(l.id)}">
      <div class="h"><span class="av">${esc((l.name || '?').trim()[0])}</span>
        <div><div class="name">${esc(l.name)}</div><a class="email" href="mailto:${esc(l.email)}?subject=${sub}">${esc(l.email)}</a></div>
        <span class="when" title="${esc(new Date(l.at).toLocaleString())}">${ago(l.at)}</span></div>
      <div class="msg">${esc(l.message)}</div>
      <div class="meta">
        <span class="tagp"><i class="fa-solid fa-signal"></i>${esc(l.referral)}</span>
        ${l.channel ? `<span class="tagp"><i class="fa-solid fa-comment"></i>prefers ${esc(l.channel)}</span>` : ''}
        <span class="tagp${irl ? ' irl' : ''}"><i class="fa-solid fa-${irl ? 'location-dot' : 'video'}"></i>${irl ? 'IRL' + (l.city ? ' · ' + esc(l.city) : '') : 'online'}</span>
        ${l.availability ? `<span class="tagp"><i class="fa-solid fa-clock"></i>${esc(l.availability)}</span>` : ''}
      </div>
      <div class="acts">
        <a class="btn btn-primary btn-sm" href="mailto:${esc(l.email)}?subject=${sub}"><i class="fa-solid fa-reply"></i> Reply</a>
        ${l.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(l.phone)}"><i class="fa-solid fa-phone"></i> ${esc(l.phone)}</a>` : ''}
        <button class="btn btn-ghost btn-sm" data-a="copy"><i class="fa-regular fa-copy"></i> Copy email</button>
        <span class="sp"></span>
        <button class="ibtn danger" data-a="del" title="Delete lead"><i class="fa-solid fa-trash"></i></button>
      </div></article>`;
  }).join('');
}
async function leadAction(e) {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const l = LEADS.find(x => x.id === b.closest('.lead').dataset.id); if (!l) return;
  if (b.dataset.a === 'copy') { await navigator.clipboard.writeText(l.email); toast('Email copied'); }
  if (b.dataset.a === 'del' && await confirmDlg('Delete this lead?', `The message from ${l.name} will be removed for good.`, 'Delete', true)) {
    const r = await post('/api/contacts/delete', { id: l.id });
    if (r.ok) { LEADS = LEADS.filter(x => x !== l); renderLeads(); toast('Lead deleted'); } else toast('Delete failed', 'err');
  }
}

/* ───────────── push ───────────── */
const pushOK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const urlB64 = b64 => Uint8Array.from(atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function swReady() { await navigator.serviceWorker.register('/sw.js', { scope: '/' }); return navigator.serviceWorker.ready; }
async function pushState() {
  let on = false;
  if (pushOK()) { try { const reg = await swReady(); on = !!(await reg.pushManager.getSubscription()) && Notification.permission === 'granted'; } catch {} }
  $('#pbanner').hidden = on || !pushOK();
  $('#bell').innerHTML = `<i class="fa-solid fa-bell${on ? '' : '-slash'}"></i><span>${on ? 'Notifications on' : 'Notifications'}</span>`;
  $('#bell').title = pushOK() ? (on ? 'Push is on. Click to send a test.' : 'Enable push notifications') : 'Push is not supported in this browser';
  return on;
}
async function enablePush() {
  if (!pushOK()) return toast('Push is not supported here. On iPhone, add this page to the home screen first.', 'err');
  try {
    if (await Notification.requestPermission() !== 'granted') return toast('Notifications are blocked in browser settings.', 'err');
    const reg = await swReady();
    const { key } = await (await api('/api/vapid')).json();
    const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(key) });
    const r = await post('/api/subscribe', sub);
    if (!r.ok) throw new Error('subscribe ' + r.status);
    await api('/api/test-push', { method: 'POST' });
    toast('Push is on, a test notification is on its way');
  } catch (e) { toast('Could not enable push: ' + e.message, 'err'); }
  pushState();
}

/* ───────────── analytics ───────────── */
let AN = null;
async function loadAnalytics() {
  const r = await api('/api/analytics'); if (!r.ok) return;
  AN = await r.json(); renderAnalytics();
}
const dayKey = d => d.toISOString().slice(0, 10);
const sumObj = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
function renderAnalytics() {
  const host = $('#analytics');
  const sources = Object.entries(AN.sources || {}).sort((a, b) => b[1] - a[1]);
  const total = sources.reduce((s, [, n]) => s + n, 0);
  if (!total) {
    host.innerHTML = `<div class="empty" style="margin-bottom:1rem"><i class="fa-solid fa-chart-column"></i>No tracked visits yet.<br>Make a link below and share it, every visit through it shows up here.</div>`;
    return;
  }
  const days = [...Array(30)].map((_, i) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 29 + i); const k = dayKey(d); return { k, d, by: AN.days[k] || {}, n: sumObj(AN.days[k]) }; });
  const last30 = days.reduce((s, d) => s + d.n, 0);
  const last7 = days.slice(-7).reduce((s, d) => s + d.n, 0);
  const per30 = {}; days.forEach(d => { for (const s in d.by) per30[s] = (per30[s] || 0) + d.by[s]; });
  const hasHistory = Object.keys(AN.days || {}).length > 0;
  const max = Math.max(1, ...days.map(d => d.n));
  const step = Math.max(1, Math.ceil(max / 2)), top = step * 2;
  const fmt = d => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

  host.innerHTML = `<div class="kpis">
      <div class="kpi"><div class="l"><i class="fa-solid fa-users"></i>All-time visits</div><div class="v">${total}</div><div class="s">via ?ref= links</div></div>
      <div class="kpi"><div class="l"><i class="fa-solid fa-calendar"></i>Last 30 days</div><div class="v">${last30}</div><div class="s">${last7} in the last 7</div></div>
      <div class="kpi"><div class="l"><i class="fa-solid fa-signs-post"></i>Sources</div><div class="v">${sources.length}</div><div class="s">${Object.keys(per30).length} active this month</div></div>
      <div class="kpi"><div class="l"><i class="fa-solid fa-trophy"></i>Top source</div><div class="v" title="${esc(sources[0][0])}">${esc(sources[0][0])}</div><div class="s">${Math.round(sources[0][1] / total * 100)}% of all visits</div></div>
    </div>
    <div class="box"><header><h2>Visits per day</h2><span class="sub">last 30 days (UTC)</span></header>
      ${hasHistory ? '' : '<p class="lbl" style="margin-bottom:.8rem">Daily history started with this version, older visits only count toward the totals.</p>'}
      <div class="chart" id="chart">
        <div class="gl" style="bottom:calc(1.4rem + (100% - 1.4rem))"><span>${top}</span></div>
        <div class="gl" style="bottom:calc(1.4rem + (100% - 1.4rem) / 2)"><span>${step}</span></div>
        ${days.map((d, i) => `<div class="bar${d.n ? '' : ' zero'}" data-i="${i}"><i style="height:${d.n / top * 100}%"></i>${i % 6 === 5 || i === 29 ? `<span class="x">${fmt(d.d)}</span>` : ''}</div>`).join('')}
      </div></div>
    <div class="box"><header><h2>Sources</h2><span class="sub">all time · share · last 30 days</span></header>
      <div class="srcs">${sources.map(([s, n], i) => `<div class="src"><span class="rk">${i + 1}</span><span class="nm">${esc(s)}</span>
        <span class="ct">${n}<small>${(n / total * 100).toFixed(n / total < .1 ? 1 : 0)}%</small><small>${per30[s] || 0} / 30d</small></span>
        <span></span><span class="track"><i style="width:${n / sources[0][1] * 100}%"></i></span></div>`).join('')}</div></div>`;

  const tip = $('#tip');
  $('#chart').onmousemove = e => {
    const b = e.target.closest('.bar'); if (!b) { tip.hidden = true; return; }
    const d = days[b.dataset.i];
    const br = Object.entries(d.by).sort((a, c) => c[1] - a[1]).slice(0, 4);
    tip.innerHTML = `<div><b>${d.n}</b> visit${d.n === 1 ? '' : 's'} · ${fmt(d.d)}</div>${br.map(([s, n]) => `<div class="r"><span>${esc(s)}</span><span>${n}</span></div>`).join('')}`;
    const r = b.getBoundingClientRect();
    tip.style.left = r.left + r.width / 2 + 'px'; tip.style.top = r.bottom - b.firstElementChild.offsetHeight - 22 + 'px'; tip.hidden = false;
  };
  $('#chart').onmouseleave = () => { tip.hidden = true; };
}
function refLink() {
  const k = keyOf($('#refIn').value);
  $('#refOut').textContent = location.origin + '/' + (k ? '?ref=' + k : '?ref=…');
  $('#refCopy').disabled = !k;
}

/* ───────────── content state ───────────── */
let D = null, DS = null, S = null, SAVED = null;
const AREAS = { text: 'text', projects: 'projects', pricing: 'pricing', testimonials: 'words', sections: 'layout', timeline: 'layout', blocks: 'layout' };
const PFIELDS = { BASES: ['price', 'days'], ADDONS: ['price'], SUPPORT: ['monthly'] };

const toRows = p => ({
  ...Object.fromEntries(Object.keys(PFIELDS).map(g => [g, Object.entries(p[g] || {}).map(([key, v]) =>
    ({ key, label: { en: (v.label && v.label.en) || '', de: (v.label && v.label.de) || '' }, ...Object.fromEntries(PFIELDS[g].map(f => [f, v[f] ?? 0])) }))])),
  RATES: { rush: p.RATES?.rush ?? 1.2, retainer: p.RATES?.retainer ?? 0.1 },
});
const fromRows = r => ({
  ...Object.fromEntries(Object.keys(PFIELDS).map(g => [g, Object.fromEntries(r[g].map(({ key, ...v }) => [key, v]))])),
  RATES: r.RATES,
});

function stateFrom(ov) {
  const secs = (Array.isArray(ov.sections) ? [...ov.sections].sort((a, b) => a.order - b.order) : [])
    .filter(s => D.sections.some(d => d.id === s.id)).map(s => ({ id: s.id, on: s.on !== false }));
  D.sections.forEach(d => { if (!secs.some(s => s.id === d.id)) secs.push({ id: d.id, on: true }); });
  return {
    text: { en: { ...(ov.text?.en || {}) }, de: { ...(ov.text?.de || {}) } },
    projects: clone(ov.projectsFull || D.projects),
    pricing: toRows(ov.pricingFull || D.pricing),
    testimonials: clone(ov.testimonials || D.testimonials),
    sections: secs,
    timeline: clone(ov.timeline || D.timeline),
    blocks: clone(ov.blocks || []),
  };
}

async function loadContent() {
  const r = await api('/api/admin-content'); if (!r.ok) return;
  const d = await r.json();
  D = d.defaults;
  DS = stateFrom({});
  S = stateFrom(d.overrides || {});
  SAVED = clone(S);
  renderEditors();
}

const dirtyAreas = () => S ? Object.keys(AREAS).filter(a => !same(S[a], SAVED[a])) : [];
const dirty = () => dirtyAreas().length > 0;
function markDirty() {
  const areas = dirtyAreas();
  const tabs = new Set(areas.map(a => AREAS[a]));
  $$('#tabs .tab').forEach(t => { const dot = $('.dot', t); if (dot) dot.hidden = !tabs.has(t.dataset.tab); });
  $('#savebar').classList.toggle('off', !areas.length);
  const names = { text: 'text', projects: 'projects', pricing: 'pricing', testimonials: 'testimonials', layout: 'layout' };
  $('#saveSt').className = 'st';
  $('#saveSt').innerHTML = `<i class="fa-solid fa-circle-dot"></i> Unsaved: ${[...tabs].map(t => names[t] || t).join(', ')}`;
}

function validate() {
  const keys = new Set();
  for (const p of S.projects) {
    if (!String(p.name || '').trim()) return ['projects', 'Every project needs a name.'];
    if (!p.slug || keys.has(p.slug)) return ['projects', `Project slug "${p.slug}" is empty or used twice.`];
    keys.add(p.slug);
  }
  for (const g of Object.keys(PFIELDS)) {
    const seen = new Set();
    for (const row of S.pricing[g]) {
      if (!row.key || seen.has(row.key)) return ['pricing', `Pricing key "${row.key}" is empty or used twice.`];
      if (!String(row.label.en || '').trim()) return ['pricing', `Pricing item "${row.key}" needs an English label.`];
      seen.add(row.key);
    }
  }
  if (!S.pricing.BASES.length || !S.pricing.SUPPORT.length) return ['pricing', 'The builder needs at least one project type and one support plan.'];
  if (S.testimonials.some(t => !String(t.name || '').trim())) return ['words', 'Every testimonial needs a name.'];
  return null;
}

async function publish() {
  const bad = validate();
  if (bad) { switchTab(bad[0]); $('#saveSt').className = 'st err'; $('#saveSt').innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${esc(bad[1])}`; return; }
  const ifChanged = (k, v) => (same(S[k], DS[k]) ? undefined : v);
  const payload = {
    text: S.text,
    projectsFull: ifChanged('projects', S.projects),
    pricingFull: ifChanged('pricing', fromRows(S.pricing)),
    testimonials: ifChanged('testimonials', S.testimonials),
    sections: ifChanged('sections', S.sections.map((s, i) => ({ ...s, order: i }))),
    timeline: ifChanged('timeline', S.timeline),
    blocks: S.blocks.length ? S.blocks : undefined,
  };
  $('#save').disabled = true;
  try {
    const r = await post('/api/overrides', payload);
    if (!r.ok) throw new Error(r.status);
    SAVED = clone(S); markDirty(); toast('Published, the site is live with your changes');
  } catch (e) { toast('Publish failed (' + e.message + ')', 'err'); }
  $('#save').disabled = false;
}

async function discard() {
  if (!await confirmDlg('Discard changes?', 'Everything since the last publish will be reverted.', 'Discard', true)) return;
  S = clone(SAVED); renderEditors(); toast('Changes discarded');
}

async function resetArea(area) {
  const label = { projects: 'projects', pricing: 'pricing', testimonials: 'testimonials', text: 'all text edits', layout: 'sections, timeline and blocks' }[area];
  if (!await confirmDlg('Reset to defaults?', `This resets ${label} to the built-in defaults. Nothing goes live until you publish.`, 'Reset', true)) return;
  if (area === 'text') S.text = { en: {}, de: {} };
  else if (area === 'layout') for (const k of ['sections', 'timeline', 'blocks']) S[k] = clone(DS[k]);
  else S[area] = clone(DS[area]);
  renderEditors();
}

function renderEditors() { renderProjects(); renderPricing(); renderWords(); renderText(); renderLayout(); markDirty(); }

/* ───────────── projects ───────────── */
function renderProjects() {
  const list = S.projects;
  const missing = D.projects.filter(p => !list.some(x => x.slug === p.slug));
  $('#projMissing').innerHTML = missing.length ? `<div class="pbanner"><i class="fa-solid fa-circle-info"></i>
    <div class="tx"><b>${missing.length} built-in project${missing.length === 1 ? '' : 's'} not on your list:</b> ${missing.map(p => esc(p.name)).join(', ')}</div>
    <button class="btn btn-ghost btn-sm" id="projRestore">Add ${missing.length === 1 ? 'it' : 'them'}</button></div>` : '';
  if (missing.length) $('#projRestore').onclick = () => { list.push(...clone(missing)); renderProjects(); };
  $('#projList').innerHTML = list.length ? list.map((p, i) => `<div class="row" data-i="${i}">
      ${p.shot ? `<img class="th" src="/${esc(p.shot)}" alt="">` : `<span class="th">${esc(p.emoji || '📦')}</span>`}
      <span class="tint" style="background:${esc(p.tint)}"></span>
      <div class="main"><b>${esc(p.emoji ? p.emoji + ' ' : '')}${esc(p.name || '(untitled)')}</b>
        <small>${esc(p.slug)} · ${esc(p.year)}${p.story ? ' · case study' : ''}${p.link ? '' : ' · private'}${i >= 6 ? ' · in "show more"' : ''}</small></div>
      <div class="acts">
        <button class="ibtn" data-a="up" title="Move up"${i ? '' : ' disabled'}><i class="fa-solid fa-arrow-up"></i></button>
        <button class="ibtn" data-a="down" title="Move down"${i < list.length - 1 ? '' : ' disabled'}><i class="fa-solid fa-arrow-down"></i></button>
        <button class="ibtn" data-a="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="ibtn danger" data-a="rm" title="Remove"><i class="fa-solid fa-trash"></i></button>
      </div></div>`).join('') : '<div class="empty"><i class="fa-solid fa-folder-open"></i>No projects. The work section will be empty.</div>';
  markDirty();
}

async function projAction(e) {
  const row = e.target.closest('.row'); if (!row || e.target.closest('[disabled]')) return;
  const i = +row.dataset.i, list = S.projects, a = (e.target.closest('[data-a]') || {}).dataset?.a || 'edit';
  if (a === 'up') [list[i - 1], list[i]] = [list[i], list[i - 1]];
  else if (a === 'down') [list[i + 1], list[i]] = [list[i], list[i + 1]];
  else if (a === 'rm') { if (!await confirmDlg(`Remove "${list[i].name}"?`, 'It disappears from the site when you publish.', 'Remove', true)) return; list.splice(i, 1); }
  else return openProject(i);
  renderProjects();
}

function addProject() {
  let n = S.projects.length + 1; while (S.projects.some(p => p.slug === 'project-' + n)) n++;
  S.projects.push({ name: 'New project', slug: 'project-' + n, emoji: '✨', year: new Date().getFullYear(), link: '', tint: '#ff5c66', tilt: 0,
    price: '', shot: '', tags: [], stack: [], one: { en: '', de: '' }, long: { en: '', de: '' } });
  renderProjects(); openProject(S.projects.length - 1);
}

function openProject(i) {
  const p = S.projects[i], body = $('#psBody');
  const head = () => { $('#psEmoji').textContent = p.emoji || '📦'; $('#psTitle').textContent = p.name || '(untitled)'; };
  const field = (label, key, opts = {}) => {
    const f = document.createElement('div'); f.className = 'fld';
    const v = opts.list ? (p[key] || []).join(', ') : p[key] ?? '';
    f.innerHTML = `<label>${esc(label)}</label><input value="${esc(v)}" placeholder="${esc(opts.ph || '')}"${opts.type ? ` type="${opts.type}"` : ''}>${opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : ''}`;
    const inp = $('input', f);
    inp.addEventListener('input', () => {
      p[key] = opts.list ? inp.value.split(',').map(x => x.trim()).filter(Boolean) : opts.type === 'number' ? Number(inp.value) : inp.value;
      head(); markDirty();
    });
    if (key === 'slug') inp.addEventListener('change', () => { inp.value = p.slug = keyOf(inp.value) || keyOf(p.name) || 'project'; markDirty(); });
    return f;
  };
  const grid = (cls, ...kids) => { const g = document.createElement('div'); g.className = 'grid ' + cls; g.append(...kids); return g; };
  const h4 = t => Object.assign(document.createElement('h4'), { textContent: t });
  const draw = () => {
    body.innerHTML = '';
    const tint = document.createElement('div'); tint.className = 'fld';
    tint.innerHTML = `<label>Accent colour</label><div class="color"><input type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(p.tint) ? p.tint : '#ff5c66')}"><input value="${esc(p.tint)}" maxlength="9"></div>`;
    const [ci, ct] = $$('input', tint);
    ci.oninput = () => { ct.value = p.tint = ci.value; markDirty(); };
    ct.oninput = () => { p.tint = ct.value; if (/^#[0-9a-f]{6}$/i.test(ct.value)) ci.value = ct.value; markDirty(); };
    const story = document.createElement('label'); story.className = 'sw';
    story.innerHTML = `<input type="checkbox"${p.story ? ' checked' : ''}> Case study (problem → what I did → outcome) with a badge on the card`;
    $('input', story).onchange = e => {
      if (e.target.checked) p.story = p._story || { why: { en: '', de: '' }, did: { en: '', de: '' }, out: { en: '', de: '' } };
      else { p._story = p.story; delete p.story; }
      draw(); markDirty();
    };
    const shot = document.createElement('div'); shot.className = 'fld';
    shot.innerHTML = '<label>Screenshot <span class="hint" style="font-family:var(--sans)">16:10 works best, top of the image is shown</span></label>';
    shot.append(imgPicker(p.shot, path => { p.shot = path; draw(); markDirty(); }, () => { p.shot = ''; draw(); markDirty(); }));
    p.one = p.one || { en: '', de: '' }; p.long = p.long || { en: '', de: '' };
    body.append(
      h4('Basics'),
      grid('g4', field('Name', 'name'), field('Slug (URL)', 'slug', { hint: '/#/p/' + p.slug }), field('Emoji', 'emoji'), field('Year', 'year')),
      grid('g2', field('Live link', 'link', { ph: 'https://… (blank = private project)' }), field('Price on card', 'price', { ph: 'e.g. €500 (blank hides it)' })),
      h4('Look'),
      grid('g2', tint, field('Card tilt (degrees)', 'tilt', { type: 'number', hint: '-4 to 4, gives the grid its hand-placed look' })),
      shot,
      h4('Text'),
      biFields('Short blurb (card)', p.one, true, markDirty),
      biFields('Long description (project page)', p.long, true, markDirty),
      grid('g2', field('Tags (card)', 'tags', { list: true, ph: 'comma, separated' }), field('Tech stack (project page)', 'stack', { list: true, ph: 'comma, separated' })),
      h4('Story'), story,
    );
    if (p.story) body.append(biFields('The problem', p.story.why, true, markDirty), biFields('What I did', p.story.did, true, markDirty), biFields('The outcome', p.story.out, true, markDirty));
    growAll(body);
  };
  head(); draw();
  const dlg = $('#projSheet');
  dlg.onclose = () => { delete p._story; renderProjects(); };
  dlg.showModal(); dlg.scrollTop = 0;
}

/* ───────────── pricing ───────────── */
function renderPricing() {
  const P = S.pricing;
  const groups = [['BASES', 'Project types', 'step 01 · pick one'], ['ADDONS', 'Add-ons', 'step 02 · pick any'], ['SUPPORT', 'Support plans', 'step 03 · monthly, pick one']];
  const extra = { BASES: ['€', 'days'], ADDONS: ['€'], SUPPORT: ['€/mo'] };
  $('#priceGroups').innerHTML = groups.map(([g, title, sub]) => `<div class="box" data-g="${g}">
      <header><h2>${title}</h2><span class="badge">${P[g].length}</span><span class="sub">${sub}</span></header>
      <div class="ptable">
        <div class="prow hd${g === 'BASES' ? '' : ' ad'}"><span>key</span><span>label EN</span><span>label DE</span>${extra[g].map(x => `<span>${x}</span>`).join('')}<span></span></div>
        ${P[g].map((r, i) => `<div class="prow${g === 'BASES' ? '' : ' ad'}" data-i="${i}">
          <input class="inp key" data-f="key" value="${esc(r.key)}" aria-label="key">
          <input class="inp" data-f="label.en" value="${esc(r.label.en)}" placeholder="English label">
          <input class="inp" data-f="label.de" value="${esc(r.label.de)}" placeholder="Deutsches Label">
          ${PFIELDS[g].map(f => `<input class="inp" type="number" min="0" step="1" data-f="${f}" value="${r[f]}" aria-label="${f}">`).join('')}
          <button class="ibtn danger" data-a="rm" title="Remove"><i class="fa-solid fa-trash"></i></button></div>`).join('')}
      </div>
      <button class="add" data-a="add" style="margin-top:.7rem"><i class="fa-solid fa-plus"></i> Add ${title.toLowerCase().replace(/s$/, '')}</button>
    </div>`).join('') + `<div class="box"><header><h2>Modifiers</h2></header><div class="rates">
      <div class="fld"><label>Rush surcharge</label><div class="suffix"><input type="number" min="0" step="1" data-rate="rush" value="${Math.round((P.RATES.rush - 1) * 100)}"><span>%</span></div><span class="hint">added on top when "rush it" is ticked, delivery ~40% faster</span></div>
      <div class="fld"><label>Support plan discount</label><div class="suffix"><input type="number" min="0" max="90" step="1" data-rate="retainer" value="${Math.round(P.RATES.retainer * 100)}"><span>%</span></div><span class="hint">off the one-off price when any paid support plan is picked</span></div>
    </div></div>`;
  checkKeys();
}
function checkKeys() {
  $$('#priceGroups [data-g]').forEach(box => {
    const keys = S.pricing[box.dataset.g].map(r => r.key);
    $$('.prow[data-i]', box).forEach((row, i) => { const k = keys[i]; row.querySelector('.key').style.borderColor = !k || keys.indexOf(k) !== i ? 'var(--bad)' : ''; });
  });
}
function priceInput(e) {
  const t = e.target;
  if (t.dataset.rate) {
    const v = Math.max(0, Number(t.value) || 0);
    S.pricing.RATES[t.dataset.rate] = t.dataset.rate === 'rush' ? 1 + v / 100 : Math.min(v, 90) / 100;
    return markDirty();
  }
  const row = t.closest('.prow[data-i]'); if (!row) return;
  const r = S.pricing[t.closest('[data-g]').dataset.g][+row.dataset.i], f = t.dataset.f;
  if (f === 'key') r.key = keyOf(t.value);
  else if (f.startsWith('label.')) r.label[f.slice(6)] = t.value;
  else r[f] = Math.max(0, Number(t.value) || 0);
  checkKeys(); markDirty();
}
function priceClick(e) {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const g = b.closest('[data-g]').dataset.g, list = S.pricing[g];
  if (b.dataset.a === 'rm') list.splice(+b.closest('.prow').dataset.i, 1);
  if (b.dataset.a === 'add') {
    let n = list.length + 1; while (list.some(r => r.key === 'item-' + n)) n++;
    list.push({ key: 'item-' + n, label: { en: '', de: '' }, ...Object.fromEntries(PFIELDS[g].map(f => [f, 0])) });
  }
  renderPricing(); markDirty();
  if (b.dataset.a === 'add') $$(`[data-g=${g}] .prow[data-i]`).pop().querySelector('[data-f="label.en"]').focus();
}

/* ───────────── testimonials ───────────── */
function renderWords() {
  const host = $('#wordsList'); host.innerHTML = '';
  if (!S.testimonials.length) host.innerHTML = '<div class="empty" style="margin-bottom:.8rem"><i class="fa-solid fa-quote-left"></i>No testimonials, the section is hidden on the site.</div>';
  S.testimonials.forEach((q, i) => {
    q.quote = q.quote || { en: '', de: '' }; q.role = q.role || { en: '', de: '' };
    const box = document.createElement('div'); box.className = 'box';
    box.innerHTML = `<header><h2>${esc(q.name || 'New testimonial')}</h2><div class="acts">
      <button class="ibtn" data-a="up"${i ? '' : ' disabled'} title="Move up"><i class="fa-solid fa-arrow-up"></i></button>
      <button class="ibtn danger" data-a="rm" title="Remove"><i class="fa-solid fa-trash"></i></button></div></header>
      <div class="grid g2"><div class="fld"><label>Name</label><input data-k="name" value="${esc(q.name)}"></div>
      <div class="fld"><label>Link (optional)</label><input data-k="link" value="${esc(q.link)}" placeholder="https://…"></div></div>`;
    $$('[data-k]', box).forEach(inp => inp.oninput = () => { q[inp.dataset.k] = inp.value; if (inp.dataset.k === 'name') $('h2', box).textContent = inp.value || 'New testimonial'; markDirty(); });
    const g = document.createElement('div'); g.className = 'grid'; g.style.marginTop = '.85rem';
    g.append(biFields('Role / company', q.role, false, markDirty), biFields('Quote', q.quote, true, markDirty));
    box.append(g);
    $('[data-a=up]', box).onclick = () => { [S.testimonials[i - 1], S.testimonials[i]] = [q, S.testimonials[i - 1]]; renderWords(); markDirty(); };
    $('[data-a=rm]', box).onclick = async () => {
      if (!await confirmDlg('Remove testimonial?', `The quote from ${q.name || 'this person'} disappears when you publish.`, 'Remove', true)) return;
      S.testimonials.splice(i, 1); renderWords(); markDirty();
    };
    host.append(box);
  });
  growAll(host);
}

/* ───────────── text ───────────── */
const HTML_KEYS = new Set(['hero.h', 'price.rush', 'impressum.body']);
function renderText() {
  const host = $('#textGroups'), groups = {};
  Object.keys(D.text.en).filter(k => !/^path\.r\d/.test(k)).forEach(k => (groups[k.split('.')[0]] ||= []).push(k));
  host.innerHTML = Object.entries(groups).map(([g, keys]) => `<details class="grp" data-g="${g}"><summary>${esc(g)}
      <span class="badge">${keys.length}</span><span class="badge" data-changed style="color:var(--gold)" hidden></span></summary>
      <div class="body">${keys.map(k => `<div class="krow" data-k="${esc(k)}">
        <div class="k">${esc(k)}${HTML_KEYS.has(k) ? ' <span class="lt">html</span>' : ''}<button class="ibtn" data-a="reset" title="Back to default"><i class="fa-solid fa-rotate-left"></i></button></div>
        <div class="grid g2">${['en', 'de'].map(L => `<div class="fld"><textarea rows="1" data-l="${L}" placeholder="${esc(D.text[L][k])}">${esc(S.text[L][k] ?? D.text[L][k])}</textarea><span class="lt">${L}</span></div>`).join('')}</div>
      </div>`).join('')}</div></details>`).join('');
  $$('.krow', host).forEach(markText);
  filterText();
}
function markText(row) {
  const k = row.dataset.k;
  const changed = ['en', 'de'].some(L => S.text[L][k] != null);
  ['en', 'de'].forEach(L => row.querySelector(`[data-l=${L}]`).closest('.fld').classList.toggle('changed', S.text[L][k] != null));
  $('[data-a=reset]', row).hidden = !changed;
  const det = row.closest('details'), n = $$('.krow', det).filter(r => $('.fld.changed', r)).length, b = $('[data-changed]', det);
  b.hidden = !n; b.textContent = n + ' edited';
}
function textInput(e) {
  const ta = e.target; if (!ta.dataset.l) return;
  const row = ta.closest('.krow'), k = row.dataset.k, L = ta.dataset.l;
  if (ta.value === D.text[L][k]) delete S.text[L][k]; else S.text[L][k] = ta.value;
  autoGrow(ta); markText(row); markDirty();
}
function textClick(e) {
  const b = e.target.closest('[data-a=reset]'); if (!b) return;
  const row = b.closest('.krow'), k = row.dataset.k;
  ['en', 'de'].forEach(L => { delete S.text[L][k]; const ta = row.querySelector(`[data-l=${L}]`); ta.value = D.text[L][k]; autoGrow(ta); });
  markText(row); markDirty();
}
function filterText() {
  const q = $('#tq').value.toLowerCase().trim();
  $$('#textGroups details').forEach(det => {
    let hits = 0;
    $$('.krow', det).forEach(row => {
      const hit = !q || row.dataset.k.includes(q) || $$('textarea', row).some(t => t.value.toLowerCase().includes(q));
      row.hidden = !hit; hits += hit;
    });
    det.hidden = !hits;
    if (q) det.open = true;
    if (det.open) growAll(det);
  });
}

/* ───────────── layout ───────────── */
function moveBtns(i, n) {
  return `<button class="ibtn" data-a="up" title="Move up"${i ? '' : ' disabled'}><i class="fa-solid fa-arrow-up"></i></button>
    <button class="ibtn" data-a="down" title="Move down"${i < n - 1 ? '' : ' disabled'}><i class="fa-solid fa-arrow-down"></i></button>`;
}
function move(list, i, a) {
  if (a === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
  if (a === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
}
function renderLayout() {
  const label = id => (D.sections.find(d => d.id === id) || {}).label || id;
  $('#secCount').textContent = S.sections.filter(s => s.on).length + ' of ' + S.sections.length + ' visible';
  $('#secList').innerHTML = S.sections.map((s, i) => `<div class="row${s.on ? '' : ' off'}" data-i="${i}">
      <div class="main"><b>${esc(label(s.id))}</b><small>#${esc(s.id)}</small></div>
      <label class="sw"><input type="checkbox" data-a="on"${s.on ? ' checked' : ''}><span>${s.on ? 'shown' : 'hidden'}</span></label>
      <div class="acts">${moveBtns(i, S.sections.length)}</div></div>`).join('');

  const tl = $('#tlList'); tl.innerHTML = '';
  S.timeline.forEach((r, i) => {
    const box = document.createElement('div'); box.className = 'box'; box.style.cssText = 'margin:0;background:var(--bg)';
    box.innerHTML = `<header><div class="fld" style="width:140px"><input data-k="year" value="${esc(r.year)}" placeholder="year, e.g. 2024–25"></div>
      <label class="sw"><input type="checkbox" data-k="now"${r.now ? ' checked' : ''}> highlight as "now"</label>
      <div class="acts">${moveBtns(i, S.timeline.length)}<button class="ibtn danger" data-a="rm" title="Remove"><i class="fa-solid fa-trash"></i></button></div></header>`;
    const obj = { en: r.en || '', de: r.de || '' };
    box.append(biFields('Text', obj, true, () => { r.en = obj.en; r.de = obj.de; markDirty(); }));
    $$('[data-k]', box).forEach(inp => inp.oninput = () => { r[inp.dataset.k] = inp.type === 'checkbox' ? inp.checked : inp.value; markDirty(); });
    $$('[data-a]', box).forEach(b => b.onclick = () => { if (b.dataset.a === 'rm') S.timeline.splice(i, 1); else move(S.timeline, i, b.dataset.a); renderLayout(); markDirty(); });
    tl.append(box);
  });

  const bl = $('#blkList'); bl.innerHTML = S.blocks.length ? '' : '<p class="lbl">No custom blocks yet.</p>';
  S.blocks.forEach((b, i) => {
    const box = document.createElement('div'); box.className = 'box'; box.style.cssText = 'margin:0;background:var(--bg)';
    box.innerHTML = `<header><label class="sw"><input type="checkbox" data-k="on"${b.on !== false ? ' checked' : ''}> visible</label>
      <div class="acts">${moveBtns(i, S.blocks.length)}<button class="ibtn danger" data-a="rm" title="Remove"><i class="fa-solid fa-trash"></i></button></div></header>`;
    const title = { en: b.title_en || '', de: b.title_de || '' }, text = { en: b.body_en || '', de: b.body_de || '' };
    const g = document.createElement('div'); g.className = 'grid';
    g.append(biFields('Heading', title, false, () => { b.title_en = title.en; b.title_de = title.de; markDirty(); }),
      biFields('Body', text, true, () => { b.body_en = text.en; b.body_de = text.de; markDirty(); }),
      imgPicker(b.image, p => { b.image = p; renderLayout(); markDirty(); }, () => { b.image = ''; renderLayout(); markDirty(); }));
    box.append(g);
    $('[data-k=on]', box).onchange = e => { b.on = e.target.checked; markDirty(); };
    $$('[data-a]', box).forEach(btn => btn.onclick = async () => {
      if (btn.dataset.a === 'rm') { if (!await confirmDlg('Remove block?', 'This custom block will be deleted.', 'Remove', true)) return; S.blocks.splice(i, 1); }
      else move(S.blocks, i, btn.dataset.a);
      renderLayout(); markDirty();
    });
    bl.append(box);
  });
  growAll($('#panel-layout'));
}
function secClick(e) {
  const row = e.target.closest('.row'), b = e.target.closest('[data-a]'); if (!row || !b) return;
  const i = +row.dataset.i;
  if (b.dataset.a === 'on') S.sections[i].on = b.checked; else move(S.sections, i, b.dataset.a);
  renderLayout(); markDirty();
}

/* ───────────── tabs + boot ───────────── */
const TABS = ['leads', 'analytics', 'projects', 'pricing', 'words', 'text', 'layout'];
function switchTab(name) {
  if (!TABS.includes(name)) name = 'leads';
  $$('#tabs .tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  TABS.forEach(p => { $('#panel-' + p).hidden = p !== name; });
  history.replaceState(null, '', '#' + name);
  if (name === 'analytics' && !AN) loadAnalytics();
  if (S) growAll($('#panel-' + name));
  window.scrollTo(0, 0);
}

function start() {
  $('#gate').hidden = true; $('#app').hidden = false;
  switchTab(location.hash.slice(1));
  loadLeads(); loadContent(); pushState();
}

function wire() {
  $('#loginForm').onsubmit = login;
  $('#logout').onclick = logout;
  $('#tabs').onclick = e => { const b = e.target.closest('.tab'); if (b) switchTab(b.dataset.tab); };
  $('#refresh').onclick = async () => { await loadLeads(); toast('Leads refreshed'); };
  $('#anRefresh').onclick = async () => { await loadAnalytics(); toast('Analytics refreshed'); };
  $('#q').oninput = renderLeads;
  $('#leadFilter').onclick = e => { const b = e.target.closest('.fchip'); if (!b) return; leadFilter = b.dataset.f; $$('.fchip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderLeads(); };
  $('#list').onclick = leadAction;
  $('#enablePush').onclick = enablePush;
  $('#bell').onclick = async () => { if (await pushState()) { await api('/api/test-push', { method: 'POST' }); toast('Test notification sent'); } else enablePush(); };
  $('#refIn').oninput = refLink; refLink();
  $('#refCopy').onclick = async () => { await navigator.clipboard.writeText($('#refOut').textContent); toast('Link copied'); };

  $('#projList').onclick = projAction;
  $('#projAdd').onclick = addProject;
  $('#psDone').onclick = () => $('#projSheet').close();
  $('#priceGroups').oninput = priceInput;
  $('#priceGroups').onclick = priceClick;
  $('#priceGroups').onchange = e => { if (e.target.dataset.f === 'key') e.target.value = keyOf(e.target.value); };
  $('#wordAdd').onclick = () => { S.testimonials.push({ name: '', link: '', role: { en: '', de: '' }, quote: { en: '', de: '' } }); renderWords(); markDirty(); $$('#wordsList [data-k=name]').pop().focus(); };
  $('#textGroups').oninput = textInput;
  $('#textGroups').onclick = textClick;
  $('#textGroups').addEventListener('toggle', e => { if (e.target.open) growAll(e.target); }, true);
  $('#tq').oninput = filterText;
  $('#secList').onclick = secClick;
  $('#tlAdd').onclick = () => { S.timeline.push({ year: '', en: '', de: '', now: false }); renderLayout(); markDirty(); };
  $('#blkAdd').onclick = () => { S.blocks.push({ on: true, title_en: '', title_de: '', body_en: '', body_de: '', image: '' }); renderLayout(); markDirty(); };
  $$('[data-reset]').forEach(b => b.onclick = () => resetArea(b.dataset.reset));
  $('#save').onclick = publish;
  $('#discard').onclick = discard;
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && dirty()) { e.preventDefault(); publish(); } });
  addEventListener('beforeunload', e => { if (dirty()) e.preventDefault(); });
}

(async () => {
  wire();
  const r = await fetch('/api/me', { credentials: 'same-origin' }).catch(() => null);
  if (r && r.ok) start(); else showGate();
})();
