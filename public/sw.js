// Retire the former offline cache: private pages must always check the server session.
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("ninety-")).map(key=>caches.delete(key)))).then(()=>self.clients.claim()).then(()=>self.registration.unregister())));
