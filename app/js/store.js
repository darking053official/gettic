const Store = {
  // Kullanıcı
  user: null,
  token: localStorage.getItem('gt_token') || null,
  isOnline: navigator.onLine,

  // Sunucu
  serverSettings: { name: 'Gettic', description: 'Türkçe sohbet platformu', icon: '' },
  
  // Kanallar
  activeChannel: localStorage.getItem('gt_activeChannel') || 'genel-sohbet',
  channels: JSON.parse(localStorage.getItem('gt_channels') || JSON.stringify([
    { id: 'genel-sohbet', name: 'genel-sohbet', type: 'text', category: 'METİN', topic: 'Sohbet odası' },
    { id: 'genel-ses', name: 'Genel Ses', type: 'voice', category: 'SES' },
    { id: 'kurallar', name: 'kurallar', type: 'forum', category: 'METİN', topic: 'Sunucu kuralları' }
  ])),
  categories: JSON.parse(localStorage.getItem('gt_categories') || JSON.stringify(['METİN', 'SES'])),

  // Mesajlar
  messages: JSON.parse(localStorage.getItem('gt_messages') || '[]'),
  pinnedMessages: JSON.parse(localStorage.getItem('gt_pinned') || '[]'),
  
  // DM
  dmFriends: JSON.parse(localStorage.getItem('gt_dm') || '[]'),
  activeDM: null,
  
  // Kullanıcılar
  blockedUsers: JSON.parse(localStorage.getItem('gt_blocked') || '[]'),
  mutedUsers: JSON.parse(localStorage.getItem('gt_muted') || '[]'),
  userRoles: JSON.parse(localStorage.getItem('gt_userRoles') || '{}'),
  
  // Roller
  roles: JSON.parse(localStorage.getItem('gt_roles') || JSON.stringify([
    { id: 'r1', name: 'Kurucu', color: '#fbbf24', permissions: { all: true }, position: 0 },
    { id: 'r2', name: 'Admin', color: '#ef4444', permissions: { manageServer: true, manageRoles: true, manageChannels: true, kick: true, ban: true, deleteMsg: true, pin: true, manageWebhooks: true }, position: 1 },
    { id: 'r3', name: 'Moderatör', color: '#6366f1', permissions: { kick: true, deleteMsg: true, mute: true, manageMessages: true }, position: 2 },
    { id: 'r4', name: 'Üye', color: '#9ca3af', permissions: { sendMsg: true, addReactions: true, uploadFile: true }, position: 3 }
  ])),

  // Anketler
  polls: JSON.parse(localStorage.getItem('gt_polls') || '{}'),
  
  // Tema & UI
  theme: localStorage.getItem('gt_ac') || '#c94d8c',
  lightMode: localStorage.getItem('gt_light') === '1',
  lang: localStorage.getItem('gt_lang') || 'tr',
  sidebarOpen: localStorage.getItem('gt_sidebar') === '1',
  userPanelOpen: false,
  emojiOpen: false,
  
  // Bildirimler
  notifications: JSON.parse(localStorage.getItem('gt_notifications') || '[]'),
  notifPermission: 'default',
  
  // Offline
  offlineQueue: JSON.parse(localStorage.getItem('gt_offlineQueue') || '[]'),
  
  // Bot & Webhook
  bots: JSON.parse(localStorage.getItem('gt_bots') || '[]'),
  webhooks: JSON.parse(localStorage.getItem('gt_webhooks') || '[]'),
  
  // İstatistik
  stats: JSON.parse(localStorage.getItem('gt_stats') || JSON.stringify({
    totalMessages: 0,
    totalUsers: 0,
    createdAt: new Date().toISOString()
  }))
};

// ============ KAYDETME ============
function saveStore() {
  try {
    localStorage.setItem('gt_messages', JSON.stringify(Store.messages.slice(-100)));
    localStorage.setItem('gt_pinned', JSON.stringify(Store.pinnedMessages.slice(-10)));
    localStorage.setItem('gt_channels', JSON.stringify(Store.channels));
    localStorage.setItem('gt_categories', JSON.stringify(Store.categories));
    localStorage.setItem('gt_dm', JSON.stringify(Store.dmFriends));
    localStorage.setItem('gt_blocked', JSON.stringify(Store.blockedUsers));
    localStorage.setItem('gt_muted', JSON.stringify(Store.mutedUsers));
    localStorage.setItem('gt_userRoles', JSON.stringify(Store.userRoles));
    localStorage.setItem('gt_roles', JSON.stringify(Store.roles));
    localStorage.setItem('gt_polls', JSON.stringify(Store.polls));
    localStorage.setItem('gt_ac', Store.theme);
    localStorage.setItem('gt_light', Store.lightMode ? '1' : '0');
    localStorage.setItem('gt_lang', Store.lang);
    localStorage.setItem('gt_sidebar', Store.sidebarOpen ? '1' : '0');
    localStorage.setItem('gt_activeChannel', Store.activeChannel);
    localStorage.setItem('gt_notifications', JSON.stringify(Store.notifications.slice(-20)));
    localStorage.setItem('gt_offlineQueue', JSON.stringify(Store.offlineQueue));
    localStorage.setItem('gt_bots', JSON.stringify(Store.bots));
    localStorage.setItem('gt_webhooks', JSON.stringify(Store.webhooks));
    localStorage.setItem('gt_stats', JSON.stringify(Store.stats));
  } catch(e) {
    console.warn('Depolama hatası:', e.message);
  }
}

// ============ YARDIMCI FONKSİYONLAR ============
function addNotification(text, type = 'info') {
  Store.notifications.push({ text, type, time: new Date().toISOString(), read: false });
  if (Store.notifications.length > 20) Store.notifications.shift();
  saveStore();
}

function addToOfflineQueue(msg) {
  Store.offlineQueue.push(msg);
  saveStore();
}

function clearOfflineQueue() {
  Store.offlineQueue = [];
  saveStore();
}

function incrementStats() {
  Store.stats.totalMessages++;
  saveStore();
}

function switchChannel(chId) {
  Store.activeChannel = chId;
  Store.messages = [];
  Store.polls = {};
  localStorage.setItem('gt_activeChannel', chId);
  renderMessages();
  renderChannels();
  if (window._socket) window._socket.emit('join_channel', chId);
}

// ============ EVENT LISTENERS ============
window.addEventListener('online', () => { 
  Store.isOnline = true; 
  if (Store.offlineQueue.length > 0 && window._socket) {
    Store.offlineQueue.forEach(msg => window._socket.emit('send_message', msg));
    clearOfflineQueue();
  }
});

window.addEventListener('offline', () => { 
  Store.isOnline = false; 
});

// ============ INIT ============
console.log('✅ Store yüklendi -', Store.messages.length, 'mesaj,', Store.channels.length, 'kanal');
