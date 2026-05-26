// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC SYSTEM.JS v2.0 - Realtime + MongoDB + localStorage      ║
// ╚══════════════════════════════════════════════════════════════════╝

if (typeof Store === 'undefined') var Store = {};

function _sysLog(msg, level = 'log') {
  console[level](`%c[System] ${msg}`, 'color:#a78bfa;font-weight:bold');
}

// ============ 1. SYNC ENGINE ============
const SyncEngine = (() => {
  let _queue  = [];
  let _syncing = false;
  let _lastSync = null;
  let _failCount = 0;
  const MAX_QUEUE   = 200;
  const MAX_BATCH   = 20;
  const RETRY_DELAY = [1000, 3000, 10000, 30000]; // üstel geri çekilme

  try { _queue = JSON.parse(localStorage.getItem('gt_sync_queue') || '[]'); } catch {}

  function _save() {
    try { localStorage.setItem('gt_sync_queue', JSON.stringify(_queue.slice(-MAX_QUEUE))); } catch {}
  }

  function add(endpoint, method, data, priority = 0) {
    // Aynı endpoint+method+id varsa güncelle
    const existing = _queue.findIndex(q => q.endpoint === endpoint && q.data?._id === data?._id);
    const item = { id: genId(), endpoint, method, data, priority, ts: Date.now() };
    if (existing > -1) _queue[existing] = item;
    else {
      _queue.push(item);
      if (_queue.length > MAX_QUEUE) _queue.shift();
    }
    _save();
    flush();
  }

  async function flush() {
    if (_syncing || !navigator.onLine || !Store.token || typeof API === 'undefined') return;
    if (_queue.length === 0) return;
    _syncing = true;

    // Önceliğe göre sırala
    const batch = [..._queue].sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, MAX_BATCH);
    const done  = new Set();

    for (const item of batch) {
      try {
        const res = await fetch(API + item.endpoint, {
          method: item.method,
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + Store.token
          },
          body: item.method !== 'GET' && item.method !== 'DELETE'
            ? JSON.stringify(item.data) : undefined
        });
        if (res.ok || res.status === 409) { // 409 = zaten var, tamam
          done.add(item.id);
          _failCount = 0;
        }
      } catch {
        _failCount++;
        break; // network hatası — batch'i durdur
      }
    }

    _queue = _queue.filter(q => !done.has(q.id));
    _lastSync = Date.now();
    _syncing  = false;
    _save();

    // Kuyrukta hâlâ iş varsa tekrar dene
    if (_queue.length > 0 && _failCount > 0) {
      const delay = RETRY_DELAY[Math.min(_failCount - 1, RETRY_DELAY.length - 1)];
      setTimeout(flush, delay);
    }
  }

  function getStatus() {
    return { pending: _queue.length, lastSync: _lastSync ? new Date(_lastSync).toLocaleTimeString('tr-TR') : '—', syncing: _syncing };
  }

  function clear() { _queue = []; _save(); }

  return { add, flush, getStatus, clear, get queue() { return _queue; } };
})();

