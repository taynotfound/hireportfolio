'use strict';
/* CMS power features for the admin: full project CRUD (add/remove/reorder/upload/price)
   + the "build" tab (section toggle/reorder, timeline, custom blocks).
   Shares globals with admin.js (DEFAULTS, OV, api, esc, toast, autoGrow, $, $$). Classic script, same scope. */

const clone = x => JSON.parse(JSON.stringify(x));
const commaIn = a => (Array.isArray(a) ? a.join(', ') : '');
const commaOut = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);

/* ── PROJECTS: full editor supersedes the by-slug text editor ── */
// working list: OV.projectsFull if present, else a live copy of defaults (materialized on first change)
function projs() { return Array.isArray(OV.projectsFull) ? OV.projectsFull : DEFAULTS.projects; }
function materialize() { if (!Array.isArray(OV.projectsFull)) OV.projectsFull = clone(DEFAULTS.projects); return OV.projectsFull; }
function projChanged() { return Array.isArray(OV.projectsFull) && JSON.stringify(OV.projectsFull) !== JSON.stringify(DEFAULTS.projects); }

function bi(o) { o = o || {}; return { en: o.en || '', de: o.de || '' }; }

function renderProjectsCMS() {
  const list = projs();
  const host = $('#projGroups'); if (!host) return; host.innerHTML = '';
  list.forEach((p, i) => {
    const det = document.createElement('details'); det.className = 'grp'; det.dataset.i = i;
    det.innerHTML = `<summary>${esc(p.emoji || '📦')} ${esc(p.name || '(untitled)')} <span class="badge">${esc(p.slug || '?')}</span></summary><div class="body"></div>`;
    const b = det.querySelector('.body');

    // reorder + remove toolbar
    const bar = document.createElement('div'); bar.className = 'inline'; bar.style.marginBottom = '.6rem';
    bar.innerHTML =
      `<button class="btn btn-ghost" data-act="up" title="move up" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
       <button class="btn btn-ghost" data-act="down" title="move down" ${i === list.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
       <span class="sp"></span>
       <button class="btn btn-ghost" data-act="rm" title="remove project" style="color:var(--coral)"><i class="fa-solid fa-trash"></i> remove</button>`;
    b.append(bar);

    // screenshot
    const shotWrap = document.createElement('div'); shotWrap.className = 'fld';
    shotWrap.innerHTML =
      `<label>screenshot</label>
       <div class="inline" style="align-items:center">
         ${p.shot ? `<img src="/${esc(p.shot)}" alt="" style="width:88px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line2)">` : '<span class="st">no image · placeholder emoji shown</span>'}
         <button class="btn btn-ghost" data-act="upload"><i class="fa-solid fa-image"></i> ${p.shot ? 'replace' : 'upload'}</button>
         ${p.shot ? '<button class="btn btn-ghost" data-act="unshoot" style="color:var(--coral)">remove image</button>' : ''}
         <input type="file" accept="image/*" data-act="file" hidden>
       </div>`;
    b.append(shotWrap);

    // plain fields
    b.append(fRow('name', 'name', p.name));
    b.append(fRow('slug', 'slug (url id)', p.slug));
    b.append(fRow('emoji', 'emoji', p.emoji));
    b.append(fRow('link', 'live link (blank = private)', p.link));
    b.append(fRow('year', 'year', p.year));
    b.append(fRow('price', 'price shown on card (e.g. "€500" — blank hides)', p.price));
    b.append(fRow('tint', 'accent color (#hex)', p.tint));
    b.append(fRow('tags', 'tags (comma separated)', commaIn(p.tags)));
    b.append(fRow('stack', 'tech stack (comma separated)', commaIn(p.stack)));

    // bilingual blurbs
    b.append(langRow('one', 'short blurb (card)', p.one));
    b.append(langRow('long', 'long description (detail page)', p.long));

    // story toggle
    const hasStory = !!p.story;
    const storyHead = document.createElement('div'); storyHead.className = 'fld';
    storyHead.innerHTML = `<label style="display:flex;align-items:center;gap:.5rem"><input type="checkbox" data-act="storytoggle" ${hasStory ? 'checked' : ''}> case study (problem / did / outcome)</label>`;
    b.append(storyHead);
    if (hasStory) {
      b.append(langRow('story.why', 'the problem', p.story.why));
      b.append(langRow('story.did', 'what I did', p.story.did));
      b.append(langRow('story.out', 'the outcome', p.story.out));
    }
    host.append(det);
  });
  wireProjCMS();
  projDirtyCMS();
}

