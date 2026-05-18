// ============ GETTIC MOBILE.JS - MOBİL UYUMLULUK ============

// Mobil state
const mobileState = {
  isMobile: window.innerWidth <= 768,
  isTablet: window.innerWidth <= 1024 && window.innerWidth > 768,
  orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
  touchStartX: 0,
  touchStartY: 0,
  sidebarOpen: false,
  keyboardOpen: false,
  lastScrollTop: 0,
  scrollDirection: 'up',
  navbarVisible: true
};

// Mobil algılama
function detectMobile() {
  mobileState.isMobile = window.innerWidth <= 768;
  mobileState.isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
  mobileState.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  
  document.body.classList.toggle('mobile', mobileState.isMobile);
  document.body.classList.toggle('tablet', mobileState.isTablet);
  document.body.classList.toggle('landscape', mobileState.orientation === 'landscape');
  
  updateMobileLayout();
}

// Mobil layout güncelleme
function updateMobileLayout() {
  const sidebar = document.getElementById('sidebar');
  const homePanel = document.getElementById('homePanel');
  const chatArea = document.getElementById('chatArea');
  const inputArea = document.querySelector('.input-area');
  
  if (mobileState.isMobile) {
    // Sidebar'ı mobil menü yap
    if (sidebar) {
      sidebar.style.position = 'fixed';
      sidebar.style.left = mobileState.sidebarOpen ? '0' : '-280px';
      sidebar.style.top = '0';
      sidebar.style.bottom = '0';
      sidebar.style.zIndex = '50';
      sidebar.style.transition = 'left .25s ease';
      sidebar.style.width = '280px';
      sidebar.style.boxShadow = mobileState.sidebarOpen ? '4px 0 20px rgba(0,0,0,.3)' : 'none';
    }
    
    // Input alanını alta sabitle
    if (inputArea) {
      inputArea.style.position = 'sticky';
      inputArea.style.bottom = '0';
      inputArea.style.paddingBottom = 'env(safe-area-inset-bottom, 8px)';
    }
    
    // Mesaj alanı yüksekliği
    if (chatArea) {
      chatArea.style.height = 'calc(100dvh - 60px)';
    }
    
    // Swipe hareketleri
    enableSwipeGestures();
  } else {
    // Masaüstüne geri dön
    if (sidebar) {
      sidebar.style.position = '';
      sidebar.style.left = '';
      sidebar.style.width = '';
      sidebar.style.boxShadow = '';
      sidebar.style.zIndex = '';
    }
    if (inputArea) {
      inputArea.style.position = '';
    }
    if (chatArea) {
      chatArea.style.height = '';
    }
  }
}

// Swipe jestleri
function enableSwipeGestures() {
  const chatArea = document.getElementById('chatArea');
  if (!chatArea) return;
  
  chatArea.addEventListener('touchstart', (e) => {
    mobileState.touchStartX = e.touches[0].clientX;
    mobileState.touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  chatArea.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - mobileState.touchStartX;
    const dy = e.changedTouches[0].clientY - mobileState.touchStartY;
    
    // Sağa swipe - sidebar aç
    if (dx > 80 && Math.abs(dx) > Math.abs(dy) && !mobileState.sidebarOpen) {
      openMobileSidebar();
    }
    
    // Sola swipe - sidebar kapat
    if (dx < -80 && Math.abs(dx) > Math.abs(dy) && mobileState.sidebarOpen) {
      closeMobileSidebar();
    }
    
    // Yukarı swipe - navbar göster
    if (dy < -50 && Math.abs(dy) > Math.abs(dx)) {
      showMobileNavbar();
    }
    
    // Aşağı swipe - navbar gizle
    if (dy > 50 && Math.abs(dy) > Math.abs(dx)) {
      hideMobileNavbar();
    }
  });
}

// Mobil sidebar
function openMobileSidebar() {
  mobileState.sidebarOpen = true;
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.style.left = '0';
  
  // Overlay
  showOverlay();
}

function closeMobileSidebar() {
  mobileState.sidebarOpen = false;
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.style.left = '-280px';
  
  // Overlay kaldır
  hideOverlay();
}