// ============ 2. OFFLİNE MOD ============
const OfflineMode = (() => {
  let _pending = [];
  let _isOffline = !navigator.onLine;
  try { _pending = JSON.parse(localStorage.getItem('gt_pending_msgs') || '[]'); } catch {}

  function _savePending() {
    try { localStorage.setItem('gt_pending_msgs', JSON.stringify(_pending.slice(-50))); } catch {}
  }

  function addPending(msg) {
    if (_pending.find(m => m._id === msg._id)) return;
    _pending.push({ ...msg, _pendingAt: Date.now() });
    if (_pending.length > 50) _pending.shift();
    _savePending();
    _sysLog(`Offline kuyruğa eklendi: ${msg._id}`, 'warn');
  }

  async function processPending() {
    if (_pending.length === 0) return;
    const msgs = [..._pending];
    _pending   = [];
    _savePending();

    _sysLog(`${msgs.length} bekleyen mesaj gönderiliyor`);

    for (const msg of msgs) {
      try {
        if (socket?.connected) {
          socket.emit('send_message', msg);
        } else {
          SyncEngine.add(`/api/channels/${msg.channelId}/messages`, 'POST', msg, 10);
        }
        await new Promise(r => setTimeout(r, 80));
      } catch {}
    }

    if (msgs.length > 0) {
      if (typeof toast === 'function') toast(`${msgs.length} bekleyen mesaj gönderildi`, 'i');
    }
  }

  function init() {
    window.addEventListener('online', async () => {
      _isOffline = false;
      _updateOfflineBanner(false);
      await processPending();
      SyncEngine.flush();
      if (typeof toast === 'function') toast('Bağlantı yeniden kuruldu', 'i');
      _sysLog('Çevrimiçi');
    });

    window.addEventListener('offline', () => {
      _isOffline = true;
      _updateOfflineBanner(true);
      if (typeof toast === 'function') toast('Çevrimdışı mod aktif', 'w');
      _sysLog('Çevrimdışı', 'warn');
    });
  }

  function _updateOfflineBanner(show) {
    let banner = document.getElementById('offlineBanner');
    if (show) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offlineBanner';
        banner.className = 'offline-banner';
        banner.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
          Çevrimdışısınız — mesajlar kuyruğa alınıyor`;
        document.body.appendChild(banner);
      }
    } else {
      banner?.remove();
    }
  }

  return { init, addPending, processPending, get isOffline() { return _isOffline; }, get pending() { return _pending; } };
})();

// ============ 3. HATA YAKALAMA ============
const ErrorTracker = (() => {
  let _errors = [];
  const MAX = 50;
  try { _errors = JSON.parse(localStorage.getItem('gt_errors') || '[]'); } catch {}

  function capture(err) {
    const entry = {
      id:        genId(),
      type:      err.type || 'unknown',
      message:   String(err.message || err).substring(0, 500),
      stack:     err.stack?.substring(0, 1000),
      url:       err.url,
      line:      err.line,
      user:      Store.user?.username,
      channel:   Store.activeChannel,
      ts:        Date.now()
    };
    _errors.unshift(entry);
    if (_errors.length > MAX) _errors.pop();
    try { localStorage.setItem('gt_errors', JSON.stringify(_errors.slice(0, 20))); } catch {}

    if (typeof perfState !== 'undefined' && perfState.debugMode) {
      console.error('[ErrorTracker]', entry);
    }

    // Kritik hatayı sunucuya bildir
    if (typeof API !== 'undefined' && Store.token) {
      fetch(API + '/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token },
        body: JSON.stringify(entry)
      }).catch(() => {});
    }
  }

  function init() {
    window.onerror = (message, url, line, col, error) => {
      capture({ type: 'global', message, url, line, col, stack: error?.stack });
      return false;
    };
    window.addEventListener('unhandledrejection', e => {
      capture({ type: 'promise', message: e.reason?.message || String(e.reason), stack: e.reason?.stack });
    });
  }

  function getReport() {
    return {
      total:     _errors.length,
      recent:    _errors.slice(0, 10),
      browser:   navigator.userAgent,
      ts:        new Date().toISOString()
    };
  }

  function clear() { _errors = []; localStorage.removeItem('gt_errors'); }

  return { init, capture, getReport, clear, get errors() { return _errors; } };
})();

// ============ 4. PERFORMANS MONİTÖR ============
const PerfMonitor = (() => {
  const metrics = { fps: 0, memory: 0, renderTime: 0, domNodes: 0, storageKB: 0, latencyMs: 0 };
  let _initialized = false;

  function init() {
    if (_initialized) return;
    _initialized = true;

    // FPS ölçer
    let frames = 0, lastTime = performance.now();
    const _tick = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) { metrics.fps = frames; frames = 0; lastTime = now; }
      requestAnimationFrame(_tick);
    };
    requestAnimationFrame(_tick);

    // Diğer metrikler (5sn aralık)
    setInterval(() => {
      metrics.memory   = Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576 * 10) / 10; // MB
      metrics.domNodes = document.querySelectorAll('*').length;
      try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          total += (localStorage.getItem(k) || '').length;
        }
        metrics.storageKB = Math.round(total / 1024);
      } catch {}
    }, 5000);

    // Bellek sızıntısı uyarısı
    setInterval(() => {
      if (metrics.memory > 150) {
        _sysLog(`Yüksek bellek kullanımı: ${metrics.memory}MB`, 'warn');
        _cleanOldData();
      }
    }, 60000);
  }

  async function measureLatency() {
    if (typeof API === 'undefined') return 0;
    const t = performance.now();
    try {
      await fetch(API + '/ping', { method: 'HEAD', cache: 'no-store' });
      metrics.latencyMs = Math.round(performance.now() - t);
    } catch {
      metrics.latencyMs = -1;
    }
    return metrics.latencyMs;
  }

  function mark(label) {
    if (typeof performance.mark === 'function') performance.mark(`gt_${label}`);
  }

  function measure(label, from, to) {
    try {
      performance.measure(`gt_${label}`, `gt_${from}`, `gt_${to}`);
      const [entry] = performance.getEntriesByName(`gt_${label}`);
      return entry?.duration || 0;
    } catch { return 0; }
  }

  function getReport() { return { ...metrics, ts: new Date().toISOString() }; }

  return { init, measureLatency, mark, measure, getReport, get metrics() { return metrics; } };
})();

// ============ 5. GÜVENLİK KATMANI ============
const SecurityLayer = (() => {
  const _limits = new Map();

  function checkRate(key, max = 10, windowMs = 10000) {
    const now  = Date.now();
    const data = _limits.get(key) || { count: 0, reset: now + windowMs };
    if (now > data.reset) { data.count = 0; data.reset = now + windowMs; }
    if (data.count >= max) return false;
    data.count++;
    _limits.set(key, data);
    return true;
  }

  function sanitize(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
  }

  function validateInput(input, type = 'text') {
    if (input === undefined || input === null) return false;
    switch (type) {
      case 'username': return /^[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]{3,32}$/.test(input);
      case 'password': return input.length >= 6 && input.length <= 128;
      case 'email':    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) && input.length <= 254;
      case 'channel':  return /^[a-z0-9\-]{1,50}$/.test(input);
      case 'message':  return input.length > 0 && input.length <= 2000;
      default:         return input.length <= 5000;
    }
  }

  // CSRF token
  function generateCSRF() {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('gt_csrf', token);
    return token;
  }

  function verifyCSRF(token) {
    return token && token === sessionStorage.getItem('gt_csrf');
  }

  // Token yenile (JWT süresi dolmadan önce)
  async function refreshTokenIfNeeded() {
    if (!Store.token || typeof API === 'undefined') return;
    try {
      const payload = JSON.parse(atob(Store.token.split('.')[1]));
      const expiresIn = payload.exp * 1000 - Date.now();
      if (expiresIn < 5 * 60 * 1000) { // 5 dakikadan az kaldıysa yenile
        const res = await fetch(API + '/api/auth/refresh', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + Store.token }
        });
        if (res.ok) {
          const data = await res.json();
          Store.token = data.token;
          localStorage.setItem('gt_token', data.token);
          _sysLog('Token yenilendi');
        }
      }
    } catch {}
  }

  return { checkRate, sanitize, validateInput, generateCSRF, verifyCSRF, refreshTokenIfNeeded };
})();

// ============ 6. YEDEKLEME ============
const BackupSystem = (() => {
  const VERSION = '2.1';

  async function backup() {
    const data = {
      version:   VERSION,
      ts:        new Date().toISOString(),
      appName:   'Gettic',
      store: {
        messages:       (Store.messages     || []).slice(-200),
        channels:       Store.channels      || [],
        categories:     Store.categories    || [],
        userRoles:      Store.userRoles     || {},
        roles:          Store.roles         || [],
        serverSettings: Store.serverSettings || {},
        theme:          Store.theme,
        lightMode:      Store.lightMode,
        compactMode:    Store.compactMode,
      },
      dm: {
        friends:  dmState?.friends   || [],
        messages: dmState?.messages  || {},
      },
      bots: {
        bots: typeof botState !== 'undefined' ? botState.bots : []
      }
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `gettic-yedek-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (typeof toast === 'function') toast('Yedek indirildi', 's');
    _sysLog('Yedek oluşturuldu');
  }

  function restore(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.store) throw new Error('Geçersiz yedek');

        if (!confirm(`${data.ts} tarihli yedeği geri yüklemek istediğinizden emin misiniz?\nMevcut veriler üzerine yazılacak.`)) return;

        const s = data.store;
        if (s.messages)       Store.messages       = s.messages;
        if (s.channels)       Store.channels       = s.channels;
        if (s.categories)     Store.categories     = s.categories;
        if (s.userRoles)      Store.userRoles      = s.userRoles;
        if (s.roles)          Store.roles          = s.roles;
        if (s.serverSettings) Store.serverSettings = s.serverSettings;
        if (s.theme)          Store.theme          = s.theme;

        if (data.dm?.friends) {
          if (typeof dmState !== 'undefined') {
            dmState.friends  = data.dm.friends;
            dmState.messages = data.dm.messages || {};
          }
        }

        if (typeof saveStore      === 'function') saveStore();
        if (typeof renderChannels === 'function') renderChannels();
        if (typeof renderMessages === 'function') renderMessages();
        if (typeof toast          === 'function') toast('Yedek geri yüklendi', 's');
        _sysLog('Yedek geri yüklendi: ' + data.ts);
      } catch (err) {
        if (typeof toast === 'function') toast('Geçersiz yedek dosyası', 'e');
        ErrorTracker.capture({ type: 'restore', message: err.message });
      }
    };
    reader.onerror = () => { if (typeof toast === 'function') toast('Dosya okunamadı', 'e'); };
    reader.readAsText(file);
  }

  // MongoDB'ye yedek yükle
  async function cloudBackup() {
    if (typeof API === 'undefined' || !Store.token) return toast('Giriş gerekli', 'e');
    try {
      const res = await fetch(API + '/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token },
        body: JSON.stringify({
          channels: Store.channels,
          categories: Store.categories,
          serverSettings: Store.serverSettings,
          roles: Store.roles
        })
      });
      if (res.ok) {
        if (typeof toast === 'function') toast('Bulut yedeği oluşturuldu', 's');
        localStorage.setItem('gt_last_cloud_backup', new Date().toISOString());
      } else {
        throw new Error(res.status);
      }
    } catch (e) {
      if (typeof toast === 'function') toast('Bulut yedeği başarısız', 'e');
    }
  }

  return { backup, restore, cloudBackup };
})();

