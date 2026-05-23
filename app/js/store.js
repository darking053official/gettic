// ╔══════════════════════════════════════════════════════════════════╗
// ║           GETTIC STORE.JS - GÜNCELLENDİ                          ║
// ╚══════════════════════════════════════════════════════════════════╝

const Store = {
  user: null,
  token: localStorage.getItem('gt_token') || null,
  isOnline: navigator.onLine,
  serverSettings: { name: 'Gettic' },
  activeChannel: localStorage.getItem('gt_activeChannel') || 'genel-sohbet',
  channels: JSON.parse(localStorage.getItem('gt_channels') || '[
    { "id": "genel-sohbet", "name": "genel-sohbet", "type": "text", "category": "METİN" },
    { "id": "genel-ses", "name": "Genel Ses", "type": "voice", "category": "SES" }
  ]'),
  categories: JSON.parse(localStorage.getItem('gt_categories') || '["METİN", "SES"]'),
  messages: [],
  dmFriends: [],
  blockedUsers: JSON.parse(localStorage.getItem('gt_blocked') || '[]'),
  mutedUsers: JSON.parse(localStorage.getItem('gt_muted') || '[]'),
  userRoles: JSON.parse(localStorage.getItem('gt_userRoles') || '{}'),
  roles: JSON.parse(localStorage.getItem('gt_roles') || '[
    { "id": "r1", "name": "Kurucu", "color": "#fbbf24", "permissions": { "all": true }, "position": 0, "icon": "crown" },
    { "id": "r2", "name": "Admin", "color": "#ef4444", "permissions": { "manageServer": true, "kick": true, "ban": true, "deleteMsg": true }, "position": 1, "icon": "shield" },
    { "id": "r3", "name": "Moderatör", "color": "#6366f1", "permissions": { "kick": true, "deleteMsg": true }, "position": 2, "icon": "hammer" },
    { "id": "r4", "name": "Üye", "color": "#ec4899", "permissions": { "sendMsg": true, "addReactions": true }, "position": 3, "icon": "user" }
  ]'),
  polls: {},
  theme: localStorage.getItem('gt_ac') || '#ec4899',
  serverIcons: JSON.parse(localStorage.getItem('gt_serverIcons') || '{}'),
  customEmojis: JSON.parse(localStorage.getItem('gt_custom_emojis') || '[]')
};

// Sayfa yüklendiğinde mesajları localStorage'dan geri yükle
try {
  const saved = localStorage.getItem('gt_messages');
  if (saved) Store.messages = JSON.parse(saved);
} catch(e) {
  Store.messages = [];
}

// Kaydet
function saveStore() {
  try {
    const maxMessages = 200;
    localStorage.setItem('gt_messages', JSON.stringify(Store.messages.slice(-maxMessages)));
    localStorage.setItem('gt_activeChannel', Store.activeChannel);
    localStorage.setItem('gt_ac', Store.theme);
    localStorage.setItem('gt_channels', JSON.stringify(Store.channels));
    localStorage.setItem('gt_categories', JSON.stringify(Store.categories));
    localStorage.setItem('gt_userRoles', JSON.stringify(Store.userRoles));
    localStorage.setItem('gt_roles', JSON.stringify(Store.roles));
    localStorage.setItem('gt_blocked', JSON.stringify(Store.blockedUsers));
    localStorage.setItem('gt_muted', JSON.stringify(Store.mutedUsers));
    localStorage.setItem('gt_serverIcons', JSON.stringify(Store.serverIcons));
    localStorage.setItem('gt_custom_emojis', JSON.stringify(Store.customEmojis));
    if (Store.token) localStorage.setItem('gt_token', Store.token);
  } catch(e) {
    console.warn('Storage dolu, eski veriler temizleniyor...');
    // Storage doluysa eski mesajları temizle
    localStorage.removeItem('gt_messages');
    localStorage.setItem('gt_messages', JSON.stringify(Store.messages.slice(-50)));
  }
}

// Çevrimiçi durum
window.addEventListener('online', () => { 
  Store.isOnline = true; 
  document.body.classList.remove('offline');
  toast('Bağlantı geri geldi', 's');
});

window.addEventListener('offline', () => { 
  Store.isOnline = false; 
  document.body.classList.add('offline');
  toast('Bağlantı koptu - çevrimdışı mod', 'e');
});

// Storage temizleme (çok doluysa)
function cleanStorage() {
  const maxSize = 4.5 * 1024 * 1024; // 4.5MB
  let totalSize = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    totalSize += (localStorage.getItem(key) || '').length;
  }
  
  if (totalSize > maxSize) {
    // En eski mesajları temizle
    Store.messages = Store.messages.slice(-50);
    saveStore();
    
    // DM mesajlarını sınırla
    const dmMessages = JSON.parse(localStorage.getItem('gt_dm_messages') || '{}');
    Object.keys(dmMessages).forEach(key => {
      dmMessages[key] = dmMessages[key].slice(-30);
    });
    localStorage.setItem('gt_dm_messages', JSON.stringify(dmMessages));
    
    console.log('🧹 Storage temizlendi');
  }
}

// Periyodik temizlik
setInterval(cleanStorage, 300000); // 5 dakikada bir

console.log('Store.js yüklendi (gelişmiş depolama)');
