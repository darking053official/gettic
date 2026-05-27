// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC STORE.JS v2.0 - Merkezi State Yönetimi                  ║
// ╚══════════════════════════════════════════════════════════════════╝

function _storeLog(msg, level = 'log') {
  console[level](`%c[Store] ${msg}`, 'color:#a78bfa;font-weight:bold');
}

// ============ VARSAYILAN STATE ============
const STORE_DEFAULTS = {
  // Auth
  user:          null,
  token:         null,

  // Aktif kanal & mesajlar
  activeChannel: 'genel-sohbet',
  messages:      [],
  polls:         {},

  // Sunucu yapısı
  channels:      [],
  categories:    [],
  members:       [],
  roles:         [],
  userRoles:     {},

  // Sunucu ayarları
  serverSettings: {
    name:        'Gettic',
    description: '',
    region:      'otomatik',
    nsfw:        false,
    verification:false,
    id:          'gettic',
  },

  // UI tercihleri
  theme:        '#6366f1',
  lightMode:    false,
  compactMode:  false,
  animations:   true,
  sidebarOpen:  false,

  // Engellenenler & bildirimler
  blockedUsers:   [],
  notifications:  [],

  // Online üyeler
  onlineMembers:  {},
};

// ============ STORE ============
// Store zaten tanımlıysa sıfırlama — sadece eksikleri doldur
if (typeof Store === 'undefined') var Store = {};
Object.keys(STORE_DEFAULTS).forEach(key => {
  if (Store[key] === undefined) Store[key] = STORE_DEFAULTS[key];
});

// ============ LOCALSTORAGE ANAHTARLARI ============
const STORE_KEYS = {
  token:          'gt_token',
  user:           'gt_user',
  activeChannel:  'gt_activeChannel',
  channels:       'gt_channels',
  categories:     'gt_categories',
  serverSettings: 'gt_server_settings',
  userRoles:      'gt_user_roles',
  roles:          'gt_roles',
  theme:          'gt_ac',
  lightMode:      'gt_light',
  compactMode:    'gt_compact',
  animations:     'gt_anim',
  sidebarOpen:    'gt_sidebar',
  blockedUsers:   'gt_blocked',
};

// ============ YÜKLE ============
function loadStore() {
  try {
    // Token
    const token = localStorage.getItem(STORE_KEYS.token);
    if (token) Store.token = token;

    // Kullanıcı
    const user = localStorage.getItem(STORE_KEYS.user);
    if (user) Store.user = JSON.parse(user);

    // Aktif kanal
    const activeChannel = localStorage.getItem(STORE_KEYS.activeChannel);
    if (activeChannel) Store.activeChannel = activeChannel;

    // Kanallar
    const channels = localStorage.getItem(STORE_KEYS.channels);
    if (channels) Store.channels = JSON.parse(channels);

    // Kategoriler
    const categories = localStorage.getItem(STORE_KEYS.categories);
    if (categories) Store.categories = JSON.parse(categories);

    // Sunucu ayarları
    const serverSettings = localStorage.getItem(STORE_KEYS.serverSettings);
    if (serverSettings) Store.serverSettings = { ...STORE_DEFAULTS.serverSettings, ...JSON.parse(serverSettings) };

    // Roller
    const roles = localStorage.getItem(STORE_KEYS.roles);
    if (roles) Store.roles = JSON.parse(roles);

    const userRoles = localStorage.getItem(STORE_KEYS.userRoles);
    if (userRoles) Store.userRoles = JSON.parse(userRoles);

    // UI
    const theme = localStorage.getItem(STORE_KEYS.theme);
    if (theme) Store.theme = theme;
    Store.lightMode   = localStorage.getItem(STORE_KEYS.lightMode)   === '1';
    Store.compactMode = localStorage.getItem(STORE_KEYS.compactMode) === '1';
    Store.animations  = localStorage.getItem(STORE_KEYS.animations)  !== '0';
    Store.sidebarOpen = localStorage.getItem(STORE_KEYS.sidebarOpen) === '1';

    // Engellenenler
    const blocked = localStorage.getItem(STORE_KEYS.blockedUsers);
    if (blocked) Store.blockedUsers = JSON.parse(blocked);

    // Aktif kanalın mesajlarını yükle
    if (Store.activeChannel) {
      const cachedMsgs = localStorage.getItem(`gt_msgs_${Store.activeChannel}`);
      if (cachedMsgs) Store.messages = JSON.parse(cachedMsgs);
    }

    _storeLog('Store yüklendi');
  } catch (e) {
    _storeLog('Store yüklenirken hata: ' + e.message, 'warn');
  }
}