// ============ 7. TEMA ENGİNİ ============
const ThemeEngine = (() => {
  const PRESETS = {
    pink:   { ac:'#ec4899', bg:'#0f0a14', bg1:'#1a0f24', bg2:'#241535' },
    indigo: { ac:'#6366f1', bg:'#0a0b14', bg1:'#0f1029', bg2:'#141535' },
    blue:   { ac:'#3b82f6', bg:'#0a0f1a', bg1:'#0f1829', bg2:'#14213d' },
    green:  { ac:'#10b981', bg:'#0a140f', bg1:'#0f2418', bg2:'#143520' },
    orange: { ac:'#f97316', bg:'#140f0a', bg1:'#241a0f', bg2:'#35220a' },
    purple: { ac:'#8b5cf6', bg:'#0f0a14', bg1:'#180f24', bg2:'#241435' },
    red:    { ac:'#ef4444', bg:'#140a0a', bg1:'#240f0f', bg2:'#351414' },
    teal:   { ac:'#14b8a6', bg:'#0a1413', bg1:'#0f2422', bg2:'#143530' },
  };

  let _current = localStorage.getItem('gt_theme') || 'indigo';
  let _custom  = {};
  try { _custom = JSON.parse(localStorage.getItem('gt_custom_theme') || '{}'); } catch {}

  function apply(nameOrColors) {
    let colors;
    if (typeof nameOrColors === 'string') {
      _current = nameOrColors;
      colors   = PRESETS[nameOrColors] || PRESETS.indigo;
      localStorage.setItem('gt_theme', nameOrColors);
    } else {
      _current = 'custom';
      colors   = nameOrColors;
      _custom  = nameOrColors;
      localStorage.setItem('gt_custom_theme', JSON.stringify(colors));
      localStorage.setItem('gt_theme', 'custom');
    }

    const root = document.documentElement;
    root.style.setProperty('--ac',   colors.ac  || colors.accent || '#6366f1');
    root.style.setProperty('--acd', (colors.ac  || colors.accent || '#6366f1') + '33');
    root.style.setProperty('--bg',   colors.bg  || '#0f0a14');
    root.style.setProperty('--bg1',  colors.bg1 || '#1a0f24');
    root.style.setProperty('--bg2',  colors.bg2 || '#241535');

    if (Store) Store.theme = colors.ac || colors.accent;
    if (typeof saveStore === 'function') saveStore();
  }

  function getCurrent() {
    return _current === 'custom' ? _custom : (PRESETS[_current] || PRESETS.indigo);
  }

  return { apply, getCurrent, presets: PRESETS, get current() { return _current; } };
})();

