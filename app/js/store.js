// ╔══════════════════════════════════════════════════════════════════╗
// ║           GETTIC STORE.JS - TAM GÜNCEL                         ║
// ╚══════════════════════════════════════════════════════════════════╝

window.Store = window.Store || {
  user: null,
  token: localStorage.getItem('gt_token') || null,
  isOnline: navigator.onLine,
  serverSettings: { name: 'Gettic' },
  activeChannel: localStorage.getItem('gt_activeChannel') || 'genel-sohbet',
  channels: JSON.parse(localStorage.getItem('gt_channels') || `[
    { "id": "genel-sohbet", "name": "genel-sohbet", "type": "text", "category": "METİN" },
    { "id": "genel-ses", "name": "Genel Ses", "type": "voice", "category": "SES" }
  ]`),
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

// Mesajları localStorage'dan geri yükle
try {
  const saved = localStorage.getItem('gt_messages');
  if (saved) window.Store.messages = JSON.parse(saved);
} catch(e) {
  window.Store.messages = [];
}

// Kaydet
window.saveStore = function() {
  try {
    const S = window.Store;
    const maxMessages = 200;
    localStorage.setItem('gt_messages', JSON.stringify(S.messages.slice(-maxMessages)));
    localStorage.setItem('gt_activeChannel', S.activeChannel);
    localStorage.setItem('gt_ac', S.theme);
    localStorage.setItem('gt_channels', JSON.stringify(S.channels));
    localStorage.setItem('gt_categories', JSON.stringify(S.categories));
    localStorage.setItem('gt_userRoles', JSON.stringify(S.userRoles));
    localStorage.setItem('gt_roles', JSON.stringify(S.roles));
    localStorage.setItem('gt_blocked', JSON.stringify(S.blockedUsers));
    localStorage.setItem('gt_muted', JSON.stringify(S.mutedUsers));
    localStorage.setItem('gt_serverIcons', JSON.stringify(S.serverIcons));
    localStorage.setItem('gt_custom_emojis', JSON.stringify(S.customEmojis));
    if (S.token) localStorage.setItem('gt_token', S.token);
  } catch(e) {
    console.warn('Storage dolu, eski veriler temizleniyor...');
    localStorage.removeItem('gt_messages');
    localStorage.setItem('gt_messages', JSON.stringify(window.Store.messages.slice(-50)));
  }
};

// Çevrimiçi durum
window.addEventListener('online', () => { 
  window.Store.isOnline = true; 
  document.body.classList.remove('offline');
});

window.addEventListener('offline', () => { 
  window.Store.isOnline = false; 
  document.body.classList.add('offline');
});

// Storage temizleme
window.cleanStorage = function() {
  const maxSize = 4.5 * 1024 * 1024;
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    totalSize += (localStorage.getItem(localStorage.key(i)) || '').length;
  }
  if (totalSize > maxSize) {
    window.Store.messages = window.Store.messages.slice(-50);
    window.saveStore();
    const dmMessages = JSON.parse(localStorage.getItem('gt_dm_messages') || '{}');
    Object.keys(dmMessages).forEach(key => { dmMessages[key] = dmMessages[key].slice(-30); });
    localStorage.setItem('gt_dm_messages', JSON.stringify(dmMessages));
    console.log('🧹 Storage temizlendi');
  }
};

setInterval(window.cleanStorage, 300000);

console.log('✅ Store.js yüklendi');