function fRow(key, lbl, val) {
  const d = document.createElement('div'); d.className = 'fld'; d.dataset.k = key;
  d.innerHTML = `<label>${esc(lbl)}</label><input data-k="${key}" value="${esc(val == null ? '' : val)}">`;
  return d;
}
function langRow(key, lbl, cur) {
  cur = cur || {};
  const d = document.createElement('div'); d.className = 'fld'; d.dataset.k = key;
  const mk = L => `<div><span class="tag">${L}</span><textarea data-k="${key}" data-lang="${L}" rows="1">${esc(cur[L] || '')}</textarea></div>`;
  d.innerHTML = `<label>${esc(lbl)}</label><div class="langrow">${mk('en')}${mk('de')}</div>`;
  return d;
}

function wireProjCMS() {
  const host = $('#projGroups');
  host.querySelectorAll('textarea').forEach(ta => { autoGrow(ta); ta.addEventListener('input', () => { autoGrow(ta); editProj(ta); }); });
  host.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('input', () => editProj(inp)));
  host.querySelectorAll('[data-act]').forEach(btn => {
    const act = btn.dataset.act;
    if (act === 'file') { btn.addEventListener('change', e => uploadShot(e.target)); return; }
    btn.addEventListener('click', e => {
      const i = +btn.closest('details').dataset.i, arr = materialize();
      if (act === 'up' && i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; renderProjectsCMS(); }
      else if (act === 'down' && i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; renderProjectsCMS(); }
      else if (act === 'rm') { if (confirm('Remove "' + (arr[i].name || 'this project') + '"?')) { arr.splice(i, 1); renderProjectsCMS(); } }
      else if (act === 'upload') { btn.closest('.inline').querySelector('[data-act=file]').click(); }
      else if (act === 'unshoot') { arr[i].shot = ''; renderProjectsCMS(); }
      else if (act === 'storytoggle') {
        if (btn.checked) arr[i].story = { why: { en: '', de: '' }, did: { en: '', de: '' }, out: { en: '', de: '' } };
        else delete arr[i].story;
        renderProjectsCMS();
      }
    });
  });
}

function editProj(inp) {
  const i = +inp.closest('details').dataset.i, arr = materialize(), p = arr[i];
  const k = inp.dataset.k, L = inp.dataset.lang;
  if (L) { const parts = k.split('.'); if (parts.length === 2) { (p.story ||= {}); (p.story[parts[1]] = bi(p.story[parts[1]]))[L] = inp.value; } else { (p[k] = bi(p[k]))[L] = inp.value; } }
  else if (k === 'tags' || k === 'stack') p[k] = commaOut(inp.value);
  else if (k === 'year') p[k] = Number(inp.value) || inp.value;
  else p[k] = inp.value;
  projDirtyCMS();
}

async function uploadShot(fileInput) {
  const f = fileInput.files && fileInput.files[0]; if (!f) return;
  const i = +fileInput.closest('details').dataset.i;
  toast('Uploading…');
  try {
    const r = await api('/api/upload', { method: 'POST', headers: { 'content-type': f.type || 'application/octet-stream' }, body: f });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'upload failed');
    materialize()[i].shot = d.path; renderProjectsCMS(); toast('Image added ✓ — save to publish');
  } catch (e) { toast('Upload failed: ' + e.message); }
}

