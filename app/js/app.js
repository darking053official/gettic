// ============ GETTIC APP.JS - FULL ROUTING SİSTEMİ ============
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
  if(typeof saveStore==='function') saveStore();
  
  // URL routing'i başlat
  handleRoute(location.pathname.replace('/app','')||'/');
}

function showLogin() {
  $('ls')?.classList.add('hide');
  $('loginScreen')?.classList.remove('hidden');
  $('mainScreen')?.classList.add('hidden');
}

// ============ ROUTING ============
function navigateTo(path) {
  history.pushState(null,'','/app'+path);
  handleRoute(path);
}

function handleRoute(path) {
  hideAll();
  
  if (path==='/'||path==='') {
    $('homePanel').classList.remove('hidden');
    if(typeof loadFriendSuggestions==='function') loadFriendSuggestions();
  }
  else if (path==='/discover') {
    $('chatArea').classList.remove('hidden');
    $('channelName').textContent='🔍 Keşfet';
    $('messages').innerHTML='<div class="empty-ch"><h4>🔍 Keşfet</h4><p>Sunucuları keşfet</p></div>';
  }
  else if (path==='/settings') {
    $('settingsPanel').classList.toggle('show');
  }
  else if (path.startsWith('/dm/')) {
    const user=path.split('/')[2];
    $('chatArea').classList.remove('hidden');
    if(user&&typeof startDM==='function') startDM(user);
    else if(typeof openModal==='function') openModal('dm');
  }
  else if (path.startsWith('/server/')) {
    const parts=path.split('/');
    const serverId=parts[2];
    const type=parts[3];
    const channelId=parts[4];
    $('sidebar').classList.remove('hidden');
    $('chatArea').classList.remove('hidden');
    if(type==='chat'&&channelId&&typeof switchChannel==='function') switchChannel(channelId);
    else if(type==='voice'&&channelId&&typeof joinVoice==='function') joinVoice(channelId);
    else if(typeof switchChannel==='function') switchChannel('genel-sohbet');
  }
  else if (path.startsWith('/user/')) {
    $('chatArea').classList.remove('hidden');
    if(typeof openModal==='function') openModal('profile');
  }
  else if (path==='/search') {
    if(typeof openModal==='function') openModal('search');
  }
  else if (path==='/notifications') {
    if(typeof openModal==='function') openModal('notifications');
  }
  else {
    $('homePanel').classList.remove('hidden');
  }
}

function hideAll() {
  ['homePanel','sidebar','chatArea','userPanel'].forEach(id=>{
    const el=$(id); if(el) el.classList.add('hidden');
  });
}

// Geri/ileri
window.addEventListener('popstate',()=>{
  handleRoute(location.pathname.replace('/app','')||'/');
});

// ============ BUTONLAR ============
function bindButtons() {
  $('homeBtn')&&($('homeBtn').onclick=()=>navigateTo('/'));
  $('discoverBtn')&&($('discoverBtn').onclick=()=>navigateTo('/discover'));
  $('dmBtn')&&($('dmBtn').onclick=()=>navigateTo('/dm/'));
  $('createServerBtn')&&($('createServerBtn').onclick=()=>{if(typeof openModal==='function')openModal('addServer')});
  $('homeSettingsBtn')&&($('homeSettingsBtn').onclick=()=>navigateTo('/settings'));
  $('chatSettingsBtn')&&($('chatSettingsBtn').onclick=()=>navigateTo('/settings'));
  $('homeNotificationsBtn')&&($('homeNotificationsBtn').onclick=()=>navigateTo('/notifications'));
  
  $('addCategoryBtn')&&($('addCategoryBtn').onclick=()=>{if(typeof openModal==='function')openModal('addCategory')});
  $('addChannelSidebarBtn')&&($('addChannelSidebarBtn').onclick=()=>{if(typeof openModal==='function')openModal('addChannel')});
  $('sidebarUserBtn')&&($('sidebarUserBtn').onclick=()=>navigateTo('/me'));
  
  $('toggleSidebarBtn')&&($('toggleSidebarBtn').onclick=()=>$('sidebar').classList.toggle('open'));
  $('togglePanelBtn')&&($('togglePanelBtn').onclick=()=>$('userPanel').classList.toggle('hidden'));
  
  $('searchBtn')&&($('searchBtn').onclick=()=>navigateTo('/search'));
  $('sendBtn')&&($('sendBtn').onclick=()=>{if(typeof sendMessage==='function')sendMessage()});
  $('emojiBtn')&&($('emojiBtn').onclick=()=>$('emojiPanel').classList.toggle('hidden'));
  $('imageBtn')&&($('imageBtn').onclick=()=>{if(typeof openModal==='function')openModal('imageGen')});
  $('pollBtn')&&($('pollBtn').onclick=()=>{if(typeof openModal==='function')openModal('poll')});
  
  $('logoutBtn')&&($('logoutBtn').onclick=()=>{if(typeof logout==='function')logout()});
  $('panelLogoutBtn')&&($('panelLogoutBtn').onclick=()=>{if(typeof logout==='function')logout()});
  
  // Panel butonları
  const panelMap={panelProfileBtn:'profile',panelDmBtn:'dm',panelAddFriendBtn:'addFriend',panelThemeBtn:'theme',panelPollBtn:'poll',panelSearchBtn:'search',panelServerBtn:'serverSettings',panelRolesBtn:'roles'};
  Object.entries(panelMap).forEach(([id,modal])=>{
    $('id')&&($('id').onclick=()=>{if(typeof openModal==='function')openModal(modal)});
  });
  
  $('panelClearBtn')&&($('panelClearBtn').onclick=()=>{if(typeof clearMessages==='function')clearMessages()});
  $('modalClose')&&($('modalClose').onclick=()=>{if(typeof closeModal==='function')closeModal()});
  $('retryBtn')&&($('retryBtn').onclick=()=>{if(socket)socket.connect()});
  
  // Mesaj input
  $('messageInput')?.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(typeof sendMessage==='function')sendMessage();}
  });
  
  console.log('✅ Tüm butonlar bağlandı');
}

// ============ LOAD USER ============
if(Store&&Store.token){
  const fn=typeof loadUser==='function'?loadUser:window.loadUser;
  if(fn){fn().then(u=>{if(u)showMain();else showLogin()}).catch(()=>showLogin())}
  else showLogin();
} else showLogin();

// ============ BUTONLARI BAĞLA ============
window.addEventListener('load',()=>setTimeout(bindButtons,300));
if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(bindButtons,100);

// ============ ONLINE/OFFLINE ============
window.addEventListener('online',()=>{Store.isOnline=true});
window.addEventListener('offline',()=>{Store.isOnline=false});

// ============ KEYBOARD ============
document.addEventListener('keydown',(e)=>{
  if(e.ctrlKey&&e.key==='k'){e.preventDefault();navigateTo('/search')}
  if(e.key==='Escape'){if(typeof closeModal==='function')closeModal();$('emojiPanel')?.classList.add('hidden')}
});

console.log('✅ App.js yüklendi');