// ============ 8. ÇOK DİL ============
const I18n = (() => {
  const LANGS = {
    tr: {
      login:'Giriş', register:'Kayıt Ol', logout:'Çıkış', send:'Gönder',
      search:'Ara', settings:'Ayarlar', online:'Çevrimiçi', offline:'Çevrimdışı',
      noMessages:'Henüz mesaj yok', typing:'yazıyor...', edit:'Düzenle',
      delete:'Sil', copy:'Kopyala', pin:'Sabitle', dm:'DM',
      home:'Ana Sayfa', discover:'Keşfet', notifications:'Bildirimler',
      friends:'Arkadaşlar', servers:'Sunucular', channels:'Kanallar',
      createChannel:'Kanal Oluştur', createServer:'Sunucu Oluştur',
      theme:'Tema', language:'Dil', profile:'Profil',
      error:'Hata', success:'Başarılı', warning:'Uyarı', info:'Bilgi',
      confirm:'Onayla', cancel:'İptal', save:'Kaydet', close:'Kapat',
      yes:'Evet', no:'Hayır', ok:'Tamam', retry:'Tekrar Dene',
      loading:'Yükleniyor...', connecting:'Bağlanıyor...', connected:'Bağlandı',
      disconnected:'Bağlantı kesildi', members:'Üyeler', roles:'Roller',
      ban:'Yasakla', kick:'At', mute:'Sustur', report:'Şikayet Et',
    },
    en: {
      login:'Login', register:'Register', logout:'Logout', send:'Send',
      search:'Search', settings:'Settings', online:'Online', offline:'Offline',
      noMessages:'No messages yet', typing:'typing...', edit:'Edit',
      delete:'Delete', copy:'Copy', pin:'Pin', dm:'DM',
      home:'Home', discover:'Discover', notifications:'Notifications',
      friends:'Friends', servers:'Servers', channels:'Channels',
      createChannel:'Create Channel', createServer:'Create Server',
      theme:'Theme', language:'Language', profile:'Profile',
      error:'Error', success:'Success', warning:'Warning', info:'Info',
      confirm:'Confirm', cancel:'Cancel', save:'Save', close:'Close',
      yes:'Yes', no:'No', ok:'OK', retry:'Retry',
      loading:'Loading...', connecting:'Connecting...', connected:'Connected',
      disconnected:'Disconnected', members:'Members', roles:'Roles',
      ban:'Ban', kick:'Kick', mute:'Mute', report:'Report',
    },
    de: {
      login:'Anmelden', register:'Registrieren', logout:'Abmelden', send:'Senden',
      search:'Suchen', settings:'Einstellungen', online:'Online', offline:'Offline',
      noMessages:'Noch keine Nachrichten', typing:'schreibt...', edit:'Bearbeiten',
      delete:'Löschen', copy:'Kopieren', pin:'Anheften',
      theme:'Design', language:'Sprache', profile:'Profil',
      error:'Fehler', success:'Erfolg', warning:'Warnung',
      confirm:'Bestätigen', cancel:'Abbrechen', save:'Speichern', close:'Schließen',
      yes:'Ja', no:'Nein', ok:'OK', retry:'Erneut versuchen',
    },
    fr: {
      login:'Connexion', register:"S'inscrire", logout:'Déconnexion', send:'Envoyer',
      search:'Chercher', settings:'Paramètres', online:'En ligne', offline:'Hors ligne',
      noMessages:'Aucun message', typing:'écrit...', edit:'Modifier',
      delete:'Supprimer', copy:'Copier', pin:'Épingler',
      theme:'Thème', language:'Langue', profile:'Profil',
      error:'Erreur', success:'Succès', warning:'Avertissement',
      confirm:'Confirmer', cancel:'Annuler', save:'Enregistrer', close:'Fermer',
      yes:'Oui', no:'Non', ok:'OK',
    },
  };

  let _lang = localStorage.getItem('gt_lang') || 'tr';

  function t(key) {
    return LANGS[_lang]?.[key] ?? LANGS.tr?.[key] ?? key;
  }

  function setLang(lang) {
    if (!LANGS[lang]) return false;
    _lang = lang;
    localStorage.setItem('gt_lang', lang);
    updateUI();
    if (socket?.connected) socket.emit('set_lang', { lang });
    return true;
  }

  function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (el.placeholder !== undefined && el.tagName !== 'BUTTON') el.placeholder = t(key);
      else el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  function getAvailable() {
    return Object.keys(LANGS).map(code => ({
      code,
      name: { tr:'Türkçe', en:'English', de:'Deutsch', fr:'Français' }[code] || code
    }));
  }

  return { t, setLang, updateUI, getAvailable, get lang() { return _lang; } };
})();

