// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC SYSTEM.JS - SVG İKONLU + TÜRKÇE DÜZELTMELER            ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function sysIcon(name, size = 18) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

var perfState = perfState || { debugMode: false };

// ============ 1. VERİTABANI SENKRONİZASYONU ============
const SyncEngine = {
  queue: JSON.parse(localStorage.getItem('gt_sync_queue') || '[]'),
  isSyncing: false,
  lastSync: null,
  
  async sync() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;
    
    try {
      for (const item of this.queue.slice(0, 20)) {
        try {
          const res = await fetch(API + item.endpoint, {
            method: item.method,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token },
            body: JSON.stringify(item.data)
          });
          if (res.ok) {
            this.queue = this.queue.filter(q => q.id !== item.id);
          }
        } catch(e) { break; }
      }
      this.lastSync = new Date().toISOString();
      this.save();
    } catch(e) {}
    this.isSyncing = false;
  },
  
  addToQueue(endpoint, method, data) {
    this.queue.push({ id: genId(), endpoint, method, data, timestamp: new Date().toISOString() });
    if (this.queue.length > 100) this.queue.shift();
    this.save();
    this.sync();
  },
  
  save() { localStorage.setItem('gt_sync_queue', JSON.stringify(this.queue)); }
};

// ============ 2. ÇEVRİMDIŞI MOD ============
const OfflineMode = {
  isOffline: !navigator.onLine,
  pendingMessages: JSON.parse(localStorage.getItem('gt_pending_msgs') || '[]'),
  
  init() {
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.processPending();
      toast(sysIcon('wifi') + ' Tekrar çevrimiçi');
      SyncEngine.sync();
    });
    
    window.addEventListener('offline', () => {
      this.isOffline = true;
      toast(sysIcon('wifi-off') + ' Çevrimdışı mod aktif', 'w');
    });
  },
  
  addPending(msg) {
    this.pendingMessages.push(msg);
    if (this.pendingMessages.length > 50) this.pendingMessages.shift();
    localStorage.setItem('gt_pending_msgs', JSON.stringify(this.pendingMessages));
  },
  
  processPending() {
    if (this.pendingMessages.length === 0) return;
    const msgs = [...this.pendingMessages];
    this.pendingMessages = [];
    localStorage.removeItem('gt_pending_msgs');
    msgs.forEach(msg => {
      Store.messages.push(msg);
      SyncEngine.addToQueue('/api/channels/' + msg.channelId + '/messages', 'POST', msg);
    });
    if (typeof renderMessages === 'function') renderMessages();
  }
};

// ============ 3. YEDEKLEME ============
const BackupSystem = {
  backup() {
    const data = {
      version: '2.0', timestamp: new Date().toISOString(),
      store: {
        messages: Store.messages?.slice(-100), channels: Store.channels,
        categories: Store.categories, userRoles: Store.userRoles, roles: Store.roles,
        dmFriends: dmState?.friends, dmMessages: dmState?.messages,
        settings: { theme: Store.theme, serverSettings: Store.serverSettings }
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gettic-yedek-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(sysIcon('download') + ' Yedekleme indirildi');
  },
  
  restore(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.store) {
          if (data.store.messages) Store.messages = data.store.messages;
          if (data.store.channels) Store.channels = data.store.channels;
          if (data.store.categories) Store.categories = data.store.categories;
          if (typeof saveStore === 'function') saveStore();
          if (typeof renderChannels === 'function') renderChannels();
          if (typeof renderMessages === 'function') renderMessages();
          toast(sysIcon('check') + ' Yedek geri yüklendi');
        }
      } catch(e) { toast(sysIcon('alert') + ' Geçersiz yedek dosyası', 'e'); }
    };
    reader.readAsDataURL(file);
  }
};

// ============ 4. HATA YAKALAMA ============
const ErrorTracker = {
  errors: JSON.parse(localStorage.getItem('gt_errors') || '[]'),
  maxErrors: 50,
  
  init() {
    window.onerror = (msg, url, line, col, error) => {
      this.capture({ type: 'global', message: msg, url, line, col, stack: error?.stack, user: Store.user?.username, timestamp: new Date().toISOString() });
      return false;
    };
    
    window.addEventListener('unhandledrejection', (e) => {
      this.capture({ type: 'promise', message: e.reason?.message || String(e.reason), stack: e.reason?.stack, user: Store.user?.username, timestamp: new Date().toISOString() });
    });
  },
  
  capture(error) {
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) this.errors.pop();
    localStorage.setItem('gt_errors', JSON.stringify(this.errors.slice(0, 20)));
    if (perfState?.debugMode) console.error(sysIcon('alert'), error);
  },
  
  getReport() {
    return { total: this.errors.length, recent: this.errors.slice(0, 10), browser: navigator.userAgent, timestamp: new Date().toISOString() };
  },
  
  clear() { this.errors = []; localStorage.removeItem('gt_errors'); }
};

