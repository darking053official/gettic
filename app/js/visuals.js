// ============ GETTIC VISUALS.JS - 10 GÖRSEL ÖZELLİK ============

// ============ 1. PARÇACIK (PARTİKÜL) ARKAPLAN ============
const ParticleBG = {
  canvas: null,
  ctx: null,
  particles: [],
  isRunning: false,
  
  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'particleCanvas';
    this.canvas.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:0.3';
    document.body.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Particle oluştur
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1
      });
    }
    
    this.isRunning = true;
    this.animate();
  },
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },
  
  animate() {
    if (!this.isRunning) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(236,72,153,${p.opacity})`;
      this.ctx.fill();
    });
    
    // Çizgiler
    this.particles.forEach((a, i) => {
      this.particles.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `rgba(236,72,153,${0.1 * (1 - dist/100)})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      });
    });
    
    requestAnimationFrame(() => this.animate());
  }
};

// ============ 2. MESAJ ANİMASYONLARI ============
const MessageAnimations = {
  effects: ['slideIn', 'fadeIn', 'bounceIn', 'scaleIn', 'flipIn'],
  currentEffect: localStorage.getItem('gt_msg_anim') || 'slideIn',
  
  getAnimationClass() {
    return `msg-anim-${this.currentEffect}`;
  },
  
  setEffect(effect) {
    if (this.effects.includes(effect)) {
      this.currentEffect = effect;
      localStorage.setItem('gt_msg_anim', effect);
    }
  }
};

// Mesaj animasyon CSS'i
const msgAnimStyle = document.createElement('style');
msgAnimStyle.textContent = `
  @keyframes msgSlideIn { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }
  @keyframes msgFadeIn { from { opacity:0 } to { opacity:1 } }
  @keyframes msgBounceIn { 0% { opacity:0; transform:scale(.8) } 50% { transform:scale(1.05) } 100% { opacity:1; transform:scale(1) } }
  @keyframes msgScaleIn { from { opacity:0; transform:scale(.5) } to { opacity:1; transform:scale(1) } }
  @keyframes msgFlipIn { from { opacity:0; transform:rotateY(90deg) } to { opacity:1; transform:rotateY(0) } }
  .msg-anim-slideIn { animation: msgSlideIn .3s ease }
  .msg-anim-fadeIn { animation: msgFadeIn .3s ease }
  .msg-anim-bounceIn { animation: msgBounceIn .4s ease }
  .msg-anim-scaleIn { animation: msgScaleIn .3s ease }
  .msg-anim-flipIn { animation: msgFlipIn .4s ease }
`;
document.head.appendChild(msgAnimStyle);

// ============ 3. YAZI TİPİ DEĞİŞTİRME ============
const FontSystem = {
  fonts: ['Segoe UI', 'Inter', 'Poppins', 'Roboto', 'Montserrat', 'Open Sans', 'Nunito', 'Raleway'],
  currentFont: localStorage.getItem('gt_font') || 'Segoe UI',
  
  setFont(font) {
    if (this.fonts.includes(font)) {
      this.currentFont = font;
      localStorage.setItem('gt_font', font);
      document.body.style.fontFamily = font + ', sans-serif';
    }
  },
  
  getFontList() { return this.fonts; }
};

// ============ 4. YÜKLENME İLERLEME ÇUBUĞU ============
const ProgressBar = {
  bar: null,
  
  init() {
    this.bar = document.createElement('div');
    this.bar.className = 'progress-bar';
    this.bar.innerHTML = '<div class="progress-fill"></div>';
    document.body.appendChild(this.bar);
  },
  
  show(percent) {
    if (!this.bar) this.init();
    this.bar.style.display = 'block';
    this.bar.querySelector('.progress-fill').style.width = percent + '%';
    if (percent >= 100) setTimeout(() => this.hide(), 500);
  },
  
  hide() {
    if (this.bar) this.bar.style.display = 'none';
  }
};

// Progress CSS
const progressStyle = document.createElement('style');
progressStyle.textContent = `
  .progress-bar {
    position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 99999;
    background: var(--bg2); display: none;
  }
  .progress-fill {
    height: 100%; background: var(--gradient, linear-gradient(90deg,var(--ac),var(--ac2)));
    transition: width .3s ease; width: 0;
  }
`;
document.head.appendChild(progressStyle);

// ============ 5. ÖZEL KAYDIRMA ÇUBUĞU ============
const CustomScrollbar = {
  init() {
    const style = document.createElement('style');
    style.textContent = `
      ::-webkit-scrollbar { width: 5px; height: 5px }
      ::-webkit-scrollbar-track { background: var(--bg1); border-radius: 10px }
      ::-webkit-scrollbar-thumb { background: var(--ac3); border-radius: 10px; transition: background .2s }
      ::-webkit-scrollbar-thumb:hover { background: var(--ac) }
      * { scrollbar-width: thin; scrollbar-color: var(--ac3) var(--bg1) }
    `;
    document.head.appendChild(style);
  }
};

// ============ 6. GLASSMORPHİZM EFEKTİ ============
const GlassEffect = {
  enable(selector) {
    document.querySelectorAll(selector).forEach(el => {
      el.style.background = 'rgba(26,15,36,0.6)';
      el.style.backdropFilter = 'blur(20px)';
      el.style.webkitBackdropFilter = 'blur(20px)';
      el.style.border = '1px solid rgba(236,72,153,0.15)';
      el.style.borderRadius = '16px';
    });
  },
  
  disable(selector) {
    document.querySelectorAll(selector).forEach(el => {
      el.style.background = '';
      el.style.backdropFilter = '';
      el.style.webkitBackdropFilter = '';
      el.style.border = '';
    });
  }
};

