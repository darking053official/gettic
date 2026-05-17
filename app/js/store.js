const Store = {
  user: null,
  token: localStorage.getItem('gt_token') || null,
  isOnline: navigator.onLine,
  channels: [
    { id: 'genel-sohbet', name: 'genel-sohbet', type: 'text', category: 'METİN' },
    { id: 'genel-ses', name: 'Genel Ses', type: 'voice', category: 'SES' },
    { id: 'kurallar', name: 'kurallar', type: 'forum', category: 'METİN' }
  ],
  categories: ['METİN', 'SES'],
  activeChannel: 'genel-sohbet',
  messages: JSON.parse(localStorage.getItem('gt_messages') || '[]'), // ← BURAYA EKLE
  dmFriends: JSON.parse(localStorage.getItem('gt_dm') || '[]'),
  blockedUsers: JSON.parse(localStorage.getItem('gt_blocked') || '[]'),
  theme: localStorage.getItem('gt_ac') || '#c94d8c',
  serverSettings: { name: 'Gettic' },
  userRoles: {},
  roles: [
    { id: 'r1', name: 'Kurucu', color: '#fbbf24', permissions: { all: true }, position: 0 },
    { id: 'r2', name: 'Admin', color: '#ef4444', permissions: { manageServer: true, manageRoles: true, kick: true, ban: true, deleteMsg: true }, position: 1 },
    { id: 'r3', name: 'Moderatör', color: '#6366f1', permissions: { kick: true, deleteMsg: true }, position: 2 },
    { id: 'r4', name: 'Üye', color: '#9ca3af', permissions: { sendMsg: true, addReactions: true }, position: 3 }
  ],
  polls: {},
  offlineQueue: [],
  notifPermission: 'default'
};

function saveStore() {
  localStorage.setItem('gt_dm', JSON.stringify(Store.dmFriends));
  localStorage.setItem('gt_blocked', JSON.stringify(Store.blockedUsers));
  localStorage.setItem('gt_ac', Store.theme);
  localStorage.setItem('gt_messages', JSON.stringify(Store.messages.slice(-50))); // ← BURAYA EKLE
}

window.addEventListener('online', () => { Store.isOnline = true; });
window.addEventListener('offline', () => { Store.isOnline = false; });
