// tay.märz admin service worker — push notifications + offline shell.
const CACHE = 'marz-admin-v3';
const SHELL = ['/admin/', '/admin.js', '/admin.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// network-first for the admin shell (fresh leads), cache fallback offline
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.startsWith('/api/')) return; // never cache API
  if (SHELL.includes(u.pathname) || u.pathname === '/admin' || u.pathname === '/admin/') {
    e.respondWith(fetch(e.request).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/admin/'))));
  }
});

self.addEventListener('push', e => {
  let d = { title: 'New lead', body: '', tag: 'lead', url: '/admin/' };
  try { d = Object.assign(d, e.data.json()); } catch {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, tag: d.tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    data: { url: d.url }, vibrate: [80, 40, 80], renotify: true
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/admin/';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.includes('/admin') && 'focus' in c) return c.focus(); }
    return clients.openWindow(url);
  }));
});