// ============ 7. İSİMLENDİRİLMİŞ RENK PALETİ ============
const ColorPalette = {
  colors: {
    'Pembe': '#ec4899', 'Mor': '#8b5cf6', 'Mavi': '#3b82f6',
    'Yeşil': '#10b981', 'Turuncu': '#f97316', 'Kırmızı': '#ef4444',
    'Sarı': '#f59e0b', 'Camgöbeği': '#14b8a6', 'Lacivert': '#6366f1',
    'Bordo': '#be123c', 'Zümrüt': '#047857', 'Menekşe': '#7c3aed'
  },
  
  getColor(name) { return this.colors[name] || this.colors['Pembe']; },
  getNames() { return Object.keys(this.colors); },
  
  applyToElement(el, colorName) {
    const color = this.getColor(colorName);
    el.style.background = color;
    el.style.color = '#fff';
  }
};

// ============ 8. GEÇİŞ EFEKTLERİ ============
const TransitionEffects = {
  pageTransition(direction = 'fade') {
    const overlay = document.createElement('div');
    overlay.className = 'page-transition';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99998; pointer-events: none;
      background: var(--ac); opacity: 0; transition: opacity .3s ease;
    `;
    document.body.appendChild(overlay);
    
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
      }, 150);
    });
  },
  
  shimmer(el) {
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    
    const shimmer = document.createElement('div');
    shimmer.style.cssText = `
      position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.1), transparent);
      animation: shimmer 1.5s infinite;
    `;
    el.appendChild(shimmer);
  }
};

// Shimmer CSS
const shimmerStyle = document.createElement('style');
shimmerStyle.textContent = `
  @keyframes shimmer { 100% { left: 100% } }
`;
document.head.appendChild(shimmerStyle);

// ============ 9. BİLDİRİM MERKEZİ ============
const NotificationCenter = {
  container: null,
  notifications: [],
  
  init() {
    this.container = document.createElement('div');
    this.container.id = 'notificationCenter';
    this.container.style.cssText = `
      position: fixed; top: 16px; right: 16px; z-index: 9999;
      display: flex; flex-direction: column; gap: 8px; max-width: 350px;
    `;
    document.body.appendChild(this.container);
  },
  
  push(title, body, icon = '💬', duration = 4000) {
    if (!this.container) this.init();
    
    const id = genId();
    const notif = document.createElement('div');
    notif.className = 'notification-item';
    notif.style.cssText = `
      background: var(--bg1); border: 1px solid var(--b2); border-radius: 12px;
      padding: 14px; display: flex; gap: 10px; align-items: flex-start;
      animation: notifSlideIn .3s ease; box-shadow: 0 8px 24px rgba(0,0,0,.3);
      cursor: pointer; transition: transform .2s, opacity .2s;
    `;
    notif.innerHTML = `
      <span style="font-size:24px;flex-shrink:0">${icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px">${title}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">${body}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:16px;flex-shrink:0">×</button>
    `;
    
    notif.onclick = () => {
      notif.style.opacity = '0';
      notif.style.transform = 'translateX(100%)';
      setTimeout(() => notif.remove(), 200);
    };
    
    this.container.appendChild(notif);
    
    setTimeout(() => {
      if (notif.parentElement) {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(100%)';
        setTimeout(() => notif.remove(), 200);
      }
    }, duration);
    
    return id;
  }
};

// Notif CSS
const notifStyle = document.createElement('style');
notifStyle.textContent = `
  @keyframes notifSlideIn { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
`;
document.head.appendChild(notifStyle);

// ============ 10. İSKELET YÜKLEME (SKELETON LOADING) ============
const SkeletonLoader = {
  show(container, count = 5) {
    const el = document.getElementById(container);
    if (!el) return;
    
    el.innerHTML = Array(count).fill(0).map((_, i) => `
      <div class="skeleton-item" style="display:flex;gap:10px;padding:8px;animation:skeletonPulse 1.5s infinite;animation-delay:${i*0.1}s">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--bg3)"></div>
        <div style="flex:1">
          <div style="height:10px;background:var(--bg3);border-radius:4px;width:40%;margin-bottom:6px"></div>
          <div style="height:8px;background:var(--bg3);border-radius:4px;width:80%;margin-bottom:4px"></div>
          <div style="height:8px;background:var(--bg3);border-radius:4px;width:60%"></div>
        </div>
      </div>
    `).join('');
    
    el.classList.add('skeleton-active');
  },
  
  hide(container) {
    const el = document.getElementById(container);
    if (el) el.classList.remove('skeleton-active');
  }
};

// Skeleton CSS
const skeletonStyle = document.createElement('style');
skeletonStyle.textContent = `
  @keyframes skeletonPulse {
    0%, 100% { opacity: 1 }
    50% { opacity: 0.4 }
  }
  .skeleton-active { pointer-events: none }
`;
document.head.appendChild(skeletonStyle);

// ============ BAŞLAT ============
document.addEventListener('DOMContentLoaded', () => {
  ParticleBG.init();
  CustomScrollbar.init();
  NotificationCenter.init();
  
  // Uygulanan fontu ayarla
  FontSystem.setFont(FontSystem.currentFont);
  
  // Mesaj animasyonu
  document.addEventListener('DOMNodeInserted', (e) => {
    if (e.target.classList?.contains('msg')) {
      e.target.classList.add(MessageAnimations.getAnimationClass());
    }
  });
  
  console.log('✅ Görsel paket yüklendi');
});