function addProject() {
  const arr = materialize();
  const n = arr.length + 1;
  arr.push({ slug: 'project-' + n, name: 'New project', emoji: '📦', year: new Date().getFullYear(), link: '', tint: '#8a7dff', price: '', shot: '', tags: [], stack: [], one: { en: '', de: '' }, long: { en: '', de: '' } });
  renderProjectsCMS();
  const last = $('#projGroups').lastElementChild; if (last) { last.open = true; last.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function projDirtyCMS() {
  const st = $('#projSt'); if (!st) return;
  const changed = projChanged();
  const n = projs().length;
  st.textContent = changed ? `${n} project${n === 1 ? '' : 's'} (structure edited)` : 'no changes';
  st.classList.toggle('dirty', changed);
}

/* ── BUILD TAB: sections / timeline / blocks ── */
function secList() { if (!Array.isArray(OV.sections)) OV.sections = DEFAULTS.sections.map((s, i) => ({ id: s.id, on: true, order: i })); return OV.sections; }
function tlList() { if (!Array.isArray(OV.timeline)) OV.timeline = clone(DEFAULTS.timeline); return OV.timeline; }
function blkList() { if (!Array.isArray(OV.blocks)) OV.blocks = []; return OV.blocks; }

function renderSections() {
  const defs = DEFAULTS.sections || [];
  const cur = Array.isArray(OV.sections) ? OV.sections : defs.map((s, i) => ({ id: s.id, on: true, order: i }));
  const label = id => (defs.find(d => d.id === id) || {}).label || id;
  const ordered = [...cur].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const host = $('#secList'); host.innerHTML = '';
  ordered.forEach((s, idx) => {
    const row = document.createElement('div'); row.className = 'prow'; row.dataset.id = s.id;
    row.innerHTML =
      `<div class="nm">${esc(label(s.id))}<small>${esc(s.id)}</small></div>
       <div class="inline">
         <button class="btn btn-ghost" data-act="up" ${idx === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
         <button class="btn btn-ghost" data-act="down" ${idx === ordered.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
         <label class="tag" style="cursor:pointer"><input type="checkbox" data-act="on" ${s.on !== false ? 'checked' : ''}> visible</label>
       </div>`;
    host.append(row);
  });
  $('#secCount').textContent = ordered.length;
  host.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
    const id = b.closest('.prow').dataset.id, arr = secList();
    const sorted = [...arr].sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
    const pos = sorted.findIndex(x => x.id === id);
    if (b.dataset.act === 'on') { arr.find(x => x.id === id).on = b.checked; buildDirty(); return; }
    if (b.dataset.act === 'up' && pos > 0) [sorted[pos - 1], sorted[pos]] = [sorted[pos], sorted[pos - 1]];
    if (b.dataset.act === 'down' && pos < sorted.length - 1) [sorted[pos + 1], sorted[pos]] = [sorted[pos], sorted[pos + 1]];
    sorted.forEach((x, i) => x.order = i);
    OV.sections = sorted; renderSections(); buildDirty();
  }));
}

function renderTimeline() {
  const list = tlList();
  const host = $('#tlList'); host.innerHTML = '';
  list.forEach((r, i) => {
    const c = document.createElement('div'); c.className = 'wcard'; c.dataset.i = i;
    c.innerHTML =
      `<button class="rm" data-act="rm" title="remove"><i class="fa-solid fa-trash"></i></button>
       <div class="inline"><input data-f="year" placeholder="year (e.g. 2024 or now)" value="${esc(r.year || '')}">
         <label class="tag" style="cursor:pointer"><input type="checkbox" data-f="now" ${r.now ? 'checked' : ''}> "now" highlight</label></div>
       <div class="fld"><div class="langrow">
         <div><span class="tag">en</span><textarea data-f="en" rows="1">${esc(r.en || '')}</textarea></div>
         <div><span class="tag">de</span><textarea data-f="de" rows="1">${esc(r.de || '')}</textarea></div>
       </div></div>`;
    host.append(c);
  });
  $('#tlCount').textContent = list.length;
  host.querySelectorAll('textarea').forEach(autoGrow);
  host.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('input', () => {
    const i = +inp.closest('.wcard').dataset.i, r = tlList()[i];
    r[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value;
    if (inp.tagName === 'TEXTAREA') autoGrow(inp);
    buildDirty();
  }));
  host.querySelectorAll('[data-act=rm]').forEach(b => b.addEventListener('click', () => { tlList().splice(+b.closest('.wcard').dataset.i, 1); renderTimeline(); buildDirty(); }));
}

