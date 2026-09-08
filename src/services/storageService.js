// ============================================
// GETTIC - SERVICES/STORAGESERVICE.JS
// Supabase Storage işlemleri
// ============================================

const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');

class StorageService {
    // Avatar yükle
    async uploadAvatar(userId, fileBuffer, mimetype, originalName) {
        try {
            const fileExt = originalName.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, fileBuffer, {
                    contentType: mimetype,
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return { success: true, url: publicUrl };
        } catch (error) {
            logger.error('Avatar yükleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Sohbet medyası yükle
    async uploadChatMedia(conversationId, userId, fileBuffer, mimetype, originalName) {
        try {
            const fileExt = originalName.split('.').pop();
            const fileName = `${Date.now()}-${userId}.${fileExt}`;
            const filePath = `${conversationId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(filePath, fileBuffer, {
                    contentType: mimetype,
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-media')
                .getPublicUrl(filePath);

            return { success: true, url: publicUrl };
        } catch (error) {
            logger.error('Medya yükleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Dosya sil
    async deleteFile(bucketName, fileUrl) {
        try {
            const urlParts = fileUrl.split('/');
            const bucketIndex = urlParts.indexOf(bucketName);
            
            if (bucketIndex === -1) {
                return { success: true };
            }

            const filePath = urlParts.slice(bucketIndex + 1).join('/');

            const { error } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            logger.error('Dosya silme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Dosya URL'si al
    getFileUrl(bucketName, filePath) {
        try {
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            logger.error('URL alma hatası:', error);
            return null;
        }
    }
}

module.exports = new StorageService();
