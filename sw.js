// Cosmic Card Scanner v2.7: retire the old offline cache while scanner updates stabilize.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('cosmic-card-scanner-')).map(k=>caches.delete(k)));
  await self.clients.claim();
  await self.registration.unregister();
})()));
// Do not intercept fetches. Network files are current; collection data remains in localStorage.
