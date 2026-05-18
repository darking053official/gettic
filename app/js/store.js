// ============ GETTIC STORE.JS - FULL GÜNCEL ============

const Store = {
  // Kullanıcı
  user: null,
  token: localStorage.getItem('gt_token') || null,
  isOnline: navigator.onLine,

  // Sunucu
  serverSettings: JSON.parse(localStorage.getItem('gt_server') || JSON.stringify({ 
    name: 'Gettic', 
    description: 'Türkçe sohbet platformu', 
    icon: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
    banner: '',
    inviteCode: (Date.now().toString(36) + Math.random().toString(36).substr(2,5)).substring(0,8)
  })),

  // Kanallar
  activeChannel: localStorage.getItem('gt_activeChannel') || 'genel-sohbet',
  channels: JSON.parse(localStorage.getItem('gt_channels') || JSON.stringify([
    { id: 'genel-sohbet', name: 'genel-sohbet', type: 'text', category: 'METİN', topic: 'Sohbet odası', serverId: 'gettic' },
    { id: 'genel-ses', name: 'Genel Ses', type: 'voice', category: 'SES', serverId: 'gettic' }
  ])),
  categories: JSON.parse(localStorage.getItem('gt_categories') || JSON.stringify(['METİN', 'SES'])),

  // Mesajlar
  messages: JSON.parse(localStorage.getItem('gt_messages') || '[]'),
  pinnedMessages: JSON.parse(localStorage.getItem('gt_pinned') || '[]'),

  // DM
  dmFriends: JSON.parse(localStorage.getItem('gt_dm_friends') || '[]'),
  activeDM: null,

  // Kullanıcı Yönetimi
  blockedUsers: JSON.parse(localStorage.getItem('gt_blocked') || '[]'),
  mutedUsers: JSON.parse(localStorage.getItem('gt_muted') || '[]'),
  userRoles: JSON.parse(localStorage.getItem('gt_userRoles') || '{}'),

  // Roller
  roles: JSON.parse(localStorage.getItem('gt_roles') || JSON.stringify([
    { id: 'r1', name: 'Kurucu', color: '#fbbf24', permissions: { all: true }, position: 0, editable: false, deletable: false },
    { id: 'r2', name: 'Admin', color: '#ef4444', permissions: { manageServer: true, manageRoles: true, manageChannels: true, kick: true, ban: true, deleteMsg: true, pin: true, mute: true, deafen: true, manageWebhooks: true, manageBots: true }, position: 1, editable: true, deletable: false },
    { id: 'r3', name: 'Moderatör', color: '#6366f1', permissions: { kick: true, deleteMsg: true, mute: true, manageMessages: true, viewAuditLog: true }, position: 2, editable: true, deletable: true },
    { id: 'r4', name: 'Üye', color: '#ec4899', permissions: { sendMsg: true, addReactions: true, uploadFile: true, connect: true, speak: true, changeNickname: true, readHistory: true }, position: 3, editable: false, deletable: false }
  ])),

  // Anketler
  polls: JSON.parse(localStorage.getItem('gt_polls') || '{}'),

  // Tema & UI
  theme: localStorage.getItem('gt_ac') || '#ec4899',
  lightMode: localStorage.getItem('gt_light') === '1',
  compactMode: localStorage.getItem('gt_compact') === '1',
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
  })),

  // Debug
  debugMode: localStorage.getItem('gt_debug') === '1'
};