// ============ 5. PERFORMANS ============
const PerfMonitor = {
  metrics: { fps: 0, memory: 0, renderTime: 0, domNodes: 0, storageSize: 0, networkLatency: 0 },
  
  init() {
    let frames = 0, lastTime = performance.now();
    const measureFPS = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) { this.metrics.fps = frames; frames = 0; lastTime = now; }
      requestAnimationFrame(measureFPS);
    };
    requestAnimationFrame(measureFPS);
    
    setInterval(() => {
      this.metrics.memory = performance.memory?.usedJSHeapSize || 0;
      this.metrics.domNodes = document.querySelectorAll('*').length;
      this.metrics.storageSize = new Blob([JSON.stringify(localStorage)]).size;
    }, 5000);
  },
  
  getReport() { return { ...this.metrics, timestamp: new Date().toISOString() }; }
};

// ============ 6. GÜVENLİK ============
const SecurityLayer = {
  rateLimits: {},
  
  checkRate(key, max = 10, window = 10000) {
    const now = Date.now();
    if (!this.rateLimits[key]) this.rateLimits[key] = [];
    this.rateLimits[key] = this.rateLimits[key].filter(t => now - t < window);
    if (this.rateLimits[key].length >= max) return false;
    this.rateLimits[key].push(now);
    return true;
  },
  
  sanitize(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
  },
  
  validateInput(input, type = 'text') {
    if (!input) return false;
    switch(type) {
      case 'username': return /^[a-zA-Z0-9_]{3,20}$/.test(input);
      case 'password': return input.length >= 4;
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      default: return input.length <= 2000;
    }
  },
  
  generateCSRFToken() {
    const token = genId() + genId();
    sessionStorage.setItem('csrf_token', token);
    return token;
  },
  
  verifyCSRF(token) { return token === sessionStorage.getItem('csrf_token'); }
};

// ============ 7. ÇOKLU DİL ============
const I18n = {
  currentLang: localStorage.getItem('gt_lang') || 'tr',
  translations: {
    tr: { login: 'Giriş', register: 'Kayıt', logout: 'Çıkış', send: 'Gönder', search: 'Ara', settings: 'Ayarlar', online: 'Çevrimiçi', offline: 'Çevrimdışı', noMessages: 'Henüz mesaj yok', typing: 'yazıyor...', edit: 'Düzenle', delete: 'Sil', copy: 'Kopyala', pin: 'Sabitle', dm: 'DM', home: 'Ana Sayfa', discover: 'Keşfet', notifications: 'Bildirimler', friends: 'Arkadaşlar', servers: 'Sunucular', channels: 'Kanallar', createChannel: 'Kanal Oluştur', createServer: 'Sunucu Oluştur', theme: 'Tema', language: 'Dil', profile: 'Profil', error: 'Hata', success: 'Başarılı', warning: 'Uyarı', info: 'Bilgi', confirm: 'Onayla', cancel: 'İptal', save: 'Kaydet', close: 'Kapat', yes: 'Evet', no: 'Hayır', ok: 'Tamam', retry: 'Tekrar Dene' },
    en: { login: 'Login', register: 'Register', logout: 'Logout', send: 'Send', search: 'Search', settings: 'Settings', online: 'Online', offline: 'Offline', noMessages: 'No messages', typing: 'typing...', edit: 'Edit', delete: 'Delete', copy: 'Copy', pin: 'Pin', dm: 'DM', home: 'Home', discover: 'Discover', notifications: 'Notifications', friends: 'Friends', servers: 'Servers', channels: 'Channels', createChannel: 'Create Channel', createServer: 'Create Server', theme: 'Theme', language: 'Language', profile: 'Profile', error: 'Error', success: 'Success', warning: 'Warning', info: 'Info', confirm: 'Confirm', cancel: 'Cancel', save: 'Save', close: 'Close', yes: 'Yes', no: 'No', ok: 'OK', retry: 'Retry' },
    de: { login: 'Anmelden', register: 'Registrieren', logout: 'Abmelden', send: 'Senden', search: 'Suchen', settings: 'Einstellungen', online: 'Online', offline: 'Offline', noMessages: 'Keine Nachrichten', typing: 'schreibt...', edit: 'Bearbeiten', delete: 'Löschen', copy: 'Kopieren', pin: 'Anheften', dm: 'DM', home: 'Startseite', notifications: 'Benachrichtigungen', theme: 'Design', language: 'Sprache', profile: 'Profil', error: 'Fehler', success: 'Erfolg', warning: 'Warnung', save: 'Speichern', close: 'Schließen', yes: 'Ja', no: 'Nein', ok: 'OK' }
  },
  
  t(key) { return this.translations[this.currentLang]?.[key] || this.translations['tr']?.[key] || key; },
  setLang(lang) { if (this.translations[lang]) { this.currentLang = lang; localStorage.setItem('gt_lang', lang); this.updateUI(); } },
  updateUI() { document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.dataset.i18n; if (el.placeholder !== undefined) el.placeholder = this.t(key); else el.textContent = this.t(key); }); }
};

