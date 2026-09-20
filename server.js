'use strict';
// Static file server for tay.märz portfolio + self-refreshing stats.
// Rebuilds heatmap.svg + waka-badge.svg server-side (key stays server-side) on boot & every 24h.
// Page stays same-origin / zero external requests. Run: node server.js  (PORT env optional)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = __dirname;
const PORT = process.env.PORT || 5700;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.ico': 'image/x-icon' };

function rebuild() {
  for (const s of ['build_heatmap.py', 'build_badge.py']) {
    execFile('python3', [path.join(ROOT, s)], { cwd: ROOT, timeout: 30000 }, (err, out, e) => {
      console.log(`[stats] ${s}: ${err ? 'FAIL ' + (e || err.message).trim() : (out || '').trim()}`);
    });
  }
}

const server = http.createServer((req, res) => {
  // contact form submissions → append to contacts.jsonl on this box
  if (req.method === 'POST' && req.url === '/contact') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 10000) req.destroy(); });
    req.on('end', () => {
      let d; try { d = JSON.parse(body); } catch { res.writeHead(400); return res.end('bad json'); }
      if (!d.name || !d.email || !d.message || !d.referral) { res.writeHead(422); return res.end('missing fields'); }
      const rec = { at: new Date().toISOString(), ip: req.socket.remoteAddress,
        name: String(d.name).slice(0, 200), email: String(d.email).slice(0, 200),
        message: String(d.message).slice(0, 5000), referral: String(d.referral).slice(0, 300),
        meet: d.meet === 'irl' ? 'irl' : 'online', city: String(d.city || '').slice(0, 100),
        availability: String(d.availability || '').slice(0, 300), phone: String(d.phone || '').slice(0, 60) };
      fs.appendFile(path.join(ROOT, 'contacts.jsonl'), JSON.stringify(rec) + '\n', err => {
        if (err) { console.error('[contact] write failed', err); res.writeHead(500); return res.end('err'); }
        console.log(`[contact] ${rec.name} <${rec.email}> via "${rec.referral}"${rec.meet === 'irl' ? ' · IRL ' + rec.city : ''}`);
        res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}');
      });
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  // resolve inside ROOT — block traversal
  const fp = path.normalize(path.join(ROOT, p));
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end('nope'); }
  // never serve submissions, source scripts, or dotfiles
  if (/\.(jsonl|py|cfg)$|(^|\/)\./.test(p)) { res.writeHead(404); return res.end('404'); }
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`portfolio on http://127.0.0.1:${PORT}`);
  rebuild();                              // refresh on boot
  setInterval(rebuild, 24 * 60 * 60 * 1000); // ...and daily
});
