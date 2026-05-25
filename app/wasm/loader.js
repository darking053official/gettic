// app/wasm/loader.js - Tüm WASM Modülleri (ECDH + Quantum + Hepsi)
window.WasmLoader = {
  crypto: null, emoji: null, audio: null, compress: null, games: null, e2ee: null, quantum: null, loaded: false,

  async init() {
    try {
      const base = '/app/wasm/';
      this.crypto = (await WebAssembly.instantiateStreaming(fetch(base + 'crypto.wasm'))).instance.exports;
      this.emoji = (await WebAssembly.instantiateStreaming(fetch(base + 'emoji.wasm'))).instance.exports;
      this.audio = (await WebAssembly.instantiateStreaming(fetch(base + 'audio.wasm'))).instance.exports;
      this.compress = (await WebAssembly.instantiateStreaming(fetch(base + 'compress.wasm'))).instance.exports;
      this.games = (await WebAssembly.instantiateStreaming(fetch(base + 'games.wasm'))).instance.exports;
      this.e2ee = (await WebAssembly.instantiateStreaming(fetch(base + 'e2ee.wasm'))).instance.exports;
      this.quantum = (await WebAssembly.instantiateStreaming(fetch(base + 'quantum.wasm'))).instance.exports;
      this.loaded = true;
      console.log('✅ 7 WASM modül yüklendi (ECDH + Quantum)');
    } catch(e) { console.warn('WASM yüklenemedi:', e.message); }
  }
};

