// ============ GETTIC AUTH.JS - FULL & HATASIZ ============

// Giriş / Kayıt
async function doAuth(type, username, password) {
  if (!username || !password) throw new Error('Kullanıcı adı ve şifre gerekli');
  if (username.length < 3) throw new Error('Kullanıcı adı en az 3 karakter');
  if (password.length < 4) throw new Error('Şifre en az 4 karakter');
  
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
      
      if (!Store.userRoles[data.user._id]) {
        Store.userRoles[data.user._id] = ['r4'];
        if (typeof saveStore === 'function') saveStore();
      }
      
      return data.user;
    }
    
    if (res.status === 429) throw new Error('Çok fazla deneme. Bekleyin.');
    throw new Error(data.error || 'İşlem başarısız');
  } catch(e) {
    if (e.message.includes('Failed to fetch')) throw new Error('Sunucuya bağlanılamadı');
    throw e;
  }
}

// Çıkış
function logout() {
  if (window._socket) {
    window._socket.emit('leave_all');
    window._socket.disconnect();
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
      try { Store.user = JSON.parse(saved); return Store.user; } catch(e2) {}
    }
  }
  return null;
}

// Global yap
window.doAuth = doAuth;
window.logout = logout;
window.loadUser = loadUser;

console.log('✅ Auth.js yüklendi');
