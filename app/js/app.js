// ╔══════════════════════════════════════════════════════════════════╗
// ║                   GETTIC APP.JS - SVG İKONLU FINAL              ║
// ╚══════════════════════════════════════════════════════════════════╝

console.log('🚀 Gettic başlatılıyor...');

function $(id) { return document.getElementById(id); }

let tab = 'login';
let socket = null;
let sendTimeout;
let verificationCode = '';
let resetVerificationCode = '';

// ============ INIT ============
setTimeout(() => {
  $('ls')?.classList.add('hide');
  $('loginScreen')?.classList.remove('hidden');
}, 500);

// ============ AUTH TABS ============
$('tabLogin').onclick = () => { 
  tab='login'; 
  $('tabLogin').classList.add('act'); 
  $('tabRegister').classList.remove('act'); 
  $('authSubmit').textContent='Giriş';
  $('loginForm').style.display='';
  $('registerForm').style.display='none';
};

$('tabRegister').onclick = () => { 
  tab='register'; 
  $('tabRegister').classList.add('act'); 
  $('tabLogin').classList.remove('act');
  $('loginForm').style.display='none';
  $('registerForm').style.display='';
};

// ============ ALTCHA ============
function getAltchaPayload() {
  try { return document.querySelector('altcha-widget')?.getValue() || null; }
  catch(e) { return null; }
}

// ============ SVG İKON YERLEŞTİR ============
function setSvgIcon(id, iconName) {
  const el = $(id);
  if (el && window.Icons && Icons[iconName]) {
    el.innerHTML = Icons[iconName];
  }
}

function placeAllIcons() {
  const icons = {
    homeBtn: 'home', discoverBtn: 'search', dmBtn: 'mail', createServerBtn: 'plus',
    logoutBtn: 'logout', panelLogoutBtn: 'logout',
    homeSettingsBtn: 'settings', homeNotificationsBtn: 'bell',
    chatSettingsBtn: 'settings',
    sendBtn: 'send', emojiBtn: 'smile', gifBtn: 'gif', imageBtn: 'image',
    pollBtn: 'poll', fileBtn: 'file', voiceMsgBtn: 'mic',
    searchBtn: 'search', toggleSidebarBtn: 'menu', togglePanelBtn: 'user'
  };
  Object.entries(icons).forEach(([id, name]) => setSvgIcon(id, name));
}

// ============ GİRİŞ ============
$('authSubmit').onclick = async () => {
  const email = $('authEmail')?.value?.trim();
  const password = $('authPassword')?.value?.trim();
  
  if (!email?.includes('@')) return showAuthError('Geçerli bir e-posta adresi girin');
  if (!password || password.length < 4) return showAuthError('Şifre en az 4 karakter');
  
  const altchaPayload = getAltchaPayload();
  if (!altchaPayload) return showAuthError('Lütfen doğrulamayı yapın');
  
  $('authError').style.display='none';
  $('authSubmit').textContent='Doğrulanıyor...';
  $('authSubmit').disabled=true;
  
  try {
    const username = email.split('@')[0];
    const res = await fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, altcha: altchaPayload })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Giriş başarısız');
    
    Store.token = data.token;
    Store.user = data.user;
    saveStore();
    showMain();
  } catch(e) { 
    showAuthError(e.message);
    document.querySelector('altcha-widget')?.reset?.();
  }
  
  $('authSubmit').textContent='Giriş';
  $('authSubmit').disabled=false;
};

function showAuthError(msg) { 
  const e=$('authError'); 
  if(e){e.textContent=msg;e.style.display='block';}
  setTimeout(()=>{if(e)e.style.display='none';},5000);
}

$('authPassword').onkeydown = (e) => { if(e.key==='Enter') $('authSubmit').click(); };
$('authEmail').onkeydown = (e) => { if(e.key==='Enter') $('authPassword').focus(); };

