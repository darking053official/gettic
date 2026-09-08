// ============================================
// GETTIC - CONTROLLERS/MESSAGECONTROLLER.JS
// Mesaj işlemleri
// ============================================

const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');
const { MAX_MESSAGE_LENGTH } = require('../../public/js/constants');

// Mesajları listele
async function getMessages(req, res, next) {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        // Kullanıcının sohbette olup olmadığını kontrol et
        const { data: memberCheck, error: memberError } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        if (memberError || !memberCheck) {
            return res.status(403).json({
                success: false,
                error: 'Bu sohbete erişiminiz yok'
            });
        }

        // Mesajları getir
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

        if (error) {
            logger.error('Mesaj listeleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Mesajlar yüklenemedi'
            });
        }

        res.json({
            success: true,
            messages: (messages || []).reverse()
        });
    } catch (error) {
        logger.error('Get messages hatası:', error);
        next(error);
    }
}

// Mesaj gönder
async function sendMessage(req, res, next) {
    try {
        const { conversationId } = req.params;
        const { content, type = 'text', mediaUrl = null, replyTo = null } = req.body;
        const userId = req.user.id;

        // İçerik kontrolü
        if (!content && !mediaUrl) {
            return res.status(400).json({
                success: false,
                error: 'Mesaj içeriği boş olamaz'
            });
        }

        if (content && content.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                success: false,
                error: `Mesaj ${MAX_MESSAGE_LENGTH} karakterden uzun olamaz`
            });
        }

        // Kullanıcının sohbette olup olmadığını kontrol et
        const { data: memberCheck, error: memberError } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        if (memberError || !memberCheck) {
            return res.status(403).json({
                success: false,
                error: 'Bu sohbete erişiminiz yok'
            });
        }

        // Mesajı oluştur
        const { data: message, error } = await supabase
            .from('messages')
            .insert([{
                conversation_id: conversationId,
                sender_id: userId,
                content: content,
                type: type,
                media_url: mediaUrl,
                reply_to: replyTo
            }])
            .select(`
                *,
                sender:profiles (
                    id,
                    username,
                    avatar_url
                )
            `)
            .single();

        if (error) {
            logger.error('Mesaj gönderme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Mesaj gönderilemedi'
            });
        }

        // Sohbet updated_at güncelle
        await supabase
            .from('conversations')
            .update({ updated_at: new Date() })
            .eq('id', conversationId);

        // Socket.IO ile diğer kullanıcılara bildir
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('new-message', message);
        }

        res.status(201).json({
            success: true,
            message
        });
    } catch (error) {
        logger.error('Send message hatası:', error);
        next(error);
    }
}

// Mesaj düzenle
async function editMessage(req, res, next) {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Mesaj içeriği boş olamaz'
            });
        }

        // Mesajın sahibi olduğunu kontrol et
        const { data: messageCheck, error: checkError } = await supabase
            .from('messages')
            .select('sender_id, conversation_id')
            .eq('id', messageId)
            .single();

        if (checkError || !messageCheck) {
            return res.status(404).json({
                success: false,
                error: 'Mesaj bulunamadı'
            });
        }

        if (messageCheck.sender_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Sadece kendi mesajlarınızı düzenleyebilirsiniz'
            });
        }

        // Mesajı güncelle
        const { data: updatedMessage, error } = await supabase
            .from('messages')
            .update({
                content: content.trim(),
                is_edited: true,
                edited_at: new Date()
            })
            .eq('id', messageId)
            .select()
            .single();

        if (error) {
            logger.error('Mesaj düzenleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Mesaj düzenlenemedi'
            });
        }

        // Socket.IO ile bildir
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${messageCheck.conversation_id}`).emit('message-edited', updatedMessage);
        }

        res.json({
            success: true,
            message: updatedMessage
        });
    } catch (error) {
        logger.error('Edit message hatası:', error);
        next(error);
    }
}

// Mesaj sil
async function deleteMessage(req, res, next) {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        // Mesajın sahibi olduğunu kontrol et
        const { data: messageCheck, error: checkError } = await supabase
            .from('messages')
            .select('sender_id, conversation_id')
            .eq('id', messageId)
            .single();

        if (checkError || !messageCheck) {
            return res.status(404).json({
                success: false,
                error: 'Mesaj bulunamadı'
            });
        }

        if (messageCheck.sender_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Sadece kendi mesajlarınızı silebilirsiniz'
            });
        }

        // Mesajı sil
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            logger.error('Mesaj silme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Mesaj silinemedi'
            });
        }

        // Socket.IO ile bildir
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${messageCheck.conversation_id}`).emit('message-deleted', {
                messageId,
                conversationId: messageCheck.conversation_id
            });
        }

        res.json({
            success: true,
            message: 'Mesaj silindi'
        });
    } catch (error) {
        logger.error('Delete message hatası:', error);
        next(error);
    }
}

// Mesajı okundu işaretle
async function markAsRead(req, res, next) {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        const { error } = await supabase
            .from('message_reads')
            .insert({
                message_id: messageId,
                user_id: userId,
                read_at: new Date()
            });

        if (error && !error.message.includes('duplicate')) {
            logger.error('Okundu işaretleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Okundu işaretlenemedi'
            });
        }

        res.json({
            success: true,
            message: 'Okundu işaretlendi'
        });
    } catch (error) {
        logger.error('Mark as read hatası:', error);
        next(error);
    }
}

// Sohbetteki tüm mesajları okundu işaretle
async function markConversationAsRead(req, res, next) {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        // Okunmamış mesajları getir
        const { data: unreadMessages, error: fetchError } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId);

        if (fetchError) {
            logger.error('Okunmamış mesaj getirme hatası:', fetchError);
            return res.status(400).json({
                success: false,
                error: 'Mesajlar getirilemedi'
            });
        }

        // Okundu kayıtlarını oluştur
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

            if (error) {
                logger.error('Okundu işaretleme hatası:', error);
                return res.status(400).json({
                    success: false,
                    error: 'Okundu işaretlenemedi'
                });
            }
        }

        // Socket.IO ile bildir
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('messages-read', {
                userId,
                conversationId
            });
        }

        res.json({
            success: true,
            message: 'Tüm mesajlar okundu işaretlendi'
        });
    } catch (error) {
        logger.error('Mark conversation as read hatası:', error);
        next(error);
    }
}

// Mesaj ara
async function searchMessages(req, res, next) {
    try {
        const { conversationId } = req.params;
        const { query } = req.query;
        const userId = req.user.id;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Arama terimi en az 2 karakter olmalı'
            });
        }

        // Kullanıcının sohbette olup olmadığını kontrol et
        const { data: memberCheck } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        if (!memberCheck) {
            return res.status(403).json({
                success: false,
                error: 'Bu sohbete erişiminiz yok'
            });
        }

        // Mesaj ara
        const { data: messages, error } = await supabase
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
            .ilike('content', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            logger.error('Mesaj arama hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Arama yapılamadı'
            });
        }

        res.json({
            success: true,
            messages: messages || []
        });
    } catch (error) {
        logger.error('Search messages hatası:', error);
        next(error);
    }
}

module.exports = {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    markConversationAsRead,
    searchMessages
};
