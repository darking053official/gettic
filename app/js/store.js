const store = Vue.reactive({
  user: null,
  token: localStorage.getItem('gt_token') || null,
  isOnline: navigator.onLine,
  channels: [
    { id: 'genel-sohbet', name: 'genel-sohbet', type: 'text', category: 'METİN' },
    { id: 'genel-ses', name: 'Genel Ses', type: 'voice', category: 'SES' }
  ],
  categories: ['METİN', 'SES'],
  activeChannel: { id: 'genel-sohbet', name: 'genel-sohbet' },
  messages: [],
  input: '',
  sidebarOpen: false,
  userPanelOpen: false,
  theme: localStorage.getItem('gt_ac') || '#c94d8c',
  emojiOpen: false,
  toastMsg: null,
  activeModal: null,
  serverSettings: { name: 'Gettic' },
  userRoles: {}
});

// Kullanıcıyı localStorage'dan yükle
try {
  const savedUser = localStorage.getItem('gt_user');
  if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
    const parsed = JSON.parse(savedUser);
    if (parsed && parsed._id) {
      store.user = parsed;
    }
  }
} catch(e) {
  localStorage.removeItem('gt_user');
}

// Token varsa kullanıcıyı API'den dene
if (!store.user && store.token) {
  fetch(API + '/api/me', {
    headers: { 'Authorization': 'Bearer ' + store.token }
  })
  .then(r => r.json())
  .then(user => {
    if (user && user._id) {
      store.user = user;
      localStorage.setItem('gt_user', JSON.stringify(user));
    }
  })
  .catch(() => {});
}

function toast(msg, type = 's') {
  store.toastMsg = { msg, type };
  setTimeout(() => { store.toastMsg = null; }, 2500);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 7);
}

window.addEventListener('online', () => { store.isOnline = true; });
window.addEventListener('offline', () => { store.isOnline = false; });

console.log('✅ Store hazır, user:', store.user?.username || 'yok');
