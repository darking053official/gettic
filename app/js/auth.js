// Giriş / Kayıt
async function doAuth(type, username, password) {
  if (!username || !password) throw new Error('Kullanıcı adı ve şifre gerekli');
  if (username.length < 3) throw new Error('Kullanıcı adı en az 3 karakter olmalı');
  if (password.length < 4) throw new Error('Şifre en az 4 karakter olmalı');
  
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
    
    // Yeni kullanıcıya otomatik rol ata
    if (!Store.userRoles[data.user._id]) {
      Store.userRoles[data.user._id] = ['r4'];
      saveStore();
    }
    
    return data.user;
  }
  
  if (res.status === 429) throw new Error('Çok fazla deneme. Lütfen bekleyin.');
  if (res.status === 401) throw new Error(data.error || 'Geçersiz kullanıcı adı veya şifre');
  throw new Error(data.error || 'İşlem başarısız');
}

// Çıkış
function logout() {
  if (window._socket) {
    window._socket.emit('leave_all');
    window._socket.disconnect();
  }
  localStorage.removeItem('gt_token');
  localStorage.removeItem('gt_user');
  Store.user = null;
  Store.token = null;
  Store.messages = [];
  Store.activeDM = null;
  location.reload();
}

// Otomatik kullanıcı yükleme
async function loadUser() {
  if (!Store.token) return null;
  
  // Token süresi kontrolü
  try {
    const payload = JSON.parse(atob(Store.token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      // Token süresi dolmuş
      localStorage.removeItem('gt_token');
      Store.token = null;
      toast('Oturum süresi doldu, tekrar giriş yapın', 'e');
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
      toast('Oturum süresi doldu', 'e');
      return null;
    }
    
    const user = await res.json();
    if (user && user._id) {
      Store.user = user;
      localStorage.setItem('gt_user', JSON.stringify(user));
      return user;
    }
  } catch(e) {
    // Çevrimdışıysa localStorage'dan yükle
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

// Şifre değiştirme
async function changePassword(oldPass, newPass) {
  if (!oldPass || !newPass) throw new Error('Mevcut ve yeni şifre gerekli');
  if (newPass.length < 4) throw new Error('Yeni şifre en az 4 karakter olmalı');
  
  const res = await fetch(API + '/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + Store.token
    },
    body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Şifre değiştirilemedi');
  return data;
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
  return data;
}

// Hesap silme
async function deleteAccount(password) {
  if (!password) throw new Error('Şifre gerekli');
  
  const res = await fetch(API + '/api/me', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + Store.token
    },
    body: JSON.stringify({ password })
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Hesap silinemedi');
  logout();
  return data;
}

// Token yenileme
async function refreshToken() {
  if (!Store.token) return null;
  try {
    const res = await fetch(API + '/api/auth/refresh', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + Store.token }
    });
    const data = await res.json();
    if (data.token) {
      Store.token = data.token;
      localStorage.setItem('gt_token', data.token);
      return data.token;
    }
  } catch(e) {}
  return null;
}

// Oturum kontrolü
function isLoggedIn() {
  return !!(Store.token && Store.user);
}

// Otomatik token yenileme (her 30 dakikada bir)
setInterval(() => {
  if (Store.token && Store.user) {
    refreshToken().catch(() => {});
  }
}, 30 * 60 * 1000);