// ============ KAYDETME ============
function saveStore() {
  try {
    localStorage.setItem('gt_messages', JSON.stringify(Store.messages.slice(-100)));
    localStorage.setItem('gt_pinned', JSON.stringify(Store.pinnedMessages.slice(-10)));
    localStorage.setItem('gt_channels', JSON.stringify(Store.channels));
    localStorage.setItem('gt_categories', JSON.stringify(Store.categories));
    localStorage.setItem('gt_dm_friends', JSON.stringify(Store.dmFriends));
    localStorage.setItem('gt_blocked', JSON.stringify(Store.blockedUsers));
    localStorage.setItem('gt_muted', JSON.stringify(Store.mutedUsers));
    localStorage.setItem('gt_userRoles', JSON.stringify(Store.userRoles));
    localStorage.setItem('gt_roles', JSON.stringify(Store.roles));
    localStorage.setItem('gt_polls', JSON.stringify(Store.polls));
    localStorage.setItem('gt_ac', Store.theme);
    localStorage.setItem('gt_light', Store.lightMode ? '1' : '0');
    localStorage.setItem('gt_compact', Store.compactMode ? '1' : '0');
    localStorage.setItem('gt_lang', Store.lang);
    localStorage.setItem('gt_sidebar', Store.sidebarOpen ? '1' : '0');
    localStorage.setItem('gt_activeChannel', Store.activeChannel);
    localStorage.setItem('gt_notifications', JSON.stringify(Store.notifications.slice(-20)));
    localStorage.setItem('gt_offlineQueue', JSON.stringify(Store.offlineQueue));
    localStorage.setItem('gt_bots', JSON.stringify(Store.bots));
    localStorage.setItem('gt_webhooks', JSON.stringify(Store.webhooks));
    localStorage.setItem('gt_stats', JSON.stringify(Store.stats));
    localStorage.setItem('gt_server', JSON.stringify(Store.serverSettings));
    localStorage.setItem('gt_debug', Store.debugMode ? '1' : '0');
  } catch(e) {
    console.warn('Depolama hatası:', e.message);
    // localStorage dolduysa eski verileri temizle
    if (e.name === 'QuotaExceededError') {
      clearOldData();
    }
  }
}

// ============ YARDIMCI FONKSİYONLAR ============
function addNotification(text, type = 'info') {
  if (!Store.notifications) Store.notifications = [];
  Store.notifications.unshift({ text, type, time: new Date().toISOString(), read: false });
  if (Store.notifications.length > 20) Store.notifications.pop();
  saveStore();
}

function addToOfflineQueue(msg) {
  if (!Store.offlineQueue) Store.offlineQueue = [];
  Store.offlineQueue.push(msg);
  if (Store.offlineQueue.length > 50) Store.offlineQueue.shift();
  saveStore();
}

function clearOfflineQueue() {
  Store.offlineQueue = [];
  saveStore();
}

function incrementStats() {
  if (!Store.stats) Store.stats = { totalMessages: 0, totalUsers: 0, createdAt: new Date().toISOString() };
  Store.stats.totalMessages++;
  saveStore();
}

function switchChannel(chId) {
  if (!chId) return;
  saveStore();
  Store.activeChannel = chId;
  Store.messages = [];
  Store.polls = {};
  localStorage.setItem('gt_activeChannel', chId);
}

function clearOldData() {
  // Eski verileri temizle
  const keys = Object.keys(localStorage).filter(k => k.startsWith('gt_'));
  const oldKeys = keys.filter(k => {
    const data = localStorage.getItem(k);
    return data && data.length > 50000; // 50KB'dan büyük
  });
  oldKeys.forEach(k => {
    try {
      const parsed = JSON.parse(localStorage.getItem(k));
      if (Array.isArray(parsed)) {
        localStorage.setItem(k, JSON.stringify(parsed.slice(-20)));
      }
    } catch(e) {
      localStorage.removeItem(k);
    }
  });
  toast('🗑️ Eski veriler temizlendi', 'i');
}

// ============ KULLANICI YÜKLEME ============
try {
  const savedUser = localStorage.getItem('gt_user');
  if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
    const parsed = JSON.parse(savedUser);
    if (parsed && parsed._id) {
      Store.user = parsed;
    }
  }
} catch(e) {
  localStorage.removeItem('gt_user');
}

// ============ EVENT LISTENERS ============
window.addEventListener('online', () => { 
  Store.isOnline = true;
  if (Store.offlineQueue && Store.offlineQueue.length > 0 && window._socket) {
    Store.offlineQueue.forEach(msg => window._socket.emit('send_message', msg));
    clearOfflineQueue();
  }
});

window.addEventListener('offline', () => { 
  Store.isOnline = false;
});

// Sayfa kapanmadan önce kaydet
window.addEventListener('beforeunload', () => {
  saveStore();
});

// ============ INIT ============
console.log('✅ Store yüklendi -', Store.messages.length, 'mesaj,', Store.channels.length, 'kanal,', Store.dmFriends.length, 'DM');
