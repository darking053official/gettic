// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC MOBILE.JS v2.0 - Tam Geliştirilmiş                      ║
// ╚══════════════════════════════════════════════════════════════════╝

function _mobLog(msg, level = 'log') {
  console[level](`%c[Mobile] ${msg}`, 'color:#34d399;font-weight:bold');
}

// ============ STATE ============
const mobileState = (() => {
  const state = {
    isMobile:       window.innerWidth <= 768,
    isTablet:       window.innerWidth > 768 && window.innerWidth <= 1024,
    orientation:    window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    sidebarOpen:    false,
    keyboardOpen:   false,
    keyboardHeight: 0,
    navbarVisible:  true,
    lastScrollTop:  0,
    scrollDir:      'up',
    touchStartX:    0,
    touchStartY:    0,
    touchStartTime: 0,
    swipeThreshold: 65,
    longPressMs:    480,
    _vp:            window.visualViewport || null,
    _initialVH:     window.innerHeight,
  };
  return state;
})();

// ============ ALGILAMA ============
function detectMobile() {
  const w = window.innerWidth;
  mobileState.isMobile   = w <= 768;
  mobileState.isTablet   = w > 768 && w <= 1024;
  mobileState.orientation = w > window.innerHeight ? 'landscape' : 'portrait';

  document.body.classList.toggle('mobile',    mobileState.isMobile);
  document.body.classList.toggle('tablet',    mobileState.isTablet);
  document.body.classList.toggle('desktop',   !mobileState.isMobile && !mobileState.isTablet);
  document.body.classList.toggle('landscape', mobileState.orientation === 'landscape');
  document.body.classList.toggle('portrait',  mobileState.orientation === 'portrait');

  _applyMobileLayout();
  _mobLog(`${mobileState.isMobile ? 'Mobil' : mobileState.isTablet ? 'Tablet' : 'Masaüstü'} — ${mobileState.orientation}`);
}

// ============ LAYOUT ============
function _applyMobileLayout() {
  const sidebar   = document.getElementById('sidebar');
  const chatArea  = document.getElementById('chatArea');
  const inputArea = document.querySelector('.input-area');
  const header    = document.querySelector('.chat-header');

  if (mobileState.isMobile) {
    // Sidebar → drawer
    if (sidebar) {
      sidebar.style.cssText = `
        position:fixed;top:0;bottom:0;left:${mobileState.sidebarOpen ? '0' : '-290px'};
        width:290px;z-index:200;
        transition:left .25s cubic-bezier(.4,0,.2,1);
        box-shadow:${mobileState.sidebarOpen ? '6px 0 24px rgba(0,0,0,.5)' : 'none'};
      `;
    }
    // Input alanı sticky
    if (inputArea) {
      inputArea.style.position = 'sticky';
      inputArea.style.bottom   = '0';
      inputArea.style.zIndex   = '10';
    }
    // Chat alanı tam yükseklik
    if (chatArea) {
      chatArea.style.height = 'calc(100dvh - 56px)';
    }
    _enableSwipe();
    _fixInputScroll();
  } else {
    // Desktop/tablet sıfırla
    if (sidebar)   sidebar.style.cssText   = '';
    if (inputArea) inputArea.style.cssText = '';
    if (chatArea)  chatArea.style.height   = '';
    mobileState.sidebarOpen = false;
    hideOverlay();
  }
}

// ============ SİDEBAR ============
function openMobileSidebar() {
  if (!mobileState.isMobile) return;
  mobileState.sidebarOpen = true;

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.style.left      = '0';
    sidebar.style.boxShadow = '6px 0 24px rgba(0,0,0,.5)';
  }

  _showOverlay();
  _vibrate(12);
  _mobLog('Sidebar açıldı');
}

function closeMobileSidebar() {
  mobileState.sidebarOpen = false;

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.style.left      = '-290px';
    sidebar.style.boxShadow = 'none';
  }

  _hideOverlay();
}

function toggleMobileSidebar() {
  mobileState.sidebarOpen ? closeMobileSidebar() : openMobileSidebar();
}

// ============ OVERLAY ============
function _showOverlay() {
  let el = document.getElementById('mobOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mobOverlay';
    el.className = 'mob-overlay';
    el.addEventListener('click',      closeMobileSidebar);
    el.addEventListener('touchstart', closeMobileSidebar, { passive: true });
    document.body.appendChild(el);
  }
  el.classList.add('show');
}

function _hideOverlay() {
  const el = document.getElementById('mobOverlay');
  if (el) el.classList.remove('show');
}

