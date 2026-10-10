// ============================================
// GETTIC - MESSAGE MANAGER (Premium)
// ============================================

class MessageManager {
    constructor() {
        this.messages = [];
        this.cache = new Map();
        this.editingMessage = null;
        this.replyingTo = null;
    }

    // ============ YARDIMCI ============
    _getExt(name) {
        return name.split('.').pop().toLowerCase();
    }

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    _isImage(name) {
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(this._getExt(name));
    }
    _isVideo(name) {
        return ['mp4', 'webm', 'ogg', 'mov'].includes(this._getExt(name));
    }
    _isAudio(name) {
        return ['mp3', 'wav', 'ogg', 'm4a'].includes(this._getExt(name));
    }

    // ============ MESAJLARI YÜKLE ============
    async loadMessages(conversationId, limit = 50, offset = 0) {
        try {
            const { data, error } = await window.CONFIG.supabase
                .from('messages')
                .select(`
                    id, conversation_id, sender_id, content, type, media_url,
                    reply_to, is_edited, is_deleted, created_at, edited_at,
                    sender:profiles (id, username, full_name, avatar_url)
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            const messages = (data || []).reverse();
            this.messages = messages;

            this.cache.set(conversationId, {
                data: messages,
                timestamp: Date.now()
            });

            return messages;
        } catch (error) {
            console.error('Mesajlar yüklenemedi:', error);
            return [];
        }
    }

    // ============ ESKİ MESAJLARI YÜKLE ============
    async loadOlderMessages(conversationId, beforeDate, limit = 50) {
        try {
            if (!beforeDate) return [];

            const { data, error } = await window.CONFIG.supabase
                .from('messages')
                .select(`
                    id, conversation_id, sender_id, content, type, media_url,
                    reply_to, is_edited, is_deleted, created_at, edited_at,
                    sender:profiles (id, username, full_name, avatar_url)
                `)
                .eq('conversation_id', conversationId)
                .lt('created_at', beforeDate)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            const older = (data || []).reverse();
            this.messages = [...older, ...this.messages];

            const cached = this.cache.get(conversationId);
            if (cached) {
                cached.data = this.messages;
                cached.timestamp = Date.now();
            }

            return older;
        } catch (error) {
            console.error('Eski mesajlar yüklenemedi:', error);
            return [];
        }
    }

    // ============ MESAJ GÖNDER ============
    async sendMessage(userId, conversationId, content, type = 'text', mediaUrl = null) {
        try {
            if (!userId) throw new Error('Oturum yok');
            if (!conversationId) throw new Error('Sohbet seçilmedi');

            const trimmed = content?.trim() || '';
            if (!trimmed && !mediaUrl) throw new Error('Mesaj içeriği boş');

            const { LIMITS } = window.CONST || {};
            if (trimmed.length > (LIMITS?.MESSAGE_MAX_LENGTH || 2000)) {
                throw new Error(`Mesaj ${LIMITS?.MESSAGE_MAX_LENGTH || 2000} karakterden uzun olamaz`);
            }

            const messageData = {
                conversation_id: conversationId,
                sender_id: userId,
                content: trimmed || null,
                type: type,
                media_url: mediaUrl,
                reply_to: this.replyingTo?.id || null
            };

            const { data, error } = await window.CONFIG.supabase
                .from('messages')
                .insert([messageData])
                .select(`
                    id, conversation_id, sender_id, content, type, media_url,
                    reply_to, is_edited, is_deleted, created_at,
                    sender:profiles (id, username, full_name, avatar_url)
                `)
                .single();

            if (error) throw error;

            // Sohbetin updated_at'ini güncelle (fire & forget)
            window.CONFIG.supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', conversationId)
                .then(() => {})
                .catch(() => {});

            this.replyingTo = null;

            return { success: true, message: data };
        } catch (error) {
            console.error('Mesaj gönderilemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ MESAJ DÜZENLE ============
    async editMessage(userId, messageId, newContent) {
        try {
            const trimmed = newContent?.trim();
            if (!trimmed) throw new Error('Mesaj içeriği boş olamaz');

            const { data, error } = await window.CONFIG.supabase
                .from('messages')
                .update({
                    content: trimmed,
                    is_edited: true,
                    edited_at: new Date().toISOString()
                })
                .eq('id', messageId)
                .eq('sender_id', userId)  // Sadece kendi mesajını
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

    // ============ MESAJ SİL (HARD) ============
    async deleteMessage(userId, messageId) {
        try {
            // Önce message_reads temizle
            await window.CONFIG.supabase
                .from('message_reads')
                .delete()
                .eq('message_id', messageId);

            const { error } = await window.CONFIG.supabase
                .from('messages')
                .delete()
                .eq('id', messageId)
                .eq('sender_id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Mesaj silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ MESAJ SİL (SOFT) ============
    async softDeleteMessage(userId, messageId) {
        try {
            const { error } = await window.CONFIG.supabase
                .from('messages')
                .update({
                    is_deleted: true,
                    content: null,
                    media_url: null,
                    deleted_at: new Date().toISOString()
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
    async markAsRead(userId, messageId, conversationId) {
        try {
            if (!userId || !messageId || !conversationId) return;

            const { error } = await window.CONFIG.supabase
                .from('message_reads')
                .upsert({
                    message_id: messageId,
                    conversation_id: conversationId,
                    user_id: userId,
                    read_at: new Date().toISOString()
                }, { onConflict: 'message_id,user_id' });

            if (error) throw error;
        } catch (error) {
            // Sessizce geç (duplicate vs.)
        }
    }

    // ============ TÜM MESAJLARI OKUNDU İŞARETLE ============
    async markAllAsRead(userId, conversationId) {
        try {
            if (!userId || !conversationId) return { success: false };

            // Okunmamış mesajları al
            const { data: reads } = await window.CONFIG.supabase
                .from('message_reads')
                .select('message_id')
                .eq('user_id', userId)
                .eq('conversation_id', conversationId);

            const readIds = new Set((reads || []).map(r => r.message_id));

            const { data: unreadMessages, error: fetchError } = await window.CONFIG.supabase
                .from('messages')
                .select('id')
                .eq('conversation_id', conversationId)
                .neq('sender_id', userId);

            if (fetchError) throw fetchError;

            // Filtrele: zaten okunmuş olanları çıkar
            const unread = (unreadMessages || []).filter(m => !readIds.has(m.id));

            if (unread.length === 0) return { success: true, count: 0 };

            const records = unread.map(m => ({
                message_id: m.id,
                conversation_id: conversationId,
                user_id: userId,
                read_at: new Date().toISOString()
            }));

            const { error } = await window.CONFIG.supabase
                .from('message_reads')
                .insert(records);

            if (error) throw error;

            return { success: true, count: unread.length };
        } catch (error) {
            console.error('Okundu işaretleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ OKUNMAMIŞ SAYI ============
    async getUnreadCount(userId, conversationId) {
        try {
            if (!userId || !conversationId) return 0;

            // Okunmuş ID'leri al
            const { data: reads } = await window.CONFIG.supabase
                .from('message_reads')
                .select('message_id')
                .eq('user_id', userId)
                .eq('conversation_id', conversationId);

            const readIds = (reads || []).map(r => r.message_id);

            let query = window.CONFIG.supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', userId)
                .eq('is_deleted', false);

            if (readIds.length > 0) {
                query = query.not('id', 'in', `(${readIds.join(',')})`);
            }

            const { count, error } = await query;
            if (error) throw error;

            return count || 0;
        } catch (error) {
            console.error('Okunmamış sayı alınamadı:', error);
            return 0;
        }
    }

    // ============ CEVAPLA ============
    setReplyTo(message) {
        this.replyingTo = message;
    }

    clearReply() {
        this.replyingTo = null;
    }

    // ============ DÜZENLE ============
    startEditing(message) {
        this.editingMessage = message;
    }

    cancelEditing() {
        this.editingMessage = null;
    }

    // ============ MESAJ ARA ============
    async searchMessages(conversationId, searchTerm, limit = 50) {
        try {
            const term = searchTerm?.trim();
            if (!term || term.length < 2) return [];

            const { data, error } = await window.CONFIG.supabase
                .from('messages')
                .select(`
                    id, conversation_id, sender_id, content, type, media_url,
                    created_at, is_deleted,
                    sender:profiles (id, username, avatar_url)
                `)
                .eq('conversation_id', conversationId)
                .eq('is_deleted', false)
                .ilike('content', `%${term}%`)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Mesaj arama hatası:', error);
            return [];
        }
    }

    // ============ MEDYA YÜKLE ============
    async uploadMedia(userId, conversationId, file) {
        try {
            if (!userId) throw new Error('Oturum yok');
            if (!conversationId) throw new Error('Sohbet seçilmedi');
            if (!file) throw new Error('Dosya seçilmedi');

            const { LIMITS } = window.CONST || {};
            const maxMB = LIMITS?.FILE_SIZE_MB || 20;

            if (file.size > maxMB * 1024 * 1024) {
                throw new Error(`Dosya ${maxMB}MB'dan büyük olamaz`);
            }

            const ext = this._getExt(file.name);
            const fileName = `${Date.now()}-${this._generateId()}.${ext}`;
            const filePath = `${conversationId}/${fileName}`;

            const { error: uploadError } = await window.CONFIG.supabase.storage
                .from('chat-media')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.CONFIG.supabase.storage
                .from('chat-media')
                .getPublicUrl(filePath);

            let messageType = 'file';
            if (this._isImage(file.name)) messageType = 'image';
            else if (this._isVideo(file.name)) messageType = 'video';
            else if (this._isAudio(file.name)) messageType = 'voice';

            return await this.sendMessage(userId, conversationId, file.name, messageType, publicUrl);
        } catch (error) {
            console.error('Dosya yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ SON MESAJ ============
    async getLastMessage(conversationId) {
        try {
            const { data, error } = await window.CONFIG.supabase
                .from('messages')
                .select(`
                    id, content, type, created_at, sender_id, is_deleted,
                    sender:profiles (id, username)
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Son mesaj alınamadı:', error);
            return null;
        }
    }

    // ============ CACHE ============
    clearCache(conversationId = null) {
        if (conversationId) {
            this.cache.delete(conversationId);
        } else {
            this.cache.clear();
            this.messages = [];
        }
    }

    reset() {
        this.clearCache();
        this.editingMessage = null;
        this.replyingTo = null;
    }
}

// Global
const messageManager = new MessageManager();
