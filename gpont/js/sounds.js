// ═══════════════════════════════════════════════════════════════════
// G-POINT ARENA SOUNDS v1.0
// Base64 olarak kodlanmış sesler, harici dosya yok!
// ═══════════════════════════════════════════════════════════════════

const Sounds = {
  // ── Atış Sesleri (sentetik) ──────────────────────────────────────
  pistol: () => _generateShootSound(400, 0.08),
  shotgun: () => _generateShootSound(150, 0.25),
  sniper: () => _generateShootSound(800, 0.15),
  rocket: () => _generateExplosionSound(),
  
  // ── Olay Sesleri ──────────────────────────────────────────────────
  hit: () => _generateHitSound(),
  death: () => _generateDeathSound(),
  reload: () => _generateReloadSound(),
  pickup: () => _generatePickupSound(),
  click: () => _generateClickSound(),
  
  // ── Müzik / Ambient ──────────────────────────────────────────────
  ambient: () => _generateAmbientSound(),
  
  // ── Efektler ─────────────────────────────────────────────────────
  explosion: () => _generateExplosionSound(),
  bulletWhiz: () => _generateWhizSound(),
};

// ═══════════════════════════════════════════════════════════════════
// SES ÜRETİCİLERİ (Saf JavaScript ile)
// ═══════════════════════════════════════════════════════════════════

function _generateShootSound(freq, duration) {
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
      
      setTimeout(() => ctx.close(), duration * 1000 + 100);
    } catch (e) { /* sessiz */ }
  };
}

function _generateExplosionSound() {
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 4);
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
      
      setTimeout(() => ctx.close(), 600);
    } catch (e) { /* sessiz */ }
  };
}

function _generateHitSound() {
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
      
      setTimeout(() => ctx.close(), 200);
    } catch (e) { /* sessiz */ }
  };
}

function _generateDeathSound() {
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      
      setTimeout(() => ctx.close(), 600);
    } catch (e) { /* sessiz */ }
  };
}

function _generateReloadSound() {
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.05);
      osc.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      
      setTimeout(() => ctx.close(), 250);
    } catch (e) { /* sessiz */ }
  };
}

function _generatePickupSound() {
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      
      setTimeout(() => ctx.close(), 200);
    } catch (e) { /* sessiz */ }
  };
}

function _generateClickSound() {
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.02);
      
      setTimeout(() => ctx.close(), 100);
    } catch (e) { /* sessiz */ }
  };
}

function _generateWhizSound() {
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
      
      setTimeout(() => ctx.close(), 200);
    } catch (e) { /* sessiz */ }
  };
}

function _generateAmbientSound() {
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.02;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
      
      return {
        stop: () => {
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          setTimeout(() => {
            try { source.stop(); ctx.close(); } catch {}
          }, 600);
        }
      };
    } catch (e) {
      return { stop: () => {} };
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// KULLANIM YARDIMCISI
// ═══════════════════════════════════════════════════════════════════

function playSound(soundFn) {
  try {
    const result = soundFn();
    if (result && typeof result === 'object' && result.stop) {
      return result; // Ambient için
    }
    return null;
  } catch (e) {
    console.warn('Ses çalınamadı:', e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Sounds, playSound };
  }
