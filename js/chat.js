// ============================================
// GETTIC - CHAT MANAGER (Premium)
// ============================================

// Sabitler (constants.js'ten gelir)
const MAX_MESSAGE_LENGTH = 2000;
const MAX_FILE_SIZE_MB = 8;
const MESSAGES_PER_PAGE = 50;

class ChatManager {
    constructor() {
        this.currentConversation = null;
        this.currentConversationData = null;
        this.conversations = [];
        this.messages = [];
        this.messageSubscription = null;
        this.typingChannel = null;
        this.presenceChannel = null;
        this.currentProfile = null;
        this.realtimeChannelName = null;
        this._typingTimeout = null;
    }

    // ============ YARDIMCI ============
    _getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    _isImageFile(filename) {
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(this._getFileExtension(filename));
    }

    _isVideoFile(filename) {
        return ['mp4', 'webm', 'ogg', 'mov'].includes(this._getFileExtension(filename));
    }

    _isAudioFile(filename) {
        return ['mp3', 'wav', 'ogg', 'm4a'].includes(this._getFileExtension(filename));
    }

    // ============ SOHBETLERİ YÜKLE ============
    async loadConversations(userId) {
        try {
            if (!userId) return [];

            const { data, error } = await supabase
                .from('conversation_members')
                .select(`
                    conversation_id,
                    conversations (
                        id,
                        type,
                        name,
                        updated_at,
                        created_at,
                        conversation_members (
                            user_id,
                            role,
                            profiles (
                                id,
                                username,
                                full_name,
                                avatar_url,
                                status,
                                last_seen
                            )
                        )
                    )
                `)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            this.conversations = (data || []).filter(c => c.conversations);
            return this.conversations;
        } catch (error) {
            console.error('Sohbetler yüklenemedi:', error);
            return [];
        }
    }

    // ============ SOHBET AÇ ============
    async openConversation(conversationId, conversationData = null) {
        try {
            this.cleanupSubscriptions();
            this.currentConversation = conversationId;

            const convData = conversationData || 
                this.conversations.find(c => c.conversations?.id === conversationId)?.conversations;

            if (convData) {
                this.currentConversationData = convData;
            }

            await this.loadMessages(conversationId);
            
            // Realtime kanallarını kur
            this.subscribeToMessages(conversationId);
            this.subscribeToTyping(conversationId);
            this.subscribeToPresence(conversationId);

            return true;
        } catch (error) {
            console.error('Sohbet açılamadı:', error);
            return false;
        }
    }

