// ============ GETTIC APP.JS - FULL (EMAIL KODLU, TEST KODSUZ) ============
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

// ============ GİRİŞ ============
$('authSubmit').onclick = async () => {
  const email = $('authEmail')?.value?.trim();
  const password = $('authPassword')?.value?.trim();
  
  if (!email || !email.includes('@')) return showAuthError('Geçerli bir e-posta adresi girin');
  if (!password || password.length < 4) return showAuthError('Şifre en az 4 karakter');
  
  $('authError').style.display='none';
  $('authSubmit').textContent='Yükleniyor...';
  $('authSubmit').disabled=true;
  
  try {
    const username = email.split('@')[0];
    const fn = typeof doAuth === 'function' ? doAuth : window.doAuth;
    if (!fn) throw new Error('Auth yüklenemedi');
    await fn('login', username, password);
    showMain();
  } catch(e) { showAuthError(e.message); }
  
  $('authSubmit').textContent='Giriş';
  $('authSubmit').disabled=false;
};

function showAuthError(msg) { const e=$('authError'); if(e){e.textContent=msg;e.style.display='block';} }
$('authPassword').onkeydown = (e) => { if(e.key==='Enter') $('authSubmit').click(); };
$('authEmail').onkeydown = (e) => { if(e.key==='Enter') $('authPassword').focus(); };

// ============ KAYIT - KOD GÖNDER ============
async function sendVerificationCode() {
  const email = $('regEmail')?.value?.trim();
  if (!email || !email.includes('@')) {
    $('codeMsg').textContent = 'Geçerli bir e-posta adresi girin';
    $('codeMsg').style.color = 'var(--re)';
    return;
  }
  
  verificationCode = String(Math.floor(100000 + Math.random() * 900000));
  
  $('codeMsg').textContent = 'Kod gönderiliyor...';
  $('codeMsg').style.color = 'var(--t3)';
  
  try {
    await fetch(API + '/api/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: 'Gettic - Doğrulama Kodunuz',
        html: `<h2>Gettic Doğrulama Kodu</h2><p>Kodunuz: <b style="font-size:24px;letter-spacing:4px">${verificationCode}</b></p><p>5 dakika geçerlidir.</p>`
      })
    });
    $('codeSection').style.display = '';
    $('sendCodeBtn').style.display = 'none';
    $('codeMsg').textContent = 'Kod e-posta adresinize gönderildi! Kod görünmüyorsa spam klasörünü kontrol edin.';
    $('codeMsg').style.color = 'var(--gr)';
  } catch(e) {
    $('codeMsg').textContent = '❌ Kod gönderilemedi. Lütfen tekrar deneyin.';
    $('codeMsg').style.color = 'var(--re)';
  }
}

// ============ KAYIT - KODLA TAMAMLA ============
async function registerWithCode() {
  const code = $('verificationCode')?.value?.trim();
  const username = $('regUsername')?.value?.trim();
  const password = $('regPassword')?.value?.trim();
  
  if (code !== verificationCode) { $('codeMsg').textContent = '❌ Geçersiz kod!'; $('codeMsg').style.color = 'var(--re)'; return; }
  if (!username || username.length < 3) { $('codeMsg').textContent = 'Kullanıcı adı en az 3 karakter'; $('codeMsg').style.color = 'var(--re)'; return; }
  if (!password || password.length < 4) { $('codeMsg').textContent = 'Şifre en az 4 karakter'; $('codeMsg').style.color = 'var(--re)'; return; }
  
  try {
    const fn = typeof doAuth === 'function' ? doAuth : window.doAuth;
    if (!fn) throw new Error('Auth yüklenemedi');
    await fn('register', username, password);
    showMain();
  } catch(e) { $('codeMsg').textContent = '❌ ' + e.message; $('codeMsg').style.color = 'var(--re)'; }
}

// ============ ŞİFREMİ UNUTTUM ============
function showForgotPassword() {
  $('forgotPasswordScreen')?.classList.remove('hidden');
  $('authMainBox').style.display = 'none';
}

function hideForgotPassword() {
  $('forgotPasswordScreen')?.classList.add('hidden');
  $('authMainBox').style.display = '';
}

async function sendResetCode() {
  const email = $('resetEmail')?.value?.trim();
  if (!email || !email.includes('@')) { $('resetMsg').textContent = 'Geçerli e-posta girin'; $('resetMsg').style.color = 'var(--re)'; return; }
  
  resetVerificationCode = String(Math.floor(100000 + Math.random() * 900000));
  $('resetMsg').textContent = 'Kod gönderiliyor...'; $('resetMsg').style.color = 'var(--t3)';
  
  try {
    await fetch(API + '/api/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email, subject: 'Gettic - Şifre Sıfırlama Kodu',
        html: `<h2>Şifre Sıfırlama</h2><p>Kodunuz: <b style="font-size:24px;letter-spacing:4px">${resetVerificationCode}</b></p>`
      })
    });
    $('resetCodeSection').style.display = '';
    $('resetMsg').textContent = '✅ Kod e-posta adresinize gönderildi!'; $('resetMsg').style.color = 'var(--gr)';
  } catch(e) {
    $('resetMsg').textContent = '❌ Kod gönderilemedi.'; $('resetMsg').style.color = 'var(--re)';
  }
}

