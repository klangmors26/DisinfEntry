/* ============================================================
   DisinfEntry — service worker (makes the console an installable app)

   What it caches, and what it deliberately does not:
   - Static files (our CSS/JS/icons and the CDN libraries) are cached so the
     app opens fast on a slow farm connection.
   - PHP pages and api/ calls are NEVER cached. They carry per-user data and a
     CSRF token, and a monitoring screen showing stale readings as if they were
     live would be worse than showing nothing. They always go to the network;
     when the network is down the user gets offline.html instead.
   - Non-GET requests are never touched.

   Bump VERSION whenever this file or offline.html changes.
   ========================================================== */

const VERSION = 'v4';
const STATIC_CACHE = `disinfentry-static-${VERSION}`;
const OFFLINE_URL = new URL('offline.html', self.registration.scope).href;

const PRECACHE = [
  'offline.html',
  'manifest.json',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/favicon-32.png',
].map((p) => new URL(p, self.registration.scope).href);

const CDN_HOSTS = ['cdn.jsdelivr.net', 'cdn.datatables.net', 'code.jquery.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('disinfentry-') && k !== STATIC_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  if (CDN_HOSTS.includes(url.hostname)) return true;
  if (url.origin !== self.location.origin) return false;
  if (!url.href.startsWith(self.registration.scope)) return false;
  const rel = url.href.slice(self.registration.scope.length);
  // User uploads (e.g. the farm logo) can change under the same name; leave them to HTTP caching.
  return /^assets\/(css|js|icons)\//.test(rel);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Page navigations: always live; offline page when the network is unreachable.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets: serve from cache, refresh in the background (stale-while-revalidate).
  // Our own CSS/JS are linked with ?v=<mtime>, so an edited file is a new cache entry.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
  // Everything else (api/, exports, uploads) falls through to the network untouched.
});

/* ---------------- Notifications ---------------- */

// Tapping a system notification focuses the app (or opens it) on the page it points to.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || 'notifications.php', self.registration.scope).href;

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
        await client.focus();
        if ('navigate' in client && client.url !== target) {
          try { await client.navigate(target); } catch { /* cross-scope; ignore */ }
        }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
