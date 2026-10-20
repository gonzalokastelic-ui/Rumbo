// Service worker de Rumbo: permite instalar la app y abrirla sin conexion.
// Navegacion: red primero, con la ultima version guardada como respaldo.
// Archivos con hash (/assets) y fotos (/destinos, /icons): cache primero.
// Firebase y cualquier otro origen no pasan por aca: los datos siempre son en vivo.
const VERSION = 'rumbo-v3';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSION).then((c) => c.put('/', copia));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  if (/^\/(assets|destinos|icons)\//.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(VERSION).then((c) => c.put(request, copia));
            }
            return res;
          }),
      ),
    );
  }
});