// ============ KAYIT ============
async function sendVerificationCode() {
  const email = $('regEmail')?.value?.trim();
  if (!email?.includes('@')) { $('codeMsg').textContent='Geçerli e-posta girin';$('codeMsg').style.color='var(--re)';return; }
  
  verificationCode = String(Math.floor(100000 + Math.random() * 900000));
  $('codeMsg').textContent='Kod gönderiliyor...';$('codeMsg').style.color='var(--t3)';
  
  try {
    await fetch(API+'/api/email/send',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({to:email,subject:'Gettic Doğrulama Kodu',html:`<h2>Gettic</h2><p>Kod: <b style="font-size:24px;letter-spacing:4px">${verificationCode}</b></p>`})
    });
    $('codeSection').style.display='';$('sendCodeBtn').style.display='none';
    $('codeMsg').textContent='✅ Kod gönderildi! Spam klasörünü kontrol edin.';$('codeMsg').style.color='var(--gr)';
  } catch(e) { $('codeMsg').textContent='❌ Kod gönderilemedi.';$('codeMsg').style.color='var(--re)'; }
}

async function registerWithCode() {
  const code=$('verificationCode')?.value?.trim();
  const username=$('regUsername')?.value?.trim();
  const password=$('regPassword')?.value?.trim();
  
  if(code!==verificationCode){$('codeMsg').textContent='❌ Geçersiz kod!';$('codeMsg').style.color='var(--re)';return;}
  if(!username||username.length<3){$('codeMsg').textContent='Kullanıcı adı en az 3 karakter';$('codeMsg').style.color='var(--re)';return;}
  if(!/^[a-zA-Z0-9_]+$/.test(username)){$('codeMsg').textContent='Sadece harf, rakam, alt çizgi';$('codeMsg').style.color='var(--re)';return;}
  if(!password||password.length<6){$('codeMsg').textContent='Şifre en az 6 karakter';$('codeMsg').style.color='var(--re)';return;}
  
  const altchaPayload=getAltchaPayload();
  if(!altchaPayload){$('codeMsg').textContent='Lütfen doğrulamayı yapın';$('codeMsg').style.color='var(--re)';return;}
  
  try {
    const res=await fetch(API+'/api/auth/register',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,password,altcha:altchaPayload})
    });
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Kayıt başarısız');
    Store.token=data.token;Store.user=data.user;saveStore();showMain();
  }catch(e){$('codeMsg').textContent='❌ '+e.message;$('codeMsg').style.color='var(--re)';document.querySelector('altcha-widget')?.reset?.();}
}

// ============ ŞİFREMİ UNUTTUM ============
function showForgotPassword(){ $('forgotPasswordScreen')?.classList.remove('hidden'); $('authMainBox').style.display='none'; }
function hideForgotPassword(){ $('forgotPasswordScreen')?.classList.add('hidden'); $('authMainBox').style.display=''; }