// Eski alias
function showOverlay() { _showOverlay(); }
function hideOverlay()  { _hideOverlay(); }

// ============ SWIPE GESTURESs ============
function _enableSwipe() {
  const area = document.getElementById('chatArea') || document.getElementById('messages');
  if (!area || area.dataset.swipeOn) return;
  area.dataset.swipeOn = '1';

  let startX = 0, startY = 0, startT = 0;

  area.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startT = Date.now();
    mobileState.touchStartX    = startX;
    mobileState.touchStartY    = startY;
    mobileState.touchStartTime = startT;
  }, { passive: true });

  area.addEventListener('touchend', e => {
    const t   = e.changedTouches[0];
    const dx  = t.clientX - startX;
    const dy  = t.clientY - startY;
    const dt  = Date.now() - startT;
    const thr = mobileState.swipeThreshold;

    // Hız bazlı eşik (hızlı swipe için daha düşük)
    const velX = Math.abs(dx) / dt;
    const effThr = velX > 0.5 ? thr * 0.6 : thr;

    // Yatay swipe (dikey baskın değilse)
    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > effThr && !mobileState.sidebarOpen && startX < 40) {
        openMobileSidebar(); // sol kenardan sağa
      } else if (dx < -effThr && mobileState.sidebarOpen) {
        closeMobileSidebar();
      }
    }
  }, { passive: true });
}

// ============ KLAVYE ALGILAMA ============
function _initKeyboardDetect() {
  // Visual Viewport API (modern)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const diff = mobileState._initialVH - window.visualViewport.height;
      const open = diff > 150;

      if (open !== mobileState.keyboardOpen) {
        mobileState.keyboardOpen   = open;
        mobileState.keyboardHeight = open ? diff : 0;
        document.body.classList.toggle('keyboard-open', open);
        document.documentElement.style.setProperty('--kb-height', (open ? diff : 0) + 'px');

        if (open) _onKeyboardOpen(diff);
        else      _onKeyboardClose();
      }
    });
  } else {
    // Fallback
    const initH = window.innerHeight;
    window.addEventListener('resize', () => {
      const diff = initH - window.innerHeight;
      const open = diff > 150;
      mobileState.keyboardOpen   = open;
      mobileState.keyboardHeight = open ? diff : 0;
      document.body.classList.toggle('keyboard-open', open);
      document.documentElement.style.setProperty('--kb-height', (open ? diff : 0) + 'px');
      if (open) _onKeyboardOpen(diff);
      else      _onKeyboardClose();
    });
  }
}

function _onKeyboardOpen(kbHeight) {
  _mobLog(`Klavye açıldı: ${kbHeight}px`);
  // Aktif input görünür hale getir
  setTimeout(() => {
    const input = document.activeElement;
    if (input?.tagName === 'INPUT' || input?.tagName === 'TEXTAREA') {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Mesajları aşağı kaydır
    const msgs = document.getElementById('messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 200);
}

function _onKeyboardClose() {
  _mobLog('Klavye kapandı');
}

// ============ INPUT SCROLL FİX ============
function _fixInputScroll() {
  // iOS'ta focus sonrası scroll sorunu
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach(inp => {
    if (inp.dataset.scrollFixed) return;
    inp.dataset.scrollFixed = '1';
    inp.addEventListener('focus', () => {
      if (!mobileState.isMobile) return;
      setTimeout(() => {
        inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }, { passive: true });
  });
}

// ============ SCROLL YÖNETİMİ ============
function _initScrollHandler() {
  const msgs = document.getElementById('messages');
  if (!msgs || msgs.dataset.scrollHandled) return;
  msgs.dataset.scrollHandled = '1';

  let ticking = false;
  msgs.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const top = msgs.scrollTop;
      mobileState.scrollDir     = top > mobileState.lastScrollTop ? 'down' : 'up';
      mobileState.lastScrollTop = top;

      // Scroll to bottom butonu
      const atBottom = msgs.scrollHeight - top - msgs.clientHeight < 100;
      _updateScrollBtn(!atBottom);

      ticking = false;
    });
  }, { passive: true });
}

function _updateScrollBtn(show) {
  let btn = document.getElementById('scrollToBottomBtn');
  if (show) {
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'scrollToBottomBtn';
      btn.className = 'scroll-bottom-btn';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
      btn.onclick = () => {
        const msgs = document.getElementById('messages');
        if (msgs) msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });
      };
      document.getElementById('chatArea')?.appendChild(btn);
    }
    btn.classList.add('show');
  } else {
    btn?.classList.remove('show');
  }
}

