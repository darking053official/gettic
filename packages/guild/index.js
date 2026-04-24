/**
 * @gettic/guild - Gettic Sunucu Yönetimi
 * Kullanım: const { GuildManager } = require('@gettic/guild');
 */

const EventEmitter = require('events');

class GuildManager extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.rooms = new Map();
        this.roles = [];
    }

    async createRoom(name, options = {}) {
        const axios = require('axios');
        const res = await axios.post(`${this.client.url}/api/rooms`, {
            name,
            description: options.description || '',
            category: options.category || 'Genel',
            isPrivate: options.isPrivate || false,
            password: options.password || ''
        }, { headers: { 'Authorization': 'Bearer ' + this.client.token } });
        this.emit('roomCreate', res.data);
        return res.data;
    }

    async deleteRoom(roomId) {
        const axios = require('axios');
        await axios.delete(`${this.client.url}/api/rooms/${roomId}`, {
            headers: { 'Authorization': 'Bearer ' + this.client.token }
        });
        this.emit('roomDelete', roomId);
    }

    async getRooms() {
        const axios = require('axios');
        const res = await axios.get(`${this.client.url}/api/rooms`);
        return res.data;
    }

    createRole(name, color, permissions) {
        const role = { name, color, permissions: permissions || [] };
        this.roles.push(role);
        this.emit('roleCreate', role);
        return role;
    }

    deleteRole(name) {
        this.roles = this.roles.filter(r => r.name !== name);
        this.emit('roleDelete', name);
    }
}

module.exports = { GuildManager };
