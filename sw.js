// Service worker de Barbería Yeiko: permite instalar la app y abrirla rápido.
// Las reservas y los horarios SIEMPRE se piden en vivo a Supabase (nunca se guardan aquí).
// Si cambias index.html y no ves el cambio en el celular, sube el número de VERSION.
const VERSION = 'yeiko-v1';
const BASICOS = ['./', 'index.html', 'manifest.json', 'img/logo.png', 'img/logo-96.png', 'img/favicon-32.png', 'img/icon-192.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSION).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, fuentes, etc.: directo a internet

  // Página: primero internet (para tener siempre la última versión), si no hay, la guardada.
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req)
        .then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put('index.html', copia)); return r; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Imágenes y demás archivos: lo guardado, y se actualiza por detrás.
  ev.respondWith(
    caches.match(req).then(guardado => {
      const red = fetch(req).then(r => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
        return r;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
