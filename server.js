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
const PORT = process.env.PORT || 5700;
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin-config.json'), 'utf8'));
const SUBS_FILE = path.join(ROOT, 'push-subs.json');
const CONTACTS = path.join(ROOT, 'contacts.jsonl');
const OVERRIDES = path.join(ROOT, 'overrides.json');
webpush.setVapidDetails(CFG.subject, CFG.vapidPublic, CFG.vapidPrivate);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };

const readJSON = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };
const loadSubs = () => readJSON(SUBS_FILE, []);
const saveSubs = s => fs.writeFileSync(SUBS_FILE, JSON.stringify(s));

// ── sessions (in-memory; admin logs in with the token, gets a cookie) ──
const sessions = new Set();
const newSession = () => { const t = crypto.randomBytes(24).toString('base64url'); sessions.add(t); return t; };
const cookieOf = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=').map(decodeURIComponent)).filter(x => x[0]));
const isAuthed = req => sessions.has(cookieOf(req).sid);
// timing-safe token compare
const tokenOK = t => { try { return crypto.timingSafeEqual(Buffer.from(String(t)), Buffer.from(CFG.adminToken)); } catch { return false; } };

function rebuild() {
  for (const s of ['build_heatmap.py', 'build_badge.py']) {
    execFile('python3', [path.join(ROOT, s)], { cwd: ROOT, timeout: 30000 }, (err, out, e) => {
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
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

async function pushAll(payload) {
  const subs = loadSubs(); let dead = [];
  await Promise.all(subs.map(s => webpush.sendNotification(s, JSON.stringify(payload)).catch(err => {
    if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.endpoint);
  })));
  if (dead.length) saveSubs(subs.filter(s => !dead.includes(s.endpoint)));
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const _t = Date.now();
  res.on('finish', () => console.log(`[req] ${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - _t}ms`));

  // ── contact intake → append + push notify ──
  if (req.method === 'POST' && url === '/contact') {
    let d; try { d = JSON.parse(await body(req)); } catch { return json(res, 400, { error: 'bad json' }); }
    if (d.company) return json(res, 200, { ok: true }); // honeypot: bot filled it → silently accept, drop
    if (!d.name || !d.email || !d.message || !d.referral) return json(res, 422, { error: 'missing fields' });
    const rec = { id: crypto.randomBytes(6).toString('hex'), at: new Date().toISOString(), ip: req.socket.remoteAddress,
      name: String(d.name).slice(0, 200), email: String(d.email).slice(0, 200),
      message: String(d.message).slice(0, 5000), referral: String(d.referral).slice(0, 300),
      channel: String(d.channel || '').slice(0, 60),
      meet: d.meet === 'irl' ? 'irl' : 'online', city: String(d.city || '').slice(0, 100),
      availability: String(d.availability || '').slice(0, 300), phone: String(d.phone || '').slice(0, 60) };
    fs.appendFile(CONTACTS, JSON.stringify(rec) + '\n', async err => {
      if (err) { console.error('[contact] write failed', err); return json(res, 500, { error: 'err' }); }
      console.log(`[contact] ${rec.name} <${rec.email}> via "${rec.referral}"${rec.meet === 'irl' ? ' · IRL ' + rec.city : ''}`);
      await pushAll({ title: `New lead: ${rec.name}`, body: `${rec.message.slice(0, 120)}`, tag: rec.id, url: '/admin/' });
      json(res, 200, { ok: true });
    });
    return;
  }

  // ── public VAPID key (needed to subscribe) ──
  if (url === '/api/vapid') return json(res, 200, { key: CFG.vapidPublic });

  // ── public: saved content/pricing overrides (merged over defaults by the page) ──
  if (url === '/api/public-overrides') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-cache' });
    return res.end(JSON.stringify(readJSON(OVERRIDES, {})));
  }

  // ── admin login: exchange token for session cookie ──
  if (req.method === 'POST' && url === '/api/login') {
    let d; try { d = JSON.parse(await body(req)); } catch { return json(res, 400, { error: 'bad json' }); }
    if (!tokenOK(d.token)) return json(res, 401, { error: 'nope' });
    const sid = newSession();
    res.writeHead(200, { 'content-type': 'application/json',
      'set-cookie': `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` });
    return res.end('{"ok":true}');
  }

  // ── everything below requires an admin session ──
  const adminApi = url.startsWith('/api/') && url !== '/api/vapid';
  if (adminApi && !isAuthed(req)) return json(res, 401, { error: 'auth' });

  if (url === '/api/me') return json(res, 200, { ok: true });

  if (req.method === 'POST' && url === '/api/subscribe') {
    let sub; try { sub = JSON.parse(await body(req)); } catch { return json(res, 400, { error: 'bad json' }); }
    if (!sub || !sub.endpoint) return json(res, 400, { error: 'no endpoint' });
    const subs = loadSubs();
    if (!subs.find(s => s.endpoint === sub.endpoint)) { subs.push(sub); saveSubs(subs); }
    return json(res, 200, { ok: true });
  }

  if (url === '/api/test-push') { await pushAll({ title: 'Test ✓', body: 'Push works. You will hear about new leads here.', tag: 'test', url: '/admin/' }); return json(res, 200, { ok: true }); }

  if (url === '/api/contacts') {
    const lines = fs.existsSync(CONTACTS) ? fs.readFileSync(CONTACTS, 'utf8').trim().split('\n').filter(Boolean) : [];
    const items = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();
    return json(res, 200, { items });
  }

  // ── admin: full defaults + saved overrides, for the editor forms ──
  if (url === '/api/admin-content') {
    delete require.cache[require.resolve('./i18n.js')];
    delete require.cache[require.resolve('./pricing.js')];
    const I = require('./i18n.js'), Pr = require('./pricing.js');
    const defaults = {
      text: I.T,
      pricing: { BASES: Pr.BASES, ADDONS: Pr.ADDONS, SUPPORT: Pr.SUPPORT, RATES: Pr.RATES },
      projects: I.PROJECTS,
      testimonials: I.TESTIMONIALS,
    };
    return json(res, 200, { defaults, overrides: readJSON(OVERRIDES, {}) });
  }

  // ── admin: save overrides (validated shape, capped size) ──
  if (req.method === 'POST' && url === '/api/overrides') {
    let d; try { d = JSON.parse(await body(req)); } catch { return json(res, 400, { error: 'bad json' }); }
    if (!d || typeof d !== 'object' || Array.isArray(d)) return json(res, 422, { error: 'shape' });
    const clean = {};
    if (d.text && typeof d.text === 'object') clean.text = d.text;      // { en:{k:v}, de:{k:v} }
    if (d.pricing && typeof d.pricing === 'object') clean.pricing = d.pricing;
    if (d.projects && typeof d.projects === 'object') clean.projects = d.projects;   // { slug: {field:val | {en,de}} }
    if (Array.isArray(d.testimonials)) clean.testimonials = d.testimonials.slice(0, 50);
    fs.writeFileSync(OVERRIDES, JSON.stringify(clean, null, 2));
    return json(res, 200, { ok: true });
  }

  // ── static files ──
  let p = decodeURIComponent(url);
  if (p === '/') p = '/index.html';
  if (p === '/admin' || p === '/admin/' || p === '/panel' || p === '/panel/') p = '/admin.html';
  const fp = path.normalize(path.join(ROOT, p));
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end('nope'); }
  // never serve submissions, config, source scripts, dotfiles, node_modules
  if (/\.(jsonl|py|cfg)$|(^|\/)\./.test(p) || /^\/(admin-config\.json|push-subs\.json|package(-lock)?\.json)$/.test(p) || p.startsWith('/node_modules')) {
    res.writeHead(404); return res.end('404');
  }
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404'); }
    const h = { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' };
    if (p === '/sw.js') { h['Service-Worker-Allowed'] = '/'; h['cache-control'] = 'no-cache'; }
    if (p === '/admin.html' || p === '/admin.js') h['cache-control'] = 'no-store';
    res.writeHead(200, h);
    res.end(buf);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`portfolio on http://127.0.0.1:${PORT}`);
  rebuild();
  setInterval(rebuild, 24 * 60 * 60 * 1000);
});