// ============ UZUN BASMA ============
function _initLongPress() {
  let timer = null;
  let moved = false;

  document.addEventListener('touchstart', e => {
    const msgEl = e.target.closest('.msg[id]');
    if (!msgEl) return;
    moved = false;
    timer = setTimeout(() => {
      if (moved) return;
      _vibrate(55);
      const msgId = msgEl.id.replace('msg-', '');
      if (msgId) _showMobileCtxMenu(e.touches[0].clientX, e.touches[0].clientY, msgId);
    }, mobileState.longPressMs);
  }, { passive: true });

  document.addEventListener('touchmove',  () => { moved = true; clearTimeout(timer); }, { passive: true });
  document.addEventListener('touchend',   () => clearTimeout(timer), { passive: true });
  document.addEventListener('touchcancel',() => clearTimeout(timer), { passive: true });
}

// ============ MOBİL CONTEXT MENU ============
function _showMobileCtxMenu(x, y, msgId) {
  document.querySelectorAll('.mob-ctx-menu').forEach(m => m.remove());

  const msg    = Store.messages?.find(m => m._id === msgId);
  const isOwn  = msg?.senderId === Store.user?._id;
  const canDel = isOwn || (typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'deleteMsg'));

  const REACT_EMOJI = { like:'👍', heart:'❤️', laugh:'😂', fire:'🔥', sad:'😢', wow:'😮' };

  const menu = document.createElement('div');
  menu.className = 'mob-ctx-menu';

  // Tepki bandı
  const reactBar = document.createElement('div');
  reactBar.className = 'mob-ctx-reacts';
  Object.entries(REACT_EMOJI).forEach(([k, v]) => {
    const btn = document.createElement('button');
    btn.textContent = v;
    btn.onclick = () => {
      if (typeof reactToMessage === 'function') reactToMessage(msgId, k);
      menu.remove();
    };
    reactBar.appendChild(btn);
  });
  menu.appendChild(reactBar);

  // Ayırıcı
  const sep0 = document.createElement('div');
  sep0.className = 'mob-ctx-sep';
  menu.appendChild(sep0);

  // Eylem butonları
  const actions = [
    { label: '↩ Yanıtla',   fn: () => typeof replyToMessage === 'function' && replyToMessage(msgId) },
    { label: '📋 Kopyala',  fn: () => typeof copyMessage    === 'function' && copyMessage(msgId) },
    { label: '📌 Sabitle',  fn: () => typeof pinMessage     === 'function' && pinMessage(msgId), show: typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'manageMessages') },
    isOwn ? { label: '✏️ Düzenle', fn: () => typeof editMessage === 'function' && editMessage(msgId) } : null,
    { sep: true },
    canDel ? { label: '🗑️ Sil', fn: () => typeof deleteMessage === 'function' && deleteMessage(msgId), danger: true } : null,
  ].filter(Boolean);

  actions.forEach(item => {
    if (item.sep) {
      const s = document.createElement('div');
      s.className = 'mob-ctx-sep';
      menu.appendChild(s);
      return;
    }
    if (item.show === false) return;
    const btn = document.createElement('button');
    btn.className = 'mob-ctx-btn' + (item.danger ? ' danger' : '');
    btn.textContent = item.label;
    btn.onclick = () => { item.fn(); menu.remove(); };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);

  // Pozisyon (ekrana sığdır)
  const mRect = menu.getBoundingClientRect();
  let mx = Math.min(x, window.innerWidth  - mRect.width  - 12);
  let my = Math.min(y, window.innerHeight - mRect.height - 12);
  mx = Math.max(12, mx);
  my = Math.max(60, my);
  menu.style.left = mx + 'px';
  menu.style.top  = my + 'px';

  // Kapat
  setTimeout(() => {
    const close = () => { menu.remove(); document.removeEventListener('touchstart', close); document.removeEventListener('click', close); };
    document.addEventListener('touchstart', close, { once: true });
    document.addEventListener('click',      close, { once: true });
  }, 80);
}

