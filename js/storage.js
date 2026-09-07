// ============================================
// GETTIC - STORAGE MANAGER
// ============================================

class StorageManager {
    constructor() {
        this.buckets = {
            AVATARS: 'avatars',
            CHAT_MEDIA: 'chat-media',
            FILES: 'files'
        };
    }

    // Avatar yükle
    async uploadAvatar(userId, file) {
        try {
            // Dosya tipi kontrol
            if (!isImageFile(file.name)) {
                throw new Error('Sadece görsel dosyaları yüklenebilir');
            }

            // Dosya boyutu kontrol (2MB)
            if (file.size > 2 * 1024 * 1024) {
                throw new Error('Avatar 2MB\'dan büyük olamaz');
            }

            const fileExt = getFileExtension(file.name);
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(this.buckets.AVATARS)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(this.buckets.AVATARS)
                .getPublicUrl(filePath);

            return { success: true, url: publicUrl };
        } catch (error) {
            console.error('Avatar yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Eski avatarı sil
    async deleteOldAvatar(avatarUrl) {
        try {
            if (!avatarUrl) return { success: true };

            // URL'den dosya yolunu çıkar
            const urlParts = avatarUrl.split('/');
            const bucketIndex = urlParts.indexOf(this.buckets.AVATARS);
            
            if (bucketIndex === -1) return { success: true };

            const filePath = urlParts.slice(bucketIndex + 1).join('/');

            const { error } = await supabase.storage
                .from(this.buckets.AVATARS)
                .remove([filePath]);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Eski avatar silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Sohbet medyası yükle
    async uploadChatMedia(conversationId, file) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            // Dosya boyutu kontrol
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                throw new Error(`Dosya ${MAX_FILE_SIZE_MB}MB'dan büyük olamaz`);
            }

            const fileExt = getFileExtension(file.name);
            const fileName = `${Date.now()}-${generateId()}.${fileExt}`;
            const filePath = `${conversationId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(this.buckets.CHAT_MEDIA)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(this.buckets.CHAT_MEDIA)
                .getPublicUrl(filePath);

            return { 
                success: true, 
                url: publicUrl,
                fileType: this.getFileType(file.name),
                fileName: file.name,
                fileSize: file.size
            };
        } catch (error) {
            console.error('Medya yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Dosya yükle
    async uploadFile(conversationId, file) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            // Dosya boyutu kontrol (20MB)
            if (file.size > 20 * 1024 * 1024) {
                throw new Error('Dosya 20MB\'dan büyük olamaz');
            }

            const fileExt = getFileExtension(file.name);
            const fileName = `${Date.now()}-${generateId()}.${fileExt}`;
            const filePath = `${conversationId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(this.buckets.FILES)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(this.buckets.FILES)
                .getPublicUrl(filePath);

            return { 
                success: true, 
                url: publicUrl,
                fileName: file.name,
                fileSize: file.size
            };
        } catch (error) {
            console.error('Dosya yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Dosya tipini belirle
    getFileType(filename) {
        if (isImageFile(filename)) return 'image';
        if (isVideoFile(filename)) return 'video';
        if (isAudioFile(filename)) return 'voice';
        return 'file';
    }

    // Dosya sil
    async deleteFile(bucketName, fileUrl) {
        try {
            if (!fileUrl) return { success: true };

            const urlParts = fileUrl.split('/');
            const bucketIndex = urlParts.indexOf(bucketName);
            
            if (bucketIndex === -1) return { success: true };

            const filePath = urlParts.slice(bucketIndex + 1).join('/');

            const { error } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Dosya silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Dosya indir
    async downloadFile(bucketName, filePath) {
        try {
            const { data, error } = await supabase.storage
                .from(bucketName)
                .download(filePath);

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Dosya indirilemedi:', error);
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
            console.error('URL alınamadı:', error);
            return null;
        }
    }

    // Dosya var mı kontrol et
    async fileExists(bucketName, filePath) {
        try {
            const { data, error } = await supabase.storage
                .from(bucketName)
                .list('', {
                    search: filePath
                });

            if (error) throw error;

            return data && data.length > 0;
        } catch (error) {
            console.error('Dosya kontrol hatası:', error);
            return false;
        }
    }

    // Klasördeki dosyaları listele
    async listFiles(bucketName, folderPath = '') {
        try {
            const { data, error } = await supabase.storage
                .from(bucketName)
                .list(folderPath);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Dosyalar listelenemedi:', error);
            return [];
        }
    }

    // Medya galerisi getir (sohbet için)
    async getConversationMedia(conversationId) {
        try {
            const { data: messages, error } = await supabase
                .from('messages')
                .select('media_url, type, created_at')
                .eq('conversation_id', conversationId)
                .not('media_url', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (messages || []).filter(msg => 
                msg.type === 'image' || msg.type === 'video'
            );
        } catch (error) {
            console.error('Medya galerisi getirilemedi:', error);
            return [];
        }
    }

    // Toplam depolama kullanımı
    async getStorageUsage(userId) {
        try {
            let totalSize = 0;

            for (const bucket of Object.values(this.buckets)) {
                const { data: files, error } = await supabase.storage
                    .from(bucket)
                    .list(userId);

                if (error) continue;

                files.forEach(file => {
                    totalSize += file.metadata?.size || 0;
                });
            }

            return formatFileSize(totalSize);
        } catch (error) {
            console.error('Depolama bilgisi alınamadı:', error);
            return '0 Bytes';
        }
    }
}

// Global storage manager
const storageManager = new StorageManager();

// Export et (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
