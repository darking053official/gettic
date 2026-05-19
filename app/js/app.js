// ============ GETTIC APP.JS - FULL & EKSİKSİZ ============
console.log('🚀 Gettic başlatılıyor...');

function $(id) { return document.getElementById(id); }

let tab = 'login';
let socket = null;
let sendTimeout;

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
  
  // İlk girişte hoş geldin mesajı
  if (Store.messages.length === 0 && Store.activeChannel === 'genel-sohbet') {
    Store.messages.push({
      _id: 'welcome-msg',
      content: '**🎉 Gettic\'e hoş geldiniz!**\n\nBurası genel sohbet kanalı. Herkes burada mesajlaşabilir, dosya paylaşabilir ve sesli sohbete katılabilir.\n\nSohbeti başlatmak için alttaki kutuya bir şeyler yaz! 😊',
      senderName: 'Gettic',
      senderId: 'system',
      channelId: 'genel-sohbet',
      createdAt: new Date().toISOString()
    });
  }
  
  if(typeof renderChannels==='function') renderChannels();
  if(typeof renderMessages==='function') renderMessages();
  if(typeof saveStore==='function') saveStore();
  if(typeof loadActiveServers==='function') loadActiveServers();
  updateUIPermissions();
  if (typeof MongoSync !== 'undefined') setTimeout(() => MongoSync.syncAll(), 2000);
}

function showLogin() {
  $('ls')?.classList.add('hide');
  $('loginScreen')?.classList.remove('hidden');
  $('mainScreen')?.classList.add('hidden');
}

function updateUIPermissions() {
  const isAdmin = typeof hasPermission === 'function' ? hasPermission(Store.user?._id, 'manageChannels') : false;
  const addCatBtn = $('addCategoryBtn');
  const addChBtn = $('addChannelSidebarBtn');
  if (addCatBtn) addCatBtn.style.display = isAdmin ? '' : 'none';
  if (addChBtn) addChBtn.style.display = isAdmin ? '' : 'none';
}

function loadActiveServers() {
  const container = document.getElementById('activeServers');
  if (!container) return;
  container.innerHTML = `
    <div class="friend-suggestion" onclick="navigateTo('/server/gettic/chat/genel-sohbet')" style="cursor:pointer">
      <div class="friend-suggestion-av" style="background:var(--ac);color:#fff;font-weight:700">G</div>
      <div class="friend-suggestion-info">
        <div class="friend-suggestion-name">Gettic</div>
        <div class="friend-suggestion-mutual">${Store.messages?.length || 0} mesaj · 12 çevrimiçi</div>
      </div>
    </div>
    <button class="friend-suggestion-btn" onclick="openModal('addServer')" style="width:100%;margin-top:8px">+ Sunucu Ekle / Keşfet</button>
  `;
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

  // Mesaj input - debounce
  $('messageInput')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      clearTimeout(sendTimeout);
      sendTimeout = setTimeout(() => { if (typeof sendMessage === 'function') sendMessage(); }, 50);
    }
  });

  // Ses kaydı
  $('voiceMsgBtn')?.addEventListener('mousedown', ()=>{ if(typeof startRecording==='function')startRecording(); });
  $('voiceMsgBtn')?.addEventListener('mouseup', ()=>{ if(typeof stopRecording==='function')stopRecording(); });
  $('voiceMsgBtn')?.addEventListener('touchstart', (e)=>{ e.preventDefault(); if(typeof startRecording==='function')startRecording(); });
  $('voiceMsgBtn')?.addEventListener('touchend', ()=>{ if(typeof stopRecording==='function')stopRecording(); });

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

// ============ KLİVYE KISAYOLLARI ============
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); if (typeof openModal === 'function') openModal('search'); }
  if (e.key === 'Escape') { if (typeof closeModal === 'function') closeModal(); $('emojiPanel')?.classList.add('hidden'); }
});

// ============ SERVICE WORKER ============
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
}

console.log('✅ App.js yüklendi');