// E2EE + Post-Quantum Yönetici
window.GetticE2EE = {
  _keyPairs: {}, _sharedSecrets: {},

  async init() { await WasmLoader.init(); },

  // === ECDH Key Pair ===
  generateKeyPair(userId) {
    if (!WasmLoader.loaded) return null;
    const seed = userId + Date.now() + Math.random();
    const seedBytes = new TextEncoder().encode(seed);
    const { memory, generate_keypair } = WasmLoader.e2ee;
    const pubPtr = 0, privPtr = 32, seedPtr = 128;
    new Uint8Array(memory.buffer).set(seedBytes, seedPtr);
    generate_keypair(seedPtr, seedBytes.length, pubPtr, privPtr);
    const pubKey = btoa(String.fromCharCode(...new Uint8Array(memory.buffer, pubPtr, 32)));
    const privKey = btoa(String.fromCharCode(...new Uint8Array(memory.buffer, privPtr, 32)));
    this._keyPairs[userId] = { publicKey: pubKey, privateKey: privKey };
    localStorage.setItem('gt_e2ee_pub_' + userId, pubKey);
    localStorage.setItem('gt_e2ee_priv_' + userId, privKey);
    return pubKey;
  },

  getPublicKey(userId) {
    return this._keyPairs[userId]?.publicKey || localStorage.getItem('gt_e2ee_pub_' + userId);
  },

  // === ECDH Shared Secret ===
  deriveSharedSecret(myUserId, theirPublicKey) {
    if (!WasmLoader.loaded) return null;
    const myPrivKey = this._keyPairs[myUserId]?.privateKey || localStorage.getItem('gt_e2ee_priv_' + myUserId);
    if (!myPrivKey || !theirPublicKey) return null;
    const privBytes = Uint8Array.from(atob(myPrivKey), c => c.charCodeAt(0));
    const pubBytes = Uint8Array.from(atob(theirPublicKey), c => c.charCodeAt(0));
    const { memory, derive_shared_secret } = WasmLoader.e2ee;
    const privPtr = 0, pubPtr = 32, outPtr = 64;
    new Uint8Array(memory.buffer, privPtr, 32).set(privBytes);
    new Uint8Array(memory.buffer, pubPtr, 32).set(pubBytes);
    derive_shared_secret(privPtr, pubPtr, outPtr);
    const secret = btoa(String.fromCharCode(...new Uint8Array(memory.buffer, outPtr, 32)));
    this._sharedSecrets[myUserId + '_' + theirPublicKey.substring(0, 10)] = secret;
    return secret;
  },

  // === AES-256 Şifreleme ===
  encryptMessage(plaintext, sharedSecret) {
    if (!sharedSecret || !WasmLoader.loaded) return plaintext;
    const msgBytes = new TextEncoder().encode(plaintext);
    const keyBytes = Uint8Array.from(atob(sharedSecret), c => c.charCodeAt(0));
    const { memory, aes_encrypt } = WasmLoader.e2ee;
    const msgPtr = 0, keyPtr = 1024, outPtr = 2048;
    new Uint8Array(memory.buffer, msgPtr, msgBytes.length).set(msgBytes);
    new Uint8Array(memory.buffer, keyPtr, keyBytes.length).set(keyBytes);
    aes_encrypt(msgPtr, msgBytes.length, keyPtr, keyBytes.length, outPtr);
    return '🔐' + btoa(String.fromCharCode(...new Uint8Array(memory.buffer, outPtr, msgBytes.length)));
  },

  decryptMessage(ciphertext, sharedSecret) {
    if (!sharedSecret || !ciphertext.startsWith('🔐') || !WasmLoader.loaded) return ciphertext;
    return this.encryptMessage(atob(ciphertext.replace('🔐', '')), sharedSecret);
  },

  // === Post-Quantum Kyber Key Pair ===
  generatePQKeyPair(userId) {
    if (!WasmLoader.loaded || !WasmLoader.quantum) return null;
    const seed = userId + Date.now() + Math.random();
    const seedBytes = new TextEncoder().encode(seed);
    const { memory, pq_keygen } = WasmLoader.quantum;
    const pubPtr = 0, privPtr = 512, seedPtr = 1024;
    new Uint8Array(memory.buffer).set(seedBytes, seedPtr);
    pq_keygen(seedPtr, seedBytes.length, pubPtr, privPtr);
    const pubKey = btoa(String.fromCharCode(...new Uint8Array(memory.buffer, pubPtr, 512)));
    const privKey = btoa(String.fromCharCode(...new Uint8Array(memory.buffer, privPtr, 512)));
    this._keyPairs[userId + '_pq'] = { publicKey: pubKey, privateKey: privKey };
    localStorage.setItem('gt_pq_pub_' + userId, pubKey);
    localStorage.setItem('gt_pq_priv_' + userId, privKey);
    return pubKey;
  },

  // === Post-Quantum KEM Encapsulate ===
  pqEncapsulate(theirPQPublicKey) {
    if (!WasmLoader.loaded || !WasmLoader.quantum) return null;
    const coin = Date.now().toString() + Math.random();
    const coinBytes = new TextEncoder().encode(coin);
    const pubBytes = Uint8Array.from(atob(theirPQPublicKey), c => c.charCodeAt(0));
    const { memory, pq_encapsulate } = WasmLoader.quantum;
    const pubPtr = 0, coinPtr = 512, ctPtr = 1024, ssPtr = 2048;
    new Uint8Array(memory.buffer, pubPtr, 512).set(pubBytes);
    new Uint8Array(memory.buffer, coinPtr, coinBytes.length).set(coinBytes);
    pq_encapsulate(pubPtr, coinPtr, coinBytes.length, ctPtr, ssPtr);
    const ciphertext = btoa(String.fromCharCode(...new Uint8Array(memory.buffer, ctPtr, 64)));
    const sharedSecret = btoa(String.fromCharCode(...new Uint8Array(memory.buffer, ssPtr, 32)));
    return { ciphertext, sharedSecret };
  },

  // === Post-Quantum KEM Decapsulate ===
  pqDecapsulate(ciphertext, userId) {
    if (!WasmLoader.loaded || !WasmLoader.quantum) return null;
    const privKey = this._keyPairs[userId + '_pq']?.privateKey || localStorage.getItem('gt_pq_priv_' + userId);
    if (!privKey) return null;
    const privBytes = Uint8Array.from(atob(privKey), c => c.charCodeAt(0));
    const ctBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const { memory, pq_decapsulate } = WasmLoader.quantum;
    const privPtr = 0, ctPtr = 512, ssPtr = 1024;
    new Uint8Array(memory.buffer, privPtr, 512).set(privBytes);
    new Uint8Array(memory.buffer, ctPtr, 64).set(ctBytes);
    pq_decapsulate(privPtr, ctPtr, ssPtr);
    return btoa(String.fromCharCode(...new Uint8Array(memory.buffer, ssPtr, 32)));
  },

  // === Post-Quantum Dijital İmza ===
  pqSign(message, userId) {
    if (!WasmLoader.loaded || !WasmLoader.quantum) return null;
    const privKey = this._keyPairs[userId + '_pq']?.privateKey || localStorage.getItem('gt_pq_priv_' + userId);
    if (!privKey) return null;
    const msgBytes = new TextEncoder().encode(message);
    const privBytes = Uint8Array.from(atob(privKey), c => c.charCodeAt(0));
    const { memory, pq_sign } = WasmLoader.quantum;
    const msgPtr = 0, privPtr = 1024, sigPtr = 2048;
    new Uint8Array(memory.buffer, msgPtr, msgBytes.length).set(msgBytes);
    new Uint8Array(memory.buffer, privPtr, 512).set(privBytes);
    pq_sign(msgPtr, msgBytes.length, privPtr, sigPtr);
    return btoa(String.fromCharCode(...new Uint8Array(memory.buffer, sigPtr, 64)));
  }
};

// Oyunlar
window.GetticGames = {
  rollDice(sides = 6) { return WasmLoader.loaded ? WasmLoader.games.roll_dice(sides) : Math.floor(Math.random() * sides) + 1; },
  flipCoin() { return Math.random() > 0.5 ? 'Yazı' : 'Tura'; },
  checkPrime(n) { if (WasmLoader.loaded && n < 1000000) return !!WasmLoader.games.check_prime(n); if (n < 2) return false; for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false; return true; }
};

// Sıkıştırma
window.GetticCompress = {
  compress(text) {
    if (!text || !WasmLoader.loaded) return text;
    const bytes = new TextEncoder().encode(text);
    const { memory, compress_rle } = WasmLoader.compress;
    const inPtr = 0, outPtr = 4096;
    new Uint8Array(memory.buffer, inPtr, bytes.length).set(bytes);
    const outLen = compress_rle(inPtr, bytes.length, outPtr);
    return btoa(String.fromCharCode(...new Uint8Array(memory.buffer, outPtr, outLen)));
  }
};

// Başlat
WasmLoader.init();
