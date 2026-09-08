// ============================================
// GETTIC - SERVICES/USERSERVICE.JS
// Kullanıcı işlemleri
// ============================================

const { supabase, supabaseAdmin } = require('../config/supabase');
const { logger } = require('../utils/logger');

class UserService {
    // Kullanıcı profili getir
    async getUserProfile(userId) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            return { success: true, profile };
        } catch (error) {
            logger.error('Profil getirme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Profili güncelle
    async updateProfile(userId, updates) {
        try {
            const { data: updatedProfile, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;

            return { success: true, profile: updatedProfile };
        } catch (error) {
            logger.error('Profil güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Kullanıcı durumunu güncelle
    async updateUserStatus(userId, status) {
        try {
            const updates = { status };
            
            if (status === 'offline') {
                updates.last_seen = new Date();
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            logger.error('Durum güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Kullanıcı ara
    async searchUsers(searchTerm, currentUserId, limit = 20) {
        try {
            const { data: users, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
                .neq('id', currentUserId)
                .limit(limit);

            if (error) throw error;

            return { success: true, users: users || [] };
        } catch (error) {
            logger.error('Kullanıcı arama hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Kullanıcı istatistikleri
    async getUserStats(userId) {
        try {
            const { count: conversationCount } = await supabase
                .from('conversation_members')
                .select('conversation_id', { count: 'exact' })
                .eq('user_id', userId);

            const { count: messageCount } = await supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('sender_id', userId);

            return {
                success: true,
                stats: {
                    conversations: conversationCount || 0,
                    messages: messageCount || 0
                }
            };
        } catch (error) {
            logger.error('İstatistik getirme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Kullanıcı engelle
    async blockUser(userId, blockedUserId) {
        try {
            const { error } = await supabase
                .from('blocked_users')
                .insert({
                    user_id: userId,
                    blocked_user_id: blockedUserId
                });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            logger.error('Kullanıcı engelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Engeli kaldır
    async unblockUser(userId, blockedUserId) {
        try {
            const { error } = await supabase
                .from('blocked_users')
                .delete()
                .eq('user_id', userId)
                .eq('blocked_user_id', blockedUserId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            logger.error('Engel kaldırma hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Engellenen kullanıcıları getir
    async getBlockedUsers(userId) {
        try {
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

            if (error) throw error;

            return { success: true, blockedUsers: blockedUsers || [] };
        } catch (error) {
            logger.error('Engellenen listesi hatası:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new UserService();
