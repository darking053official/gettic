// ============ GETTIC APP.JS - FULL ============
console.log('🚀 Gettic başlatılıyor...');

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
  try {
    await doAuth(tab, u, p);
    showMain();
  } catch(e) { showAuthError(e.message); }
};
function showAuthError(msg) { authError.textContent=msg; authError.style.display='block'; }

authPassword.onkeydown = (e) => { if(e.key==='Enter') authSubmit.click(); };

function showMain() {
  loginScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden','flex');
  mainScreen.classList.add('flex');
  displayName.textContent = Store.user?.username || '';
  avatar.textContent = Store.user?.username?.charAt(0)?.toUpperCase() || 'G';
  serverName.textContent = Store.serverSettings?.name || 'Gettic';
  channelName.textContent = Store.activeChannel || 'genel-sohbet';
  renderChannels();
  renderMessages();
  initEmojiPanel();
  connectSocket();
  saveStore();
}

// ============ LOGOUT ============
$('logoutBtn').onclick = logout;
$('panelLogoutBtn').onclick = logout;

// ============ MESAJ ============
sendBtn.onclick = sendMessage;
sendBtn.addEventListener('touchend', (e) => { e.preventDefault(); sendMessage(); });
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// ============ SIDEBAR TOGGLE ============
$('toggleSidebarBtn').onclick = () => sidebar.classList.toggle('open');
$('togglePanelBtn').onclick = () => userPanel.classList.toggle('hidden');

// ============ MODALS ============
modalClose.onclick = closeModal;
$('addChannelBtn').onclick = () => openModal('addChannel');
$('themeBtn').onclick = () => openModal('theme');
$('dmBtn').onclick = () => openModal('dm');
$('imageBtn').onclick = () => openModal('imageGen');
$('pollBtn').onclick = () => openModal('poll');
$('searchBtn').onclick = () => openModal('search');

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

// ============ SOCKET ============
function connectSocket() {
  if (!Store.token||typeof io==='undefined') return;
  if (socket) socket.disconnect();
  socket = io(API, { auth: { token: Store.token }, transports: ['websocket','polling'] });
  window._socket = socket;
  socket.on('connect', () => {
    socket.emit('join_channel', Store.activeChannel);
    connbar.style.height = '0';
  });
  socket.on('new_message', (msg) => {
    if (msg.channelId===Store.activeChannel&&msg.senderId!==Store.user?._id) {
      Store.messages.push(msg);
      if (Store.messages.length>MAX_MSGS) Store.messages.shift();
      renderMessages();
      saveStore();
    }
  });
  socket.on('disconnect', () => {
    connbar.style.height = '28px';
    toast('Bağlantı koptu','e');
  });
}
$('retryBtn').onclick = () => { if(socket) socket.connect(); };

// ============ LOAD USER ============
if (Store.token) {
  loadUser().then(u => { if (u) showMain(); });
}

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key==='k') { e.preventDefault(); openModal('search'); }
  if (e.key==='Escape') { closeModal(); emojiPanel.classList.add('hidden'); }
});

// ============ ONLINE/OFFLINE ============
window.addEventListener('online', () => { Store.isOnline=true; connbar.style.height='0'; });
window.addEventListener('offline', () => { Store.isOnline=false; connbar.style.height='28px'; });

console.log('✅ Gettic App');
