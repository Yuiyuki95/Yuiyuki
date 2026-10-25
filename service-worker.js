// Replaces the previous LibreTV worker at the same URL. No private data is cached.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