// Global kısayol
function t(key) { return I18n.t(key); }

// ============ 9. API RATE LIMITER ============
const APIRateLimiter = (() => {
  const _limits  = new Map();
  const _global  = { count: 0, reset: Date.now() + 60000, max: 300, window: 60000 };

  function check(key, max = 20, windowMs = 10000) {
    const now = Date.now();

    // Global limit yenile
    if (now > _global.reset) { _global.count = 0; _global.reset = now + _global.window; }
    if (_global.count >= _global.max) {
      _sysLog('Global API limiti aşıldı', 'warn');
      return false;
    }

    // Endpoint limiti
    let entry = _limits.get(key);
    if (!entry || now > entry.reset) entry = { count: 0, reset: now + windowMs };
    if (entry.count >= max) return false;

    entry.count++;
    _global.count++;
    _limits.set(key, entry);
    return true;
  }

  function remaining(key) {
    const entry = _limits.get(key);
    if (!entry || Date.now() > entry.reset) return 20;
    return Math.max(0, 20 - entry.count);
  }

  function reset(key) { _limits.delete(key); }

  return { check, remaining, reset };
})();

// ============ 10. EKLENTİ SİSTEMİ ============
const PluginSystem = (() => {
  const _plugins = new Map();

  function register(id, plugin) {
    if (!id || !plugin?.init) { _sysLog(`Eklenti kaydı başarısız: ${id}`, 'warn'); return false; }
    try {
      plugin.init();
      _plugins.set(id, {
        id,
        name:        plugin.name        || id,
        version:     plugin.version     || '1.0.0',
        description: plugin.description || '',
        enabled:     true,
        hooks:       plugin.hooks       || {},
        unload:      plugin.unload      || null,
      });
      _sysLog(`Eklenti yüklendi: ${id} v${plugin.version || '1.0.0'}`);
      return true;
    } catch (e) {
      ErrorTracker.capture({ type: 'plugin', message: `${id}: ${e.message}` });
      return false;
    }
  }

  function unregister(id) {
    const p = _plugins.get(id);
    if (!p) return;
    try { p.unload?.(); } catch {}
    _plugins.delete(id);
    _sysLog(`Eklenti kaldırıldı: ${id}`);
  }

  function trigger(hookName, ...args) {
    for (const [, p] of _plugins) {
      if (!p.enabled || !p.hooks[hookName]) continue;
      try { p.hooks[hookName](...args); }
      catch (e) { ErrorTracker.capture({ type: 'plugin_hook', message: `${p.id}/${hookName}: ${e.message}` }); }
    }
  }

  function toggle(id) {
    const p = _plugins.get(id);
    if (p) p.enabled = !p.enabled;
  }

  function list() {
    return [..._plugins.values()].map(({ id, name, version, description, enabled }) =>
      ({ id, name, version, description, enabled }));
  }

  return { register, unregister, trigger, toggle, list };
})();

