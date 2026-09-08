// ============================================
// GETTIC - SERVICE WORKER
// ============================================

const CACHE_NAME = 'gettic-v0.0.1';
const CACHE_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/chat.html',
    '/profile.html',
    '/settings.html',
    '/css/style.css',
    '/css/auth.css',
    '/css/chat.css',
    '/css/components.css',
    '/css/animations.css',
    '/js/config.js',
    '/js/constants.js',
    '/js/utils.js',
    '/js/auth.js',
    '/js/chat.js',
    '/js/realtime.js',
    '/js/ui.js',
    '/js/message.js',
    '/js/conversation.js',
    '/js/notification.js',
    '/js/storage.js',
    '/logo.png'
];

// Service Worker kurulumu
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Gettic: Cache açıldı');
                return cache.addAll(CACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Service Worker aktivasyonu
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Gettic: Eski cache silindi:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch olayları
self.addEventListener('fetch', (event) => {
    // API isteklerini cache'leme
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Supabase isteklerini cache'leme
    if (event.request.url.includes('supabase.co')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Statik dosyalar için cache-first stratejisi
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(event.request)
                    .then((response) => {
                        // Sadece başarılı cevapları cache'le
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return response;
                    });
            })
    );
});

// Push bildirimleri
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Yeni bildirim',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/chat.html'
        }
    };

    event.waitUntil(
        self.registration.showNotification('Gettic', options)
    );
});

// Bildirime tıklama
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/chat.html');
                }
            })
    );
});

// Background sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

async function syncMessages() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const pendingMessages = await cache.match('pending-messages');
        
        if (pendingMessages) {
            const messages = await pendingMessages.json();
            
            // Mesajları gönder
            for (const message of messages) {
                await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(message)
                });
            }
            
            // Pending mesajları temizle
            await cache.delete('pending-messages');
        }
    } catch (error) {
        console.error('Gettic: Sync hatası:', error);
    }
}
