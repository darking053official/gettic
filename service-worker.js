// ============ GETTIC SERVICE-WORKER.JS - FULL GÜNCEL ============

const CACHE_NAME = 'gettic-v3';
const ASSETS = [
  '/app',
  '/app/css/variables.css',
  '/app/css/reset.css',
  '/app/css/layout.css',
  '/app/css/sidebar.css',
  '/app/css/chat.css',
  '/app/css/modals.css',
  '/app/css/responsive.css',
  '/app/css/voice.css',
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
  '/app/js/gif.js',
  '/app/js/app.js',
  '/app/js/socketio.js',
  'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png'
];

// ============ KURULUM ============
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🔄 Önbellek oluşturuluyor...');
        return cache.addAll(ASSETS).catch(err => {
          console.warn('Bazı dosyalar önbelleğe alınamadı:', err);
        });
      })
  );
  self.skipWaiting();
});

// ============ AKTİF ============
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('🗑️ Eski önbellek silindi:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// ============ FETCH - NETWORK FIRST ============
self.addEventListener('fetch', (e) => {
  // API isteklerini önbelleğe alma
  if (e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Başarılı yanıtı önbelleğe al
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Çevrimdışıysa önbellekten al
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          // Ana sayfa için fallback
          if (e.request.destination === 'document') {
            return caches.match('/app');
          }
          return new Response('Çevrimdışı', { status: 503 });
        });
      })
  );
});

// ============ PUSH BİLDİRİMİ ============
self.addEventListener('push', (e) => {
  const data = e.data?.json() || { 
    title: 'Gettic', 
    body: 'Yeni bir mesajın var!',
    icon: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png'
  };

  const options = {
    body: data.body,
    icon: data.icon || 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
    badge: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'gettic-msg',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    actions: data.actions || []
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ============ BİLDİRİME TIKLAMA ============
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsArr) => {
        // Açık bir Gettic sekmesi varsa ona odaklan
        const client = clientsArr.find((c) => 
          c.url.includes('/app') || c.url.includes('gettic.js.org')
        );
        
        if (client) {
          client.focus();
          // DM bildirimi ise DM'e yönlendir
          if (e.notification.data?.type === 'dm') {
            client.postMessage({ 
              type: 'navigate', 
              path: '/dm/' + e.notification.data.sender 
            });
          }
        } else {
          // Yeni sekme aç
          const url = e.notification.data?.path || '/app';
          clients.openWindow(url);
        }
      })
  );
});

// ============ MESAJ İLETİŞİMİ ============
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (e.data?.type === 'cache') {
    // Önbelleği güncelle
    caches.open(CACHE_NAME).then(cache => {
      cache.add(e.data.url);
    });
  }
});

console.log('✅ Service Worker hazır');