// ============ 11. İSTATİSTİK ============
const StatsEngine = (() => {
  let _stats = { messages: 0, reactions: 0, commands: 0, files: 0, voiceMinutes: 0 };
  let _session = { start: Date.now(), messages: 0 };
  try { _stats = { ..._stats, ...JSON.parse(localStorage.getItem('gt_stats') || '{}') }; } catch {}

  function increment(key, amount = 1) {
    if (!(key in _stats)) return;
    _stats[key] += amount;
    if (key === 'messages') _session.messages++;
    try { localStorage.setItem('gt_stats', JSON.stringify(_stats)); } catch {}
    // Badge güncelle
    const el = document.getElementById('statBadge_' + key);
    if (el) el.textContent = _stats[key];
  }

  function get(key) { return key ? _stats[key] : { ..._stats }; }

  function getSession() {
    return {
      ..._session,
      duration: Math.round((Date.now() - _session.start) / 60000) + ' dk'
    };
  }

  return { increment, get, getSession };
})();

// Eski uyumlu alias
function incrementStats() { StatsEngine.increment('messages'); }

// ============ 12. GELİŞTİRİCİ KONSOL ============
const DevConsole = {
  open() {
    if (typeof MODAL_TEMPLATES !== 'undefined') {
      MODAL_TEMPLATES.devConsole = () => {
        const sync  = SyncEngine.getStatus();
        const perf  = PerfMonitor.getReport();
        const errs  = ErrorTracker.getReport();
        const stats = StatsEngine.get();
        return `
          <div class="gm-header">
            <h2>⚙️ Geliştirici Konsolu</h2>
          </div>
          <div class="gm-body" style="font-family:monospace;font-size:12px">
            <div class="gm-section-label">Performans</div>
            <div class="gm-info-rows">
              <div class="gm-info-row"><span>FPS</span><code>${perf.fps}</code></div>
              <div class="gm-info-row"><span>Bellek</span><code>${perf.memory} MB</code></div>
              <div class="gm-info-row"><span>DOM Nodes</span><code>${perf.domNodes}</code></div>
              <div class="gm-info-row"><span>localStorage</span><code>${perf.storageKB} KB</code></div>
            </div>
            <div class="gm-divider"></div>
            <div class="gm-section-label">Sync</div>
            <div class="gm-info-rows">
              <div class="gm-info-row"><span>Kuyruk</span><code>${sync.pending} item</code></div>
              <div class="gm-info-row"><span>Son Sync</span><code>${sync.lastSync}</code></div>
            </div>
            <div class="gm-divider"></div>
            <div class="gm-section-label">İstatistikler</div>
            <div class="gm-info-rows">
              ${Object.entries(stats).map(([k, v]) => `<div class="gm-info-row"><span>${k}</span><code>${v}</code></div>`).join('')}
            </div>
            <div class="gm-divider"></div>
            <div class="gm-section-label">Hatalar (${errs.total})</div>
            <div style="max-height:150px;overflow-y:auto;font-size:11px">
              ${errs.recent.length === 0 ? '<p style="color:var(--t3)">Hata yok ✓</p>' : errs.recent.map(e => `
                <div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">
                  <span style="color:#ef4444">[${e.type}]</span> ${e.message}<br>
                  <span style="color:var(--t3);font-size:10px">${new Date(e.ts).toLocaleTimeString('tr-TR')}</span>
                </div>`).join('')}
            </div>
            <div class="gm-divider"></div>
            <div class="gm-actions">
              <button class="gm-btn ghost sm" onclick="SyncEngine.flush()">Sync Flush</button>
              <button class="gm-btn ghost sm" onclick="ErrorTracker.clear();openModal('devConsole')">Hataları Temizle</button>
              <button class="gm-btn ghost sm" onclick="BackupSystem.backup()">Yedek Al</button>
              <button class="gm-btn ghost sm" onclick="PerfMonitor.measureLatency().then(ms=>toast('Latency: '+ms+'ms'))">Ping</button>
            </div>
          </div>`;
      };
      if (typeof openModal === 'function') openModal('devConsole');
    }
  }
};

