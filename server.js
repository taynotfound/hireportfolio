'use strict';
// Static server for tay.märz portfolio + contact intake + admin PWA w/ web push.
// Rebuilds heatmap.svg + waka-badge.svg on boot & daily. Zero external requests on the public page.
// Run: node server.js  (PORT env optional)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const webpush = require('web-push');

const ROOT = __dirname;
const PORT = process.env.PORT || 2500;
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin-config.json'), 'utf8'));
const SUBS_FILE = path.join(ROOT, 'push-subs.json');
const CONTACTS = path.join(ROOT, 'contacts.jsonl');
const OVERRIDES = path.join(ROOT, 'overrides.json');
const ANALYTICS_FILE = path.join(ROOT, 'analytics.json');
webpush.setVapidDetails(CFG.subject, CFG.vapidPublic, CFG.vapidPrivate);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

// Only these are ever served. Everything else (source, data, config, dotfiles) 404s.
const PUBLIC_FILES = new Set(['/index.html', '/admin.html', '/datenschutz.html', '/de_seed.html',
  '/style.css', '/app.js', '/i18n.js', '/pricing.js', '/admin.js', '/admin.webmanifest', '/sw.js',
  '/heatmap.svg', '/waka-badge.svg']);
const PUBLIC_DIRS = ['/shots/', '/icons/', '/vendor/', '/uploads/'];
const ALIASES = { '/': '/index.html', '/admin': '/admin.html', '/admin/': '/admin.html',
  '/panel': '/admin.html', '/panel/': '/admin.html', '/datenschutz': '/datenschutz.html', '/de': '/de_seed.html' };

const readJSON = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };
const writeJSON = (f, data) => fs.writeFileSync(f, JSON.stringify(data, null, 2));
const loadSubs = () => readJSON(SUBS_FILE, []);
const saveSubs = s => fs.writeFileSync(SUBS_FILE, JSON.stringify(s));
const clientIp = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

// ── sessions (in-memory; admin logs in with the token, gets a cookie) ──
const sessions = new Set();
const newSession = () => { const t = crypto.randomBytes(24).toString('base64url'); sessions.add(t); return t; };
const cookieOf = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => {
  const i = c.indexOf('='); if (i < 0) return [];
  try { return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1).trim())]; } catch { return []; }
}).filter(x => x.length));
const isAuthed = req => sessions.has(cookieOf(req).sid);
const tokenOK = t => { try { return crypto.timingSafeEqual(Buffer.from(String(t)), Buffer.from(CFG.adminToken)); } catch { return false; } };

function rebuild() {
  for (const s of ['build_heatmap.py', 'build_badge.py']) {
    execFile('python3', [path.join(ROOT, s)], { cwd: ROOT, timeout: 30000, env: process.env }, (err, out, e) => {
      console.log(`[stats] ${s}: ${err ? 'FAIL ' + (e || err.message).trim() : (out || '').trim()}`);
    });
  }
}

function body(req) {
  return new Promise((resolve, reject) => {
    let b = ''; req.on('data', c => { b += c; if (b.length > 300000) req.destroy(); });
    req.on('end', () => resolve(b)); req.on('error', reject);
  });
}
const readBody = async req => { try { return JSON.parse(await body(req)); } catch { return undefined; } };
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

async function pushAll(payload) {
  const subs = loadSubs(); const dead = [];
  await Promise.all(subs.map(s => webpush.sendNotification(s, JSON.stringify(payload)).catch(err => {
    if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.endpoint);
  })));
  if (dead.length) saveSubs(subs.filter(s => !dead.includes(s.endpoint)));
}

// ── content defaults (re-read so edits to i18n.js / pricing.js show up without a restart) ──
function defaults() {
  for (const f of ['./i18n.js', './pricing.js']) delete require.cache[require.resolve(f)];
  const I = require('./i18n.js'), Pr = require('./pricing.js');
  return {
    text: I.T,
    pricing: { BASES: Pr.BASES, ADDONS: Pr.ADDONS, SUPPORT: Pr.SUPPORT, RATES: Pr.RATES },
    projects: I.PROJECTS,
    testimonials: I.TESTIMONIALS,
    sections: [
      { id: 'work', label: 'Projects / Work' },
      { id: 'words', label: 'Testimonials' },
      { id: 'price', label: 'Package builder / Pricing' },
      { id: 'how', label: 'How it works' },
      { id: 'more', label: 'More / about & security' },
      { id: 'cms-blocks', label: 'Custom blocks' },
      { id: 'hi', label: 'Contact' },
    ],
    timeline: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map(r => ({
      year: I.T.en['path.' + r + 'y'], en: I.T.en['path.' + r], de: I.T.de['path.' + r], now: r === 'r6',
    })),
  };
}

