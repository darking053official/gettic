const store = reactive({
  user: JSON.parse(localStorage.getItem('gt_user') || 'null'),
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
  theme: localStorage.getItem('gt_ac') || '#c94d8c',
  emojiOpen: false,
  toastMsg: null,
  activeModal: null,
  serverSettings: { name: 'Gettic' }
});

function toast(msg, type = 's') {
  store.toastMsg = { msg, type };
  setTimeout(() => store.toastMsg = null, 2500);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 7);
}
