// ============================================
// GETTIC - MESSAGE MANAGER
// ============================================

class MessageManager {
    constructor() {
        this.messages = [];
        this.messageCache = {};
        this.editingMessage = null;
        this.replyingTo = null;
    }

    // Mesajları yükle
    async loadMessages(conversationId, limit = 50, offset = 0) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:profiles (
                        id,
                        username,
                        full_name,
                        avatar_url
                    )
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            // Mesajları ters çevir (eskiden yeniye)
            const messages = (data || []).reverse();
            
            // Cache'e ekle
            this.messageCache[conversationId] = messages;
            this.messages = messages;

            return messages;
        } catch (error) {
            console.error('Mesajlar yüklenemedi:', error);
            return [];
        }
    }

    // Eski mesajları yükle (pagination)
    async loadOlderMessages(conversationId, beforeMessageId, limit = 50) {
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
                .lt('created_at', beforeMessageId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return (data || []).reverse();
        } catch (error) {
            console.error('Eski mesajlar yüklenemedi:', error);
            return [];
        }
    }

    // Mesaj gönder
    async sendMessage(conversationId, content, type = 'text', mediaUrl = null) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            const messageData = {
                conversation_id: conversationId,
                sender_id: user.id,
                content: content.trim(),
                type: type,
                media_url: mediaUrl,
                reply_to: this.replyingTo?.id || null
            };

            const { data, error } = await supabase
                .from('messages')
                .insert([messageData])
                .select()
                .single();

            if (error) throw error;

            // Reply durumunu temizle
            this.replyingTo = null;

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
                    content: newContent.trim(),
                    is_edited: true,
                    edited_at: new Date()
                })
                .eq('id', messageId)
                .select()
                .single();

            if (error) throw error;

            this.editingMessage = null;

            return { success: true, message: data };
        } catch (error) {
            console.error('Mesaj düzenlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesaj sil
    async deleteMessage(messageId) {
        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Mesaj silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesajı soft delete yap
    async softDeleteMessage(messageId) {
        try {
            const { error } = await supabase
                .from('messages')
                .update({
                    is_deleted: true,
                    content: '',
                    media_url: null,
                    deleted_at: new Date()
                })
                .eq('id', messageId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Mesaj silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesajı okundu işaretle
    async markAsRead(messageId, conversationId) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return;

            const { error } = await supabase
                .from('message_reads')
                .insert({
                    message_id: messageId,
                    conversation_id: conversationId,
                    user_id: user.id,
                    read_at: new Date()
                });

            if (error && !error.message.includes('duplicate')) {
                console.error('Okundu işaretlenemedi:', error);
            }
        } catch (error) {
            console.error('Okundu işaretleme hatası:', error);
        }
    }

    // Tüm mesajları okundu işaretle
    async markAllAsRead(conversationId) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return;

            const { data: unreadMessages, error: fetchError } = await supabase
                .from('messages')
                .select('id')
                .eq('conversation_id', conversationId)
                .neq('sender_id', user.id);

            if (fetchError) throw fetchError;

            const readRecords = unreadMessages.map(msg => ({
                message_id: msg.id,
                conversation_id: conversationId,
                user_id: user.id,
                read_at: new Date()
            }));

            if (readRecords.length > 0) {
                const { error } = await supabase
                    .from('message_reads')
                    .upsert(readRecords);

                if (error) throw error;
            }

            return { success: true };
        } catch (error) {
            console.error('Okundu işaretleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesaja cevap ver
    setReplyTo(message) {
        this.replyingTo = message;
    }

    // Cevabı temizle
    clearReply() {
        this.replyingTo = null;
    }

    // Mesaj düzenlemeye başla
    startEditing(message) {
        this.editingMessage = message;
    }

    // Düzenlemeyi iptal et
    cancelEditing() {
        this.editingMessage = null;
    }

    // Mesaj ara
    async searchMessages(conversationId, searchTerm) {
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
                .ilike('content', `%${searchTerm}%`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Mesaj arama hatası:', error);
            return [];
        }
    }

    // Medya dosyası yükle
    async uploadMedia(conversationId, file) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                throw new Error(`Dosya ${MAX_FILE_SIZE_MB}MB'dan büyük olamaz`);
            }

            const fileExt = getFileExtension(file.name);
            const fileName = `${conversationId}-${Date.now()}-${generateId()}.${fileExt}`;
            const filePath = `chat/${conversationId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-media')
                .getPublicUrl(filePath);

            let messageType = 'file';
            if (isImageFile(file.name)) messageType = 'image';
            else if (isVideoFile(file.name)) messageType = 'video';
            else if (isAudioFile(file.name)) messageType = 'voice';

            return await this.sendMessage(conversationId, file.name, messageType, publicUrl);
        } catch (error) {
            console.error('Dosya yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Okunmamış mesaj sayısı
    async getUnreadCount(conversationId) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return 0;

            const { data: readMessages } = await supabase
                .from('message_reads')
                .select('message_id')
                .eq('user_id', user.id);

            const readIds = (readMessages || []).map(r => r.message_id);

            const { count, error } = await supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('conversation_id', conversationId)
                .neq('sender_id', user.id)
                .not('id', 'in', `(${readIds.join(',')})`);

            if (error) throw error;

            return count || 0;
        } catch (error) {
            console.error('Okunmamış sayısı alınamadı:', error);
            return 0;
        }
    }

    // Son mesajı getir
    async getLastMessage(conversationId) {
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
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // Kayıt yok
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Son mesaj alınamadı:', error);
            return null;
        }
    }

    // Mesajı temizle (önbellekten)
    clearCache(conversationId) {
        if (conversationId) {
            delete this.messageCache[conversationId];
        } else {
            this.messageCache = {};
            this.messages = [];
        }
    }
}

// Global message manager
const messageManager = new MessageManager();

// Export et (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageManager;
}
