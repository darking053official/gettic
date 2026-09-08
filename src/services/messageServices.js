// ============================================
// GETTIC - SERVICES/MESSAGESERVICE.JS
// Mesaj iş mantığı
// ============================================

const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');

class MessageService {
    // Mesaj oluştur
    async createMessage(conversationId, senderId, content, type = 'text', mediaUrl = null, replyTo = null) {
        try {
            // Sohbet üyeliği kontrolü
            const { data: memberCheck } = await supabase
                .from('conversation_members')
                .select('user_id')
                .eq('conversation_id', conversationId)
                .eq('user_id', senderId)
                .single();

            if (!memberCheck) {
                return {
                    success: false,
                    error: 'Bu sohbete erişiminiz yok'
                };
            }

            // Mesajı oluştur
            const { data: message, error } = await supabase
                .from('messages')
                .insert([{
                    conversation_id: conversationId,
                    sender_id: senderId,
                    content,
                    type,
                    media_url: mediaUrl,
                    reply_to: replyTo
                }])
                .select(`
                    *,
                    sender:profiles (
                        id,
                        username,
                        full_name,
                        avatar_url
                    )
                `)
                .single();

            if (error) throw error;

            // Sohbet updated_at güncelle
            await supabase
                .from('conversations')
                .update({ updated_at: new Date() })
                .eq('id', conversationId);

            // Okundu bilgisini otomatik ekle (kendi mesajı)
            await supabase
                .from('message_reads')
                .insert({
                    message_id: message.id,
                    conversation_id: conversationId,
                    user_id: senderId,
                    read_at: new Date()
                });

            return { success: true, message };
        } catch (error) {
            logger.error('Mesaj oluşturma hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesajları getir
    async getMessages(conversationId, userId, limit = 50, offset = 0) {
        try {
            // Üyelik kontrolü
            const { data: memberCheck } = await supabase
                .from('conversation_members')
                .select('user_id')
                .eq('conversation_id', conversationId)
                .eq('user_id', userId)
                .single();

            if (!memberCheck) {
                return { success: false, error: 'Bu sohbete erişiminiz yok' };
            }

            const { data: messages, error } = await supabase
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

            return { success: true, messages: (messages || []).reverse() };
        } catch (error) {
            logger.error('Mesaj getirme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesaj düzenle
    async editMessage(messageId, userId, newContent) {
        try {
            // Mesaj sahibi kontrolü
            const { data: messageCheck } = await supabase
                .from('messages')
                .select('sender_id, conversation_id')
                .eq('id', messageId)
                .single();

            if (!messageCheck) {
                return { success: false, error: 'Mesaj bulunamadı' };
            }

            if (messageCheck.sender_id !== userId) {
                return { success: false, error: 'Sadece kendi mesajlarınızı düzenleyebilirsiniz' };
            }

            const { data: updatedMessage, error } = await supabase
                .from('messages')
                .update({
                    content: newContent,
                    is_edited: true,
                    edited_at: new Date()
                })
                .eq('id', messageId)
                .select()
                .single();

            if (error) throw error;

            return { success: true, message: updatedMessage };
        } catch (error) {
            logger.error('Mesaj düzenleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Mesaj sil
    async deleteMessage(messageId, userId) {
        try {
            const { data: messageCheck } = await supabase
                .from('messages')
                .select('sender_id, conversation_id')
                .eq('id', messageId)
                .single();

            if (!messageCheck) {
                return { success: false, error: 'Mesaj bulunamadı' };
            }

            if (messageCheck.sender_id !== userId) {
                return { success: false, error: 'Sadece kendi mesajlarınızı silebilirsiniz' };
            }

            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;

            return { 
                success: true, 
                conversationId: messageCheck.conversation_id 
            };
        } catch (error) {
            logger.error('Mesaj silme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Sohbetteki tüm mesajları okundu işaretle
    async markConversationRead(conversationId, userId) {
        try {
            const { data: unreadMessages } = await supabase
                .from('messages')
                .select('id')
                .eq('conversation_id', conversationId)
                .neq('sender_id', userId);

            const readRecords = (unreadMessages || []).map(msg => ({
                message_id: msg.id,
                conversation_id: conversationId,
                user_id: userId,
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
            logger.error('Okundu işaretleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Okunmamış mesaj sayısı
    async getUnreadCount(conversationId, userId) {
        try {
            const { data: readMessages } = await supabase
                .from('message_reads')
                .select('message_id')
                .eq('user_id', userId);

            const readIds = (readMessages || []).map(r => r.message_id);

            let query = supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('conversation_id', conversationId)
                .neq('sender_id', userId);

            if (readIds.length > 0) {
                query = query.not('id', 'in', `(${readIds.join(',')})`);
            }

            const { count, error } = await query;

            if (error) throw error;

            return { success: true, count: count || 0 };
        } catch (error) {
            logger.error('Okunmamış sayısı hatası:', error);
            return { success: false, count: 0 };
        }
    }
}

module.exports = new MessageService();
