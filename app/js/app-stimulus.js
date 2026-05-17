// ============ INIT ============
document.getElementById('ls')?.classList.add('hide');
document.getElementById('loginScreen')?.classList.remove('hidden');

let tab = 'login';
let socket = null;
let user = null;

// ============ AUTH ============
document.getElementById('tabLogin').onclick = () => { tab='login'; updateAuthUI(); };
document.getElementById('tabRegister').onclick = () => { tab='register'; updateAuthUI(); };

function updateAuthUI() {
  document.getElementById('tabLogin').classList.toggle('act', tab==='login');
  document.getElementById('tabRegister').classList.toggle('act', tab==='register');
  document.getElementById('authSubmit').textContent = tab==='login'?'Giriş':'Kayıt';
}

document.getElementById('authSubmit').onclick = async () => {
  const u = document.getElementById('authUsername').value.trim();
  const p = document.getElementById('authPassword').value.trim();
  const err = document.getElementById('authError');
  
  if (!u||u.length<3) { err.textContent='Kullanıcı adı en az 3 karakter'; err.style.display='block'; return; }
  if (!p||p.length<4) { err.textContent='Şifre en az 4 karakter'; err.style.display='block'; return; }
  err.style.display='none';
  
  try {
    user = await doAuth(tab, u, p);
    if (user) showMain();
  } catch(e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
};

function showMain() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainScreen').classList.remove('hidden');
  document.getElementById('mainScreen').classList.add('flex');
  document.getElementById('displayName').textContent = Store.user.username;
  document.getElementById('avatar').textContent = Store.user.username.charAt(0).toUpperCase();
  document.getElementById('serverName').textContent = Store.serverSettings.name;
  
  renderChannels();
  renderMessages();
  initEmojiPanel();
  connectSocket();
}

// ============ MESAJ ============
document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('messageInput').onkeydown = (e) => {
  if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendMessage(); }
};

// ============ LOGOUT ============
document.getElementById('logoutBtn').onclick = logout;
document.getElementById('panelLogoutBtn').onclick = logout;

// ============ SIDEBAR ============
document.getElementById('addChannelBtn').onclick = () => openModal('addChannel');
document.getElementById('themeBtn').onclick = () => openModal('theme');
document.getElementById('dmBtn').onclick = () => openModal('dm');
document.getElementById('emojiBtn').onclick = toggleEmoji;
document.getElementById('imageBtn').onclick = () => openModal('imageGen');
document.getElementById('pollBtn').onclick = () => openModal('poll');
document.getElementById('modalClose').onclick = closeModal;
document.getElementById('modal').onclick = (e) => { if(e.target===e.currentTarget) closeModal(); };

// Panel butonları
document.getElementById('panelDmBtn').onclick = () => openModal('dm');
document.getElementById('panelAddFriendBtn').onclick = () => openModal('addFriend');
document.getElementById('panelThemeBtn').onclick = () => openModal('theme');
document.getElementById('panelPollBtn').onclick = () => openModal('poll');

// ============ EMOJI ============
function initEmojiPanel() {
  const emojis = ['😀','😂','❤️','👍','🔥','🎉','🥳','😎','💯','✅','👋','🙏','🎮','✨','😢','😡','🤔','💻','📱','🌍'];
  const grid = document.getElementById('emojiPanel');
  grid.innerHTML = emojis.map(e => `<span class="es" onclick="insertEmoji('${e}')">${e}</span>`).join('');
}

function toggleEmoji() {
  document.getElementById('emojiPanel').classList.toggle('hidden');
}

function insertEmoji(emoji) {
  const inp = document.getElementById('messageInput');
  inp.value += emoji;
  inp.focus();
  document.getElementById('emojiPanel').classList.add('hidden');
}

// ============ SOCKET ============
function connectSocket() {
  if (!Store.token||typeof io==='undefined') return;
  socket = io(API, { auth: { token: Store.token } });
  window._socket = socket;
  socket.on('connect', () => socket.emit('join_channel', Store.activeChannel));
  socket.on('new_message', (msg) => {
    if (msg.channelId===Store.activeChannel&&msg.senderId!==Store.user?._id) {
      Store.messages.push(msg);
      if (Store.messages.length>MAX_MSGS) Store.messages.shift();
      renderMessages();
    }
  });
  socket.on('disconnect', () => toast('Bağlantı koptu','e'));
}

// ============ LOAD USER ============
if (Store.token) {
  loadUser().then(u => {
    if (u) showMain();
  });
}

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'k') { e.preventDefault(); openModal('search'); }
  if (e.key === 'Escape') { closeModal(); document.getElementById('emojiPanel')?.classList.add('hidden'); }
});

console.log('✅ Gettic başlatıldı - 300+ özellik hazır');