async function resetPasswordWithCode() {
  const code = $('resetCode')?.value?.trim();
  const newPass = $('newPassword')?.value?.trim();
  
  if (code !== resetVerificationCode) { $('resetMsg').textContent = '❌ Geçersiz kod!'; $('resetMsg').style.color = 'var(--re)'; return; }
  if (!newPass || newPass.length < 4) { $('resetMsg').textContent = 'Şifre en az 4 karakter'; $('resetMsg').style.color = 'var(--re)'; return; }
  
  $('resetMsg').textContent = '✅ Şifre değiştirildi! Giriş yapabilirsiniz.'; $('resetMsg').style.color = 'var(--gr)';
  setTimeout(() => hideForgotPassword(), 2000);
}

// ============ SHOW MAIN ============
function showMain() {
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
  
  if (Store.messages.length === 0 && Store.activeChannel === 'genel-sohbet') {
    Store.messages.push({
      _id: 'welcome-msg', content: '**🎉 Gettic\'e hoş geldiniz!**\n\nBurası genel sohbet kanalı.', senderName: 'Gettic', senderId: 'system', channelId: 'genel-sohbet', createdAt: new Date().toISOString()
    });
  }
  
  if(typeof renderChannels==='function') renderChannels();
  if(typeof renderMessages==='function') renderMessages();
  if(typeof saveStore==='function') saveStore();
  if(typeof loadActiveServers==='function') loadActiveServers();
  updateUIPermissions();
  if (typeof MongoSync !== 'undefined') setTimeout(() => MongoSync.syncAll(), 2000);
}

function showLogin() { $('ls')?.classList.add('hide'); $('loginScreen')?.classList.remove('hidden'); $('mainScreen')?.classList.add('hidden'); }
function updateUIPermissions() {
  const isAdmin = typeof hasPermission === 'function' ? hasPermission(Store.user?._id, 'manageChannels') : false;
  const addCatBtn = $('addCategoryBtn'); const addChBtn = $('addChannelSidebarBtn');
  if (addCatBtn) addCatBtn.style.display = isAdmin ? '' : 'none';
  if (addChBtn) addChBtn.style.display = isAdmin ? '' : 'none';
}

// ============ BUTONLAR ============
function bindButtons() {
  $('homeBtn')?.addEventListener('click',()=>{ $('homePanel').classList.remove('hidden'); $('sidebar').classList.add('hidden'); $('chatArea').classList.add('hidden'); if(typeof loadActiveServers==='function')loadActiveServers(); });
  $('discoverBtn')?.addEventListener('click',()=>{ $('homePanel').classList.add('hidden'); $('sidebar').classList.add('hidden'); $('chatArea').classList.remove('hidden'); $('chatArea').classList.add('flex'); });
  $('dmBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('dm'); });
  $('createServerBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('addServer'); });
  $('homeSettingsBtn')?.addEventListener('click',()=>{ $('settingsPanel').classList.toggle('show'); });
  $('homeNotificationsBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('notifications'); });
  $('addCategoryBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('addCategory'); });
  $('addChannelSidebarBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('addChannel'); });
  $('sidebarUserBtn')?.addEventListener('click',()=>{ if(typeof openModal==='function')openModal('profile'); });
  $('toggleSidebarBtn')?.addEventListener('click',()=>$('sidebar')?.classList.toggle('open'));
  $('togglePanelBtn')?.addEventListener('click',()=>{ const p=$('userPanel'); if(p)p.style.display=p.style.display==='none'||p.style.display===''?'block':'none'; });
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
  $('messageInput')?.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); clearTimeout(sendTimeout); sendTimeout = setTimeout(() => { if (typeof sendMessage === 'function') sendMessage(); }, 50); } });
  console.log('✅ Tüm butonlar bağlandı');
}

// ============ LOAD USER ============
if(Store&&Store.token){ const fn=typeof loadUser==='function'?loadUser:window.loadUser; if(fn){fn().then(u=>{if(u)showMain();else showLogin()}).catch(()=>showLogin())} else showLogin(); } else showLogin();
setTimeout(bindButtons, 300);
window.addEventListener('load', ()=>setTimeout(bindButtons, 100));
window.addEventListener('online',()=>{if(Store)Store.isOnline=true});
window.addEventListener('offline',()=>{if(Store)Store.isOnline=false});
window.addEventListener('beforeunload', ()=>{ if(typeof saveStore==='function') saveStore(); });
document.addEventListener('keydown', function(e) { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); if (typeof openModal === 'function') openModal('search'); } if (e.key === 'Escape') { if (typeof closeModal === 'function') closeModal(); $('emojiPanel')?.classList.add('hidden'); } });
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/service-worker.js').catch(()=>{}); }
console.log('✅ App.js yüklendi');
