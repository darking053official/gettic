// ============================================
// GETTIC - CONTROLLERS/USERCONTROLLER.JS
// Kullanıcı işlemleri
// ============================================

const { supabase, supabaseAdmin } = require('../config/supabase');
const { logger } = require('../utils/logger');

// Kullanıcıları listele/ara
async function searchUsers(req, res, next) {
    try {
        const { query, limit = 20 } = req.query;
        const userId = req.user.id;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Arama terimi en az 2 karakter olmalı'
            });
        }

        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .neq('id', userId)
            .limit(limit);

        if (error) {
            logger.error('Kullanıcı arama hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Kullanıcılar aranamadı'
            });
        }

        res.json({
            success: true,
            users: users || []
        });
    } catch (error) {
        logger.error('Search users hatası:', error);
        next(error);
    }
}

// Kullanıcı profili getir
async function getUserProfile(req, res, next) {
    try {
        const { userId } = req.params;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            logger.error('Profil getirme hatası:', error);
            return res.status(404).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }

        res.json({
            success: true,
            profile
        });
    } catch (error) {
        logger.error('Get user profile hatası:', error);
        next(error);
    }
}

// Kendi profilini getir
async function getMyProfile(req, res, next) {
    try {
        const userId = req.user.id;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            logger.error('Profil getirme hatası:', error);
            return res.status(404).json({
                success: false,
                error: 'Profil bulunamadı'
            });
        }

        res.json({
            success: true,
            profile
        });
    } catch (error) {
        logger.error('Get my profile hatası:', error);
        next(error);
    }
}

// Profili güncelle
async function updateProfile(req, res, next) {
    try {
        const userId = req.user.id;
        const { username, full_name, avatar_url, status } = req.body;

        // Kullanıcı adı kontrolü
        if (username) {
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({
                    success: false,
                    error: 'Kullanıcı adı 3-20 karakter arası olmalı ve sadece harf, rakam ve alt çizgi içermeli'
                });
            }

            // Kullanıcı adı benzersiz mi kontrol et
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .neq('id', userId)
                .single();

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Bu kullanıcı adı zaten kullanılıyor'
                });
            }
        }

        // Durum kontrolü
        if (status && !['online', 'offline', 'away', 'busy'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz durum'
            });
        }

        const updates = {};
        if (username) updates.username = username;
        if (full_name !== undefined) updates.full_name = full_name;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;
        if (status) updates.status = status;

        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            logger.error('Profil güncelleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Profil güncellenemedi'
            });
        }

        res.json({
            success: true,
            profile: updatedProfile
        });
    } catch (error) {
        logger.error('Update profile hatası:', error);
        next(error);
    }
}

// Avatar yükle
async function uploadAvatar(req, res, next) {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'Dosya gerekli'
            });
        }

        // Dosya tipi kontrol
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: 'Sadece JPEG, PNG, GIF ve WebP formatları desteklenir'
            });
        }

        // Supabase Storage'a yükle
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });

        if (uploadError) {
            logger.error('Avatar yükleme hatası:', uploadError);
            return res.status(400).json({
                success: false,
                error: 'Avatar yüklenemedi'
            });
        }

        // Public URL al
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Profili güncelle
        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', userId)
            .select()
            .single();

        if (updateError) {
            logger.error('Profil güncelleme hatası:', updateError);
        }

        res.json({
            success: true,
            avatar_url: publicUrl,
            profile: updatedProfile
        });
    } catch (error) {
        logger.error('Upload avatar hatası:', error);
        next(error);
    }
}

// Kullanıcı durumunu güncelle
async function updateStatus(req, res, next) {
    try {
        const userId = req.user.id;
        const { status } = req.body;

        if (!status || !['online', 'offline', 'away', 'busy'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz durum'
            });
        }

        const updates = {
            status: status
        };

        if (status === 'offline') {
            updates.last_seen = new Date();
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            logger.error('Durum güncelleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Durum güncellenemedi'
            });
        }

        // Socket.IO ile bildir
        const io = req.app.get('io');
        if (io) {
            io.emit('user-status-changed', {
                userId,
                status
            });
        }

        res.json({
            success: true,
            message: 'Durum güncellendi'
        });
    } catch (error) {
        logger.error('Update status hatası:', error);
        next(error);
    }
}

// Kullanıcı istatistikleri
async function getUserStats(req, res, next) {
    try {
        const { userId } = req.params;

        // Sohbet sayısı
        const { count: conversationCount } = await supabase
            .from('conversation_members')
            .select('conversation_id', { count: 'exact' })
            .eq('user_id', userId);

        // Mesaj sayısı
        const { count: messageCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('sender_id', userId);

        // Arkadaş sayısı (direkt sohbetlerden)
        const { data: directConversations } = await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', userId);

        const conversationIds = (directConversations || []).map(c => c.conversation_id);
        
        let friendCount = 0;
        if (conversationIds.length > 0) {
            const { data: friends } = await supabase
                .from('conversation_members')
                .select('user_id')
                .in('conversation_id', conversationIds)
                .neq('user_id', userId);
            
            friendCount = new Set((friends || []).map(f => f.user_id)).size;
        }

        res.json({
            success: true,
            stats: {
                conversations: conversationCount || 0,
                messages: messageCount || 0,
                friends: friendCount
            }
        });
    } catch (error) {
        logger.error('Get user stats hatası:', error);
        next(error);
    }
}

// Kullanıcıyı engelle
async function blockUser(req, res, next) {
    try {
        const userId = req.user.id;
        const { blockedUserId } = req.body;

        if (!blockedUserId) {
            return res.status(400).json({
                success: false,
                error: 'Engellenecek kullanıcı ID gerekli'
            });
        }

        const { error } = await supabase
            .from('blocked_users')
            .insert({
                user_id: userId,
                blocked_user_id: blockedUserId
            });

        if (error) {
            logger.error('Kullanıcı engelleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Kullanıcı engellenemedi'
            });
        }

        res.json({
            success: true,
            message: 'Kullanıcı engellendi'
        });
    } catch (error) {
        logger.error('Block user hatası:', error);
        next(error);
    }
}

// Engeli kaldır
async function unblockUser(req, res, next) {
    try {
        const userId = req.user.id;
        const { blockedUserId } = req.body;

        const { error } = await supabase
            .from('blocked_users')
            .delete()
            .eq('user_id', userId)
            .eq('blocked_user_id', blockedUserId);

        if (error) {
            logger.error('Engel kaldırma hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Engel kaldırılamadı'
            });
        }

        res.json({
            success: true,
            message: 'Engel kaldırıldı'
        });
    } catch (error) {
        logger.error('Unblock user hatası:', error);
        next(error);
    }
}

// Engellenen kullanıcıları listele
async function getBlockedUsers(req, res, next) {
    try {
        const userId = req.user.id;

        const { data: blockedUsers, error } = await supabase
            .from('blocked_users')
            .select(`
                blocked_user_id,
                profiles:blocked_user_id (
                    id,
                    username,
                    full_name,
                    avatar_url
                )
            `)
            .eq('user_id', userId);

        if (error) {
            logger.error('Engellenen listesi hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Engellenen kullanıcılar getirilemedi'
            });
        }

        res.json({
            success: true,
            blockedUsers: blockedUsers || []
        });
    } catch (error) {
        logger.error('Get blocked users hatası:', error);
        next(error);
    }
}

module.exports = {
    searchUsers,
    getUserProfile,
    getMyProfile,
    updateProfile,
    uploadAvatar,
    updateStatus,
    getUserStats,
    blockUser,
    unblockUser,
    getBlockedUsers
};
