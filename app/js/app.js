// ============ GETTIC APP.JS - FULL & HATASIZ ============
console.log('🚀 Gettic başlatılıyor...');

// Güvenli element seçici
function $(id) {
  const el = document.getElementById(id);
  if (!el) console.warn('⚠️ Element bulunamadı:', id);
  return el;
}

// ============ GLOBAL DEĞİŞKENLER ============
let tab = 'login';
let socket = null;
let typingTimeout = null;

// ============ INIT ============
setTimeout(() => {
  const ls = $('ls');
  const login = $('loginScreen');
  if (ls) ls.classList.add('hide');
  if (login) login.classList.remove('hidden');
}, 500);

// ============ AUTH ============
const tabLogin = $('tabLogin');
const tabRegister = $('tabRegister');
const authSubmit = $('authSubmit');
const authUsername = $('authUsername');
const authPassword = $('authPassword');
const authError = $('authError');

if (tabLogin) tabLogin.onclick = () => { tab = 'login'; tabLogin.classList.add('act'); tabRegister.classList.remove('act'); authSubmit.textContent = 'Giriş'; };
if (tabRegister) tabRegister.onclick = () => { tab = 'register'; tabRegister.classList.add('act'); tabLogin.classList.remove('act'); authSubmit.textContent = 'Kayıt'; };

if (authSubmit) {
  authSubmit.onclick = async () => {
    const u = authUsername ? authUsername.value.trim() : '';
    const p = authPassword ? authPassword.value.trim() : '';
    if (!u || u.length < 3) { if (authError) { authError.textContent = 'Kullanıcı adı en az 3 karakter'; authError.style.display = 'block'; } return; }
    if (!p || p.length < 4) { if (authError) { authError.textContent = 'Şifre en az 4 karakter'; authError.style.display = 'block'; } return; }
    if (authError) authError.style.display = 'none';
    authSubmit.textContent = 'Yükleniyor...';
    authSubmit.disabled = true;
    try {
      const fn = typeof doAuth === 'function' ? doAuth : (window.doAuth || null);
      if (!fn) throw new Error('Auth yüklenemedi');
      await fn(tab, u, p);
      showMain();
    } catch (e) {
      if (authError) { authError.textContent = e.message; authError.style.display = 'block'; }
    }
    authSubmit.textContent = tab === 'login' ? 'Giriş' : 'Kayıt';
    authSubmit.disabled = false;
  };
}

if (authPassword) authPassword.onkeydown = (e) => { if (e.key === 'Enter') authSubmit.click(); };
if (authUsername) authUsername.onkeydown = (e) => { if (e.key === 'Enter') authPassword.focus(); };

// ============ SHOW MAIN ============
function showMain() {
  const loginScreen = $('loginScreen');
  const mainScreen = $('mainScreen');
  const displayName = $('displayName');
  const avatar = $('avatar');
  const serverName = $('serverName');
  const channelName = $('channelName');
  const messageInput = $('messageInput');

  if (loginScreen) loginScreen.classList.add('hidden');
  if (mainScreen) { mainScreen.classList.remove('hidden'); mainScreen.classList.add('flex'); }
  if (displayName && Store.user) displayName.textContent = Store.user.username || '';
  if (avatar && Store.user) avatar.textContent = (Store.user.username || 'G').charAt(0).toUpperCase();
  if (serverName && Store.serverSettings) serverName.textContent = Store.serverSettings.name || 'Gettic';
  if (channelName) channelName.textContent = Store.activeChannel || 'genel-sohbet';
  document.title = 'Gettic - ' + (Store.user ? Store.user.username : 'Sohbet');
  
  if (typeof renderChannels === 'function') renderChannels();
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof initEmojiPanel === 'function') initEmojiPanel();
  if (typeof saveStore === 'function') saveStore();
  if (typeof updateIcons === 'function') updateIcons();
  if (messageInput) messageInput.focus();
}

// ============ LOGIN GÖSTER ============
function showLogin() {
  const ls = $('ls');
  const loginScreen = $('loginScreen');
  const mainScreen = $('mainScreen');
  if (ls) ls.classList.add('hide');
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (mainScreen) mainScreen.classList.add('hidden');
}

