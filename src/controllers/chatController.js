// ============================================
// GETTIC - CONTROLLERS/CHATCONTROLLER.JS
// Sohbet işlemleri
// ============================================

const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');

// Sohbetleri listele
async function getConversations(req, res, next) {
    try {
        const userId = req.user.id;

        const { data: conversations, error } = await supabase
            .from('conversation_members')
            .select(`
                conversation_id,
                role,
                joined_at,
                conversations (
                    id,
                    type,
                    name,
                    avatar_url,
                    created_at,
                    updated_at,
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

        if (error) {
            logger.error('Sohbet listeleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Sohbetler yüklenemedi'
            });
        }

        res.json({
            success: true,
            conversations: conversations || []
        });
    } catch (error) {
        logger.error('Get conversations hatası:', error);
        next(error);
    }
}

// Tek sohbet getir
async function getConversation(req, res, next) {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

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

        const { data: conversation, error } = await supabase
            .from('conversations')
            .select(`
                *,
                conversation_members (
                    user_id,
                    role,
                    joined_at,
                    profiles (
                        id,
                        username,
                        full_name,
                        avatar_url,
                        status,
                        last_seen
                    )
                )
            `)
            .eq('id', conversationId)
            .single();

        if (error) {
            logger.error('Sohbet getirme hatası:', error);
            return res.status(404).json({
                success: false,
                error: 'Sohbet bulunamadı'
            });
        }

        res.json({
            success: true,
            conversation
        });
    } catch (error) {
        logger.error('Get conversation hatası:', error);
        next(error);
    }
}

// Direkt sohbet oluştur
async function createDirectConversation(req, res, next) {
    try {
        const { otherUserId } = req.body;
        const userId = req.user.id;

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                error: 'Karşı kullanıcı ID gerekli'
            });
        }

        if (userId === otherUserId) {
            return res.status(400).json({
                success: false,
                error: 'Kendinizle sohbet oluşturamazsınız'
            });
        }

        // Karşı kullanıcının var olup olmadığını kontrol et
        const { data: otherUser, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', otherUserId)
            .single();

        if (userError || !otherUser) {
            return res.status(404).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }

        // Mevcut sohbet var mı kontrol et
        const { data: existingConversations } = await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', userId);

        const userConversationIds = (existingConversations || []).map(c => c.conversation_id);

        if (userConversationIds.length > 0) {
            const { data: directConversations } = await supabase
                .from('conversations')
                .select(`
                    id,
                    conversation_members (
                        user_id
                    )
                `)
                .in('id', userConversationIds)
                .eq('type', 'direct');

            for (const conv of directConversations || []) {
                const memberIds = conv.conversation_members.map(m => m.user_id);
                if (memberIds.includes(otherUserId)) {
                    return res.json({
                        success: true,
                        conversationId: conv.id,
                        isNew: false
                    });
                }
            }
        }

        // Yeni sohbet oluştur
        const { data: newConversation, error: convError } = await supabase
            .from('conversations')
            .insert([{ 
                type: 'direct',
                created_by: userId
            }])
            .select()
            .single();

        if (convError) {
            logger.error('Sohbet oluşturma hatası:', convError);
            return res.status(400).json({
                success: false,
                error: 'Sohbet oluşturulamadı'
            });
        }

        // Üyeleri ekle
        const { error: memberError } = await supabase
            .from('conversation_members')
            .insert([
                { conversation_id: newConversation.id, user_id: userId },
                { conversation_id: newConversation.id, user_id: otherUserId }
            ]);

        if (memberError) {
            logger.error('Üye ekleme hatası:', memberError);
            return res.status(400).json({
                success: false,
                error: 'Sohbet üyeleri eklenemedi'
            });
        }

        res.status(201).json({
            success: true,
            conversationId: newConversation.id,
            isNew: true
        });
    } catch (error) {
        logger.error('Create direct conversation hatası:', error);
        next(error);
    }
}

// Grup sohbeti oluştur
async function createGroupConversation(req, res, next) {
    try {
        const { name, memberIds } = req.body;
        const userId = req.user.id;

        if (!name || name.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Grup adı en az 3 karakter olmalı'
            });
        }

        if (!memberIds || memberIds.length < 1) {
            return res.status(400).json({
                success: false,
                error: 'En az bir üye seçilmeli'
            });
        }

        // Tekrar eden üyeleri kaldır
        const uniqueMemberIds = [...new Set([userId, ...memberIds])];

        if (uniqueMemberIds.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Grup en az 2 kişiden oluşmalı'
            });
        }

        // Yeni grup oluştur
        const { data: newGroup, error: convError } = await supabase
            .from('conversations')
            .insert([{ 
                type: 'group',
                name: name.trim(),
                created_by: userId
            }])
            .select()
            .single();

        if (convError) {
            logger.error('Grup oluşturma hatası:', convError);
            return res.status(400).json({
                success: false,
                error: 'Grup oluşturulamadı'
            });
        }

        // Üyeleri ekle (ilk kullanıcı admin)
        const members = uniqueMemberIds.map(memberId => ({
            conversation_id: newGroup.id,
            user_id: memberId,
            role: memberId === userId ? 'admin' : 'member'
        }));

        const { error: memberError } = await supabase
            .from('conversation_members')
            .insert(members);

        if (memberError) {
            logger.error('Grup üye ekleme hatası:', memberError);
            return res.status(400).json({
                success: false,
                error: 'Grup üyeleri eklenemedi'
            });
        }

        res.status(201).json({
            success: true,
            conversationId: newGroup.id
        });
    } catch (error) {
        logger.error('Create group conversation hatası:', error);
        next(error);
    }
}

// Grup bilgilerini güncelle
async function updateGroupInfo(req, res, next) {
    try {
        const { conversationId } = req.params;
        const { name, avatar_url } = req.body;
        const userId = req.user.id;

        // Admin kontrolü
        const { data: memberCheck } = await supabase
            .from('conversation_members')
            .select('role')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        if (!memberCheck || memberCheck.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Bu işlem için admin yetkisi gerekli'
            });
        }

        const updates = {};
        if (name) updates.name = name.trim();
        if (avatar_url) updates.avatar_url = avatar_url;

        const { data: updatedGroup, error } = await supabase
            .from('conversations')
            .update(updates)
            .eq('id', conversationId)
            .select()
            .single();

        if (error) {
            logger.error('Grup güncelleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Grup güncellenemedi'
            });
        }

        res.json({
            success: true,
            conversation: updatedGroup
        });
    } catch (error) {
        logger.error('Update group hatası:', error);
        next(error);
    }
}

// Gruba üye ekle
async function addGroupMember(req, res, next) {
    try {
        const { conversationId } = req.params;
        const { userId: newMemberId } = req.body;
        const userId = req.user.id;

        // Admin kontrolü
        const { data: memberCheck } = await supabase
            .from('conversation_members')
            .select('role')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        if (!memberCheck || memberCheck.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Bu işlem için admin yetkisi gerekli'
            });
        }

        const { error } = await supabase
            .from('conversation_members')
            .insert([{
                conversation_id: conversationId,
                user_id: newMemberId,
                role: 'member'
            }]);

        if (error) {
            logger.error('Üye ekleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Üye eklenemedi'
            });
        }

        res.json({
            success: true,
            message: 'Üye eklendi'
        });
    } catch (error) {
        logger.error('Add group member hatası:', error);
        next(error);
    }
}

// Gruptan üye çıkar
async function removeGroupMember(req, res, next) {
    try {
        const { conversationId, memberId } = req.params;
        const userId = req.user.id;

        // Admin kontrolü veya kendini çıkarma
        const { data: memberCheck } = await supabase
            .from('conversation_members')
            .select('role')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

        if (!memberCheck || (memberCheck.role !== 'admin' && userId !== memberId)) {
            return res.status(403).json({
                success: false,
                error: 'Bu işlem için yetkiniz yok'
            });
        }

        const { error } = await supabase
            .from('conversation_members')
            .delete()
            .eq('conversation_id', conversationId)
            .eq('user_id', memberId);

        if (error) {
            logger.error('Üye çıkarma hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Üye çıkarılamadı'
            });
        }

        res.json({
            success: true,
            message: 'Üye çıkarıldı'
        });
    } catch (error) {
        logger.error('Remove group member hatası:', error);
        next(error);
    }
}

// Sohbetten ayrıl
async function leaveConversation(req, res, next) {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const { error } = await supabase
            .from('conversation_members')
            .delete()
            .eq('conversation_id', conversationId)
            .eq('user_id', userId);

        if (error) {
            logger.error('Sohbetten ayrılma hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Sohbetten ayrılınamadı'
            });
        }

        res.json({
            success: true,
            message: 'Sohbetten ayrıldınız'
        });
    } catch (error) {
        logger.error('Leave conversation hatası:', error);
        next(error);
    }
}

module.exports = {
    getConversations,
    getConversation,
    createDirectConversation,
    createGroupConversation,
    updateGroupInfo,
    addGroupMember,
    removeGroupMember,
    leaveConversation
};