// Overrides on disk may still use the old partial `projects` / `pricing` shapes. Fold them into the
// full-list shapes so the page and the admin only ever deal with one format.
function loadOverrides() {
  const ov = readJSON(OVERRIDES, {});
  if (!ov.projects && !ov.pricing) return ov;
  const D = defaults();
  if (ov.projects && !ov.projectsFull) {
    const list = structuredClone(D.projects);
    for (const p of list) {
      const o = ov.projects[p.slug]; if (!o) continue;
      for (const f of ['name', 'link', 'year']) if (o[f] != null && o[f] !== '') p[f] = o[f];
      for (const f of ['one', 'long']) if (o[f]) Object.assign(p[f], Object.fromEntries(Object.entries(o[f]).filter(([, v]) => v)));
    }
    if (JSON.stringify(list) !== JSON.stringify(D.projects)) ov.projectsFull = list;
  }
  if (ov.pricing && !ov.pricingFull) {
    const full = structuredClone(D.pricing);
    for (const g of ['BASES', 'ADDONS', 'SUPPORT']) for (const k in ov.pricing[g] || {}) {
      if (full[g][k]) for (const f of ['price', 'days', 'monthly']) if (typeof ov.pricing[g][k][f] === 'number') full[g][k][f] = ov.pricing[g][k][f];
    }
    if (ov.pricing.RATES) Object.assign(full.RATES, ov.pricing.RATES);
    ov.pricingFull = full;
  }
  delete ov.projects; delete ov.pricing;
  return ov;
}

// ── validation for what the admin saves ──
const str = (v, n = 4000) => (v == null ? '' : String(v).slice(0, n));
const bi = (o, n) => ({ en: str(o && o.en, n), de: str(o && o.de, n) });
const num = (v, max = 1e7) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.min(x, max) : 0; };
const keyOf = k => String(k).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);

function cleanPricing(p) {
  const out = { BASES: {}, ADDONS: {}, SUPPORT: {}, RATES: {} };
  const fields = { BASES: ['price', 'days'], ADDONS: ['price'], SUPPORT: ['monthly'] };
  for (const g in fields) for (const [k, v] of Object.entries((p && p[g]) || {}).slice(0, 40)) {
    const key = keyOf(k); if (!key || !v) continue;
    out[g][key] = { label: bi(v.label, 120) };
    for (const f of fields[g]) out[g][key][f] = num(v[f]);
  }
  const r = (p && p.RATES) || {};
  out.RATES = { rush: num(r.rush, 10) || 1.2, retainer: Math.min(num(r.retainer, 1), 0.9) };
  if (!Object.keys(out.BASES).length || !Object.keys(out.SUPPORT).length) return null; // builder needs both
  return out;
}

function cleanProject(p) {
  if (!p || typeof p !== 'object' || !p.name) return null;
  const o = {
    name: str(p.name, 80), slug: keyOf(p.slug || p.name) || 'project', emoji: str(p.emoji, 16),
    year: str(p.year, 12), link: str(p.link, 300), tint: /^#[0-9a-f]{3,8}$/i.test(p.tint || '') ? p.tint : '#ff5c66',
    price: str(p.price, 40), shot: str(p.shot, 200), tilt: Math.max(-4, Math.min(4, Number(p.tilt) || 0)),
    one: bi(p.one, 400), long: bi(p.long, 3000),
    tags: (Array.isArray(p.tags) ? p.tags : []).slice(0, 8).map(x => str(x, 30)),
    stack: (Array.isArray(p.stack) ? p.stack : []).slice(0, 12).map(x => str(x, 30)),
  };
  if (p.story && typeof p.story === 'object') o.story = { why: bi(p.story.why), did: bi(p.story.did), out: bi(p.story.out) };
  return o;
}

