// ============ GETTIC MONGOSYNC.JS - FULL GÜNCEL ============
const MongoSync = {
  isSyncing: false,

  // Mesaj kaydet
  async saveMessage(msg) {
    if (!Store.token || !navigator.onLine) return;
    try {
      await fetch(API + '/api/channels/' + msg.channelId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token },
        body: JSON.stringify(msg)
      });
    } catch(e) {}
  },

  // Mesajları yükle
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
    } catch(e) {}
    return [];
  },

  // Mesaj düzenle
  async editMessage(msgId, channelId, newContent) {
    if (!Store.token || !navigator.onLine) return;
    try {
      await fetch(API + '/api/channels/' + channelId + '/messages/' + msgId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token },
        body: JSON.stringify({ content: newContent })
      });
    } catch(e) {}
  },

  // Mesaj sil
  async deleteMessage(msgId, channelId) {
    if (!Store.token || !navigator.onLine) return;
    try {
      await fetch(API + '/api/channels/' + channelId + '/messages/' + msgId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
    } catch(e) {}
  },

  // Kanalları yükle
  async loadChannels() {
    if (!Store.token) return [];
    try {
      const res = await fetch(API + '/api/channels?server=gettic', {
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
      if (res.ok) return await res.json();
    } catch(e) {}
    return [];
  },

  // Kanal kaydet
  async saveChannel(channel) {
    if (!Store.token || !navigator.onLine) return;
    try {
      await fetch(API + '/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token },
        body: JSON.stringify(channel)
      });
    } catch(e) {}
  },

  // Kanal sil
  async deleteChannel(channelId) {
    if (!Store.token || !navigator.onLine) return;
    try {
      await fetch(API + '/api/channels/' + channelId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
    } catch(e) {}
  },

  // DM mesajı kaydet
  async saveDMMessage(fromUser, toUser, text) {
    if (!Store.token || !navigator.onLine) return;
    try {
      await fetch(API + '/api/dm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token },
        body: JSON.stringify({ to: toUser, text })
      });
    } catch(e) {}
  },

  // DM mesajlarını yükle
  async loadDMMessages(username) {
    if (!Store.token) return [];
    try {
      const res = await fetch(API + '/api/dm/' + username, {
        headers: { 'Authorization': 'Bearer ' + Store.token }
      });
      if (res.ok) return await res.json();
    } catch(e) {}
    return [];
  },

  // Tümünü senkronize et
  async syncAll() {
    if (this.isSyncing || !Store.token || !navigator.onLine) return;
    this.isSyncing = true;
    try {
      const channels = await this.loadChannels();
      if (channels.length > 0) {
        Store.channels = channels;
        if (typeof renderChannels === 'function') renderChannels();
      }
      if (Store.activeChannel) {
        const messages = await this.loadMessages(Store.activeChannel);
        if (messages.length > 0) {
          Store.messages = messages.slice(-100);
          if (typeof renderMessages === 'function') renderMessages();
        }
      }
    } catch(e) {}
    this.isSyncing = false;
  },

  // Aktif kanalı senkronize et
  async syncCurrentChannel() {
    if (!Store.token || !Store.activeChannel || !navigator.onLine) return;
    try {
      const messages = await this.loadMessages(Store.activeChannel);
      if (messages.length > 0) {
        Store.messages = messages.slice(-100);
        if (typeof renderMessages === 'function') renderMessages();
      }
    } catch(e) {}
  }
};

console.log('✅ MongoSync.js yüklendi');