// ============ 8. TEMA ============
const ThemeEngine = {
  themes: {
    pink: { accent: '#ec4899', bg: '#0f0a14', bg1: '#1a0f24', bg2: '#241535' },
    blue: { accent: '#3b82f6', bg: '#0a0f1a', bg1: '#0f1829', bg2: '#14213d' },
    green: { accent: '#10b981', bg: '#0a140f', bg1: '#0f2418', bg2: '#143520' },
    orange: { accent: '#f97316', bg: '#140f0a', bg1: '#24180f', bg2: '#352114' },
    purple: { accent: '#8b5cf6', bg: '#0f0a14', bg1: '#180f24', bg2: '#241435' },
    red: { accent: '#ef4444', bg: '#140a0a', bg1: '#240f0f', bg2: '#351414' },
    custom: JSON.parse(localStorage.getItem('gt_custom_theme') || '{}')
  },
  currentTheme: localStorage.getItem('gt_theme') || 'pink',
  
  apply(themeName) {
    const theme = this.themes[themeName] || this.themes.pink;
    this.currentTheme = themeName;
    localStorage.setItem('gt_theme', themeName);
    document.documentElement.style.setProperty('--ac', theme.accent);
    document.documentElement.style.setProperty('--bg', theme.bg);
    document.documentElement.style.setProperty('--bg1', theme.bg1);
    document.documentElement.style.setProperty('--bg2', theme.bg2);
    if (typeof saveStore === 'function') saveStore();
  },
  
  saveCustom(colors) { this.themes.custom = colors; localStorage.setItem('gt_custom_theme', JSON.stringify(colors)); this.apply('custom'); },
  getCurrent() { return this.themes[this.currentTheme] || this.themes.pink; }
};

// ============ 9. EKLENTİ ============
const PluginSystem = {
  plugins: JSON.parse(localStorage.getItem('gt_plugins') || '{}'),
  
  register(name, plugin) {
    if (!name || !plugin.init) return false;
    this.plugins[name] = { name, version: plugin.version || '1.0.0', description: plugin.description || '', enabled: true, hooks: plugin.hooks || {}, data: plugin.data || {} };
    plugin.init(); this.save(); return true;
  },
  
  unregister(name) { if (this.plugins[name]?.hooks?.destroy) this.plugins[name].hooks.destroy(); delete this.plugins[name]; this.save(); },
  trigger(hookName, ...args) { Object.values(this.plugins).forEach(plugin => { if (plugin.enabled && plugin.hooks[hookName]) { try { plugin.hooks[hookName](...args); } catch(e) {} } }); },
  getList() { return Object.values(this.plugins).map(p => ({ name: p.name, version: p.version, description: p.description, enabled: p.enabled })); },
  save() { localStorage.setItem('gt_plugins', JSON.stringify(this.plugins)); }
};

// ============ 10. API LIMIT ============
const APIRateLimiter = {
  limits: {},
  globalLimit: { max: 100, window: 60000, current: 0, resetAt: Date.now() + 60000 },
  
  check(key, max = 10, window = 10000) {
    const now = Date.now();
    if (now > this.globalLimit.resetAt) { this.globalLimit.current = 0; this.globalLimit.resetAt = now + this.globalLimit.window; }
    if (this.globalLimit.current >= this.globalLimit.max) return false;
    if (!this.limits[key]) this.limits[key] = { count: 0, resetAt: now + window };
    if (now > this.limits[key].resetAt) { this.limits[key].count = 0; this.limits[key].resetAt = now + window; }
    if (this.limits[key].count >= max) return false;
    this.limits[key].count++; this.globalLimit.current++;
    return true;
  },
  
  getRemaining(key) { if (!this.limits[key]) return 10; const now = Date.now(); if (now > this.limits[key].resetAt) return 10; return Math.max(0, 10 - this.limits[key].count); },
  getGlobalRemaining() { const now = Date.now(); if (now > this.globalLimit.resetAt) return this.globalLimit.max; return Math.max(0, this.globalLimit.max - this.globalLimit.current); }
};

// ============ BAŞLAT ============
document.addEventListener('DOMContentLoaded', () => {
  OfflineMode.init();
  ErrorTracker.init();
  PerfMonitor.init();
  ThemeEngine.apply(ThemeEngine.currentTheme);
  
  setInterval(() => SyncEngine.sync(), 30000);
  
  setInterval(() => {
    if (performance.memory?.usedJSHeapSize > 100 * 1048576) { clearOldCache?.(); }
  }, 60000);
  
  console.log('Sistem paketi yüklendi (SVG ikonlu + Türkçe düzeltmeler)');
});