function toggleMobileSidebar() {
  if (mobileState.sidebarOpen) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

// Overlay
function showOverlay() {
  let overlay = document.getElementById('mobileOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobileOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:block';
    overlay.addEventListener('click', closeMobileSidebar);
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'block';
}

function hideOverlay() {
  const overlay = document.getElementById('mobileOverlay');
  if (overlay) overlay.style.display = 'none';
}

// Mobil navbar
function showMobileNavbar() {
  const navbar = document.querySelector('.rail');
  const inputArea = document.querySelector('.input-area');
  if (navbar) navbar.style.transform = 'translateY(0)';
  if (inputArea) inputArea.style.transform = 'translateY(0)';
  mobileState.navbarVisible = true;
}

function hideMobileNavbar() {
  const navbar = document.querySelector('.rail');
  const inputArea = document.querySelector('.input-area');
  if (navbar && mobileState.isMobile) navbar.style.transform = 'translateY(-100%)';
  if (inputArea && mobileState.isMobile) inputArea.style.transform = 'translateY(100%)';
  mobileState.navbarVisible = false;
}

// Klavye algılama
function detectKeyboard() {
  const initialHeight = window.innerHeight;
  
  window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    const diff = initialHeight - currentHeight;
    
    if (diff > 150) {
      // Klavye açık
      mobileState.keyboardOpen = true;
      document.body.classList.add('keyboard-open');
      
      // Input'u görünür yap
      const input = document.getElementById('messageInput') || document.getElementById('dmInput');
      if (input) {
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    } else {
      // Klavye kapalı
      mobileState.keyboardOpen = false;
      document.body.classList.remove('keyboard-open');
    }
  });
}

// Mobil scroll
function handleMobileScroll() {
  const msgs = document.getElementById('messages');
  if (!msgs) return;
  
  msgs.addEventListener('scroll', () => {
    const scrollTop = msgs.scrollTop;
    mobileState.scrollDirection = scrollTop > mobileState.lastScrollTop ? 'down' : 'up';
    mobileState.lastScrollTop = scrollTop;
    
    // Aşağı scroll - navbar gizle
    if (mobileState.scrollDirection === 'down' && scrollTop > 100 && mobileState.isMobile) {
      hideMobileNavbar();
    }
    
    // Yukarı scroll - navbar göster
    if (mobileState.scrollDirection === 'up' && mobileState.isMobile) {
      showMobileNavbar();
    }
  });
}

// Mobil için dokunmatik geri bildirim
function addTouchFeedback() {
  document.querySelectorAll('.ib, .ri, .ch-item, .friend-suggestion, .mb').forEach(el => {
    el.addEventListener('touchstart', () => {
      el.style.opacity = '0.7';
      el.style.transform = 'scale(0.97)';
    }, { passive: true });
    
    el.addEventListener('touchend', () => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    }, { passive: true });
  });
}

// Mobil için uzun basma menüsü
function enableLongPress() {
  let longPressTimer;
  
  document.addEventListener('touchstart', (e) => {
    const msgEl = e.target.closest('.msg');
    if (!msgEl) return;
    
    longPressTimer = setTimeout(() => {
      // Titreşim
      if (navigator.vibrate) navigator.vibrate(50);
      
      // Uzun basma menüsü
      const msgId = msgEl.id?.replace('msg-', '');
      if (msgId) {
        showMobileContextMenu(e.touches[0].clientX, e.touches[0].clientY, msgId);
      }
    }, 500);
  }, { passive: true });
  
  document.addEventListener('touchmove', () => {
    clearTimeout(longPressTimer);
  }, { passive: true });
  
  document.addEventListener('touchend', () => {
    clearTimeout(longPressTimer);
  });
}

