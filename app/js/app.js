// ============ GETTIC APP.JS ============
console.log('🚀 Gettic başlatılıyor...');

function $(id) { return document.getElementById(id); }

let tab = 'login';
let socket = null;

// ============ INIT ============
setTimeout(() => {
  $('ls')?.classList.add('hide');
  $('loginScreen')?.classList.remove('hidden');
}, 500);

// ============ AUTH ============
$('tabLogin').onclick = () => { tab='login'; $('tabLogin').classList.add('act'); $('tabRegister').classList.remove('act'); $('authSubmit').textContent='Giriş'; };
$('tabRegister').onclick = () => { tab='register'; $('tabRegister').classList.add('act'); $('tabLogin').classList.remove('act'); $('authSubmit').textContent='Kayıt'; };

$('authSubmit').onclick = async () => {
  const u = $('authUsername').value.trim();
  const p = $('authPassword').value.trim();
  if (!u||u.length<3) return showAuthError('Kullanıcı adı en az 3 karakter');
  if (!p||p.length<4) return showAuthError('Şifre en az 4 karakter');
  $('authError').style.display='none';
  $('authSubmit').textContent='Yükleniyor...';
  $('authSubmit').disabled=true;
  try {
    const fn = typeof doAuth==='function'?doAuth:window.doAuth;
    if(!fn) throw new Error('Auth yüklenemedi');
    await fn(tab,u,p);
    showMain();
  } catch(e) { showAuthError(e.message); }
  $('authSubmit').textContent=tab==='login'?'Giriş':'Kayıt';
  $('authSubmit').disabled=false;
};

function showAuthError(msg) { const e=$('authError'); if(e){e.textContent=msg;e.style.display='block';} }
$('authPassword').onkeydown = (e) => { if(e.key==='Enter') $('authSubmit').click(); };
$('authUsername').onkeydown = (e) => { if(e.key==='Enter') $('authPassword').focus(); };

// ============ SHOW MAIN ============
function showMain() {
  // localStorage'dan mesajları geri yükle
  const saved = localStorage.getItem('gt_messages');
  if (saved && (!Store.messages || Store.messages.length === 0)) {
    try { Store.messages = JSON.parse(saved); } catch(e) {}
  }

  $('loginScreen').classList.add('hidden');
  $('mainScreen').classList.remove('hidden');
  $('mainScreen').classList.add('flex');
  if(Store.user) {
    $('displayName').textContent=Store.user.username;
    $('avatar').textContent=Store.user.username.charAt(0).toUpperCase();
  }
  $('serverName').textContent=Store.serverSettings?.name||'Gettic';
  document.title='Gettic - '+(Store.user?.username||'Sohbet');
  if(typeof renderChannels==='function') renderChannels();
  if(typeof renderMessages==='function') renderMessages();
  if(typeof saveStore==='function') saveStore();
  
  // MongoDB'den veri çek
  if (typeof MongoSync !== 'undefined') setTimeout(() => MongoSync.syncAll(), 2000);
}

function showLogin() {
  $('ls')?.classList.add('hide');
  $('loginScreen')?.classList.remove('hidden');
  $('mainScreen')?.classList.add('hidden');
}

// ============ BUTONLAR ============
function bindButtons() {
  $('homeBtn')?.addEventListener('click',()=>{ $('homePanel').classList.remove('hidden'); $('sidebar').classList.add('hidden'); $('chatArea').classList.add('hidden'); });
  $('discoverBtn')?.addEventListener('click',()=>{ $('homePanel').classList.add('hidden'); $('sidebar').classList.add('hidden'); $('chatArea').classList.remove('hidden'); $('chatArea').classList.add('flex'); });
  $('dmBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('dm'); });
  $('createServerBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('addServer'); });
  $('homeSettingsBtn')?.addEventListener('click',()=>{ $('settingsPanel').classList.toggle('show'); });
  $('homeNotificationsBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('notifications'); });
  $('addCategoryBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('addCategory'); });
  $('addChannelSidebarBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('addChannel'); });
  $('sidebarUserBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('profile'); });
  $('toggleSidebarBtn')?.addEventListener('click',()=>$('sidebar')?.classList.toggle('open'));
  $('togglePanelBtn')?.addEventListener('click',()=>$('userPanel')?.classList.toggle('hidden'));
  $('searchBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('search'); });
  $('sendBtn')?.addEventListener('click',()=>{ if(typeof sendMessage==='function')sendMessage(); });
  $('emojiBtn')?.addEventListener('click',()=>$('emojiPanel')?.classList.toggle('hidden'));
  $('gifBtn')?.addEventListener('click',()=>{ if(typeof openGifPicker==='function')openGifPicker(); });
  $('imageBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('imageGen'); });
  $('pollBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('poll'); });
  $('logoutBtn')?.addEventListener('click',()=>{ if(typeof logout==='function')logout(); });
  $('panelLogoutBtn')?.addEventListener('click',()=>{ if(typeof logout==='function')logout(); });
  $('modalClose')?.addEventListener('click',()=>{ if(typeof closeModal==='function')closeModal(); });
  $('retryBtn')?.addEventListener('click',()=>{ if(socket)socket.connect(); });

  const panelMap={panelProfileBtn:'profile',panelDmBtn:'dm',panelAddFriendBtn:'addFriend',panelThemeBtn:'theme',panelPollBtn:'poll',panelSearchBtn:'search',panelServerBtn:'serverSettings',panelRolesBtn:'roles'};
  Object.entries(panelMap).forEach(([id,modal])=>{ const btn=$(id); if(btn) btn.addEventListener('click',()=>{ if(typeof openModal==='function')openModal(modal); }); });
  
  $('panelClearBtn')?.addEventListener('click',()=>{ if(typeof clearMessages==='function')clearMessages(); });
  
  $('messageInput')?.addEventListener('keydown',(e)=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(typeof sendMessage==='function')sendMessage();} });

  console.log('✅ Tüm butonlar bağlandı');
}

// ============ LOAD USER ============
if(Store&&Store.token){
  const fn=typeof loadUser==='function'?loadUser:window.loadUser;
  if(fn){fn().then(u=>{if(u)showMain();else showLogin()}).catch(()=>showLogin())}
  else showLogin();
} else showLogin();

// ============ BUTONLARI BAĞLA ============
setTimeout(bindButtons, 300);
window.addEventListener('load', ()=>setTimeout(bindButtons, 100));

// ============ ONLINE/OFFLINE ============
window.addEventListener('online',()=>{if(Store)Store.isOnline=true});
window.addEventListener('offline',()=>{if(Store)Store.isOnline=false});

// ============ KAYDET ============
window.addEventListener('beforeunload', ()=>{ if(typeof saveStore==='function') saveStore(); });

console.log('✅ App.js yüklendi');