// ============ DOKUNMA GERİ BİLDİRİMİ ============
function _initTouchFeedback() {
  const SELECTOR = '.ib, .ri, .ch-item, .gm-list-item, .dm-list-item, .gm-btn, .mob-ctx-btn';

  // MutationObserver ile dinamik elemanları da yakala
  const apply = (root) => {
    root.querySelectorAll(SELECTOR).forEach(el => {
      if (el.dataset.tfb) return;
      el.dataset.tfb = '1';
      el.addEventListener('touchstart', () => {
        el.style.opacity   = '0.72';
        el.style.transform = 'scale(0.96)';
        el.style.transition = 'opacity .08s,transform .08s';
      }, { passive: true });
      el.addEventListener('touchend', () => {
        el.style.opacity   = '';
        el.style.transform = '';
      }, { passive: true });
      el.addEventListener('touchcancel', () => {
        el.style.opacity   = '';
        el.style.transform = '';
      }, { passive: true });
    });
  };

  apply(document);

  const obs = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) apply(n); }));
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// ============ TITREŞIM ============
function _vibrate(pattern = 10) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ============ PWA — YÜKLEME PROMPTU ============
let _deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPrompt = e;
  _showInstallBanner();
});

window.addEventListener('appinstalled', () => {
  _deferredPrompt = null;
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.remove();
  _mobLog('PWA yüklendi');
  if (typeof toast === 'function') toast('Gettic yüklendi! 🎉', 's');
});

function _showInstallBanner() {
  if (document.getElementById('pwaInstallBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwaInstallBanner';
  banner.className = 'pwa-banner';
  banner.innerHTML = `
    <div class="pwa-banner-left">
      <span style="font-size:22px">📱</span>
      <div>
        <div class="pwa-banner-title">Gettic'i Yükle</div>
        <div class="pwa-banner-sub">Ana ekrana ekle, daha hızlı aç</div>
      </div>
    </div>
    <div class="pwa-banner-btns">
      <button class="pwa-btn-install" onclick="installPWA()">Yükle</button>
      <button class="pwa-btn-close" onclick="this.closest('#pwaInstallBanner').remove()">✕</button>
    </div>`;
  document.body.appendChild(banner);
}

async function installPWA() {
  if (!_deferredPrompt) return;
  _deferredPrompt.prompt();
  const { outcome } = await _deferredPrompt.userChoice;
  _deferredPrompt = null;
  document.getElementById('pwaInstallBanner')?.remove();
  _mobLog('PWA yükleme sonucu: ' + outcome);
}

// ============ PULL TO REFRESH ============
function _initPullToRefresh() {
  const msgs = document.getElementById('messages');
  if (!msgs || msgs.dataset.ptrOn) return;
  msgs.dataset.ptrOn = '1';

  let startY = 0, pulling = false;
  let indicator = null;

  msgs.addEventListener('touchstart', e => {
    if (msgs.scrollTop === 0) {
      startY  = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  msgs.addEventListener('touchmove', e => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 10 && dy < 80) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'ptr-indicator';
        indicator.innerHTML = `<div class="ptr-spinner"></div>`;
        msgs.prepend(indicator);
      }
      indicator.style.height = dy + 'px';
      indicator.style.opacity = dy / 60 + '';
    }
  }, { passive: true });

  msgs.addEventListener('touchend', e => {
    if (!pulling) return;
    pulling = false;
    const dy = e.changedTouches[0].clientY - startY;
    if (indicator) { indicator.remove(); indicator = null; }
    if (dy > 60) {
      _mobLog('Pull-to-refresh tetiklendi');
      if (typeof toast === 'function') toast('Yükleniyor...', 'i');
      // Eski mesajları yükle
      if (typeof MongoSync !== 'undefined' && MongoSync.loadOlderMessages) {
        MongoSync.loadOlderMessages(Store.activeChannel);
      } else if (socket?.connected) {
        socket.emit('load_older', { channelId: Store.activeChannel, before: Store.messages?.[0]?._id });
      }
    }
  }, { passive: true });
}

// ============ BOTTOM SHEET ============
function showBottomSheet(contentHTML, title = '') {
  document.getElementById('mobBottomSheet')?.remove();

  const sheet = document.createElement('div');
  sheet.id = 'mobBottomSheet';
  sheet.className = 'mob-bottom-sheet';
  sheet.innerHTML = `
    <div class="mob-bs-handle"></div>
    ${title ? `<div class="mob-bs-title">${title}</div>` : ''}
    <div class="mob-bs-body">${contentHTML}</div>`;

  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('open'));

  // Sürükleyerek kapat
  let startY = 0;
  sheet.querySelector('.mob-bs-handle').addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
  }, { passive: true });
  sheet.querySelector('.mob-bs-handle').addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 60) hideBottomSheet();
  }, { passive: true });

  // Dışına tıklayınca kapat
  const backdrop = document.createElement('div');
  backdrop.className = 'mob-bs-backdrop';
  backdrop.onclick = hideBottomSheet;
  sheet.insertAdjacentElement('beforebegin', backdrop);
  requestAnimationFrame(() => backdrop.classList.add('show'));
}

