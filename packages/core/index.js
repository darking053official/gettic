/**
 * @gettic/core - Gettic Ana İstemci
 * Kullanım: const { Client } = require('@gettic/core');
 */

const io = require('socket.io-client');
const EventEmitter = require('events');

class Client extends EventEmitter {
    constructor(options = {}) {
        super();
        this.url = options.url || 'https://gettic.onrender.com';
        this.token = options.token || '';
        this.username = options.username || 'GetticBot';
        this.socket = null;
        this.ready = false;
        this.rooms = new Map();
        this.users = new Map();
        this.commands = new Map();
        this.prefix = options.prefix || '/';
        this._heartbeat = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = io(this.url, {
                auth: { token: this.token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 3000
            });

            this.socket.on('connect', () => {
                this.socket.emit('user-online', 'bot-' + this.token);
                this.ready = true;
                this._startHeartbeat();
                this.emit('ready');
                resolve(this);
            });

            this.socket.on('receive-message', (msg) => this._handleMessage(msg));
            this.socket.on('disconnect', () => this._handleDisconnect());
            this.socket.on('connect_error', (err) => reject(err));
        });
    }

    _handleMessage(msg) {
        if (msg.isBot) return;
        this.emit('message', msg);

        // Komut işleme
        if (msg.content.startsWith(this.prefix)) {
            const withoutPrefix = msg.content.substring(this.prefix.length);
            const args = withoutPrefix.split(' ');
            const commandName = args.shift().toLowerCase();

            if (this.commands.has(commandName)) {
                const ctx = this._createContext(msg, args);
                this.commands.get(commandName)(ctx);
                this.emit('command', commandName, ctx);
            }
        }
    }

    _createContext(msg, args) {
        return {
            message: msg,
            args: args,
            room: msg.room,
            sender: msg.senderName,
            senderId: msg.sender,
            reply: (text) => this.send(msg.room, text),
            delete: () => this.deleteMessage(msg._id),
            edit: (text) => this.editMessage(msg._id, text),
            sendEmbed: (embed) => this.sendEmbed(msg.room, embed)
        };
    }

    _handleDisconnect() {
        this.ready = false;
        clearInterval(this._heartbeat);
        this.emit('disconnect');
        setTimeout(() => this.connect(), 5000);
    }

    _startHeartbeat() {
        this._heartbeat = setInterval(() => {
            if (this.socket?.connected) {
                this.socket.emit('ping');
            }
        }, 30000);
    }

    // Mesaj işlemleri
    send(room, content) {
        this.socket?.emit('send-message', {
            content: content,
            senderId: 'bot-' + this.token,
            senderName: this.username,
            roomId: room,
            type: 'text',
            isBot: true
        });
        return this;
    }

    sendEmbed(room, { title, description, color, fields, image, footer }) {
        let content = '';
        if (title) content += `**${title}**\n`;
        if (description) content += `${description}\n`;
        if (fields) {
            fields.forEach(f => { content += `\n**${f.name}**: ${f.value}`; });
        }
        if (image) content += `\n${image}`;
        if (footer) content += `\n_${footer}_`;
        return this.send(room, content);
    }

    editMessage(msgId, newContent) {
        const axios = require('axios');
        return axios.put(`${this.url}/api/messages/${msgId}`,
            { content: newContent },
            { headers: { 'Authorization': 'Bearer ' + this.token } }
        );
    }

    deleteMessage(msgId) {
        const axios = require('axios');
        return axios.delete(`${this.url}/api/messages/${msgId}`,
            { headers: { 'Authorization': 'Bearer ' + this.token } }
        );
    }

    // Oda işlemleri
    joinRoom(roomId) {
        this.socket?.emit('join-room', roomId);
        return this;
    }

    leaveRoom(roomId) {
        this.socket?.emit('leave-room', roomId);
        return this;
    }

    // Komut yönetimi
    command(name, handler) {
        this.commands.set(name.toLowerCase(), handler);
        return this;
    }

    commands(commands) {
        Object.entries(commands).forEach(([name, handler]) => {
            this.command(name, handler);
        });
        return this;
    }

    // Yardımcı
    setUsername(name) {
        this.username = name;
        return this;
    }

    setPrefix(prefix) {
        this.prefix = prefix;
        return this;
    }

    destroy() {
        clearInterval(this._heartbeat);
        this.socket?.disconnect();
        this.ready = false;
        this.emit('destroy');
    }

    get uptime() {
        return process.uptime();
    }

    get ping() {
        return this.socket?.io?.engine?.transport?.pingTimeout || 0;
    }
}

module.exports = { Client };