function cleanOverrides(d) {
  const c = {};
  if (d.text && typeof d.text === 'object') {
    c.text = {};
    for (const L of ['en', 'de']) c.text[L] = Object.fromEntries(Object.entries(d.text[L] || {})
      .filter(([, v]) => typeof v === 'string').map(([k, v]) => [str(k, 60), str(v, 6000)]));
  }
  if (Array.isArray(d.projectsFull)) c.projectsFull = d.projectsFull.slice(0, 60).map(cleanProject).filter(Boolean);
  if (d.pricingFull) { const p = cleanPricing(d.pricingFull); if (p) c.pricingFull = p; }
  if (Array.isArray(d.testimonials)) c.testimonials = d.testimonials.slice(0, 50).filter(t => t && t.name)
    .map(t => ({ name: str(t.name, 80), link: str(t.link, 300), role: bi(t.role, 120), quote: bi(t.quote, 1500) }));
  if (Array.isArray(d.sections)) c.sections = d.sections.slice(0, 40)
    .map((s, i) => ({ id: str(s && s.id, 40), on: !(s && s.on === false), order: Number(s && s.order) || i }));
  if (Array.isArray(d.timeline)) c.timeline = d.timeline.slice(0, 60)
    .map(r => ({ year: str(r && r.year, 20), en: str(r && r.en, 600), de: str(r && r.de, 600), now: !!(r && r.now) }));
  if (Array.isArray(d.blocks)) c.blocks = d.blocks.slice(0, 40).map(b => ({ on: !(b && b.on === false),
    title_en: str(b && b.title_en, 200), title_de: str(b && b.title_de, 200),
    body_en: str(b && b.body_en, 6000), body_de: str(b && b.body_de, 6000), image: str(b && b.image, 200) }));
  return c;
}

// ── ?ref= analytics: totals per source + per-day breakdown (no IPs, no cookies stored) ──
function loadAnalytics() {
  const a = readJSON(ANALYTICS_FILE, {});
  if (a.v === 2) return a;
  return { v: 2, sources: a, days: {} }; // migrate the old flat { source: count } file
}
const recentHits = new Map(); // ip|source -> ts, dedupes refreshes for 30 min
function track(ip, source) {
  const now = Date.now(), k = ip + '|' + source;
  if (now - (recentHits.get(k) || 0) < 30 * 60e3) return;
  recentHits.set(k, now);
  if (recentHits.size > 5000) for (const [kk, t] of recentHits) if (now - t > 30 * 60e3) recentHits.delete(kk);
  const a = loadAnalytics(), day = new Date().toISOString().slice(0, 10);
  a.sources[source] = (a.sources[source] || 0) + 1;
  (a.days[day] ||= {})[source] = (a.days[day][source] || 0) + 1;
  const keep = Object.keys(a.days).sort().slice(-400);
  a.days = Object.fromEntries(keep.map(d => [d, a.days[d]]));
  writeJSON(ANALYTICS_FILE, a);
}

