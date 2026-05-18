// ============ GETTIC PERFORMANCE.JS - PERFORMANS OPTİMİZASYONU ============

// Performans state
const perfState = {
  fps: 0,
  frameCount: 0,
  lastFrameTime: performance.now(),
  memoryUsage: 0,
  isLowEndDevice: false,
  lazyLoadEnabled: true,
  virtualScrollEnabled: true,
  maxVisibleMessages: 50,
  cacheEnabled: true,
  compressionEnabled: true,
  debugMode: false
};

// ============ CİHAZ ALGILAMA ============
function detectDeviceCapabilities() {
  // Düşük performanslı cihaz algılama
  const memory = navigator.deviceMemory || 4; // GB
  const cores = navigator.hardwareConcurrency || 4;
  const connection = navigator.connection;
  
  perfState.isLowEndDevice = memory <= 2 || cores <= 2;
  
  if (perfState.isLowEndDevice) {
    // Düşük cihaz ayarları
    perfState.maxVisibleMessages = 20;
    perfState.lazyLoadEnabled = true;
    perfState.virtualScrollEnabled = true;
    
    // Animasyonları azalt
    document.body.classList.add('low-end-device');
    reduceAnimations();
  }
  
  // Bağlantı durumuna göre optimizasyon
  if (connection) {
    if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      enableDataSaver();
    }
  }
  
  console.log('📱 Cihaz:', {
    memory: memory + 'GB',
    cores,
    connection: connection?.effectiveType,
    isLowEnd: perfState.isLowEndDevice
  });
}

