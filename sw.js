// tay.märz admin service worker: push notifications only.
// Deliberately has NO fetch handler, so it never intercepts or caches requests
// (an earlier caching worker stalled /api/ POSTs on mobile).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  await Promise.all((await caches.keys()).map(k => caches.delete(k))); // clear what the old worker left behind
  await self.clients.claim();
})()));

self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'tay.märz', {
    body: d.body || '', tag: d.tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: d.url || '/admin/' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/admin/';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find(c => new URL(c.url).pathname.startsWith('/admin'));
    if (w) { await w.focus(); return w.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
