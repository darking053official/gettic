// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC APP.JS v2.0 - Ana Başlatıcı                             ║
// ╚══════════════════════════════════════════════════════════════════╝

function _appLog(msg, level = 'log') {
  console[level](`%c[App] ${msg}`, 'color:#f472b6;font-weight:bold');
}

// ============ KONFİGÜRASYON ============
// config.js'den gelir, yoksa fallback
if (typeof API === 'undefined') {
  var API = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://gettic-backend.onrender.com';
}

// ============ SOCKET BAŞLAT ============
var socket = null;

function initSocket(token) {
  if (socket?.connected) socket.disconnect();

  socket = io(API, {
    auth:       { token },
    transports: ['websocket', 'polling'],
    reconnection:        true,
    reconnectionAttempts: 10,
    reconnectionDelay:   1000,
    reconnectionDelayMax: 10000,
    timeout:             20000,
  });

  socket.on('connect', () => {
    _appLog('Socket bağlandı: ' + socket.id);
    _updateConnectionStatus(true);

    // Aktif kanala katıl
    if (Store.activeChannel) {
      socket.emit('join_channel', Store.activeChannel);
    }

    // Socket ready event'i tetikle (diğer modüller bekliyor)
    document.dispatchEvent(new CustomEvent('socket_ready'));

    // Offline kuyruğu gönder
    if (typeof OfflineMode !== 'undefined') OfflineMode.processPending?.();
  });

  socket.on('disconnect', reason => {
    _appLog('Socket bağlantısı kesildi: ' + reason, 'warn');
    _updateConnectionStatus(false);
  });

  socket.on('connect_error', err => {
    _appLog('Socket bağlantı hatası: ' + err.message, 'error');
    _updateConnectionStatus(false);
  });

  socket.on('error', err => {
    _appLog('Socket hata: ' + err.message, 'error');
    if (err.message === 'Geçersiz token' || err.message === 'Token süresi doldu') {
      // Token yenile ve tekrar bağlan
      _refreshAndReconnect();
    }
  });

  return socket;
}

async function _refreshAndReconnect() {
  try {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method:      'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data  = await res.json();
      Store.token = data.token;
      localStorage.setItem('gt_token', data.token);
      initSocket(data.token);
    } else {
      handleLogout();
    }
  } catch {
    handleLogout();
  }
}

// ============ BAĞLANTI DURUMU ============
function _updateConnectionStatus(connected) {
  const dot = document.getElementById('connectionDot');
  const txt = document.getElementById('connectionText');
  if (dot) dot.className = `conn-dot ${connected ? 'on' : 'off'}`;
  if (txt) txt.textContent = connected ? 'Bağlı' : 'Bağlanıyor...';
}

// ============ KULLANICI PANELİ ============
function renderUserPanel() {
  const u = Store.user;
  if (!u) return;

  const nameEl   = document.getElementById('myUsername');
  const roleEl   = document.getElementById('myRole');
  const avEl     = document.getElementById('myAvatar');
  const statusEl = document.getElementById('myStatus');

  if (nameEl) nameEl.textContent  = u.username || '';
  if (avEl)   avEl.textContent    = (u.username || '?').charAt(0).toUpperCase();
  if (statusEl) {
    const STATUS_COLORS = { online:'#10b981', idle:'#f59e0b', dnd:'#ef4444', offline:'#6b7280', invisible:'#6b7280' };
    statusEl.style.background = STATUS_COLORS[u.status || 'online'];
  }

  const role = typeof getHighestRole === 'function' ? getHighestRole(u._id) : null;
  if (roleEl && role) {
    roleEl.textContent  = role.name;
    roleEl.style.color  = role.color;
  }
}

// ============ KLAVYE KISAYOLLARI ============
function _initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Ctrl+K → Arama
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      if (typeof openModal === 'function') openModal('search');
    }
    // Ctrl+Shift+D → Dev konsolu
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      if (typeof DevConsole !== 'undefined') DevConsole.open();
    }
    // Escape → Modal kapat
    if (e.key === 'Escape') {
      if (typeof closeModal === 'function') closeModal();
    }
    // Alt+Yukarı/Aşağı → Kanal değiştir
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      _navigateChannel(e.key === 'ArrowUp' ? -1 : 1);
    }
  });
}

function _navigateChannel(dir) {
  const channels = Store.channels || [];
  const idx      = channels.findIndex(c => c.id === Store.activeChannel);
  const next     = channels[idx + dir];
  if (next && typeof switchChannel === 'function') switchChannel(next.id);
}

