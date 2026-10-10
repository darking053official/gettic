// ============================================
// GETTIC - REALTIME MANAGER (Premium)
// ============================================

class RealtimeManager {
    constructor() {
        this.channels = new Map();       // channelName → channel
        this.channelCallbacks = new Map(); // channelName → [callbacks]
        this.presenceState = {};
        this.typingUsers = new Map();
        this.onlineUsers = new Map();
        this.typingTimers = new Map();
        this._cleanupBound = false;
        this._userId = null;
        this._setupCleanup();
    }

    // ============ TEMİZLİK ============
    _setupCleanup() {
        if (this._cleanupBound) return;
        this._cleanupBound = true;

        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    setUser(userId) {
        this._userId = userId;
    }

    // ============ KANAL YÖNETİMİ ============
    _getSupabase() {
        return (window.CONFIG && window.CONFIG.supabase) || window.supabaseClient;
    }

    _getOrCreateChannel(name) {
        const supabase = this._getSupabase();
        if (!supabase) {
            console.error('Supabase yok');
            return null;
        }

        if (!this.channels.has(name)) {
            const channel = supabase.channel(name, {
                config: {
                    broadcast: { self: false },
                    presence: { key: this._userId || 'anon' }
                }
            });
            this.channels.set(name, channel);
            this.channelCallbacks.set(name, []);
        }

        return this.channels.get(name);
    }

    // Kanalı güvenli şekilde temizle
    cleanupChannel(name) {
        const channel = this.channels.get(name);
        if (channel) {
            try {
                channel.unsubscribe();
            } catch (e) {
                console.warn('Kanal kapatma hatası:', e);
            }
            this.channels.delete(name);
            this.channelCallbacks.delete(name);
        }
    }

    // ============ MESAJLAR ============
    subscribeToMessages(conversationId, callback) {
        const channelName = `messages-${conversationId}`;
        const channel = this._getOrCreateChannel(channelName);
        if (!channel) return null;

        // Duplicate kontrolü
        const callbacks = this.channelCallbacks.get(channelName);
        if (callbacks.includes(callback)) return channel;
        callbacks.push(callback);

        channel
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    callbacks.forEach(cb => cb('new', payload.new));
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    callbacks.forEach(cb => cb('update', payload.new));
                }
            )
            .on('postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    callbacks.forEach(cb => cb('delete', payload.old));
                }
            )
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error(`Kanal hatası [${channelName}]:`, err);
                }
            });

        return channel;
    }

    unsubscribeFromMessages(conversationId, callback) {
        const channelName = `messages-${conversationId}`;
        if (callback) {
            const callbacks = this.channelCallbacks.get(channelName) || [];
            this.channelCallbacks.set(channelName, callbacks.filter(cb => cb !== callback));
        } else {
            this.cleanupChannel(channelName);
        }
    }

    // ============ SOHBET LİSTESİ ============
    subscribeToConversations(userId, callback) {
        const channelName = `conversations-${userId}`;
        const channel = this._getOrCreateChannel(channelName);
        if (!channel) return null;

        channel
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${userId}` },
                (payload) => callback(payload)
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'conversations' },
                (payload) => callback(payload)
            )
            .subscribe();

        return channel;
    }

    // ============ PRESENCE (ÇEVRİMİÇİ) ============
    subscribeToPresence(userId, callback) {
        if (!userId) {
            console.warn('Presence için userId gerekli');
            return null;
        }

        const channelName = `presence-global`;
        const channel = this._getOrCreateChannel(channelName);
        if (!channel) return null;

        const handleUpdate = () => {
            const state = channel.presenceState();
            this.presenceState = state;
            this._rebuildOnlineUsers(state);
            callback(this.onlineUsers);
        };

        channel
            .on('presence', { event: 'sync' }, handleUpdate)
            .on('presence', { event: 'join' }, handleUpdate)
            .on('presence', { event: 'leave' }, handleUpdate)
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    try {
                        await channel.track({
                            user_id: userId,
                            online_at: new Date().toISOString()
                        });
                    } catch (e) {
                        console.warn('Presence track hatası:', e);
                    }
                }
            });

        return channel;
    }

    _rebuildOnlineUsers(state) {
        this.onlineUsers.clear();
        Object.values(state).forEach(presences => {
            presences.forEach(p => {
                if (p.user_id) {
                    this.onlineUsers.set(p.user_id, {
                        user_id: p.user_id,
                        online_at: p.online_at,
                        status: 'online',
                        lastSeen: new Date()
                    });
                }
            });
        });
    }

    // ============ TYPING ============
    subscribeToTyping(conversationId, callback) {
        const channelName = `typing-${conversationId}`;
        const channel = this._getOrCreateChannel(channelName);
        if (!channel) return null;

        channel
            .on('broadcast', { event: 'typing' }, (payload) => {
                const { user_id, username } = payload.payload;

                // Kendini gösterme
                if (user_id === this._userId) return;

                this.typingUsers.set(user_id, { username, timestamp: Date.now() });
                callback(this.typingUsers);

                // Önceki timer'ı temizle
                if (this.typingTimers.has(user_id)) {
                    clearTimeout(this.typingTimers.get(user_id));
                }

                // Yeni timer
                const timer = setTimeout(() => {
                    this.typingUsers.delete(user_id);
                    this.typingTimers.delete(user_id);
                    callback(this.typingUsers);
                }, 3000);

                this.typingTimers.set(user_id, timer);
            })
            .subscribe();

        return channel;
    }

    // Yazıyor bilgisi gönder (throttled)
    async sendTyping(conversationId) {
        if (!this._userId || !conversationId) return;

        const channelName = `typing-${conversationId}`;
        const channel = this.channels.get(channelName);
        if (!channel) return;

        try {
            await channel.send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                    user_id: this._userId,
                    timestamp: Date.now()
                }
            });
        } catch (e) {
            // Sessizce geç
        }
    }

    // ============ OKUNDU ============
    subscribeToReadReceipts(conversationId, callback) {
        const channelName = `reads-${conversationId}`;
        const channel = this._getOrCreateChannel(channelName);
        if (!channel) return null;

        channel
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'message_reads', filter: `conversation_id=eq.${conversationId}` },
                (payload) => callback(payload.new)
            )
            .subscribe();

        return channel;
    }

    // ============ KULLANICI DURUMU ============
    subscribeToUserStatus(userId, callback) {
        const channelName = `user-status-${userId}`;
        const channel = this._getOrCreateChannel(channelName);
        if (!channel) return null;

        channel
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                (payload) => callback(payload.new)
            )
            .subscribe();

        return channel;
    }

    // ============ YARDIMCI ============
    isUserOnline(userId) {
        const user = this.onlineUsers.get(userId);
        return user?.status === 'online';
    }

    getOnlineCount() {
        return Array.from(this.onlineUsers.values())
            .filter(u => u.status === 'online').length;
    }

    // ============ NOTIFICATIONS ============
    subscribeToNotifications(userId, callback) {
        const channelName = `notifications-${userId}`;
        const channel = this._getOrCreateChannel(channelName);
        if (!channel) return null;

        channel
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => callback(payload.new)
            )
            .subscribe();

        return channel;
    }

    // ============ TEMİZLİK ============
    cleanup() {
        // Tüm timer'ları temizle
        this.typingTimers.forEach(timer => clearTimeout(timer));
        this.typingTimers.clear();

        // Tüm kanalları kapat
        this.channels.forEach((channel, name) => {
            try {
                channel.unsubscribe();
            } catch (e) {}
        });

        this.channels.clear();
        this.channelCallbacks.clear();
        this.presenceState = {};
        this.typingUsers.clear();
        this.onlineUsers.clear();
    }

    reset() {
        this.cleanup();
        this._userId = null;
    }
}

// Global
const realtimeManager = new RealtimeManager();
