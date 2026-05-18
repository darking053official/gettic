// ============ GETTIC MONGODBSYNC.JS - MONGO DB TAM SENKRONİZASYON ============

const MongoSync = {
  isSyncing: false,
  lastSync: null,
  syncInterval: null,

  // ============ MESAJ İŞLEMLERİ ============

  // Mesajı MongoDB'ye kaydet
  async saveMessage(msg) {
    if (!Store.token || !navigator.onLine) return false;
    try {
      const res = await fetch(API + '/api/channels/' + msg.channelId + '/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Store.token
        },
        body: JSON.stringify({
          content: msg.content,
          senderName: msg.senderName,
          senderId: msg.senderId,
          channelId: msg.channelId,
          createdAt: msg.createdAt,
          reactions: msg.reactions || {},
          edited: msg.edited || false,
          image: msg.image || null,
          file: msg.file || null
        })
      });
      if (res.ok) {
        const saved = await res.json();
        // ID'yi güncelle
        if (saved._id) {
          const msgInStore = Store.messages.find(m => m._id === msg._id);
          if (msgInStore) msgInStore._id = saved._id;
        }
        return true;
      }
    } catch(e) {
      console.warn('Mesaj kaydedilemedi:', e.message);
      // Offline kuyruğuna ekle
      SyncEngine.addToQueue('/api/channels/' + msg.channelId + '/messages', 'POST', msg);
    }
    return false;
  },

  // Mesajı sil
  async deleteMessage(msgId, channelId) {
    if (!Store.token || !navigator.onLine) return false;
    try {
      const res = await fetch(API + '/api/channels/' + channelId + '/messages/' + msgId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
      return res.ok;
    } catch(e) {
      SyncEngine.addToQueue('/api/channels/' + channelId + '/messages/' + msgId, 'DELETE', {});
      return false;
    }
  },

  // Mesajı düzenle
  async editMessage(msgId, channelId, newContent) {
    if (!Store.token || !navigator.onLine) return false;
    try {
      const res = await fetch(API + '/api/channels/' + channelId + '/messages/' + msgId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Store.token
        },
        body: JSON.stringify({ content: newContent, edited: true })
      });
      return res.ok;
    } catch(e) {
      return false;
    }
  },

  // Mesajları MongoDB'den yükle
  async loadMessages(channelId) {
    if (!Store.token) return [];
    try {
      const res = await fetch(API + '/api/channels/' + channelId + '/messages?limit=100', {
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch(e) {
      console.warn('Mesajlar yüklenemedi:', e.message);
    }
    return [];
  },

  // ============ KANAL İŞLEMLERİ ============

  // Kanalı MongoDB'ye kaydet
  async saveChannel(channel) {
    if (!Store.token || !navigator.onLine) return false;
    try {
      const res = await fetch(API + '/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Store.token
        },
        body: JSON.stringify({
          id: channel.id,
          name: channel.name,
          type: channel.type || 'text',
          category: channel.category || 'METİN',
          topic: channel.topic || '',
          serverId: 'gettic'
        })
      });
      return res.ok;
    } catch(e) {
      SyncEngine.addToQueue('/api/channels', 'POST', channel);
      return false;
    }
  },

  // Kanalı sil
  async deleteChannel(channelId) {
    if (!Store.token || !navigator.onLine) return false;
    try {
      const res = await fetch(API + '/api/channels/' + channelId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
      return res.ok;
    } catch(e) {
      SyncEngine.addToQueue('/api/channels/' + channelId, 'DELETE', {});
      return false;
    }
  },

  // Kanalları MongoDB'den yükle
  async loadChannels() {
    if (!Store.token) return [];
    try {
      const res = await fetch(API + '/api/channels?server=gettic', {
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch(e) {
      console.warn('Kanallar yüklenemedi:', e.message);
    }
    return [];
  },

  // ============ KULLANICI İŞLEMLERİ ============

  // Kullanıcı rollerini kaydet
  async saveUserRoles() {
    if (!Store.token || !navigator.onLine) return false;
    try {
      const res = await fetch(API + '/api/user/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Store.token
        },
        body: JSON.stringify({
          userRoles: Store.userRoles || {}
        })
      });
      return res.ok;
    } catch(e) { return false; }
  },

  // Kullanıcı rollerini yükle
  async loadUserRoles() {
    if (!Store.token) return {};
    try {
      const res = await fetch(API + '/api/user/roles', {
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
      if (res.ok) {
        const data = await res.json();
        return data || {};
      }
    } catch(e) { return {}; }
  },

  // ============ DM İŞLEMLERİ ============

  // DM mesajını kaydet
  async saveDMMessage(sender, receiver, text) {
    if (!Store.token || !navigator.onLine) return false;
    try {
      const res = await fetch(API + '/api/dm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Store.token
        },
        body: JSON.stringify({ to: receiver, text, sender })
      });
      return res.ok;
    } catch(e) { return false; }
  },

  // DM mesajlarını yükle
  async loadDMMessages(username) {
    if (!Store.token) return [];
    try {
      const res = await fetch(API + '/api/dm/' + username, {
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch(e) { return []; }
  },

  // ============ SENKRONİZASYON ============

  // Her şeyi senkronize et
  async syncAll() {
    if (this.isSyncing || !Store.token || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      console.log('🔄 MongoDB senkronizasyonu başladı...');

      // Kanalları yükle
      const channels = await this.loadChannels();
      if (channels.length > 0) {
        Store.channels = channels;
        if (typeof renderChannels === 'function') renderChannels();
      }

      // Aktif kanal mesajlarını yükle
      if (Store.activeChannel) {
        const messages = await this.loadMessages(Store.activeChannel);
        if (messages.length > 0) {
          Store.messages = messages.slice(-MAX_MSGS);
          if (typeof renderMessages === 'function') renderMessages();
        }
      }

      // Kullanıcı rollerini yükle
      const roles = await this.loadUserRoles();
      if (Object.keys(roles).length > 0) {
        Store.userRoles = { ...Store.userRoles, ...roles };
      }

      // DM mesajlarını yükle
      if (typeof dmState !== 'undefined' && dmState.activeDM) {
        const dmMessages = await this.loadDMMessages(dmState.activeDM);
        if (dmMessages.length > 0) {
          if (!dmState.messages) dmState.messages = {};
          dmState.messages[dmState.activeDM] = dmMessages;
          if (typeof renderDMChat === 'function') renderDMChat(dmState.activeDM);
        }
      }

      this.lastSync = new Date().toISOString();
      console.log('✅ MongoDB senkronizasyonu tamamlandı');
    } catch(e) {
      console.warn('❌ Senkronizasyon hatası:', e.message);
    }

    this.isSyncing = false;
  },

  // Sadece aktif kanal mesajlarını yükle (hafif)
  async syncCurrentChannel() {
    if (!Store.token || !Store.activeChannel || !navigator.onLine) return;
    try {
      const messages = await this.loadMessages(Store.activeChannel);
      if (messages.length > 0) {
        Store.messages = messages.slice(-MAX_MSGS);
        if (typeof renderMessages === 'function') renderMessages();
      }
    } catch(e) {}
  },

  // ============ OTOMATİK SENKRONİZASYON ============

  startAutoSync(interval = 30000) {
    this.stopAutoSync();
    this.syncInterval = setInterval(() => this.syncAll(), interval);
  },

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
};

// ============ BAŞLAT ============
document.addEventListener('DOMContentLoaded', () => {
  // İlk yüklemede senkronize et
  if (Store.token) {
    setTimeout(() => MongoSync.syncAll(), 2000);
  }

  // Otomatik senkronizasyon (30 saniyede bir)
  MongoSync.startAutoSync(30000);

  // Online olunca senkronize et
  window.addEventListener('online', () => {
    setTimeout(() => MongoSync.syncAll(), 1000);
  });

  // Sayfadan ayrılırken son verileri kaydet
  window.addEventListener('beforeunload', () => {
    if (Store.messages?.length > 0) {
      const lastMsgs = Store.messages.slice(-5);
      lastMsgs.forEach(msg => MongoSync.saveMessage(msg));
    }
    MongoSync.saveUserRoles();
  });

  console.log('✅ MongoDB Sync hazır');
});
