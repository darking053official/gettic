/**
 * @gettic/voice - Gettic Sesli Kanal İstemcisi
 * Kullanım: const { VoiceClient } = require('@gettic/voice');
 */

const EventEmitter = require('events');
const { RTCPeerConnection, MediaStream } = require('wrtc');

class VoiceClient extends EventEmitter {
    constructor(client, options = {}) {
        super();
        this.client = client;
        this.roomId = null;
        this.connected = false;
        this.muted = false;
        this.deafened = false;
        this.stream = null;
        this.peers = new Map();
        this.bitrate = options.bitrate || 64000;
        this.codec = options.codec || 'opus';
    }

    async join(roomId) {
        if (this.connected) await this.leave();
        this.roomId = roomId;

        try {
            this.stream = new MediaStream();
            this.client.socket.emit('voice-join', {
                roomId: roomId,
                user: { id: this.client.token, name: this.client.username }
            });
            this.connected = true;
            this.emit('join', roomId);
        } catch (e) {
            this.emit('error', e);
        }
    }

    async leave() {
        if (!this.connected) return;
        this.client.socket.emit('voice-leave', {
            roomId: this.roomId,
            userId: this.client.token
        });
        this.peers.forEach(pc => pc.close());
        this.peers.clear();
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
        }
        this.connected = false;
        this.emit('leave', this.roomId);
    }

    mute() {
        this.muted = true;
        if (this.stream) {
            this.stream.getAudioTracks().forEach(t => t.enabled = false);
        }
        this.emit('mute');
    }

    unmute() {
        this.muted = false;
        if (this.stream) {
            this.stream.getAudioTracks().forEach(t => t.enabled = true);
        }
        this.emit('unmute');
    }

    toggleMute() {
        this.muted ? this.unmute() : this.mute();
    }

    deafen() {
        this.deafened = true;
        this.emit('deafen');
    }

    undeafen() {
        this.deafened = false;
        this.emit('undeafen');
    }

    get isSpeaking() {
        if (!this.stream) return false;
        const audioTrack = this.stream.getAudioTracks()[0];
        return audioTrack && audioTrack.enabled && audioTrack.readyState === 'live';
    }
}

module.exports = { VoiceClient };
