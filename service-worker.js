const CACHE_NAME = 'gettic-v2';
const ASSETS = [
  '/app',
  '/app/css/variables.css',
  '/app/css/reset.css',
  '/app/css/layout.css',
  '/app/css/sidebar.css',
  '/app/css/chat.css',
  '/app/css/modals.css',
  '/app/css/responsive.css',
  '/app/js/config.js',
  '/app/js/icons.js',
  '/app/js/store.js',
  '/app/js/auth.js',
  '/app/js/chat.js',
  '/app/js/channels.js',
  '/app/js/dm.js',
  '/app/js/voice.js',
  '/app/js/polls.js',
  '/app/js/roles.js',
  '/app/js/ui.js',
  '/app/js/app.js',
  '/app/js/socketio.js',
  'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png'
];

// Kurulum
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Aktif
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch - Önce cache, yoksa network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Push bildirimi
self.addEventListener('push', (e) => {
  const data = e.data?.json() || { title: 'Gettic', body: 'Yeni mesaj' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
      badge: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
      vibrate: [200, 100, 200],
      tag: 'gettic-msg'
    })
  );
});

// Bildirime tıklama
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const client = clientsArr.find((c) => c.url.includes('/app'));
      if (client) return client.focus();
      return clients.openWindow('/app');
    })
  );
});
