/**
 * @gettic/rest - Gettic REST API İstemcisi
 * Kullanım: const { RESTClient } = require('@gettic/rest');
 */

const axios = require('axios');

class RESTClient {
    constructor(options = {}) {
        this.baseURL = options.url || 'https://gettic.onrender.com';
        this.token = options.token || '';
        this.headers = {
            'Authorization': 'Bearer ' + this.token,
            'Content-Type': 'application/json'
        };
    }

    async request(method, path, data) {
        try {
            const res = await axios({
                method,
                url: `${this.baseURL}${path}`,
                data,
                headers: this.headers
            });
            return res.data;
        } catch (e) {
            throw new Error(`REST hatası: ${e.response?.data?.error || e.message}`);
        }
    }

    // Kullanıcı
    getProfile() { return this.request('GET', '/api/auth/me'); }
    updateProfile(data) { return this.request('PUT', '/api/auth/me', data); }

    // Odalar
    getRooms() { return this.request('GET', '/api/rooms'); }
    createRoom(name, description, category) {
        return this.request('POST', '/api/rooms', { name, description, category });
    }
    getMessages(roomId) { return this.request('GET', `/api/rooms/${roomId}/messages`); }

    // Webhook
    createWebhook(name, room) { return this.request('POST', '/api/webhooks', { name, room }); }
    getWebhooks() { return this.request('GET', '/api/webhooks'); }
    deleteWebhook(id) { return this.request('DELETE', `/api/webhooks/${id}`); }

    // Bot
    createBot(name) { return this.request('POST', '/api/bots', { name }); }
}

module.exports = { RESTClient };
