// ============ DOM REFS ============
const $ = (id) => document.getElementById(id);
const ls = $('ls');
const loginScreen = $('loginScreen');
const mainScreen = $('mainScreen');
const authUsername = $('authUsername');
const authPassword = $('authPassword');
const authSubmit = $('authSubmit');
const authError = $('authError');
const tabLogin = $('tabLogin');
const tabRegister = $('tabRegister');
const messagesEl = $('messages');
const messageInput = $('messageInput');
const sendBtn = $('sendBtn');
const displayName = $('displayName');
const avatar = $('avatar');
const serverName = $('serverName');
const channelName = $('channelName');
const channelList = $('channelList');
const sidebar = $('sidebar');
const userPanel = $('userPanel');
const modal = $('modal');
const modalContent = $('modalContent');
const modalClose = $('modalClose');
const toastEl = $('toast');
const emojiPanel = $('emojiPanel');
const typing = $('typing');
const connbar = $('connbar');

// ============ STATE ============
let tab = 'login';
let socket = null;
let typingTimeout = null;

// ============ INIT ============
setTimeout(() => { ls?.classList.add('hide'); loginScreen?.classList.remove('hidden'); }, 500);

// ============ AUTH ============
tabLogin.onclick = () => { tab='login'; updateAuthUI(); };
tabRegister.onclick = () => { tab='register'; updateAuthUI(); };
function updateAuthUI() {
  tabLogin.classList.toggle('act', tab==='login');
  tabRegister.classList.toggle('act', tab==='register');
  authSubmit.textContent = tab==='login'?'Giriş':'Kayıt';
}

authSubmit.onclick = async () => {
  const u = authUsername.value.trim();
  const p = authPassword.value.trim();
  if (!u||u.length<3) { showAuthError('Kullanıcı adı en az 3 karakter'); return; }
  if (!p||p.length<4) { showAuthError('Şifre en az 4 karakter'); return; }
  authError.style.display='none';
  authSubmit.textContent = 'Yükleniyor...';
  authSubmit.disabled = true;
  try {
    await doAuth(tab, u, p);
    showMain();
  } catch(e) { showAuthError(e.message); }
  authSubmit.textContent = tab==='login'?'Giriş':'Kayıt';
  authSubmit.disabled = false;
};
function showAuthError(msg) { authError.textContent=msg; authError.style.display='block'; }

authPassword.onkeydown = (e) => { if(e.key==='Enter') authSubmit.click(); };
authUsername.onkeydown = (e) => { if(e.key==='Enter') authPassword.focus(); };

function showMain() {
  // localStorage'dan mesajları geri yükle
  const saved = localStorage.getItem('gt_messages');
  if (saved && !Store.messages.length) {
    try { Store.messages = JSON.parse(saved); } catch(e) {}
  }
  // Rolleri yükle
  const savedRoles = localStorage.getItem('gt_roles');
  if (savedRoles) {
    try { Store.roles = JSON.parse(savedRoles); } catch(e) {}
  }
  
  loginScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden','flex');
  mainScreen.classList.add('flex');
  displayName.textContent = Store.user?.username || '';
  avatar.textContent = Store.user?.username?.charAt(0)?.toUpperCase() || 'G';
  serverName.textContent = Store.serverSettings?.name || 'Gettic';
  channelName.textContent = Store.activeChannel || 'genel-sohbet';
  document.title = 'Gettic - ' + (Store.user?.username || 'Sohbet');
  
  renderChannels();
  renderMessages();
  initEmojiPanel();
  connectSocket();
  saveStore();
  messageInput?.focus();
}

// ============ LOGOUT ============
$('logoutBtn').onclick = () => { if(confirm('Çıkış yapmak istediğine emin misin?')) logout(); };
$('panelLogoutBtn').onclick = () => { if(confirm('Çıkış yapmak istediğine emin misin?')) logout(); };

// ============ MESAJ ============
sendBtn.onclick = sendMessage;
sendBtn.addEventListener('touchend', (e) => { e.preventDefault(); sendMessage(); });
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
messageInput.addEventListener('input', () => {
  if (socket && Store.user) {
    clearTimeout(typingTimeout);
    socket.emit('typing', { channelId: Store.activeChannel, username: Store.user.username });
    typingTimeout = setTimeout(() => socket.emit('stop_typing', { channelId: Store.activeChannel }), 3000);
  }
});

// ============ SIDEBAR TOGGLE ============
$('toggleSidebarBtn').onclick = () => { sidebar.classList.toggle('open'); Store.sidebarOpen = sidebar.classList.contains('open'); saveStore(); };
$('togglePanelBtn').onclick = () => userPanel.classList.toggle('hidden');

// Sidebar başlangıç durumu
if (Store.sidebarOpen) sidebar.classList.add('open');

// ============ MODALS ============
modalClose.onclick = closeModal;
$('addChannelBtn').onclick = () => openModal('addChannel');
$('themeBtn').onclick = () => openModal('theme');
$('dmBtn').onclick = () => openModal('dm');
$('imageBtn').onclick = () => openModal('imageGen');
$('pollBtn').onclick = () => openModal('poll');
$('searchBtn').onclick = () => openModal('search');
$('serverIcon').onclick = () => openModal('serverSettings');

// Panel butonları
$('panelDmBtn').onclick = () => openModal('dm');
$('panelAddFriendBtn').onclick = () => openModal('addFriend');
$('panelThemeBtn').onclick = () => openModal('theme');
$('panelPollBtn').onclick = () => openModal('poll');
$('panelSearchBtn').onclick = () => openModal('search');
$('panelClearBtn').onclick = clearMessages;