// ============ KAYDET ============
function saveStore() {
  try {
    if (Store.token)          localStorage.setItem(STORE_KEYS.token,          Store.token);
    if (Store.user)           localStorage.setItem(STORE_KEYS.user,           JSON.stringify(_sanitizeUser(Store.user)));
    if (Store.activeChannel)  localStorage.setItem(STORE_KEYS.activeChannel,  Store.activeChannel);
    if (Store.channels?.length)    localStorage.setItem(STORE_KEYS.channels,       JSON.stringify(Store.channels));
    if (Store.categories?.length)  localStorage.setItem(STORE_KEYS.categories,     JSON.stringify(Store.categories));
    if (Store.serverSettings) localStorage.setItem(STORE_KEYS.serverSettings, JSON.stringify(Store.serverSettings));
    if (Store.roles?.length)       localStorage.setItem(STORE_KEYS.roles,          JSON.stringify(Store.roles));
    if (Store.userRoles)      localStorage.setItem(STORE_KEYS.userRoles,      JSON.stringify(Store.userRoles));

    localStorage.setItem(STORE_KEYS.theme,       Store.theme        || '#6366f1');
    localStorage.setItem(STORE_KEYS.lightMode,   Store.lightMode    ? '1' : '0');
    localStorage.setItem(STORE_KEYS.compactMode, Store.compactMode  ? '1' : '0');
    localStorage.setItem(STORE_KEYS.animations,  Store.animations   !== false ? '1' : '0');
    localStorage.setItem(STORE_KEYS.sidebarOpen, Store.sidebarOpen  ? '1' : '0');

    if (Store.blockedUsers?.length) {
      localStorage.setItem(STORE_KEYS.blockedUsers, JSON.stringify(Store.blockedUsers));
    }

    // Mesajları kanal başına kaydet
    if (Store.activeChannel && Store.messages?.length) {
      try {
        localStorage.setItem(`gt_msgs_${Store.activeChannel}`, JSON.stringify(Store.messages.slice(-100)));
      } catch {}
    }
  } catch (e) {
    _storeLog('Store kayıt hatası: ' + e.message, 'warn');
  }
}

// Hassas verileri localStorage'a yazma
function _sanitizeUser(user) {
  if (!user) return null;
  const { password, token, refreshTokens, loginAttempts, lockedUntil, ip, userAgent, ...safe } = user;
  return safe;
}

// ============ STORE SIFIRLA ============
function clearStore() {
  Object.keys(STORE_KEYS).forEach(key => {
    try { localStorage.removeItem(STORE_KEYS[key]); } catch {}
  });

  // Kanal mesajlarını sil
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('gt_msgs_') || key?.startsWith('gt_dm_')) toRemove.push(key);
  }
  toRemove.forEach(k => { try { localStorage.removeItem(k); } catch {} });

  // Store'u sıfırla
  Object.assign(Store, { ...STORE_DEFAULTS });
  _storeLog('Store temizlendi');
}

// ============ ROL SİSTEMİ ============
function hasPermission(userId, permission) {
  if (!userId) return false;

  // Admin her şeye erişebilir
  const adminList = (typeof process !== 'undefined' ? [] : []);
  if (Store.user?._id === userId) {
    // Kendi rollerine bak
  }

  const userRoleIds = Store.userRoles?.[userId] || [];
  const roles       = Store.roles || _defaultRoles();

  for (const roleId of userRoleIds) {
    const role = roles.find(r => r.id === roleId);
    if (!role) continue;
    if (role.permissions?.administrator) return true;
    if (role.permissions?.[permission])  return true;
  }

  // Sunucu sahibi
  if (Store.serverSettings?.ownerId === userId) return true;

  return false;
}

function getHighestRole(userId) {
  if (!userId) return null;
  const userRoleIds = Store.userRoles?.[userId] || [];
  const roles       = Store.roles || _defaultRoles();
  if (userRoleIds.length === 0) return roles.find(r => r.id === 'r4') || null; // Üye

  const userRoles = roles.filter(r => userRoleIds.includes(r.id));
  return userRoles.sort((a, b) => (b.position || 0) - (a.position || 0))[0] || null;
}

function _defaultRoles() {
  return [
    { id: 'r1', name: 'Admin',     color: '#ef4444', position: 100, permissions: { administrator: true }, editable: false },
    { id: 'r2', name: 'Moderatör', color: '#f59e0b', position: 50,  permissions: { manageMessages: true, kickMembers: true, muteMembers: true }, editable: true },
    { id: 'r3', name: 'VIP',       color: '#8b5cf6', position: 10,  permissions: { sendMsg: true }, editable: true },
    { id: 'r4', name: 'Üye',       color: '#6b7280', position: 0,   permissions: { sendMsg: true, readMessages: true }, editable: false },
  ];
}

