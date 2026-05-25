// wasm/loader.js - Tüm WASM Modülleri Tek Yükleyici
window.WasmLoader = {
  crypto: null, emoji: null, audio: null, compress: null, games: null, e2ee: null, loaded: false,

  async init() {
    try {
      const base = '/app/wasm/';
      const [crypto, emoji, audio, compress, games, e2ee] = await Promise.all([
        WebAssembly.instantiateStreaming(fetch(base + 'crypto.wasm')),
        WebAssembly.instantiateStreaming(fetch(base + 'emoji.wasm')),
        WebAssembly.instantiateStreaming(fetch(base + 'audio.wasm')),
        WebAssembly.instantiateStreaming(fetch(base + 'compress.wasm')),
        WebAssembly.instantiateStreaming(fetch(base + 'games.wasm')),
        WebAssembly.instantiateStreaming(fetch(base + 'e2ee.wasm'))
      ]);
      this.crypto = crypto.instance.exports; this.emoji = emoji.instance.exports;
      this.audio = audio.instance.exports; this.compress = compress.instance.exports;
      this.games = games.instance.exports; this.e2ee = e2ee.instance.exports;
      this.loaded = true;
      console.log('✅ 6 WASM modül yüklendi');
    } catch(e) { console.warn('WASM yüklenemedi:', e.message); }
  }
};

window.GetticE2EE = {
  _keyPairs: {}, _sharedSecrets: {},
  async init() { await WasmLoader.init(); },
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
  getPublicKey(userId) { return this._keyPairs[userId]?.publicKey || localStorage.getItem('gt_e2ee_pub_' + userId); },
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
  }
};

window.GetticGames = {
  rollDice(sides = 6) { return WasmLoader.loaded ? WasmLoader.games.roll_dice(sides) : Math.floor(Math.random() * sides) + 1; },
  flipCoin() { return Math.random() > 0.5 ? 'Yazı' : 'Tura'; },
  checkPrime(n) { if (WasmLoader.loaded && n < 1000000) return !!WasmLoader.games.check_prime(n); if (n < 2) return false; for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false; return true; }
};

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

WasmLoader.init();
