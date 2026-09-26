// tay.märz admin — self-destruct SW. The old caching worker stalled /api/ POSTs
// on mobile; killing it entirely (admin is online-only, push re-adds later if needed).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  const ks = await caches.keys();
  await Promise.all(ks.map(k => caches.delete(k)));
  await self.registration.unregister();
  const cs = await self.clients.matchAll();
  cs.forEach(c => c.navigate(c.url));
});
// pass every request straight to network — never intercept