function assignRole(userId, roleId) {
  if (!Store.userRoles) Store.userRoles = {};
  if (!Store.userRoles[userId]) Store.userRoles[userId] = [];
  if (!Store.userRoles[userId].includes(roleId)) {
    Store.userRoles[userId].push(roleId);
    saveStore();
  }
}

function removeRole(userId, roleId) {
  if (!Store.userRoles?.[userId]) return;
  Store.userRoles[userId] = Store.userRoles[userId].filter(r => r !== roleId);
  saveStore();
}

// ============ KULLANICI YÖNETİMİ ============
function blockUser(userId) {
  if (!Store.blockedUsers) Store.blockedUsers = [];
  if (!Store.blockedUsers.includes(userId)) {
    Store.blockedUsers.push(userId);
    saveStore();
    if (typeof renderMessages === 'function') renderMessages({ force: true });
    if (typeof toast === 'function') toast('Kullanıcı engellendi');
  }
}

function unblockUser(userId) {
  if (!Store.blockedUsers) return;
  Store.blockedUsers = Store.blockedUsers.filter(u => u !== userId);
  saveStore();
  if (typeof renderMessages === 'function') renderMessages({ force: true });
  if (typeof toast === 'function') toast('Engel kaldırıldı');
}

function kickUser(userId) {
  if (!hasPermission(Store.user?._id, 'kickMembers')) return toast?.('Yetkiniz yok', 'e');
  if (socket?.connected) {
    socket.emit('kick_user', { userId });
    if (typeof toast === 'function') toast('Kullanıcı atıldı');
  }
}

function banUser(username, reason = '') {
  if (!hasPermission(Store.user?._id, 'banMembers')) return toast?.('Yetkiniz yok', 'e');
  if (socket?.connected) {
    socket.emit('ban_user', { username, reason });
    if (typeof toast === 'function') toast(`${username} yasaklandı`);
  }
}

function muteUser(username, minutes = 10) {
  if (!hasPermission(Store.user?._id, 'muteMembers')) return toast?.('Yetkiniz yok', 'e');
  if (socket?.connected) {
    socket.emit('mute_user', { username, minutes });
    if (typeof toast === 'function') toast(`${username} ${minutes} dk susturuldu`);
  }
}

// ============ ÇIKIŞ ============
async function handleLogout() {
  try {
    if (typeof MongoSync !== 'undefined') await MongoSync.logout();
    if (socket?.connected) socket.disconnect();
  } catch {}

  clearStore();
  document.dispatchEvent(new CustomEvent('logout'));

  // Auth ekranına dön
  const authEl  = document.getElementById('authScreen');
  const appEl   = document.getElementById('appScreen');
  if (authEl) authEl.style.display = '';
  if (appEl)  appEl.style.display  = 'none';

  _storeLog('Çıkış yapıldı');
}

// ============ ONLINE SAYACI ============
function updateOnlineCount() {
  const count = Object.values(Store.onlineMembers || {}).filter(Boolean).length;
  const el    = document.getElementById('onlineCount');
  if (el) el.textContent = count;
}

// ============ İSTATİSTİK ============
function getStoreStats() {
  return {
    messages:  Store.messages?.length  || 0,
    channels:  Store.channels?.length  || 0,
    members:   Store.members?.length   || 0,
    roles:     Store.roles?.length     || 0,
    channel:   Store.activeChannel,
  };
}

// ============ EXPORT (global erişim) ============
window.Store        = Store;
window.saveStore    = saveStore;
window.loadStore    = loadStore;
window.clearStore   = clearStore;
window.hasPermission  = hasPermission;
window.getHighestRole = getHighestRole;
window.assignRole   = assignRole;
window.removeRole   = removeRole;
window.blockUser    = blockUser;
window.unblockUser  = unblockUser;
window.kickUser     = kickUser;
window.banUser      = banUser;
window.muteUser     = muteUser;
window.handleLogout = handleLogout;

// ============ INIT ============
(function initStore() {
  loadStore();

  // Roller yoksa varsayılanları yükle
  if (!Store.roles?.length) {
    Store.roles = _defaultRoles();
  }

  // Periyodik kaydet (60sn)
  setInterval(saveStore, 60_000);

  _storeLog('v2.0 yüklendi ✓');
})();