// ============ YARDIMCI ============
function _cleanOldData() {
  // Eski mesajları temizle
  if (Store.messages?.length > 500) {
    Store.messages = Store.messages.slice(-200);
    if (typeof saveStore === 'function') saveStore();
    _sysLog('Eski mesajlar temizlendi');
  }
  // Eski hata logları temizle
  ErrorTracker.clear();
}

// genId (eğer başka yerde tanımlı değilse)
if (typeof genId === 'undefined') {
  window.genId = function() {
    return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  };
}

// ============ BAŞLAT ============
(function initSystem() {
  // Temel servisler
  OfflineMode.init();
  ErrorTracker.init();
  PerfMonitor.init();

  // Tema uygula
  ThemeEngine.apply(ThemeEngine.current);

  // Dil güncelle
  I18n.updateUI();

  // Token yenileme (15dk aralık)
  setInterval(() => SecurityLayer.refreshTokenIfNeeded(), 15 * 60 * 1000);

  // Sync (30sn aralık)
  setInterval(() => SyncEngine.flush(), 30000);

  // Bulut yedek (günlük)
  const lastCloud = localStorage.getItem('gt_last_cloud_backup');
  if (!lastCloud || Date.now() - new Date(lastCloud).getTime() > 24 * 60 * 60 * 1000) {
    setTimeout(() => BackupSystem.cloudBackup(), 10000);
  }

  // Socket event'leri
  if (typeof socket !== 'undefined' && socket) {
    _initSystemSocket();
  } else {
    document.addEventListener('socket_ready', _initSystemSocket, { once: true });
  }

  // Ctrl+Shift+D → dev konsol
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      DevConsole.open();
    }
  });

  _sysLog('v2.0 yüklendi ✓');
})();