// ============ MODAL OVERLAY KAPAT ============
function _initModalDismiss() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  modal.addEventListener('click', e => {
    if (e.target === modal && typeof closeModal === 'function') closeModal();
  });
}

// ============ TEMA UYGULA ============
function _applyStoredTheme() {
  if (typeof ThemeEngine !== 'undefined') {
    ThemeEngine.apply(ThemeEngine.current);
  } else {
    const ac = Store.theme || '#6366f1';
    document.documentElement.style.setProperty('--ac', ac);
    document.documentElement.style.setProperty('--acd', ac + '33');
  }

  if (Store.lightMode)   document.body.classList.add('light-mode');
  if (Store.compactMode) document.body.classList.add('compact-mode');
  if (Store.animations === false) document.body.classList.add('no-animations');
}

// ============ UYGULAMA BAŞLAT ============
async function initApp() {
  _appLog('Başlatılıyor...');

  // 1. Tema hemen uygula (flash önlemi)
  _applyStoredTheme();

  // 2. Oturumu kontrol et
  const isLoggedIn = await checkSession();
  if (!isLoggedIn) {
    _appLog('Oturum yok → auth ekranı');
    return;
  }

  // 3. App ekranını göster
  const authEl = document.getElementById('authScreen');
  const appEl  = document.getElementById('appScreen');
  if (authEl) authEl.style.display = 'none';
  if (appEl)  appEl.style.display  = '';

  // 4. Socket başlat
  initSocket(Store.token);

  // 5. Modülleri başlat
  if (typeof detectMobile    === 'function') detectMobile();
  if (typeof I18n            !== 'undefined') I18n.updateUI();
  _initKeyboardShortcuts();
  _initModalDismiss();

  // 6. Kanalları render et
  if (typeof renderChannels  === 'function') renderChannels();
  if (typeof renderUserPanel === 'function') renderUserPanel();

  // 7. Tam senkronizasyon (MongoSync hazırsa)
  if (typeof MongoSync !== 'undefined') {
    await MongoSync.fullSync();
  }

  // 8. Periyodik görevler
  _startPeriodicTasks();

  _appLog('Hazır ✓');
  document.dispatchEvent(new CustomEvent('app_ready'));
}

// ============ PERİYODİK GÖREVLER ============
function _startPeriodicTasks() {
  // Her 5dk: token yenile
  setInterval(async () => {
    if (typeof SecurityLayer !== 'undefined') {
      await SecurityLayer.refreshTokenIfNeeded();
    }
  }, 5 * 60 * 1000);

  // Her 30sn: sync engine flush
  setInterval(() => {
    if (typeof SyncEngine !== 'undefined') SyncEngine.flush();
  }, 30_000);

  // Her 1dk: online üye sayısı güncelle
  setInterval(() => {
    if (typeof updateOnlineCount === 'function') updateOnlineCount();
  }, 60_000);
}

// ============ UYGULAMA EVENT DİNLEYİCİLERİ ============

// Auth başarılı
document.addEventListener('auth_success', async (e) => {
  _appLog('Auth başarılı: ' + e.detail?.username);
  initSocket(Store.token);
  if (typeof detectMobile === 'function') detectMobile();
  _initKeyboardShortcuts();
  _initModalDismiss();
  if (typeof renderChannels  === 'function') renderChannels();
  if (typeof renderUserPanel === 'function') renderUserPanel();
  _startPeriodicTasks();
});

// Çıkış
document.addEventListener('logout', () => {
  _appLog('Çıkış yapıldı');
  if (socket) { socket.disconnect(); socket = null; }
});

// Senkronizasyon tamamlandı
document.addEventListener('sync_complete', () => {
  _appLog('Sync tamamlandı');
  if (typeof renderChannels  === 'function') renderChannels();
  if (typeof renderUserPanel === 'function') renderUserPanel();
  if (typeof updateNotifBadge === 'function') updateNotifBadge();
});

// ============ DOMContentLoaded ============
document.addEventListener('DOMContentLoaded', initApp);

// ============ SERVICE WORKER (PWA) ============
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    _appLog('Service Worker kayıtlı: ' + reg.scope);
  }).catch(() => {});
}

_appLog('v2.0 yüklendi ✓');


// Loading ekranını 3 saniye sonra zorla kapat
setTimeout(() => {
  const el = document.getElementById('ls');
  if (el) el.classList.add('hidden');
}, 3000);
