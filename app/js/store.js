// ============ GETTIC STORE.JS ============
const Store = {
  user: null,
  token: localStorage.getItem('gt_token') || null,
  isOnline: navigator.onLine,
  serverSettings: { name: 'Gettic' },
  activeChannel: localStorage.getItem('gt_activeChannel') || 'genel-sohbet',
  channels: [
    { id: 'genel-sohbet', name: 'genel-sohbet', type: 'text', category: 'METİN' },
    { id: 'genel-ses', name: 'Genel Ses', type: 'voice', category: 'SES' }
  ],
  categories: ['METİN', 'SES'],
  messages: [],
  dmFriends: [],
  blockedUsers: [],
  userRoles: {},
  roles: [
    { id: 'r1', name: 'Kurucu', color: '#fbbf24', permissions: { all: true }, position: 0 },
    { id: 'r2', name: 'Admin', color: '#ef4444', permissions: { manageServer: true, kick: true, ban: true, deleteMsg: true }, position: 1 },
    { id: 'r3', name: 'Moderatör', color: '#6366f1', permissions: { kick: true, deleteMsg: true }, position: 2 },
    { id: 'r4', name: 'Üye', color: '#ec4899', permissions: { sendMsg: true, addReactions: true }, position: 3 }
  ],
  polls: {},
  theme: localStorage.getItem('gt_ac') || '#ec4899'
};

// Sayfa yüklendiğinde mesajları localStorage'dan geri yükle
try {
  const saved = localStorage.getItem('gt_messages');
  if (saved) Store.messages = JSON.parse(saved);
} catch(e) {}

function saveStore() {
  try {
    localStorage.setItem('gt_messages', JSON.stringify(Store.messages.slice(-100)));
    localStorage.setItem('gt_activeChannel', Store.activeChannel);
    localStorage.setItem('gt_ac', Store.theme);
    localStorage.setItem('gt_channels', JSON.stringify(Store.channels));
    localStorage.setItem('gt_categories', JSON.stringify(Store.categories));
    localStorage.setItem('gt_userRoles', JSON.stringify(Store.userRoles));
  } catch(e) {}
}

window.addEventListener('online', () => { Store.isOnline = true; });
window.addEventListener('offline', () => { Store.isOnline = false; });