async function sendResetCode(){
  const email=$('resetEmail')?.value?.trim();
  if(!email?.includes('@')){$('resetMsg').textContent='Geçerli e-posta girin';$('resetMsg').style.color='var(--re)';return;}
  resetVerificationCode=String(Math.floor(100000+Math.random()*900000));
  $('resetMsg').textContent='Kod gönderiliyor...';$('resetMsg').style.color='var(--t3)';
  try {
    await fetch(API+'/api/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:email,subject:'Gettic Şifre Sıfırlama',html:`<h2>Şifre Sıfırlama</h2><p>Kod: <b>${resetVerificationCode}</b></p>`})});
    $('resetCodeSection').style.display='';$('resetMsg').textContent='✅ Kod gönderildi!';$('resetMsg').style.color='var(--gr)';
  }catch(e){$('resetMsg').textContent='❌ Kod gönderilemedi.';$('resetMsg').style.color='var(--re)';}
}

async function resetPasswordWithCode(){
  const code=$('resetCode')?.value?.trim(),newPass=$('newPassword')?.value?.trim();
  if(code!==resetVerificationCode){$('resetMsg').textContent='❌ Geçersiz kod!';$('resetMsg').style.color='var(--re)';return;}
  if(!newPass||newPass.length<4){$('resetMsg').textContent='Şifre en az 4 karakter';$('resetMsg').style.color='var(--re)';return;}
  $('resetMsg').textContent='✅ Şifre değiştirildi!';$('resetMsg').style.color='var(--gr)';setTimeout(hideForgotPassword,2000);
}

// ============ SHOW MAIN ============
function showMain(){
  const saved=localStorage.getItem('gt_messages');
  if(saved&&(!Store.messages||Store.messages.length===0)){try{Store.messages=JSON.parse(saved)}catch(e){}}
  $('loginScreen').classList.add('hidden');$('mainScreen').classList.remove('hidden');$('mainScreen').classList.add('flex');
  if(Store.user){$('displayName').textContent=Store.user.username;$('avatar').textContent=Store.user.username.charAt(0).toUpperCase();}
  $('serverName').textContent=Store.serverSettings?.name||'Gettic';document.title='Gettic - '+(Store.user?.username||'Sohbet');
  if(Store.messages.length===0&&Store.activeChannel==='genel-sohbet'){Store.messages.push({_id:'welcome-msg',content:'**🎉 Gettic\'e hoş geldiniz!**\n\nBurası genel sohbet kanalı.',senderName:'Gettic',senderId:'system',channelId:'genel-sohbet',createdAt:new Date().toISOString()});}
  if(typeof renderChannels==='function')renderChannels();if(typeof renderMessages==='function')renderMessages();saveStore();
  if(typeof loadActiveServers==='function')loadActiveServers();updateUIPermissions();
  if(typeof MongoSync!=='undefined')setTimeout(()=>MongoSync.syncAll(),2000);initSocket();
  placeAllIcons(); // SVG ikonları yerleştir
}

function showLogin(){$('ls')?.classList.add('hide');$('loginScreen')?.classList.remove('hidden');$('mainScreen')?.classList.add('hidden');}

function updateUIPermissions(){
  const isAdmin=typeof hasPermission==='function'?hasPermission(Store.user?._id,'manageChannels'):false;
  const addCat=$('addCategoryBtn'),addCh=$('addChannelSidebarBtn');
  if(addCat)addCat.style.display=isAdmin?'':'none';if(addCh)addCh.style.display=isAdmin?'':'none';
}

// ============ BUTONLAR ============
function bindButtons(){
  $('homeBtn')?.addEventListener('click',()=>{$('homePanel').classList.remove('hidden');$('sidebar').classList.add('hidden');$('chatArea').classList.add('hidden');if(typeof loadActiveServers==='function')loadActiveServers();});
  $('discoverBtn')?.addEventListener('click',()=>{$('homePanel').classList.add('hidden');$('sidebar').classList.add('hidden');$('chatArea').classList.remove('hidden');$('chatArea').classList.add('flex');});
  $('dmBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('dm');});
  $('createServerBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('addServer');});
  $('homeSettingsBtn')?.addEventListener('click',()=>$('settingsPanel')?.classList.toggle('show'));
  $('homeNotificationsBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('notifications');});
  $('addCategoryBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('addCategory');});
  $('addChannelSidebarBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('addChannel');});
  $('sidebarUserBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('profile');});
  $('toggleSidebarBtn')?.addEventListener('click',()=>$('sidebar')?.classList.toggle('open'));
  $('togglePanelBtn')?.addEventListener('click',()=>{const p=$('userPanel');if(p)p.style.display=p.style.display==='none'||p.style.display===''?'block':'none';});
  $('searchBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('search');});
  $('sendBtn')?.addEventListener('click',()=>{if(typeof sendMessage==='function')sendMessage();});
  $('emojiBtn')?.addEventListener('click',()=>$('emojiPanel')?.classList.toggle('hidden'));
  $('gifBtn')?.addEventListener('click',()=>{if(typeof openGifPicker==='function')openGifPicker();});
  $('imageBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('imageGen');});
  $('pollBtn')?.addEventListener('click',()=>{if(typeof openModal==='function')openModal('poll');});
  $('logoutBtn')?.addEventListener('click',()=>{if(typeof logout==='function')logout();});
  $('panelLogoutBtn')?.addEventListener('click',()=>{if(typeof logout==='function')logout();});
  $('modalClose')?.addEventListener('click',()=>{if(typeof closeModal==='function')closeModal();});
  $('retryBtn')?.addEventListener('click',()=>{if(socket)socket.connect();});
  const panelMap={panelProfileBtn:'profile',panelDmBtn:'dm',panelAddFriendBtn:'addFriend',panelThemeBtn:'theme',panelPollBtn:'poll',panelSearchBtn:'search',panelServerBtn:'serverSettings',panelRolesBtn:'roles'};
  Object.entries(panelMap).forEach(([id,modal])=>{const btn=$(id);if(btn)btn.addEventListener('click',()=>{if(typeof openModal==='function')openModal(modal);});});
  $('panelClearBtn')?.addEventListener('click',()=>{if(typeof clearMessages==='function')clearMessages();});
  $('messageInput')?.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();clearTimeout(sendTimeout);sendTimeout=setTimeout(()=>{if(typeof sendMessage==='function')sendMessage();},50);}});
  placeAllIcons();
  console.log('✅ Tüm butonlar bağlandı');
}

// ============ LOAD USER ============
if(Store?.token){const fn=typeof loadUser==='function'?loadUser:window.loadUser;if(fn){fn().then(u=>{if(u)showMain();else showLogin()}).catch(()=>showLogin())}else showLogin();}else showLogin();
setTimeout(bindButtons,300);window.addEventListener('load',()=>setTimeout(bindButtons,100));
window.addEventListener('online',()=>{if(Store)Store.isOnline=true});window.addEventListener('offline',()=>{if(Store)Store.isOnline=false});
window.addEventListener('beforeunload',()=>{if(typeof saveStore==='function')saveStore();});
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();if(typeof openModal==='function')openModal('search');}if(e.key==='Escape'){if(typeof closeModal==='function')closeModal();$('emojiPanel')?.classList.add('hidden');}});
if('serviceWorker'in navigator){navigator.serviceWorker.register('/service-worker.js').catch(()=>{});}
console.log('✅ App.js yüklendi');

// ============ SOCKET.IO REALTIME ============
function initSocket(){
  if(!Store.token||!Store.user)return;
  if(socket){socket.disconnect();}
  socket=io(API,{auth:{token:Store.token}});
  socket.on('connect',()=>{console.log('✅ Socket bağlandı');$('connbar')?.classList.add('hidden');if(Store.activeChannel){socket.emit('join_channel',Store.activeChannel);}});
  socket.on('disconnect',()=>{console.log('🔌 Socket koptu');$('connbar')?.classList.remove('hidden');});
  socket.on('new_message',(msg)=>{if(!Store.messages.find(m=>m._id===msg._id)){Store.messages.push(msg);if(typeof renderMessages==='function')renderMessages();saveStore();scrollToBottom();}});
  socket.on('user_typing',({username,channelId})=>{if(channelId===Store.activeChannel){$('typing').textContent=username+' yazıyor...';clearTimeout(window._typingTimeout);window._typingTimeout=setTimeout(()=>{$('typing').textContent='';},2000);}});
}

function sendMessage(){
  const input=$('messageInput');const content=input?.value?.trim();
  if(!content||!Store.user||!socket?.connected)return;
  const msgData={channelId:Store.activeChannel||'genel-sohbet',content,senderName:Store.user.username,senderId:Store.user._id,createdAt:new Date().toISOString()};
  socket.emit('send_message',msgData);input.value='';input.focus();
}

function scrollToBottom(){const msgs=$('messages');if(msgs){setTimeout(()=>{msgs.scrollTop=msgs.scrollHeight;},50);}}

$('messageInput')?.addEventListener('input',()=>{if(socket?.connected&&Store.user){socket.emit('typing',{channelId:Store.activeChannel||'genel-sohbet',username:Store.user.username});}});
