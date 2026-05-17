// ============ GETTIC APP.JS - FULL & EKSİKSİZ ============
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

function showInputs() {
  const inputs = ['messageInput','sendBtn','emojiBtn','imageBtn','pollBtn'];
  inputs.forEach(id => { const el = $(id); if(el) el.style.display = ''; });
}

function hideInputs() {
  const inputs = ['messageInput','sendBtn','emojiBtn','imageBtn','pollBtn'];
  inputs.forEach(id => { const el = $(id); if(el) el.style.display = 'none'; });
}

function handleRoute(path) {
  console.log('🔄 Route işleniyor:', path);
  hideAll();
  showInputs();
  
  if (path==='/'||path==='') {
    $('homePanel').classList.remove('hidden');
    if(typeof loadFriendSuggestions==='function') loadFriendSuggestions();
  } else if (path==='/discover') {
    $('chatArea').classList.remove('hidden');
    $('chatArea').classList.add('flex');
    $('channelName').textContent = '🔍 Keşfet';
    $('messages').innerHTML = `
      <div class="empty-ch">
        <h4>🔍 Keşfet</h4>
        <p>Popüler sunucular ve topluluklar</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:20px;max-width:500px;margin-left:auto;margin-right:auto">
          <div style="background:var(--bg2);padding:20px;border-radius:16px;text-align:center;cursor:pointer;min-width:140px" onclick="navigateTo('/server/gettic/chat/genel-sohbet')">
            <div style="width:50px;height:50px;border-radius:14px;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin:0 auto 10px">G</div>
            <div style="font-weight:600;font-size:14px">Gettic</div>
            <div style="font-size:10px;color:var(--t3)">12 çevrimiçi</div>
          </div>
          <div style="background:var(--bg2);padding:20px;border-radius:16px;text-align:center;cursor:pointer;min-width:140px" onclick="navigateTo('/server/gettic/chat/genel-sohbet')">
            <div style="width:50px;height:50px;border-radius:14px;background:#6366f1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin:0 auto 10px">T</div>
            <div style="font-weight:600;font-size:14px">Tech Sohbet</div>
            <div style="font-size:10px;color:var(--t3)">8 çevrimiçi</div>
          </div>
          <div style="background:var(--bg2);padding:20px;border-radius:16px;text-align:center;cursor:pointer;min-width:140px" onclick="navigateTo('/server/gettic/chat/genel-sohbet')">
            <div style="width:50px;height:50px;border-radius:14px;background:#22c55e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin:0 auto 10px">O</div>
            <div style="font-weight:600;font-size:14px">Oyun Dünyası</div>
            <div style="font-size:10px;color:var(--t3)">5 çevrimiçi</div>
          </div>
        </div>
      </div>`;
    hideInputs();
  } else if (path==='/settings') {
    $('settingsPanel').classList.toggle('show');
  } else if (path.startsWith('/dm/')) {
    $('chatArea').classList.remove('hidden');
    const user=path.split('/')[2];
    if(user&&typeof startDM==='function') startDM(user);
    else if(typeof openModal==='function') openModal('dm');
  } else if (path.startsWith('/server/')) {
    const parts=path.split('/');
    $('sidebar').classList.remove('hidden');
    $('chatArea').classList.remove('hidden');
    if(parts[3]==='chat'&&parts[4]&&typeof switchChannel==='function') switchChannel(parts[4]);
    else if(parts[3]==='voice'&&parts[4]&&typeof joinVoice==='function') joinVoice(parts[4]);
    else if(typeof switchChannel==='function') switchChannel('genel-sohbet');
  } else if (path.startsWith('/user/')) {
    if(typeof openModal==='function') openModal('profile');
  } else if (path==='/search') {
    if(typeof openModal==='function') openModal('search');
  } else if (path==='/notifications') {
    if(typeof openModal==='function') openModal('notifications');
  } else {
    $('homePanel').classList.remove('hidden');
  }
}

