// ============================================
// GETTIC - REALTIME MANAGER
// ============================================

class RealtimeManager {
    constructor() {
        this.channels = {};
        this.presenceState = {};
        this.typingUsers = {};
        this.onlineUsers = new Map();
        this.listeners = {};
    }

    // Kanal oluştur veya mevcut kanalı getir
    getChannel(channelName) {
        if (!this.channels[channelName]) {
            this.channels[channelName] = supabase.channel(channelName);
        }
        return this.channels[channelName];
    }

    // Mesaj dinle
    subscribeToMessages(conversationId, callback) {
        const channelName = `messages-${conversationId}`;
        const channel = this.getChannel(channelName);

        channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    callback('new', payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    callback('update', payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    callback('delete', payload.old);
                }
            )
            .subscribe();

        return channel;
    }

    // Sohbet listesi dinle
    subscribeToConversations(userId, callback) {
        const channelName = `conversations-${userId}`;
        const channel = this.getChannel(channelName);

        channel
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversation_members',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    callback(payload);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'conversations'
                },
                (payload) => {
                    callback(payload);
                }
            )
            .subscribe();

        return channel;
    }

    // Presence (çevrimiçi durum)
    subscribeToPresence(userId, callback) {
        const channelName = `presence`;
        const channel = this.getChannel(channelName);

        channel
            .on('presence', { event: 'sync' }, () => {
                this.presenceState = channel.presenceState();
                this.updateOnlineUsers();
                callback(this.onlineUsers);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                newPresences.forEach(presence => {
                    this.onlineUsers.set(presence.user_id, {
                        ...presence,
                        status: 'online',
                        lastSeen: new Date()
                    });
                });
                callback(this.onlineUsers);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                leftPresences.forEach(presence => {
                    this.onlineUsers.set(presence.user_id, {
                        ...presence,
                        status: 'offline',
                        lastSeen: new Date()
                    });
                });
                callback(this.onlineUsers);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date()
                    });
                }
            });

        return channel;
    }

    // Yazıyor göstergesi
    subscribeToTyping(conversationId, callback) {
        const channelName = `typing-${conversationId}`;
        const channel = this.getChannel(channelName);

        channel
            .on('broadcast', { event: 'typing' }, (payload) => {
                const { user_id, username, timestamp } = payload.payload;
                
                this.typingUsers[user_id] = {
                    username,
                    timestamp: new Date(timestamp)
                };

                callback(this.typingUsers);

                // 3 saniye sonra otomatik temizle
                setTimeout(() => {
                    delete this.typingUsers[user_id];
                    callback(this.typingUsers);
                }, 3000);
            })
            .subscribe();

        return channel;
    }

    // Yazıyor bilgisi gönder
    async sendTyping(conversationId, userId, username) {
        const channelName = `typing-${conversationId}`;
        const channel = this.getChannel(channelName);

        await channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
                user_id: userId,
                username: username,
                timestamp: new Date()
            }
        });
    }

    // Okundu bilgisi dinle
    subscribeToReadReceipts(conversationId, callback) {
        const channelName = `reads-${conversationId}`;
        const channel = this.getChannel(channelName);

        channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'message_reads',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();

        return channel;
    }

    // Kullanıcı durumu dinle
    subscribeToUserStatus(userId, callback) {
        const channelName = `user-status-${userId}`;
        const channel = this.getChannel(channelName);

        channel
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();

        return channel;
    }

    // Online kullanıcıları güncelle
    updateOnlineUsers() {
        Object.values(this.presenceState).forEach(presences => {
            presences.forEach(presence => {
                if (presence.user_id) {
                    this.onlineUsers.set(presence.user_id, {
                        ...presence,
                        status: 'online',
                        lastSeen: new Date()
                    });
                }
            });
        });
    }

    // Kullanıcı çevrimiçi mi kontrol
    isUserOnline(userId) {
        const user = this.onlineUsers.get(userId);
        return user && user.status === 'online';
    }

    // Çevrimiçi kullanıcı sayısı
    getOnlineCount() {
        return Array.from(this.onlineUsers.values())
            .filter(user => user.status === 'online')
            .length;
    }

    // Bildirim dinle
    subscribeToNotifications(userId, callback) {
        const channelName = `notifications-${userId}`;
        const channel = this.getChannel(channelName);

        channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();

        return channel;
    }

    // Tüm kanalları temizle
    cleanup() {
        Object.values(this.channels).forEach(channel => {
            channel.unsubscribe();
        });
        this.channels = {};
        this.presenceState = {};
        this.typingUsers = {};
        this.onlineUsers.clear();
    }

    // Belirli bir kanalı temizle
    cleanupChannel(channelName) {
        if (this.channels[channelName]) {
            this.channels[channelName].unsubscribe();
            delete this.channels[channelName];
        }
    }

    // Event listener ekle
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    // Event listener kaldır
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    // Event tetikle
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}

// Global realtime manager
const realtimeManager = new RealtimeManager();

// Export et (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealtimeManager;
}
