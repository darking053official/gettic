// ============================================
// GETTIC - CHAT MANAGER
// ============================================

class ChatManager {
    constructor() {
        this.currentConversation = null;
        this.conversations = [];
        this.messages = [];
        this.messageSubscription = null;
        this.typingSubscription = null;
        this.presenceSubscription = null;
    }

    // Sohbetleri yükle
    async loadConversations() {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return [];

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
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            this.conversations = data || [];
            return this.conversations;
        } catch (error) {
            console.error('Sohbetler yüklenemedi:', error);
            return [];
        }
    }

    // Sohbet aç
    async openConversation(conversationId) {
        try {
            // Önceki subscription'ları temizle
            this.cleanupSubscriptions();

            this.currentConversation = conversationId;

            // Sohbet bilgilerini bul
            const conversationData = this.conversations.find(
                c => c.conversations.id === conversationId
            );

            if (conversationData) {
                this.currentConversationData = conversationData.conversations;
            }

            // Mesajları yükle
            await this.loadMessages(conversationId);

            // Realtime subscription'ları kur
            this.subscribeToMessages(conversationId);
            this.subscribeToTyping(conversationId);
            this.subscribeToPresence(conversationId);

            return true;
        } catch (error) {
            console.error('Sohbet açılamadı:', error);
            return false;
        }
    }

    // Mesajları yükle
    async loadMessages(conversationId) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:profiles (
                        id,
                        username,
                        avatar_url
                    )
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            this.messages = data || [];
            return this.messages;
        } catch (error) {
            console.error('Mesajlar yüklenemedi:', error);
            return [];
        }
    }

    // Mesaj gönder
    async sendMessage(content, type = 'text', mediaUrl = null) {
        try {
            if (!this.currentConversation) {
                throw new Error('Sohbet seçilmedi');
            }

            if (!content && !mediaUrl) {
                throw new Error('Mesaj içeriği boş');
            }

            if (content.length > MAX_MESSAGE_LENGTH) {
                throw new Error(`Mesaj ${MAX_MESSAGE_LENGTH} karakterden uzun olamaz`);
            }

            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            const messageData = {
                conversation_id: this.currentConversation,
                sender_id: user.id,
                content: content,
                type: type,
                media_url: mediaUrl,
                created_at: new Date()
            };

            const { data, error } = await supabase
                .from('messages')
                .insert([messageData])
                .select()
                .single();

            if (error) throw error;

            // Sohbet updated_at güncelle
            await supabase
                .from('conversations')
                .update({ updated_at: new Date() })
                .eq('id', this.currentConversation);

            return { success: true, message: data };
        } catch (error) {
            console.error('Mesaj gönderilemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesaj düzenle
    async editMessage(messageId, newContent) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .update({
                    content: newContent,
                    is_edited: true
                })
                .eq('id', messageId)
                .select()
                .single();

            if (error) throw error;

            return { success: true, message: data };
        } catch (error) {
            console.error('Mesaj düzenlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesaj sil (soft delete)
    async deleteMessage(messageId) {
        try {
            const { error } = await supabase
                .from('messages')
                .update({
                    is_deleted: true,
                    content: 'Bu mesaj silindi'
                })
                .eq('id', messageId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Mesaj silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesaj okundu işaretle
    async markAsRead(messageId) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return;

            const { error } = await supabase
                .from('message_reads')
                .upsert({
                    message_id: messageId,
                    user_id: user.id,
                    read_at: new Date()
                });

            if (error) throw error;
        } catch (error) {
            console.error('Okundu işaretlenemedi:', error);
        }
    }

    // Okunmamış mesaj sayısı
    async getUnreadCount(conversationId) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return 0;

            const { count, error } = await supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('conversation_id', conversationId)
                .neq('sender_id', user.id)
                .not('id', 'in', '(select message_id from message_reads where user_id = ' + user.id + ')');

            if (error) throw error;

            return count || 0;
        } catch (error) {
            console.error('Okunmamış sayısı alınamadı:', error);
            return 0;
        }
    }

    // Yeni sohbet oluştur
    async createDirectConversation(otherUserId) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            // Mevcut sohbet var mı kontrol et
            const { data: existingConv, error: existingError } = await supabase
                .from('conversations')
                .select(`
                    id,
                    conversation_members!inner(user_id)
                `)
                .eq('type', 'direct')
                .eq('conversation_members.user_id', user.id);

            if (existingError) throw existingError;

            // Diğer kullanıcıyla ortak sohbet ara
            for (const conv of existingConv || []) {
                const memberIds = conv.conversation_members.map(m => m.user_id);
                if (memberIds.includes(otherUserId)) {
                    return { success: true, conversationId: conv.id, isNew: false };
                }
            }

            // Yeni sohbet oluştur
            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert([{ type: 'direct' }])
                .select()
                .single();

            if (convError) throw convError;

            // Üyeleri ekle
            const { error: memberError } = await supabase
                .from('conversation_members')
                .insert([
                    { conversation_id: newConv.id, user_id: user.id },
                    { conversation_id: newConv.id, user_id: otherUserId }
                ]);

            if (memberError) throw memberError;

            await this.loadConversations();

            return { success: true, conversationId: newConv.id, isNew: true };
        } catch (error) {
            console.error('Sohbet oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // Grup sohbeti oluştur
    async createGroupConversation(name, memberIds) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            const allMembers = [user.id, ...memberIds];

            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert([{ type: 'group', name: name }])
                .select()
                .single();

            if (convError) throw convError;

            const members = allMembers.map(memberId => ({
                conversation_id: newConv.id,
                user_id: memberId,
                role: memberId === user.id ? 'admin' : 'member'
            }));

            const { error: memberError } = await supabase
                .from('conversation_members')
                .insert(members);

            if (memberError) throw memberError;

            await this.loadConversations();

            return { success: true, conversationId: newConv.id };
        } catch (error) {
            console.error('Grup oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // Kullanıcıları ara
    async searchUsers(searchTerm) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .ilike('username', `%${searchTerm}%`)
                .neq('id', user.id)
                .limit(10);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Kullanıcı arama hatası:', error);
            return [];
        }
    }

    // Realtime: Mesajlara abone ol
    subscribeToMessages(conversationId) {
        this.messageSubscription = supabase
            .channel(`messages-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    this.messages.push(payload.new);
                    if (this.onNewMessage) {
                        this.onNewMessage(payload.new);
                    }
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
                        this.messages[index] = payload.new;
                        if (this.onMessageUpdate) {
                            this.onMessageUpdate(payload.new);
                        }
                    }
                }
            )
            .subscribe();
    }

    // Realtime: Yazıyor göstergesi
    subscribeToTyping(conversationId) {
        this.typingSubscription = supabase
            .channel(`typing-${conversationId}`)
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (this.onTyping) {
                    this.onTyping(payload.payload);
                }
            })
            .subscribe();
    }

    // Yazıyor bilgisi gönder
    async sendTypingIndicator() {
        if (!this.currentConversation) return;

        const user = await authManager.getCurrentUser();
        if (!user) return;

        await supabase
            .channel(`typing-${this.currentConversation}`)
            .send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                    user_id: user.id,
                    username: this.currentProfile?.username || 'Kullanıcı',
                    timestamp: new Date()
                }
            });
    }

    // Realtime: Presence (çevrimiçi durum)
    subscribeToPresence(conversationId) {
        this.presenceSubscription = supabase
            .channel(`presence-${conversationId}`)
            .on('presence', { event: 'sync' }, () => {
                const state = this.presenceSubscription.presenceState();
                if (this.onPresence) {
                    this.onPresence(state);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const user = await authManager.getCurrentUser();
                    if (user) {
                        await this.presenceSubscription.track({
                            user_id: user.id,
                            online_at: new Date()
                        });
                    }
                }
            });
    }

    // Subscription'ları temizle
    cleanupSubscriptions() {
        if (this.messageSubscription) {
            this.messageSubscription.unsubscribe();
            this.messageSubscription = null;
        }
        
        if (this.typingSubscription) {
            this.typingSubscription.unsubscribe();
            this.typingSubscription = null;
        }
        
        if (this.presenceSubscription) {
            this.presenceSubscription.unsubscribe();
            this.presenceSubscription = null;
        }
    }

    // Dosya yükle
    async uploadFile(file) {
        try {
            if (!this.currentConversation) {
                throw new Error('Sohbet seçilmedi');
            }

            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                throw new Error(`Dosya ${MAX_FILE_SIZE_MB}MB'dan büyük olamaz`);
            }

            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            const fileExt = getFileExtension(file.name);
            const fileName = `${this.currentConversation}-${Date.now()}-${generateId()}.${fileExt}`;
            const filePath = `chat/${this.currentConversation}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-media')
                .getPublicUrl(filePath);

            // Dosya tipine göre mesaj gönder
            let messageType = 'file';
            if (isImageFile(file.name)) messageType = 'image';
            else if (isVideoFile(file.name)) messageType = 'video';
            else if (isAudioFile(file.name)) messageType = 'voice';

            return await this.sendMessage(file.name, messageType, publicUrl);
        } catch (error) {
            console.error('Dosya yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global chat manager
const chatManager = new ChatManager();

// Export et (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}