function renderBlocks() {
  const list = blkList();
  const host = $('#blkList'); host.innerHTML = '';
  list.forEach((bk, i) => {
    const c = document.createElement('div'); c.className = 'wcard'; c.dataset.i = i;
    c.innerHTML =
      `<button class="rm" data-act="rm" title="remove"><i class="fa-solid fa-trash"></i></button>
       <div class="inline"><label class="tag" style="cursor:pointer"><input type="checkbox" data-f="on" ${bk.on !== false ? 'checked' : ''}> visible</label>
         ${bk.image ? `<img src="/${esc(bk.image)}" style="width:64px;height:40px;object-fit:cover;border-radius:6px">` : ''}
         <button class="btn btn-ghost" data-act="img"><i class="fa-solid fa-image"></i> ${bk.image ? 'replace' : 'image'}</button>
         <input type="file" accept="image/*" data-act="file" hidden></div>
       <div class="fld"><label>heading</label><div class="langrow">
         <div><span class="tag">en</span><input data-f="title_en" value="${esc(bk.title_en || '')}"></div>
         <div><span class="tag">de</span><input data-f="title_de" value="${esc(bk.title_de || '')}"></div></div></div>
       <div class="fld"><label>body</label><div class="langrow">
         <div><span class="tag">en</span><textarea data-f="body_en" rows="2">${esc(bk.body_en || '')}</textarea></div>
         <div><span class="tag">de</span><textarea data-f="body_de" rows="2">${esc(bk.body_de || '')}</textarea></div></div></div>`;
    host.append(c);
  });
  $('#blkCount').textContent = list.length;
  host.querySelectorAll('textarea').forEach(autoGrow);
  host.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('input', () => {
    const i = +inp.closest('.wcard').dataset.i, bk = blkList()[i];
    bk[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value;
    if (inp.tagName === 'TEXTAREA') autoGrow(inp);
    buildDirty();
  }));
  host.querySelectorAll('[data-act=rm]').forEach(b => b.addEventListener('click', () => { blkList().splice(+b.closest('.wcard').dataset.i, 1); renderBlocks(); buildDirty(); }));
  host.querySelectorAll('[data-act=img]').forEach(b => b.addEventListener('click', () => b.closest('.inline').querySelector('[data-act=file]').click()));
  host.querySelectorAll('[data-act=file]').forEach(inp => inp.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const i = +inp.closest('.wcard').dataset.i;
    toast('Uploading…');
    try {
      const r = await api('/api/upload', { method: 'POST', headers: { 'content-type': f.type || 'application/octet-stream' }, body: f });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'failed');
      blkList()[i].image = d.path; renderBlocks(); buildDirty(); toast('Image added ✓');
    } catch (err) { toast('Upload failed: ' + err.message); }
  }));
}

function buildDirty() {
  const changed = (Array.isArray(OV.sections) && JSON.stringify(OV.sections) !== JSON.stringify(DEFAULTS.sections.map((s, i) => ({ id: s.id, on: true, order: i }))))
    || (Array.isArray(OV.timeline) && JSON.stringify(OV.timeline) !== JSON.stringify(DEFAULTS.timeline))
    || (Array.isArray(OV.blocks) && OV.blocks.length > 0);
  const st = $('#buildSt'); if (!st) return;
  st.textContent = changed ? 'unsaved structure changes' : 'no changes';
  st.classList.toggle('dirty', changed);
}

function renderBuild() { renderSections(); renderTimeline(); renderBlocks(); buildDirty(); }

/* ── hook into admin.js load + wire buttons ── */
function cmsAfterLoad() {
  renderProjectsCMS();   // take over the projects tab with full CRUD
  renderBuild();
}

document.addEventListener('DOMContentLoaded', () => {
  // defer until admin.js main() has wired the base UI; buttons live in the DOM already
  const wire = () => {
    const add = $('#projAdd'); if (add) add.onclick = addProject;
    const preset = $('#projReset'); if (preset) preset.onclick = () => { OV.projectsFull = null; OV.projects = {}; renderProjectsCMS(); toast('Projects reset to defaults — save to apply'); };
    const tlAdd = $('#tlAdd'); if (tlAdd) tlAdd.onclick = () => { tlList().push({ year: '', en: '', de: '', now: false }); renderTimeline(); buildDirty(); };
    const blkAdd = $('#blkAdd'); if (blkAdd) blkAdd.onclick = () => { blkList().push({ on: true, title_en: '', title_de: '', body_en: '', body_de: '', image: '' }); renderBlocks(); buildDirty(); };
    const bSave = $('#buildSave'); if (bSave) bSave.onclick = () => saveOverrides('build');
    const bReset = $('#buildReset'); if (bReset) bReset.onclick = () => { OV.sections = null; OV.timeline = null; OV.blocks = null; renderBuild(); toast('Structure reset — save to apply'); };
  };
  // admin.js binds on DOMContentLoaded too; run after a tick so DEFAULTS/OV may not exist yet — buttons are static so wiring is safe now
  setTimeout(wire, 0);
});