// Mobil context menu
function showMobileContextMenu(x, y, msgId) {
  const existing = document.getElementById('mobileContextMenu');
  if (existing) existing.remove();
  
  const menu = document.createElement('div');
  menu.id = 'mobileContextMenu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: var(--bg1);
    border: 1px solid var(--b2);
    border-radius: 12px;
    padding: 8px;
    z-index: 999;
    min-width: 180px;
    box-shadow: 0 8px 32px rgba(0,0,0,.3);
  `;
  
  menu.innerHTML = `
    <button onclick="reactToMessage('${msgId}','👍');this.parentElement.remove()" style="display:block;width:100%;padding:10px;background:none;border:none;color:var(--t2);text-align:left;cursor:pointer;border-radius:8px;font-size:13px">👍 Beğen</button>
    <button onclick="copyMessage('${msgId}');this.parentElement.remove()" style="display:block;width:100%;padding:10px;background:none;border:none;color:var(--t2);text-align:left;cursor:pointer;border-radius:8px;font-size:13px">📋 Kopyala</button>
    <button onclick="deleteMessage('${msgId}');this.parentElement.remove()" style="display:block;width:100%;padding:10px;background:none;border:none;color:var(--re);text-align:left;cursor:pointer;border-radius:8px;font-size:13px">🗑️ Sil</button>
  `;
  
  document.body.appendChild(menu);
  
  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
    document.addEventListener('touchstart', () => menu.remove(), { once: true });
  }, 100);
}

// Mobil CSS
const mobileStyle = document.createElement('style');
mobileStyle.textContent = `
  @media (max-width: 768px) {
    .rail {
      width: 52px;
      padding: 6px 0;
    }
    
    .ri {
      width: 38px;
      height: 38px;
    }
    
    .sidebar {
      position: fixed !important;
      left: -280px !important;
      top: 0 !important;
      bottom: 0 !important;
      width: 280px !important;
      z-index: 50 !important;
      transition: left .25s ease !important;
    }
    
    .home-panel {
      padding: 0;
    }
    
    .home-header {
      padding: 10px 14px;
    }
    
    .home-body {
      padding: 14px;
    }
    
    .chat-header {
      padding: 8px 12px;
      height: 42px;
    }
    
    .msgs {
      padding: 8px 10px;
    }
    
    .input-area {
      padding: 6px 8px;
      gap: 4px;
      position: sticky !important;
      bottom: 0 !important;
      background: var(--bg1) !important;
    }
    
    .msg-inp {
      font-size: 16px !important;
      padding: 8px 12px;
    }
    
    .ib {
      width: 28px !important;
      height: 28px !important;
    }
    
    .friend-suggestion {
      padding: 8px;
    }
    
    .friend-suggestion-av {
      width: 36px;
      height: 36px;
    }
    
    .msg-av {
      width: 28px;
      height: 28px;
      font-size: 11px;
    }
    
    .msg-text {
      font-size: 14px;
    }
    
    .voice-panel {
      width: 90vw !important;
      bottom: 10px !important;
    }
    
    .modal .mbox {
      width: 95vw !important;
      max-height: 90dvh !important;
      border-radius: 16px !important;
      padding: 16px !important;
    }
    
    .settings-panel {
      width: 100% !important;
      position: fixed !important;
    }
    
    .keyboard-open .input-area {
      padding-bottom: 20px !important;
    }
    
    .keyboard-open .msgs {
      padding-bottom: 80px;
    }
  }
  
  @media (max-width: 480px) {
    .hacts .ib:nth-child(n+3) {
      display: none;
    }
    
    .friend-suggestion-btn {
      padding: 4px 10px;
      font-size: 10px;
    }
  }
  
  @media (orientation: landscape) and (max-height: 500px) {
    .chat-header {
      height: 36px;
      padding: 4px 10px;
    }
    
    .msgs {
      padding: 4px 8px;
    }
    
    .input-area {
      padding: 4px 6px;
    }
    
    .home-header {
      padding: 6px 12px;
    }
  }
`;
document.head.appendChild(mobileStyle);

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  detectMobile();
  detectKeyboard();
  handleMobileScroll();
  addTouchFeedback();
  enableLongPress();
  
  window.addEventListener('resize', detectMobile);
  window.addEventListener('orientationchange', () => {
    setTimeout(detectMobile, 300);
  });
  
  // Mobil sidebar toggle
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  if (toggleBtn) toggleBtn.onclick = toggleMobileSidebar;
});