// ============ ANİMASYON OPTİMİZASYONU ============
function reduceAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    .low-end-device * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
    .low-end-device .spin,
    .low-end-device .vpulse,
    .low-end-device .typing-dots span {
      animation: none !important;
    }
    .low-end-device .msg {
      animation: none !important;
    }
  `;
  document.head.appendChild(style);
}

// ============ LAZY LOADING ============
function initLazyLoading() {
  // Resimler için lazy load
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '100px',
    threshold: 0.01
  });
  
  // Mevcut ve yeni resimleri gözle
  document.querySelectorAll('img[data-src], .msg-image').forEach(img => {
    observer.observe(img);
  });
  
  // Dinamik eklenen resimler için
  window._lazyObserver = observer;
}

// ============ SANAL KAYDIRMA ============
function initVirtualScroll() {
  const msgs = document.getElementById('messages');
  if (!msgs) return;
  
  let visibleRange = { start: 0, end: perfState.maxVisibleMessages };
  
  msgs.addEventListener('scroll', () => {
    if (!perfState.virtualScrollEnabled) return;
    
    const scrollTop = msgs.scrollTop;
    const itemHeight = 60; // Ortalama mesaj yüksekliği
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
    const endIdx = startIdx + perfState.maxVisibleMessages;
    
    if (startIdx !== visibleRange.start || endIdx !== visibleRange.end) {
      visibleRange = { start: startIdx, end: endIdx };
      renderVisibleMessages(startIdx, endIdx);
    }
  });
}

function renderVisibleMessages(start, end) {
  const allMessages = document.querySelectorAll('.msg');
  allMessages.forEach((msg, i) => {
    if (i >= start && i <= end) {
      msg.style.display = '';
      msg.style.visibility = 'visible';
    } else {
      msg.style.display = 'none';
      msg.style.visibility = 'hidden';
    }
  });
}

// ============ FPS ÖLÇÜM ============
function startFPSMonitor() {
  let frames = 0;
  let lastTime = performance.now();
  
  function measure() {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      perfState.fps = frames;
      frames = 0;
      lastTime = now;
      
      // Düşük FPS'de optimizasyon
      if (perfState.fps < 30 && !perfState.isLowEndDevice) {
        enablePerformanceMode();
      }
    }
    requestAnimationFrame(measure);
  }
  
  requestAnimationFrame(measure);
}

function enablePerformanceMode() {
  perfState.maxVisibleMessages = 30;
  perfState.lazyLoadEnabled = true;
  reduceAnimations();
  console.log('⚡ Performans modu aktif');
}

// ============ VERİ TASARRUFU ============
function enableDataSaver() {
  // Resimleri sıkıştır
  perfState.compressionEnabled = true;
  
  // Otomatik oynatmayı kapat
  document.querySelectorAll('video, audio').forEach(el => {
    el.autoplay = false;
    el.preload = 'none';
  });
  
  // Büyük dosyaları indirme
  toast('📱 Veri tasarrufu modu aktif', 'i');
}

// ============ ÖNBELLEK YÖNETİMİ ============
function manageCache() {
  const cacheSize = getCacheSize();
  
  // 5MB üzerinde temizlik yap
  if (cacheSize > 5 * 1024 * 1024) {
    clearOldCache();
  }
}

function getCacheSize() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('gt_')) {
      total += localStorage.getItem(key).length * 2; // UTF-16
    }
  }
  return total;
}

function clearOldCache() {
  // Eski mesajları temizle
  const messages = JSON.parse(localStorage.getItem('gt_messages') || '[]');
  if (messages.length > 100) {
    localStorage.setItem('gt_messages', JSON.stringify(messages.slice(-50)));
  }
  
  // Eski dosyaları temizle
  const files = JSON.parse(localStorage.getItem('gt_files') || '[]');
  if (files.length > 50) {
    localStorage.setItem('gt_files', JSON.stringify(files.slice(-25)));
  }
  
  toast('🗑️ Önbellek temizlendi');
}

// ============ MESAJ OPTİMİZASYONU ============
function optimizeMessageRendering() {
  // Toplu render için debounce
  let renderTimeout;
  
  window._optimizedRender = () => {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
      if (typeof renderMessages === 'function') {
        renderMessages();
      }
    }, 16); // 60fps
  };
}

// ============ DOM OPTİMİZASYONU ============
function optimizeDOM() {
  // Gereksiz DOM elementlerini temizle
  document.querySelectorAll('.msg-image').forEach(img => {
    if (!img.complete) {
      img.loading = 'lazy';
      img.decoding = 'async';
    }
  });
  
  // Event delegation kullan
  document.addEventListener('click', (e) => {
    // Mesaj butonları
    const msgBtn = e.target.closest('.ma button');
    if (msgBtn) return; // Zaten onclick var
    
    // Kanal seçimi
    const chItem = e.target.closest('.ch-item');
    if (chItem) return; // Zaten onclick var
  });
}

// ============ BAĞLANTI OPTİMİZASYONU ============
function optimizeConnection() {
  const connection = navigator.connection;
  if (!connection) return;
  
  connection.addEventListener('change', () => {
    const type = connection.effectiveType;
    
    if (type === 'slow-2g' || type === '2g') {
      // WebSocket yerine polling kullan
      if (window._socket) {
        window._socket.io.opts.transports = ['polling'];
      }
      toast('🐌 Yavaş bağlantı algılandı', 'w');
    } else {
      // WebSocket'e geri dön
      if (window._socket) {
        window._socket.io.opts.transports = ['websocket', 'polling'];
      }
    }
  });
}

// ============ DEBUGB MODU ============
function toggleDebugMode() {
  perfState.debugMode = !perfState.debugMode;
  
  if (perfState.debugMode) {
    showDebugPanel();
  } else {
    hideDebugPanel();
  }
}

function showDebugPanel() {
  let panel = document.getElementById('debugPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'debugPanel';
    panel.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 250px;
      max-height: 80vh;
      background: rgba(0,0,0,.9);
      color: #0f0;
      font-size: 10px;
      font-family: monospace;
      padding: 10px;
      z-index: 99999;
      overflow-y: auto;
      border-radius: 0 0 0 8px;
    `;
    document.body.appendChild(panel);
  }
  
  const updateDebug = () => {
    if (!perfState.debugMode) return;
    panel.innerHTML = `
      <b>DEBUG MODE</b><br>
      FPS: ${perfState.fps}<br>
      Mesaj: ${Store?.messages?.length || 0}<br>
      DOM: ${document.querySelectorAll('.msg').length}<br>
      Cache: ${(getCacheSize() / 1024).toFixed(1)}KB<br>
      Bağlantı: ${navigator.connection?.effectiveType || '?'}<br>
      Bellek: ${(performance.memory?.usedJSHeapSize / 1048576).toFixed(1) || '?'}MB<br>
      Cihaz: ${perfState.isLowEndDevice ? 'Düşük' : 'Normal'}<br>
      <hr>
      <button onclick="clearOldCache()" style="font-size:9px">🗑️ Temizle</button>
      <button onclick="toggleDebugMode()" style="font-size:9px">❌ Kapat</button>
    `;
    requestAnimationFrame(updateDebug);
  };
  
  updateDebug();
}

function hideDebugPanel() {
  const panel = document.getElementById('debugPanel');
  if (panel) panel.remove();
}

// ============ PERFORMANS CSS ============
const perfStyle = document.createElement('style');
perfStyle.textContent = `
  .msg-image {
    content-visibility: auto;
    contain-intrinsic-size: 300px;
  }
  
  .msg {
    content-visibility: auto;
    contain-intrinsic-size: 60px;
  }
  
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f0a14;
      --bg1: #1a0f24;
      --bg2: #241535;
    }
  }
`;
document.head.appendChild(perfStyle);

// ============ BAŞLAT ============
document.addEventListener('DOMContentLoaded', () => {
  detectDeviceCapabilities();
  initLazyLoading();
  initVirtualScroll();
  startFPSMonitor();
  optimizeMessageRendering();
  optimizeDOM();
  optimizeConnection();
  manageCache();
  
  // Periyodik önbellek temizliği
  setInterval(manageCache, 30 * 60 * 1000); // 30 dk
  
  // Debug modu kısayolu
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      toggleDebugMode();
    }
  });
  
  // Sayfa görünürlüğü değişince
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Arka planda FPS ölçümünü durdur
      perfState.fps = 0;
    }
  });
});