function _initSystemSocket() {
  if (typeof socket === 'undefined' || !socket) return;

  // Sunucu ayarları güncellemesi
  socket.on('server_settings_updated', settings => {
    Store.serverSettings = { ...Store.serverSettings, ...settings };
    if (typeof saveStore === 'function') saveStore();
    const el = document.getElementById('serverName');
    if (el && settings.name) el.textContent = settings.name;
  });

  // Zorla güncelleme
  socket.on('force_reload', ({ reason }) => {
    _sysLog('Sunucu güncelleme isteği: ' + reason);
    if (typeof toast === 'function') toast('Güncelleme uygulanıyor...', 'i');
    setTimeout(() => window.location.reload(), 2000);
  });

  // Duyuru
  socket.on('announcement', ({ text, type }) => {
    if (typeof toast === 'function') toast(text, type || 'i', 8000);
  });

  // Maintenance
  socket.on('maintenance', ({ message, duration }) => {
    if (typeof toast === 'function') {
      toast(`🔧 Bakım modu: ${message} (${duration} dk)`, 'w', 10000);
    }
  });

  _sysLog('Socket event dinleyicileri hazır');
}

// ============ CSS ============
(function injectSystemStyles() {
  const id = 'gt-sys-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
/* ─── Offline banner ─── */
.offline-banner{
  position:fixed;top:0;left:0;right:0;z-index:9999;
  background:#f59e0b;color:#1a1000;
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:8px 16px;font-size:13px;font-weight:600;
  animation:slideDown .3s ease;
}
@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}

/* ─── Dev konsol bilgi satırları (system.js içinde de kullanılıyor) ─── */
.gm-info-rows{display:flex;flex-direction:column;gap:4px}
.gm-info-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:6px 10px;border-radius:8px;background:var(--bg2,#241535);
  font-size:12px;color:var(--t2,#ccc);
}
.gm-info-row span:first-child{color:var(--t3,#888)}
.gm-info-row code{
  font-size:12px;color:var(--ac,#6366f1);font-family:monospace;
}
  `;
  document.head.appendChild(style);
})();