// ============ EMOJI ============
$('emojiBtn').onclick = () => emojiPanel.classList.toggle('hidden');
function initEmojiPanel() {
  const emojis = ['😀','😂','❤️','👍','🔥','🎉','🥳','😎','💯','✅','👋','🙏','🎮','✨','😢','😡','🤔','💻','📱','🌍','🎵','⭐','💎','🍕','🚀'];
  emojiPanel.innerHTML = '<div class="egrid">'+emojis.map(e => `<span class="es" onclick="insertEmoji('${e}')">${e}</span>`).join('')+'</div>';
}
function insertEmoji(emoji) {
  messageInput.value += emoji;
  messageInput.focus();
  emojiPanel.classList.add('hidden');
}

// Emoji panel dışına tıklanınca kapat
document.addEventListener('click', (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== $('emojiBtn')) {
    emojiPanel.classList.add('hidden');
  }
});

// ============ SOCKET ============
function connectSocket() {
  if (!Store.token||typeof io==='undefined') return;
  if (socket) socket.disconnect();
  socket = io(API, { auth: { token: Store.token }, transports: ['websocket','polling'], reconnection: true, reconnectionAttempts: 10 });
  window._socket = socket;
  
  socket.on('connect', () => {
    socket.emit('join_channel', Store.activeChannel);
    connbar.style.height = '0';
    toast('🟢 Bağlandı');
  });
  
  socket.on('new_message', (msg) => {
    if (msg.channelId===Store.activeChannel&&msg.senderId!==Store.user?._id) {
      Store.messages.push(msg);
      if (Store.messages.length>MAX_MSGS) Store.messages.shift();
      renderMessages();
      saveStore();
      // Masaüstü bildirimi
      if (Store.notifPermission==='granted' && document.hidden) {
        try {
          new Notification(msg.senderName, { body: msg.content.substring(0, 100), icon: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png' });
        } catch(e) {}
      }
    }
  });
  
  socket.on('user_typing', ({ username }) => {
    typing.textContent = username + ' yazıyor...';
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => typing.textContent = '', 3000);
  });
  
  socket.on('disconnect', () => {
    connbar.style.height = '28px';
    toast('🔴 Bağlantı koptu', 'e');
  });
  
  socket.on('connect_error', () => {
    toast('Bağlantı hatası', 'e');
  });
}

$('retryBtn').onclick = () => { if(socket) socket.connect(); };

// ============ LOAD USER ============
if (Store.token) {
  loadUser().then(u => { 
    if (u) {
      const saved = localStorage.getItem('gt_messages');
      if (saved && !Store.messages.length) {
        try { Store.messages = JSON.parse(saved); } catch(e) {}
      }
      showMain(); 
    }
  });
}

// ============ BİLDİRİM İZNİ ============
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().then(p => { Store.notifPermission = p; });
}

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key==='k') { e.preventDefault(); openModal('search'); }
  if (e.key==='Escape') { closeModal(); emojiPanel.classList.add('hidden'); }
  if (e.key==='F5' || (e.ctrlKey && e.key==='r')) {
    saveStore();
  }
});

// Sayfa kapanmadan önce kaydet
window.addEventListener('beforeunload', () => { saveStore(); });

// ============ ONLINE/OFFLINE ============
window.addEventListener('online', () => { 
  Store.isOnline=true; 
  connbar.style.height='0'; 
  toast('🟢 Tekrar çevrimiçi');
  connectSocket();
});
window.addEventListener('offline', () => { 
  Store.isOnline=false; 
  connbar.style.height='28px'; 
  toast('🔴 Çevrimdışı', 'e');
});

// ============ VISIBILITY ============
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    document.title = 'Gettic - ' + (Store.user?.username || 'Sohbet');
  }
});

// ============ MOBİL GERİ TUŞU ============
window.addEventListener('popstate', (e) => {
  if (modal && !modal.classList.contains('hidden')) {
    closeModal();
    e.preventDefault();
  }
});

// ============ SERVICE WORKER ============
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((reg) => console.log('✅ SW kaydedildi:', reg.scope))
    .catch((err) => console.log('SW hatası:', err));
}

// ============ PWA INSTALL ============
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => {
    if (confirm('Gettic\'i ana ekrana eklemek ister misin?')) {
      deferredPrompt.prompt();
    }
  }, 5000);
});

console.log('✅ Gettic App hazır -', Store.messages.length, 'mesaj yüklü');

function updateIcons() {
  const iconMap = {
    'serverIcon': I.hash,
    'addChannelBtn': I.plus,
    'themeBtn': I.settings,
    'dmBtn': I.dm,
    'serverSettingsBtn': I.settings,
    'logoutBtn': I.logout,
    'toggleSidebarBtn': I.menu,
    'togglePanelBtn': I.user,
    'searchBtn': I.search,
    'notificationsBtn': I.bell,
    'pinBtn': I.pin,
    'emojiBtn': I.smile,
    'fileBtn': I.plus,
    'imageBtn': I.image,
    'pollBtn': I.poll,
    'sendBtn': I.send,
    'retryBtn': I.refresh,
  };
  
  Object.entries(iconMap).forEach(([id, icon]) => {
    const el = document.getElementById(id);
    if (el && icon) {
      el.innerHTML = icon;
    }
  });
}
