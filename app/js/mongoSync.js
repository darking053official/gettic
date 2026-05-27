// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC MONGOSYNC.JS v2.0 - MongoDB Senkronizasyon Katmanı     ║
// ╚══════════════════════════════════════════════════════════════════╝

function _syncLog(msg, level = 'log') {
  console[level](`%c[MongoSync] ${msg}`, 'color:#60a5fa;font-weight:bold');
}

// ============ TEMEL API FETCH ============
const MongoSync = (() => {
  // ── İstek kuyruğu & retry ──────────────────────────────────────
  const _pending  = new Map(); // reqKey → promise (duplicate önlemi)
  const _cache    = new Map(); // cacheKey → { data, ts }
  const CACHE_TTL = 30_000;   // 30 saniye

  // ── Token alma ────────────────────────────────────────────────
  function _getToken() {
    return Store?.token || localStorage.getItem('gt_token') || '';
  }

  // ── Access token süresi dolmuşsa refresh et ───────────────────
  async function _ensureToken() {
    const token = _getToken();
    if (!token) return null;
    try {
      const payload    = JSON.parse(atob(token.split('.')[1]));
      const expiresIn  = payload.exp * 1000 - Date.now();
      if (expiresIn > 30_000) return token; // 30sn+ varsa direkt kullan

      // Refresh et
      const res = await fetch(`${API}/api/auth/refresh`, {
        method:      'POST',
        credentials: 'include', // cookie gönder
      });
      if (!res.ok) {
        // Refresh başarısız → logout
        if (typeof handleLogout === 'function') handleLogout();
        return null;
      }
      const data      = await res.json();
      Store.token     = data.token;
      localStorage.setItem('gt_token', data.token);
      return data.token;
    } catch {
      return token;
    }
  }

  // ── Ana fetch fonksiyonu ──────────────────────────────────────
  async function _fetch(endpoint, opts = {}, retries = 2) {
    const token = await _ensureToken();
    if (!token && !opts.public) return null;

    const url     = API + endpoint;
    const reqKey  = opts.method + ':' + endpoint + ':' + (opts.dedup || '');

    // Duplicate request önlemi
    if (opts.dedup && _pending.has(reqKey)) {
      return _pending.get(reqKey);
    }

    // Cache kontrolü (sadece GET)
    const cacheKey = endpoint;
    if (!opts.method || opts.method === 'GET') {
      const cached = _cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.data;
      }
    }

    const promise = (async () => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await fetch(url, {
            method:      opts.method  || 'GET',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${token}`,
              ...(opts.headers || {}),
            },
            body:        opts.body ? JSON.stringify(opts.body) : undefined,
            credentials: 'include',
            signal:      opts.signal,
          });

          // 401 → token yenile
          if (res.status === 401 && attempt < retries) {
            Store.token = null;
            await _ensureToken();
            continue;
          }

          // Rate limit
          if (res.status === 429) {
            const retry = parseInt(res.headers.get('Retry-After') || '5');
            if (attempt < retries) {
              await _sleep(retry * 1000);
              continue;
            }
          }

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            _syncLog(`API Hata [${res.status}] ${endpoint}: ${err.error}`, 'warn');
            return null;
          }

          const data = await res.json();

          // GET sonuçlarını cache'e al
          if (!opts.method || opts.method === 'GET') {
            _cache.set(cacheKey, { data, ts: Date.now() });
          }

          return data;
        } catch (err) {
          if (err.name === 'AbortError') return null;
          if (attempt < retries) {
            await _sleep(1000 * (attempt + 1));
            continue;
          }
          _syncLog(`Fetch hatası ${endpoint}: ${err.message}`, 'error');
          return null;
        }
      }
      return null;
    })();

    if (opts.dedup) {
      _pending.set(reqKey, promise);
      promise.finally(() => _pending.delete(reqKey));
    }

    return promise;
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function _invalidateCache(prefix) {
    for (const key of _cache.keys()) {
      if (key.startsWith(prefix)) _cache.delete(key);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════
  async function register(username, password, gcaptcha) {
    return _fetch('/api/auth/register', {
      method: 'POST',
      body:   { username, password, gcaptcha },
      public: true,
    });
  }

  async function login(username, password, gcaptcha) {
    return _fetch('/api/auth/login', {
      method: 'POST',
      body:   { username, password, gcaptcha },
      public: true,
    });
  }

  async function logout() {
    return _fetch('/api/auth/logout', { method: 'POST' });
  }

  async function getMe() {
    return _fetch('/api/me', { dedup: 'me' });
  }

  async function updateMe(data) {
    _invalidateCache('/api/me');
    return _fetch('/api/me', { method: 'PUT', body: data });
  }

  async function changePassword(oldPassword, newPassword) {
    return _fetch('/api/me/password', {
      method: 'POST',
      body:   { oldPassword, newPassword },
    });
  }

  async function deleteAccount(password) {
    _invalidateCache('/api/me');
    return _fetch('/api/me', { method: 'DELETE', body: { password } });
  }

  // ═══════════════════════════════════════════════════════════════
  // KANALLAR
  // ═══════════════════════════════════════════════════════════════
  async function loadChannels(serverId = 'gettic') {
    const data = await _fetch(`/api/channels?server=${serverId}`, { dedup: 'channels' });
    if (!data) return null;

    Store.channels   = data;
    Store.categories = [...new Set(data.map(c => c.category))];
    _saveLocalChannels();
    if (typeof renderChannels === 'function') renderChannels();
    _syncLog(`${data.length} kanal yüklendi`);
    return data;
  }

  async function saveChannel(ch) {
    const res = await _fetch('/api/channels', { method: 'POST', body: ch });
    _invalidateCache('/api/channels');
    return res;
  }

  async function updateChannel(chId, updates) {
    const res = await _fetch(`/api/channels/${chId}`, { method: 'PUT', body: updates });
    _invalidateCache('/api/channels');
    return res;
  }

  async function deleteChannel(chId) {
    const res = await _fetch(`/api/channels/${chId}`, { method: 'DELETE' });
    _invalidateCache('/api/channels');
    return res;
  }

  // ═══════════════════════════════════════════════════════════════
  // MESAJLAR
  // ═══════════════════════════════════════════════════════════════
  async function loadMessages(channelId, limit = 50, before = null) {
    if (!channelId) return null;

    let url = `/api/channels/${channelId}/messages?limit=${limit}`;
    if (before) url += `&before=${encodeURIComponent(before)}`;

    const data = await _fetch(url, { dedup: `msgs:${channelId}` });
    if (!data) return null;

    if (before) {
      // Eski mesajları başa ekle
      Store.messages = [...data, ...(Store.messages || [])];
    } else {
      Store.messages = data;
    }

    if (Store.messages.length > 200) Store.messages = Store.messages.slice(-200);

    _saveLocalMessages(channelId);
    if (typeof renderMessages === 'function') renderMessages({ scrollToEnd: !before });
    _syncLog(`${data.length} mesaj yüklendi (${channelId})`);
    return data;
  }

  async function loadOlderMessages(channelId) {
    const first = Store.messages?.[0];
    if (!first) return loadMessages(channelId);
    return loadMessages(channelId, 50, first.createdAt);
  }

  async function saveMessage(msg) {
    if (!msg?.channelId) return null;
    // Socket bağlıysa zaten gönderildi, sadece DB'ye persist et
    if (socket?.connected) {
      // Socket üzerinden zaten gönderiliyor, sadece offline için queue'a al
      if (!navigator.onLine) {
        SyncEngine?.add(`/api/channels/${msg.channelId}/messages`, 'POST', msg, 5);
      }
      return msg;
    }
    return _fetch(`/api/channels/${msg.channelId}/messages`, {
      method: 'POST',
      body:   msg,
    });
  }

  async function editMessage(msgId, channelId, content) {
    return _fetch(`/api/messages/${msgId}`, {
      method: 'PUT',
      body:   { content, channelId },
    });
  }

  async function deleteMessage(msgId, channelId) {
    return _fetch(`/api/messages/${msgId}`, {
      method: 'DELETE',
      body:   { channelId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // DM
  // ═══════════════════════════════════════════════════════════════
  async function loadDMMessages(username) {
    const data = await _fetch(`/api/dm/${encodeURIComponent(username)}`);
    return data || [];
  }

  async function saveDMMessage(from, to, message) {
    return _fetch('/api/dm', {
      method: 'POST',
      body:   { to, message },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // KULLANICILAR
  // ═══════════════════════════════════════════════════════════════
  async function loadUsers() {
    const data = await _fetch('/api/users', { dedup: 'users' });
    if (data) {
      Store.members = data;
      _syncLog(`${data.length} kullanıcı yüklendi`);
    }
    return data;
  }

  async function searchUsers(query) {
    if (!query || query.length < 2) return [];
    return _fetch(`/api/users/search?q=${encodeURIComponent(query)}`) || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // KANAL DEĞİŞTİRİNCE SENKRONİZASYON
  // ═══════════════════════════════════════════════════════════════
  async function syncCurrentChannel(channelId) {
    channelId = channelId || Store.activeChannel;
    if (!channelId) return;

    // Önce localStorage'dan yükle (hızlı render)
    const cached = _loadLocalMessages(channelId);
    if (cached?.length) {
      Store.messages = cached;
      if (typeof renderMessages === 'function') renderMessages();
    }

    // Sonra MongoDB'den güncelle
    await loadMessages(channelId);
  }

  // ═══════════════════════════════════════════════════════════════
  // BİLDİRİMLER
  // ═══════════════════════════════════════════════════════════════
  async function loadNotifications() {
    return _fetch('/api/notifications') || [];
  }

  async function saveNotification(notif) {
    return _fetch('/api/notifications', { method: 'POST', body: notif });
  }

  async function markAllNotificationsRead() {
    return _fetch('/api/notifications/read-all', { method: 'PUT' });
  }

  // ═══════════════════════════════════════════════════════════════
  // BOTLAR
  // ═══════════════════════════════════════════════════════════════
  async function loadBots() {
    const data = await _fetch('/api/bots');
    if (data && typeof botState !== 'undefined') {
      botState.bots = data;
      _syncLog(`${data.length} bot yüklendi`);
    }
    return data;
  }

  async function saveBot(bot) {
    return _fetch('/api/bots', { method: 'POST', body: bot });
  }

  async function deleteBot(botId) {
    return _fetch(`/api/bots/${botId}`, { method: 'DELETE' });
  }

  // ═══════════════════════════════════════════════════════════════
  // SUNUCU AYARLARI
  // ═══════════════════════════════════════════════════════════════
  async function loadServerSettings() {
    const data = await _fetch('/api/server/settings');
    if (data) {
      Store.serverSettings = { ...Store.serverSettings, ...data };
      const el = document.getElementById('serverName');
      if (el && data.name) el.textContent = data.name;
    }
    return data;
  }

  async function saveServerSettings(settings) {
    return _fetch('/api/server/settings', { method: 'PUT', body: settings });
  }

  // ═══════════════════════════════════════════════════════════════
  // TAM SENKRONIZASYON (ilk yükleme)
  // ═══════════════════════════════════════════════════════════════
  async function fullSync() {
    if (!Store.token) return;
    _syncLog('Tam senkronizasyon başlıyor...');

    const spinner = _showSyncSpinner();
    try {
      // Paralel yükle
      const [me, channels] = await Promise.all([
        getMe(),
        loadChannels(),
      ]);

      if (me) {
        Store.user = me;
        if (typeof renderUserPanel === 'function') renderUserPanel();
      }

      if (channels) {
        // Aktif kanalı yükle
        const activeId = Store.activeChannel || localStorage.getItem('gt_activeChannel') || 'genel-sohbet';
        await syncCurrentChannel(activeId);
      }

      // Arka planda yükle (kritik değil)
      Promise.all([
        loadUsers(),
        loadBots(),
        loadNotifications().then(notifs => {
          if (notifs?.length && typeof notifState !== 'undefined') {
            const existing = new Set(notifState.list.map(n => n.id));
            const newOnes  = notifs.filter(n => !existing.has(n.id));
            notifState.list = [...newOnes, ...notifState.list].slice(0, 100);
            notifState.unread = notifState.list.filter(n => !n.read).length;
            if (typeof updateNotifBadge === 'function') updateNotifBadge();
          }
        }),
      ]).catch(() => {});

      _syncLog('Tam senkronizasyon tamamlandı');
      document.dispatchEvent(new CustomEvent('sync_complete'));
    } catch (e) {
      _syncLog('Senkronizasyon hatası: ' + e.message, 'error');
    } finally {
      _hideSyncSpinner(spinner);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LOCALSTORAGE YARDIMCILARI
  // ═══════════════════════════════════════════════════════════════
  function _saveLocalMessages(channelId) {
    try {
      const msgs = (Store.messages || []).slice(-100);
      localStorage.setItem(`gt_msgs_${channelId}`, JSON.stringify(msgs));
    } catch {}
  }

  function _loadLocalMessages(channelId) {
    try {
      const raw = localStorage.getItem(`gt_msgs_${channelId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function _saveLocalChannels() {
    try {
      localStorage.setItem('gt_channels',   JSON.stringify(Store.channels   || []));
      localStorage.setItem('gt_categories', JSON.stringify(Store.categories || []));
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  // SYNC SPINNER
  // ═══════════════════════════════════════════════════════════════
  function _showSyncSpinner() {
    let el = document.getElementById('syncSpinner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'syncSpinner';
      el.className = 'sync-spinner';
      el.innerHTML = `
        <div class="sync-spinner-dot"></div>
        <span>Senkronize ediliyor...</span>`;
      document.body.appendChild(el);
    }
    el.classList.add('show');
    return el;
  }

  function _hideSyncSpinner(el) {
    if (el) {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SOCKET EVENT BRIDGE (sunucudan gelen verileri Store'a yaz)
  // ═══════════════════════════════════════════════════════════════
  function initSocketBridge() {
    if (typeof socket === 'undefined' || !socket) return;

    socket.on('new_message', msg => {
      if (msg.channelId !== Store.activeChannel) return;
      if (!Store.messages) Store.messages = [];
      if (Store.messages.find(m => m._id === msg._id)) return; // duplicate
      Store.messages.push(msg);
      if (Store.messages.length > 200) Store.messages.shift();
      _saveLocalMessages(msg.channelId);
      if (typeof renderMessages === 'function') renderMessages();
      if (typeof ChannelState !== 'undefined') ChannelState.addUnread(msg.channelId);
    });

    socket.on('delete_message', ({ id, channelId }) => {
      if (!Store.messages) return;
      Store.messages = Store.messages.filter(m => String(m._id) !== String(id));
      _saveLocalMessages(channelId || Store.activeChannel);
      if (typeof renderMessages === 'function') renderMessages({ force: true, scrollToEnd: false });
    });

    socket.on('edit_message', ({ id, content }) => {
      const msg = Store.messages?.find(m => String(m._id) === String(id));
      if (msg) { msg.content = content; msg.edited = true; }
      _saveLocalMessages(Store.activeChannel);
      if (typeof renderMessages === 'function') renderMessages({ scrollToEnd: false });
    });

    socket.on('user_online',  ({ userId, username }) => {
      const member = Store.members?.find(m => String(m._id) === userId);
      if (member) member.status = 'online';
      if (typeof dmState !== 'undefined') dmState.online[username] = true;
    });

    socket.on('user_offline', ({ userId, username }) => {
      const member = Store.members?.find(m => String(m._id) === userId);
      if (member) { member.status = 'offline'; member.lastSeen = new Date().toISOString(); }
      if (typeof dmState !== 'undefined') dmState.online[username] = false;
    });

    socket.on('user_status', ({ userId, status }) => {
      const member = Store.members?.find(m => String(m._id) === userId);
      if (member) member.status = status;
    });

    _syncLog('Socket bridge hazır');
  }

  // ═══════════════════════════════════════════════════════════════
  // CACHE TEMİZLE
  // ═══════════════════════════════════════════════════════════════
  function clearCache(prefix = '') {
    if (prefix) {
      _invalidateCache(prefix);
    } else {
      _cache.clear();
    }
    _syncLog('Cache temizlendi: ' + (prefix || 'tümü'));
  }

  // Public API
  return {
    // Auth
    register, login, logout, getMe, updateMe, changePassword, deleteAccount,
    // Kanallar
    loadChannels, saveChannel, updateChannel, deleteChannel,
    // Mesajlar
    loadMessages, loadOlderMessages, saveMessage, editMessage, deleteMessage, syncCurrentChannel,
    // DM
    loadDMMessages, saveDMMessage,
    // Kullanıcılar
    loadUsers, searchUsers,
    // Bildirimler
    loadNotifications, saveNotification, markAllNotificationsRead,
    // Botlar
    loadBots, saveBot, deleteBot,
    // Sunucu
    loadServerSettings, saveServerSettings,
    // Genel
    fullSync, initSocketBridge, clearCache,
  };
})();

// ============ CSS ============
(function injectSyncStyles() {
  const id = 'gt-sync-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.sync-spinner{
  position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(60px);
  display:flex;align-items:center;gap:8px;
  background:var(--bg1,#1a0f24);border:1px solid rgba(255,255,255,.1);
  border-radius:20px;padding:8px 14px;font-size:12px;color:var(--t2,#ccc);
  box-shadow:0 4px 20px rgba(0,0,0,.4);z-index:9990;
  opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;
}
.sync-spinner.show{opacity:1;transform:translateX(-50%) translateY(0)}
.sync-spinner-dot{
  width:10px;height:10px;border-radius:50%;
  border:2px solid rgba(255,255,255,.15);
  border-top-color:var(--ac,#6366f1);
  animation:syncSpin .7s linear infinite;
}
@keyframes syncSpin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initMongoSync() {
  // Socket hazır olunca bridge'i başlat
  if (typeof socket !== 'undefined' && socket) {
    MongoSync.initSocketBridge();
  } else {
    document.addEventListener('socket_ready', () => MongoSync.initSocketBridge(), { once: true });
  }

  _syncLog('v2.0 yüklendi ✓');
})();