// ============ TÜM BUTONLAR ============
function bindAllButtons() {
  // Home
  const homeBtn = $('homeBtn');
  if (homeBtn) homeBtn.onclick = () => {
    const homePanel = $('homePanel');
    const sidebar = $('sidebar');
    const chatArea = $('chatArea');
    if (homePanel) homePanel.classList.remove('hidden');
    if (sidebar) sidebar.classList.add('hidden');
    if (chatArea) chatArea.classList.add('hidden');
    if (typeof loadFriendSuggestions === 'function') loadFriendSuggestions();
  };

  // Discover
  const discoverBtn = $('discoverBtn');
  if (discoverBtn) discoverBtn.onclick = () => {
    const homePanel = $('homePanel');
    const sidebar = $('sidebar');
    const chatArea = $('chatArea');
    const channelName = $('channelName');
    if (homePanel) homePanel.classList.add('hidden');
    if (sidebar) sidebar.classList.add('hidden');
    if (chatArea) { chatArea.classList.remove('hidden'); chatArea.classList.add('flex'); }
    if (channelName) channelName.textContent = 'Keşfet';
  };

  // DM
  const dmBtn = $('dmBtn');
  if (dmBtn) dmBtn.onclick = () => { if (typeof openModal === 'function') openModal('dm'); };

  // Sunucu Oluştur
  const createServerBtn = $('createServerBtn');
  if (createServerBtn) createServerBtn.onclick = () => { if (typeof openModal === 'function') openModal('addServer'); };

  // Ayarlar
  const homeSettingsBtn = $('homeSettingsBtn');
  if (homeSettingsBtn) homeSettingsBtn.onclick = () => {
    const settingsPanel = $('settingsPanel');
    if (settingsPanel) settingsPanel.classList.toggle('show');
  };

  const chatSettingsBtn = $('chatSettingsBtn');
  if (chatSettingsBtn) chatSettingsBtn.onclick = () => {
    const settingsPanel = $('settingsPanel');
    if (settingsPanel) settingsPanel.classList.toggle('show');
  };

  // Bildirimler
  const homeNotificationsBtn = $('homeNotificationsBtn');
  if (homeNotificationsBtn) homeNotificationsBtn.onclick = () => { if (typeof openModal === 'function') openModal('notifications'); };

  // Sidebar butonları
  const addCategoryBtn = $('addCategoryBtn');
  if (addCategoryBtn) addCategoryBtn.onclick = () => { if (typeof openModal === 'function') openModal('addCategory'); };

  const addChannelSidebarBtn = $('addChannelSidebarBtn');
  if (addChannelSidebarBtn) addChannelSidebarBtn.onclick = () => { if (typeof openModal === 'function') openModal('addChannel'); };

  const sidebarUserBtn = $('sidebarUserBtn');
  if (sidebarUserBtn) sidebarUserBtn.onclick = () => { if (typeof openModal === 'function') openModal('profile'); };

  // Toggle
  const toggleSidebarBtn = $('toggleSidebarBtn');
  if (toggleSidebarBtn) toggleSidebarBtn.onclick = () => {
    const sidebar = $('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  };

  const togglePanelBtn = $('togglePanelBtn');
  if (togglePanelBtn) togglePanelBtn.onclick = () => {
    const userPanel = $('userPanel');
    if (userPanel) userPanel.classList.toggle('hidden');
  };

  // Chat butonları
  const searchBtn = $('searchBtn');
  if (searchBtn) searchBtn.onclick = () => { if (typeof openModal === 'function') openModal('search'); };

  const sendBtn = $('sendBtn');
  if (sendBtn) sendBtn.onclick = () => { if (typeof sendMessage === 'function') sendMessage(); };

  const emojiBtn = $('emojiBtn');
  if (emojiBtn) emojiBtn.onclick = () => {
    const emojiPanel = $('emojiPanel');
    if (emojiPanel) emojiPanel.classList.toggle('hidden');
  };

  const imageBtn = $('imageBtn');
  if (imageBtn) imageBtn.onclick = () => { if (typeof openModal === 'function') openModal('imageGen'); };

  const pollBtn = $('pollBtn');
  if (pollBtn) pollBtn.onclick = () => { if (typeof openModal === 'function') openModal('poll'); };

  // Mesaj input
  const messageInput = $('messageInput');
  if (messageInput) {
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (typeof sendMessage === 'function') sendMessage(); }
    });
  }

  // Logout
  const logoutBtn = $('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = () => { if (typeof logout === 'function') logout(); };

  const panelLogoutBtn = $('panelLogoutBtn');
  if (panelLogoutBtn) panelLogoutBtn.onclick = () => { if (typeof logout === 'function') logout(); };

  // Panel butonları
  const panelBtnMap = {
    'panelProfileBtn': 'profile',
    'panelDmBtn': 'dm',
    'panelAddFriendBtn': 'addFriend',
    'panelThemeBtn': 'theme',
    'panelPollBtn': 'poll',
    'panelSearchBtn': 'search',
    'panelServerBtn': 'serverSettings',
    'panelRolesBtn': 'roles'
  };

  Object.entries(panelBtnMap).forEach(([id, modal]) => {
    const btn = $(id);
    if (btn) btn.onclick = () => { if (typeof openModal === 'function') openModal(modal); };
  });

  const panelClearBtn = $('panelClearBtn');
  if (panelClearBtn) panelClearBtn.onclick = () => { if (typeof clearMessages === 'function') clearMessages(); };

  // Modal close
  const modalClose = $('modalClose');
  if (modalClose) modalClose.onclick = () => { if (typeof closeModal === 'function') closeModal(); };

  // Retry
  const retryBtn = $('retryBtn');
  if (retryBtn) retryBtn.onclick = () => { if (socket) socket.connect(); };

  console.log('✅ Tüm butonlar bağlandı');
}

// ============ LOAD USER ============
if (Store && Store.token) {
  const fn = typeof loadUser === 'function' ? loadUser : (window.loadUser || null);
  if (fn) {
    fn().then(u => {
      if (u) showMain();
      else showLogin();
    }).catch(() => showLogin());
  } else {
    showLogin();
  }
} else {
  showLogin();
}

// ============ BUTONLARI BAĞLA ============
window.addEventListener('load', () => {
  setTimeout(bindAllButtons, 300);
});

// Yedek - DOM hazırsa hemen bağla
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(bindAllButtons, 100);
}

console.log('✅ App.js yüklendi');