function hideAll() {
  ['homePanel','sidebar','chatArea','userPanel'].forEach(id=>{
    const el=$(id); if(el) el.classList.add('hidden');
  });
}

window.addEventListener('popstate',()=>{
  handleRoute(location.pathname.replace('/app','')||'/');
});

// ============ BUTONLAR ============
function bindButtons() {
  $('homeBtn')?.addEventListener('click',()=>navigateTo('/'));
  $('discoverBtn')?.addEventListener('click',()=>navigateTo('/discover'));
  $('dmBtn')?.addEventListener('click',()=>navigateTo('/dm/'));
  $('createServerBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('addServer')});
  $('homeSettingsBtn')?.addEventListener('click',()=>navigateTo('/settings'));
  $('chatSettingsBtn')?.addEventListener('click',()=>navigateTo('/settings'));
  $('homeNotificationsBtn')?.addEventListener('click',()=>navigateTo('/notifications'));
  
  $('addCategoryBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('addCategory')});
  $('addChannelSidebarBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('addChannel')});
  $('sidebarUserBtn')?.addEventListener('click',()=>navigateTo('/me'));
  
  $('toggleSidebarBtn')?.addEventListener('click',()=>$('sidebar')?.classList.toggle('open'));
  $('togglePanelBtn')?.addEventListener('click',()=>$('userPanel')?.classList.toggle('hidden'));
  
  $('searchBtn')?.addEventListener('click',()=>navigateTo('/search'));
  $('sendBtn')?.addEventListener('click',()=>{if(typeof sendMessage==='function')sendMessage()});
  $('emojiBtn')?.addEventListener('click',()=>$('emojiPanel')?.classList.toggle('hidden'));
  $('gifBtn')?.addEventListener('click', () => { if (typeof openGifPicker === 'function') openGifPicker(); });
  $('imageBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('imageGen')});
  $('pollBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('poll')});
  
  $('logoutBtn')?.addEventListener('click',()=>{if(typeof logout==='function')logout()});
  $('panelLogoutBtn')?.addEventListener('click',()=>{if(typeof logout==='function')logout()});
  
  const panelMap={panelProfileBtn:'profile',panelDmBtn:'dm',panelAddFriendBtn:'addFriend',panelThemeBtn:'theme',panelPollBtn:'poll',panelSearchBtn:'search',panelServerBtn:'serverSettings',panelRolesBtn:'roles'};
  Object.entries(panelMap).forEach(([id,modal])=>{
    const btn=$(id); if(btn) btn.addEventListener('click',()=>{if(typeof openModal==='function')openModal(modal)});
  });
  
  $('panelClearBtn')?.addEventListener('click',()=>{if(typeof clearMessages==='function')clearMessages()});
  $('modalClose')?.addEventListener('click',()=>{if(typeof closeModal==='function')closeModal()});
  $('retryBtn')?.addEventListener('click',()=>{if(socket)socket.connect()});
  
  $('messageInput')?.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(typeof sendMessage==='function')sendMessage();}
  });
  
  // Mobil klavye
  $('messageInput')?.addEventListener('focus',()=>{
    setTimeout(()=>{const msgs=$('messages');if(msgs)msgs.scrollTop=msgs.scrollHeight},300);
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
window.addEventListener('online',()=>{if(Store)Store.isOnline=true});
window.addEventListener('offline',()=>{if(Store)Store.isOnline=false});

// ============ KEYBOARD ============
document.addEventListener('keydown',(e)=>{
  if(e.ctrlKey&&e.key==='k'){e.preventDefault();navigateTo('/search')}
  if(e.key==='Escape'){if(typeof closeModal==='function')closeModal();$('emojiPanel')?.classList.add('hidden')}
});

// ============ SERVICE WORKER ============
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
}

console.log('✅ App.js yüklendi');

// Sayfa yüklendiğinde route'u işle
const currentPath = location.pathname.replace('/app', '') || '/';
console.log('📍 Current path:', currentPath);
handleRoute(currentPath);

window.handleRoute = handleRoute;
