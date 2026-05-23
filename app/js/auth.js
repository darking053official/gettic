// ╔══════════════════════════════════════════════════════════════════╗
// ║                    GETTIC AUTH.JS - ALTCHA'LI FINAL              ║
// ╚══════════════════════════════════════════════════════════════════╝

// Altcha payload alma
function getAltchaPayload() {
  try { return document.querySelector('altcha-widget')?.getValue() || null; }
  catch(e) { return null; }
}

// Giriş / Kayıt
async function doAuth(type, username, password) {
  if (!username || !password) throw new Error('Kullanıcı adı ve şifre gerekli');
  if (username.length < 3) throw new Error('Kullanıcı adı en az 3 karakter olmalı');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir');
  if (password.length < 6) throw new Error('Şifre en az 6 karakter olmalı');
  
  // Altcha doğrulaması
  const altchaPayload = getAltchaPayload();
  if (!altchaPayload) throw new Error('Lütfen "Ben robot değilim" doğrulamasını yapın');
  
  try {
    const res = await fetch(API + '/api/auth/' + type, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, altcha: altchaPayload })
    });
    
    const data = await res.json();
    
    if (data.token) {
      Store.token = data.token;
      Store.user = data.user;
      localStorage.setItem('gt_token', data.token);
      localStorage.setItem('gt_user', JSON.stringify(data.user));
      
      if (!Store.userRoles || !Store.userRoles[data.user._id]) {
        if (!Store.userRoles) Store.userRoles = {};
        Store.userRoles[data.user._id] = ['r4'];
        if (typeof saveStore === 'function') saveStore();
      }
      
      if (typeof MongoSync !== 'undefined' && MongoSync.syncAll) {
        setTimeout(() => MongoSync.syncAll(), 1500);
      }
      
      return data.user;
    }
    
    if (res.status === 429) throw new Error('Çok fazla deneme. Lütfen 15 dakika bekleyin.');
    if (res.status === 423) throw new Error(data.error || 'Hesap kilitli. Lütfen bekleyin.');
    if (res.status === 401) throw new Error(data.error || 'Geçersiz kullanıcı adı veya şifre');
    if (res.status === 400) throw new Error(data.error || 'Geçersiz bilgiler');
    throw new Error(data.error || 'İşlem başarısız');
  } catch(e) {
    // Altcha'yı sıfırla
    document.querySelector('altcha-widget')?.reset?.();
    
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      throw new Error('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
    }
    throw e;
  }
}

// Çıkış
function logout() {
  if (socket) {
    try {
      socket.emit('leave_all');
      socket.disconnect();
    } catch(e) {}
    socket = null;
  }
  
  localStorage.removeItem('gt_token');
  localStorage.removeItem('gt_user');
  
  if (typeof Store !== 'undefined') {
    Store.user = null;
    Store.token = null;
    Store.messages = [];
    Store.activeDM = null;
  }
  
  const main = document.getElementById('mainScreen');
  const login = document.getElementById('loginScreen');
  if (main) main.classList.add('hidden');
  if (login) login.classList.remove('hidden');
  
  const authEmail = document.getElementById('authEmail');
  const authPass = document.getElementById('authPassword');
  if (authEmail) authEmail.value = '';
  if (authPass) authPass.value = '';
}

// Kullanıcı yükleme
async function loadUser() {
  if (!Store || !Store.token) return null;
  
  // Token süresi kontrolü
  try {
    const payload = JSON.parse(atob(Store.token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('gt_token');
      Store.token = null;
      return null;
    }
  } catch(e) {}
  
  try {
    const res = await fetch(API + '/api/me', {
      headers: { 'Authorization': 'Bearer ' + Store.token }
    });
    
    if (res.status === 401) {
      localStorage.removeItem('gt_token');
      Store.token = null;
      return null;
    }
    
    const user = await res.json();
    if (user && user._id) {
      Store.user = user;
      localStorage.setItem('gt_user', JSON.stringify(user));
      return user;
    }
  } catch(e) {
    // Offline fallback
    const saved = localStorage.getItem('gt_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        Store.user = user;
        return user;
      } catch(e2) {}
    }
  }
  return null;
}

// Profil güncelleme
async function updateProfile(updates) {
  // Zararlı alanları temizle
  delete updates.password;
  delete updates.username;
  delete updates._id;
  delete updates.token;
  delete updates.loginAttempts;
  delete updates.lockedUntil;
  
  try {
    const res = await fetch(API + '/api/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + Store.token
      },
      body: JSON.stringify(updates)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Profil güncellenemedi');
    
    Store.user = data;
    localStorage.setItem('gt_user', JSON.stringify(data));
    
    const displayName = document.getElementById('displayName');
    const avatar = document.getElementById('avatar');
    if (displayName && data.username) displayName.textContent = data.username;
    if (avatar && data.username) avatar.textContent = data.username.charAt(0).toUpperCase();
    
    return data;
  } catch(e) {
    throw new Error('Profil güncellenemedi: ' + e.message);
  }
}

// Oturum kontrolü
function isLoggedIn() {
  return !!(Store && Store.token && Store.user);
}

// Token yenileme
async function refreshToken() {
  if (!Store?.token) return false;
  try {
    const payload = JSON.parse(atob(Store.token.split('.')[1]));
    // 1 saat kala yenile
    if (payload.exp * 1000 - Date.now() < 3600000) {
      const res = await fetch(API + '/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          Store.token = data.token;
          localStorage.setItem('gt_token', data.token);
          return true;
        }
      }
    }
  } catch(e) {}
  return false;
}

// Global yap
window.doAuth = doAuth;
window.logout = logout;
window.loadUser = loadUser;
window.updateProfile = updateProfile;
window.isLoggedIn = isLoggedIn;
window.refreshToken = refreshToken;
window.getAltchaPayload = getAltchaPayload;

console.log('✅ Auth.js yüklendi (Altcha korumalı)');
