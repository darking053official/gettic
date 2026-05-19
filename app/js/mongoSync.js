// ============ GETTIC MONGOSYNC.JS ============
const MongoSync = {
  isSyncing: false,

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

  async syncAll() {
    if (this.isSyncing || !Store.token || !navigator.onLine) return;
    this.isSyncing = true;
    try {
      const channels = await this.loadChannels();
      if (channels.length > 0) { Store.channels = channels; if (typeof renderChannels === 'function') renderChannels(); }
      if (Store.activeChannel) {
        const messages = await this.loadMessages(Store.activeChannel);
        if (messages.length > 0) { Store.messages = messages.slice(-100); if (typeof renderMessages === 'function') renderMessages(); }
      }
    } catch(e) {}
    this.isSyncing = false;
  },

  async loadChannels() {
    if (!Store.token) return [];
    try {
      const res = await fetch(API + '/api/channels?server=gettic', { headers: { 'Authorization': 'Bearer ' + Store.token } });
      if (res.ok) return await res.json();
    } catch(e) {}
    return [];
  }
};