const readLeads = () => (fs.existsSync(CONTACTS) ? fs.readFileSync(CONTACTS, 'utf8').split('\n') : [])
  .filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const t0 = Date.now();
  res.on('finish', () => console.log(`[req] ${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - t0}ms`));
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('x-frame-options', 'DENY');
  const POST = req.method === 'POST';

  // ── public endpoints ──
  if (POST && url === '/contact') {
    const d = await readBody(req); if (!d) return json(res, 400, { error: 'bad json' });
    if (d.company) return json(res, 200, { ok: true }); // honeypot: bot filled it → silently accept, drop
    if (!d.name || !d.email || !d.message || !d.referral) return json(res, 422, { error: 'missing fields' });
    const rec = { id: crypto.randomBytes(6).toString('hex'), at: new Date().toISOString(), ip: clientIp(req),
      name: str(d.name, 200), email: str(d.email, 200), message: str(d.message, 5000), referral: str(d.referral, 300),
      channel: str(d.channel, 60), meet: d.meet === 'irl' ? 'irl' : 'online', city: str(d.city, 100),
      availability: str(d.availability, 300), phone: str(d.phone, 60) };
    try { fs.appendFileSync(CONTACTS, JSON.stringify(rec) + '\n'); }
    catch (err) { console.error('[contact] write failed', err); return json(res, 500, { error: 'err' }); }
    console.log(`[contact] ${rec.name} <${rec.email}> via "${rec.referral}"${rec.meet === 'irl' ? ' · IRL ' + rec.city : ''}`);
    await pushAll({ title: `New lead: ${rec.name}`, body: rec.message.slice(0, 120), tag: rec.id, url: '/admin/' });
    return json(res, 200, { ok: true });
  }

  if (POST && url === '/api/track') {
    const d = await readBody(req);
    const source = d && keyOf(String(d.source || '').replace(/\s+/g, '-'));
    if (source) track(clientIp(req), source);
    return json(res, 200, { ok: true });
  }

  if (url === '/api/vapid') return json(res, 200, { key: CFG.vapidPublic });
  if (url === '/api/public-overrides') return json(res, 200, loadOverrides());

  if (POST && url === '/api/login') {
    const d = await readBody(req);
    if (!d || !tokenOK(d.token)) return json(res, 401, { error: 'nope' });
    const secure = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted ? '; Secure' : '';
    res.writeHead(200, { 'content-type': 'application/json',
      'set-cookie': `sid=${newSession()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}` });
    return res.end('{"ok":true}');
  }

  // ── everything else under /api/ requires an admin session ──
  if (url.startsWith('/api/')) {
    if (!isAuthed(req)) return json(res, 401, { error: 'auth' });

    if (url === '/api/me') return json(res, 200, { ok: true });

    if (POST && url === '/api/logout') {
      sessions.delete(cookieOf(req).sid);
      res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'sid=; Path=/; Max-Age=0' });
      return res.end('{"ok":true}');
    }

    if (url === '/api/analytics') return json(res, 200, loadAnalytics());

    if (url === '/api/contacts') return json(res, 200, { items: readLeads().reverse() });

    if (POST && url === '/api/contacts/delete') {
      const d = await readBody(req); if (!d || !d.id) return json(res, 400, { error: 'no id' });
      const keep = readLeads().filter(l => l.id !== d.id);
      fs.writeFileSync(CONTACTS, keep.map(l => JSON.stringify(l)).join('\n') + (keep.length ? '\n' : ''));
      return json(res, 200, { ok: true });
    }

    if (POST && url === '/api/subscribe') {
      const sub = await readBody(req);
      if (!sub || !sub.endpoint) return json(res, 400, { error: 'no endpoint' });
      const subs = loadSubs();
      if (!subs.find(s => s.endpoint === sub.endpoint)) { subs.push(sub); saveSubs(subs); }
      return json(res, 200, { ok: true });
    }

    if (url === '/api/test-push') {
      await pushAll({ title: 'Test ✓', body: 'Push works. You will hear about new leads here.', tag: 'test', url: '/admin/' });
      return json(res, 200, { ok: true });
    }

    if (url === '/api/admin-content') return json(res, 200, { defaults: defaults(), overrides: loadOverrides() });

    if (POST && url === '/api/overrides') {
      const d = await readBody(req);
      if (!d || typeof d !== 'object' || Array.isArray(d)) return json(res, 422, { error: 'shape' });
      writeJSON(OVERRIDES, cleanOverrides(d));
      return json(res, 200, { ok: true });
    }

    // upload an image → optimize to webp under /uploads, return its path
    if (POST && url === '/api/upload') {
      const chunks = []; let size = 0, tooBig = false;
      req.on('data', c => { size += c.length; if (size > 12 * 1024 * 1024) { tooBig = true; req.destroy(); } else chunks.push(c); });
      req.on('end', async () => {
        if (tooBig) return json(res, 413, { error: 'too big (12MB max)' });
        try {
          const sharp = require('sharp');
          const out = await sharp(Buffer.concat(chunks)).rotate()
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
          const dir = path.join(ROOT, 'uploads');
          fs.mkdirSync(dir, { recursive: true });
          const name = crypto.randomBytes(8).toString('hex') + '.webp';
          fs.writeFileSync(path.join(dir, name), out);
          console.log(`[upload] ${name} ${out.length}b`);
          return json(res, 200, { ok: true, path: 'uploads/' + name });
        } catch (e) { console.error('[upload]', e.message); return json(res, 500, { error: 'not an image we can read' }); }
      });
      req.on('error', () => json(res, 400, { error: 'stream' }));
      return;
    }

    return json(res, 404, { error: 'no such endpoint' });
  }

  // ── static files (whitelist) ──
  let p; try { p = decodeURIComponent(url); } catch { res.writeHead(400); return res.end('bad url'); }
  p = ALIASES[p] || p;
  const fp = path.normalize(path.join(ROOT, p));
  const allowed = fp.startsWith(ROOT + path.sep) && !p.includes('/.') &&
    (PUBLIC_FILES.has(p) || PUBLIC_DIRS.some(d => p.startsWith(d)));
  if (!allowed) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404'); }
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404'); }
    const h = { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' };
    if (p === '/sw.js') { h['service-worker-allowed'] = '/'; h['cache-control'] = 'no-cache'; }
    else if (p.startsWith('/admin')) h['cache-control'] = 'no-store';
    else if (PUBLIC_DIRS.some(d => p.startsWith(d))) h['cache-control'] = 'public, max-age=604800';
    else h['cache-control'] = 'no-cache';
    res.writeHead(200, h);
    res.end(buf);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`portfolio on http://127.0.0.1:${PORT}`);
  rebuild();
  setInterval(rebuild, 24 * 60 * 60 * 1000);
});
