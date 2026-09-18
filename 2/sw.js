const CACHE_NAME = 'hctk-control-pwa-v58';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js?v=58',
  '../shared/styles.css',
  '../shared/app-core.js?v=58',
  './manifest.webmanifest',
  './assets/app-icon.svg',
  './assets/blank-card.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('hctk-control-pwa-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const appRoot = new URL('./', self.location.href);
  if (request.mode === 'navigate') {
    if (![appRoot.pathname, `${appRoot.pathname}index.html`].includes(url.pathname)) return;
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          try {
            const cache = await caches.open(CACHE_NAME);
            if (!response.ok) {
              return (await cache.match('./index.html')) || response;
            }
            await cache.put('./index.html', response.clone());
          } catch {
          }
          return response;
        })
        .catch(async (error) => {
          try {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match('./index.html');
            if (cached) return cached;
          } catch {
          }
          throw error;
        })
    );
    return;
  }

  const shellResource = APP_SHELL.some((path) => new URL(path, appRoot).href === url.href);
  const mediaResource = !url.search && url.pathname.startsWith(`${appRoot.pathname}assets/`);
  if (!shellResource && !mediaResource) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
  );
});