    // ============ MESAJLARI YÜKLE ============
    async loadMessages(conversationId, limit = MESSAGES_PER_PAGE) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id,
                    conversation_id,
                    sender_id,
                    content,
                    type,
                    media_url,
                    is_edited,
                    is_deleted,
                    created_at,
                    edited_at,
                    sender:profiles (
                        id,
                        username,
                        avatar_url
                    )
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            this.messages = (data || []).reverse();
            return this.messages;
        } catch (error) {
            console.error('Mesajlar yüklenemedi:', error);
            return [];
        }
    }

    // ============ ESKİ MESAJLARI YÜKLE ============
    async loadOlderMessages(conversationId, beforeDate, limit = MESSAGES_PER_PAGE) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id,
                    conversation_id,
                    sender_id,
                    content,
                    type,
                    media_url,
                    is_edited,
                    is_deleted,
                    created_at,
                    sender:profiles (id, username, avatar_url)
                `)
                .eq('conversation_id', conversationId)
                .lt('created_at', beforeDate)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            const older = (data || []).reverse();
            this.messages = [...older, ...this.messages];
            return older;
        } catch (error) {
            console.error('Eski mesajlar yüklenemedi:', error);
            return [];
        }
    }

    // ============ MESAJ GÖNDER ============
    async sendMessage(userId, content, type = 'text', mediaUrl = null) {
        try {
            if (!this.currentConversation) throw new Error('Sohbet seçilmedi');
            if (!content && !mediaUrl) throw new Error('Mesaj içeriği boş');
            if (content && content.length > MAX_MESSAGE_LENGTH) {
                throw new Error(`Mesaj ${MAX_MESSAGE_LENGTH} karakterden uzun olamaz`);
            }
            if (!userId) throw new Error('Oturum yok');

            const messageData = {
                conversation_id: this.currentConversation,
                sender_id: userId,
                content: content?.trim() || null,
                type: type,
                media_url: mediaUrl
            };

            const { data, error } = await supabase
                .from('messages')
                .insert([messageData])
                .select(`
                    id, conversation_id, sender_id, content, type, media_url, 
                    is_edited, is_deleted, created_at,
                    sender:profiles (id, username, avatar_url)
                `)
                .single();

            if (error) throw error;

            // Sohbet timestamp güncelle
            supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', this.currentConversation)
                .then(() => {})
                .catch(() => {});

            return { success: true, message: data };
        } catch (error) {
            console.error('Mesaj gönderilemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ MESAJ DÜZENLE ============
    async editMessage(userId, messageId, newContent) {
        try {
            if (!newContent?.trim()) throw new Error('Mesaj içeriği boş');
            if (newContent.length > MAX_MESSAGE_LENGTH) {
                throw new Error(`Mesaj çok uzun`);
            }

            const { data, error } = await supabase
                .from('messages')
                .update({
                    content: newContent.trim(),
                    is_edited: true,
                    edited_at: new Date().toISOString()
                })
                .eq('id', messageId)
                .eq('sender_id', userId)
                .select()
                .single();

            if (error) throw error;

            return { success: true, message: data };
        } catch (error) {
            console.error('Mesaj düzenlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ MESAJ SİL (SOFT) ============
    async deleteMessage(userId, messageId) {
        try {
            const { error } = await supabase
                .from('messages')
                .update({
                    is_deleted: true,
                    content: null,
                    media_url: null
                })
                .eq('id', messageId)
                .eq('sender_id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Mesaj silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ OKUNDU İŞARETLE ============
    async markAsRead(userId, conversationId, messageIds = null) {
        try {
            if (!userId) return;

            let query = supabase
                .from('message_reads')
                .select('message_id')
                .eq('user_id', userId)
                .eq('conversation_id', conversationId);

            if (messageIds) {
                query = query.in('message_id', messageIds);
            }

            const { data: existing } = await query;
            const existingIds = (existing || []).map(r => r.message_id);

            const records = (messageIds || []).filter(id => !existingIds.includes(id))
                .map(messageId => ({
                    message_id: messageId,
                    conversation_id: conversationId,
                    user_id: userId,
                    read_at: new Date().toISOString()
                }));

            if (records.length === 0) return { success: true };

            const { error } = await supabase
                .from('message_reads')
                .insert(records);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Okundu işaretlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ OKUNMAMIŞ SAYI ============
    async getUnreadCount(userId, conversationId) {
        try {
            if (!userId) return 0;

            // Okunmuş mesaj ID'lerini al
            const { data: reads } = await supabase
                .from('message_reads')
                .select('message_id')
                .eq('user_id', userId)
                .eq('conversation_id', conversationId);

            const readIds = (reads || []).map(r => r.message_id);

            // Bu sohbetteki, kendi mesajların olmayan mesajları say
            let query = supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', userId);

            if (readIds.length > 0) {
                query = query.not('id', 'in', `(${readIds.join(',')})`);
            }

            const { count, error } = await query;
            if (error) throw error;

            return count || 0;
        } catch (error) {
            console.error('Okunmamış sayısı alınamadı:', error);
            return 0;
        }
    }

    // ============ DİREKT SOHBET OLUŞTUR ============
    async createDirectConversation(userId, otherUserId) {
        try {
            if (!userId) throw new Error('Oturum yok');
            if (userId === otherUserId) throw new Error('Kendinizle sohbet oluşturamazsınız');

            // Mevcut sohbet kontrolü - daha basit yöntem
            const { data: userConvs } = await supabase
                .from('conversation_members')
                .select(`
                    conversation_id,
                    conversations!inner (id, type)
                `)
                .eq('user_id', userId);

            const directConvIds = (userConvs || [])
                .filter(c => c.conversations?.type === 'direct')
                .map(c => c.conversation_id);

            if (directConvIds.length > 0) {
                const { data: commonConvs } = await supabase
                    .from('conversation_members')
                    .select('conversation_id')
                    .in('conversation_id', directConvIds)
                    .eq('user_id', otherUserId);

                if (commonConvs && commonConvs.length > 0) {
                    return { success: true, conversationId: commonConvs[0].conversation_id, isNew: false };
                }
            }

            // Yeni sohbet oluştur
            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert([{ type: 'direct', created_by: userId }])
                .select()
                .single();

            if (convError) throw convError;

            const { error: memberError } = await supabase
                .from('conversation_members')
                .insert([
                    { conversation_id: newConv.id, user_id: userId, role: 'member' },
                    { conversation_id: newConv.id, user_id: otherUserId, role: 'member' }
                ]);

            if (memberError) throw memberError;

            return { success: true, conversationId: newConv.id, isNew: true };
        } catch (error) {
            console.error('Sohbet oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ GRUP SOHBETİ OLUŞTUR ============
    async createGroupConversation(userId, name, memberIds) {
        try {
            if (!userId) throw new Error('Oturum yok');
            if (!name || name.trim().length < 3) throw new Error('Grup adı en az 3 karakter');
            if (!memberIds || memberIds.length < 1) throw new Error('En az 1 üye seçin');

            const allMembers = [...new Set([userId, ...memberIds])];

            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert([{ type: 'group', name: name.trim(), created_by: userId }])
                .select()
                .single();

            if (convError) throw convError;

            const members = allMembers.map(id => ({
                conversation_id: newConv.id,
                user_id: id,
                role: id === userId ? 'admin' : 'member'
            }));

            const { error: memberError } = await supabase
                .from('conversation_members')
                .insert(members);

            if (memberError) throw memberError;

            return { success: true, conversationId: newConv.id };
        } catch (error) {
            console.error('Grup oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ KULLANICI ARA ============
    async searchUsers(searchTerm, currentUserId, limit = 10) {
        try {
            if (!searchTerm || searchTerm.length < 2) return [];

            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url, status, last_seen')
                .ilike('username', `%${searchTerm}%`)
                .neq('id', currentUserId)
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Kullanıcı arama hatası:', error);
            return [];
        }
    }

    // ============ REALTIME: MESAJLAR ============
    subscribeToMessages(conversationId, onNewMessage, onMessageUpdate) {
        this.realtimeChannelName = `chat-${conversationId}-${Date.now()}`;

        this.messageSubscription = supabase
            .channel(this.realtimeChannelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                async (payload) => {
                    // Gönderen bilgisini çek
                    if (payload.new.sender_id) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('id, username, avatar_url')
                            .eq('id', payload.new.sender_id)
                            .single();
                        
                        if (profile) payload.new.sender = profile;
                    }
                    
                    this.messages.push(payload.new);
                    if (onNewMessage) onNewMessage(payload.new);
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
                    const index = this.messages.findIndex(m => m.id === payload.new.id);
                    if (index !== -1) {
                        this.messages[index] = { ...this.messages[index], ...payload.new };
                        if (onMessageUpdate) onMessageUpdate(payload.new);
                    }
                }
            )
            .subscribe();
    }

    // ============ REALTIME: TYPING ============
    subscribeToTyping(conversationId, onTyping) {
        this.typingChannel = supabase
            .channel(`typing-${conversationId}`)
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (onTyping) onTyping(payload.payload);
            })
            .subscribe();
    }

    async sendTypingIndicator(userId, username) {
        if (!this.currentConversation || !userId) return;

        // Throttle - son 2 saniyede gönderildiyse atla
        if (this._typingTimeout) return;
        
        this._typingTimeout = setTimeout(() => {
            this._typingTimeout = null;
        }, 2000);

        if (this.typingChannel) {
            try {
                await this.typingChannel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: {
                        user_id: userId,
                        username: username || 'Kullanıcı',
                        timestamp: Date.now()
                    }
                });
            } catch (e) {
                // Sessizce geç
            }
        }
    }

    // ============ REALTIME: PRESENCE ============
    subscribeToPresence(conversationId, userId, onPresence) {
        this.presenceChannel = supabase
            .channel(`presence-${conversationId}`)
            .on('presence', { event: 'sync' }, () => {
                const state = this.presenceChannel.presenceState();
                if (onPresence) onPresence(state);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && userId) {
                    await this.presenceChannel.track({
                        user_id: userId,
                        online_at: new Date().toISOString()
                    });
                }
            });
    }

    // ============ DOSYA YÜKLE ============
    async uploadFile(userId, file) {
        try {
            if (!this.currentConversation) throw new Error('Sohbet seçilmedi');
            if (!userId) throw new Error('Oturum yok');
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                throw new Error(`Dosya ${MAX_FILE_SIZE_MB}MB'dan büyük olamaz`);
            }

            const ext = this._getFileExtension(file.name);
            const fileName = `${this.currentConversation}/${Date.now()}-${this._generateId()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-media')
                .getPublicUrl(fileName);

            let messageType = 'file';
            if (this._isImageFile(file.name)) messageType = 'image';
            else if (this._isVideoFile(file.name)) messageType = 'video';
            else if (this._isAudioFile(file.name)) messageType = 'voice';

            return await this.sendMessage(userId, file.name, messageType, publicUrl);
        } catch (error) {
            console.error('Dosya yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ TEMİZLİK ============
    cleanupSubscriptions() {
        if (this.messageSubscription) {
            this.messageSubscription.unsubscribe();
            this.messageSubscription = null;
        }
        if (this.typingChannel) {
            this.typingChannel.unsubscribe();
            this.typingChannel = null;
        }
        if (this.presenceChannel) {
            this.presenceChannel.unsubscribe();
            this.presenceChannel = null;
        }
        this.realtimeChannelName = null;
    }

    reset() {
        this.cleanupSubscriptions();
        this.currentConversation = null;
        this.currentConversationData = null;
        this.messages = [];
        this.conversations = [];
    }
}

// Global
const chatManager = new ChatManager();
