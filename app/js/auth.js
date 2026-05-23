// ============ GETTIC AUTH.JS - FULL GÜNCEL ============

// Giriş / Kayıt
async function doAuth(type, username, password) {
  if (!username || !password) throw new Error('Kullanıcı adı ve şifre gerekli');
  if (username.length < 3) throw new Error('Kullanıcı adı en az 3 karakter olmalı');
  if (password.length < 4) throw new Error('Şifre en az 4 karakter olmalı');
  
  try {
    const res = await fetch(API + '/api/auth/' + type, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
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
    
    if (res.status === 429) throw new Error('Çok fazla deneme. Lütfen bekleyin.');
    if (res.status === 401) throw new Error(data.error || 'Geçersiz kullanıcı adı veya şifre');
    throw new Error(data.error || 'İşlem başarısız');
  } catch(e) {
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      throw new Error('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
    }
    throw e;
  }
}

// Çıkış
function logout() {
  if (socket) {
    socket.emit('leave_all');
    socket.disconnect();
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
}

// Oturum kontrolü
function isLoggedIn() {
  return !!(Store && Store.token && Store.user);
}

// Global yap
window.doAuth = doAuth;
window.logout = logout;
window.loadUser = loadUser;
window.updateProfile = updateProfile;
window.isLoggedIn = isLoggedIn;

console.log('✅ Auth.js yüklendi');