function hideBottomSheet() {
  const sheet    = document.getElementById('mobBottomSheet');
  const backdrop = document.querySelector('.mob-bs-backdrop');
  if (sheet) {
    sheet.classList.remove('open');
    setTimeout(() => sheet.remove(), 300);
  }
  if (backdrop) {
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 300);
  }
}

// ============ TOAST POZISYON DÜZELTMESİ ============
function _fixToastPosition() {
  // Klavye açıkken toast yukarıya git
  const obs = new MutationObserver(() => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    if (mobileState.keyboardOpen) {
      toast.style.bottom = (mobileState.keyboardHeight + 16) + 'px';
    } else {
      toast.style.bottom = '';
    }
  });
  const toast = document.getElementById('toast');
  if (toast) obs.observe(toast, { attributes: true, attributeFilter: ['class'] });
}

// ============ CSS ============
(function injectMobileStyles() {
  const id = 'gt-mob-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
:root { --kb-height: 0px; }

/* ─── Overlay ─── */
.mob-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.55);
  z-index:199;opacity:0;pointer-events:none;
  transition:opacity .25s ease;
}
.mob-overlay.show{opacity:1;pointer-events:all}

/* ─── Context Menu ─── */
.mob-ctx-menu{
  position:fixed;z-index:9995;
  background:var(--bg1,#1a0f24);
  border:1px solid rgba(255,255,255,.1);
  border-radius:16px;padding:8px;
  box-shadow:0 16px 48px rgba(0,0,0,.6);
  min-width:190px;
  animation:mobCtxIn .18s cubic-bezier(.34,1.56,.64,1);
}
@keyframes mobCtxIn{from{transform:scale(.88);opacity:0}to{transform:scale(1);opacity:1}}
.mob-ctx-reacts{
  display:flex;gap:2px;padding:4px 6px 8px;
  border-bottom:1px solid rgba(255,255,255,.07);
  margin-bottom:4px;
}
.mob-ctx-reacts button{
  background:none;border:none;font-size:22px;cursor:pointer;
  padding:4px;border-radius:8px;transition:transform .12s;
  line-height:1;
}
.mob-ctx-reacts button:hover{transform:scale(1.3)}
.mob-ctx-sep{height:1px;background:rgba(255,255,255,.07);margin:3px 4px}
.mob-ctx-btn{
  display:flex;align-items:center;gap:8px;width:100%;
  padding:11px 12px;background:none;border:none;
  color:var(--t1,#fff);font-size:14px;font-family:inherit;
  cursor:pointer;border-radius:10px;text-align:left;
  transition:background .12s;
}
.mob-ctx-btn:hover,.mob-ctx-btn:active{background:rgba(255,255,255,.07)}
.mob-ctx-btn.danger{color:#ef4444}
.mob-ctx-btn.danger:hover{background:#ef444418}

/* ─── Scroll to bottom ─── */
.scroll-bottom-btn{
  position:absolute;bottom:16px;right:16px;
  width:36px;height:36px;border-radius:50%;
  background:var(--ac,#6366f1);color:#fff;
  border:none;cursor:pointer;z-index:20;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 16px rgba(0,0,0,.4);
  opacity:0;transform:scale(.8) translateY(8px);pointer-events:none;
  transition:opacity .2s,transform .2s;
}
.scroll-bottom-btn.show{opacity:1;transform:scale(1) translateY(0);pointer-events:all}

/* ─── Pull to refresh ─── */
.ptr-indicator{
  display:flex;align-items:center;justify-content:center;
  overflow:hidden;transition:height .1s,opacity .1s;
}
.ptr-spinner{
  width:22px;height:22px;border-radius:50%;
  border:2.5px solid rgba(255,255,255,.1);
  border-top-color:var(--ac,#6366f1);
  animation:spin .7s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* ─── Bottom sheet ─── */
.mob-bs-backdrop{
  position:fixed;inset:0;background:rgba(0,0,0,.5);
  z-index:300;opacity:0;transition:opacity .25s;
}
.mob-bs-backdrop.show{opacity:1}
.mob-bottom-sheet{
  position:fixed;bottom:0;left:0;right:0;z-index:301;
  background:var(--bg1,#1a0f24);
  border-radius:20px 20px 0 0;
  padding:0 0 max(env(safe-area-inset-bottom),16px);
  max-height:85dvh;overflow-y:auto;
  transform:translateY(100%);
  transition:transform .3s cubic-bezier(.4,0,.2,1);
  box-shadow:0 -8px 40px rgba(0,0,0,.5);
}
.mob-bottom-sheet.open{transform:translateY(0)}
.mob-bs-handle{
  width:36px;height:4px;border-radius:2px;
  background:rgba(255,255,255,.2);
  margin:12px auto 8px;cursor:grab;
}
.mob-bs-title{
  font-size:15px;font-weight:700;color:var(--t1,#fff);
  padding:4px 20px 12px;border-bottom:1px solid rgba(255,255,255,.07);
}
.mob-bs-body{padding:12px 16px}

/* ─── PWA Banner ─── */
.pwa-banner{
  position:fixed;bottom:0;left:0;right:0;z-index:500;
  background:var(--bg1,#1a0f24);
  border-top:1px solid rgba(255,255,255,.1);
  padding:12px 16px max(env(safe-area-inset-bottom),12px);
  display:flex;align-items:center;justify-content:space-between;
  gap:12px;animation:slideUp .3s ease;
  box-shadow:0 -4px 24px rgba(0,0,0,.4);
}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.pwa-banner-left{display:flex;align-items:center;gap:10px}
.pwa-banner-title{font-size:13px;font-weight:700;color:var(--t1,#fff)}
.pwa-banner-sub{font-size:11px;color:var(--t3,#888)}
.pwa-banner-btns{display:flex;align-items:center;gap:8px;flex-shrink:0}
.pwa-btn-install{
  padding:7px 14px;border-radius:10px;
  background:var(--ac,#6366f1);color:#fff;
  border:none;cursor:pointer;font-size:13px;font-weight:600;
}
.pwa-btn-close{
  background:none;border:none;cursor:pointer;
  color:var(--t3,#888);font-size:18px;padding:4px;
  line-height:1;border-radius:6px;
}
.pwa-btn-close:hover{color:var(--t1,#fff)}

/* ─── Mobil genel ─── */
@media (max-width:768px) {
  .chat-header{padding:8px 12px;height:48px}
  .msgs,#messages{padding:6px 10px}
  .input-area{
    padding:6px 10px;gap:5px;
    padding-bottom:max(env(safe-area-inset-bottom),8px);
  }
  .msg-inp{font-size:16px!important}
  .msg{padding:3px 10px}
  .msg-av{width:30px;height:30px;font-size:12px}
  .msg-text{font-size:14px}
  .msg-actions{display:none!important} /* Uzun basma ile açılır */
  .ib{width:30px!important;height:30px!important}
  .modal #modalContent,#modal #modalContent{
    width:96vw!important;max-height:88dvh!important;
    border-radius:16px!important;
  }
  .ctx-menu{min-width:160px}
  .rail{width:50px}
  .ri{width:36px;height:36px}
  .keyboard-open .input-area{
    padding-bottom:calc(var(--kb-height) + 8px)!important;
  }
}

@media (max-width:480px) {
  .msg-av{width:26px;height:26px;font-size:10px}
  .gm-type-grid{grid-template-columns:1fr!important}
  .gm-profile-stats{grid-template-columns:repeat(3,1fr)!important}
  .gm-bot-cmd-grid{gap:4px}
  .dm-list-item{padding:6px 10px}
}

@media (orientation:landscape) and (max-height:500px) {
  .chat-header{height:36px;padding:4px 10px}
  .msgs,#messages{padding:3px 8px}
  .input-area{padding:3px 8px}
  .rail{width:40px}
  .ri{width:30px;height:30px}
  #modal #modalContent{max-height:95dvh!important}
}

@media (prefers-reduced-motion:reduce) {
  *{transition:none!important;animation:none!important}
}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initMobile() {
  detectMobile();
  _initKeyboardDetect();
  _initScrollHandler();
  _initLongPress();
  _initTouchFeedback();
  _initPullToRefresh();
  _fixToastPosition();

  window.addEventListener('resize',            () => detectMobile(),                  { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(detectMobile, 350),   { passive: true });

  // Sidebar toggle butonu
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  if (toggleBtn) toggleBtn.onclick = toggleMobileSidebar;

  // Dinamik elementler için input scroll fix yeniden çalıştır
  const obs = new MutationObserver(() => _fixInputScroll());
  obs.observe(document.body, { childList: true, subtree: true });

  _mobLog('v2.0 yüklendi ✓');
})();
