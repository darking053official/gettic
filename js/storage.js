// ============================================
// GETTIC - STORAGE MANAGER (Premium)
// ============================================

class StorageManager {
    constructor() {
        this.buckets = {
            AVATARS: 'avatars',
            CHAT_MEDIA: 'chat-media',
            FILES: 'files'
        };
        this.limits = {
            AVATAR: 2 * 1024 * 1024,      // 2MB
            IMAGE: 8 * 1024 * 1024,       // 8MB
            VIDEO: 20 * 1024 * 1024,      // 20MB
            AUDIO: 10 * 1024 * 1024,      // 10MB
            FILE: 20 * 1024 * 1024        // 20MB
        };
        this.allowedTypes = {
            IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            VIDEO: ['mp4', 'webm', 'ogg', 'mov'],
            AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
            DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx']
        };
    }

    // ============ YARDIMCI ============
    _getSupabase() {
        return (window.CONFIG && window.CONFIG.supabase) || window.supabaseClient;
    }

    _getExt(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    _isImage(name) {
        return this.allowedTypes.IMAGE.includes(this._getExt(name));
    }
    _isVideo(name) {
        return this.allowedTypes.VIDEO.includes(this._getExt(name));
    }
    _isAudio(name) {
        return this.allowedTypes.AUDIO.includes(this._getExt(name));
    }

    _getFileType(filename) {
        if (this._isImage(filename)) return 'image';
        if (this._isVideo(filename)) return 'video';
        if (this._isAudio(filename)) return 'voice';
        return 'file';
    }

    _formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Public URL'den dosya yolunu güvenli çıkar
    _extractFilePath(publicUrl, bucket) {
        try {
            if (!publicUrl || !bucket) return null;

            // Format: https://xxx.supabase.co/storage/v1/object/public/{bucket}/{path}
            const marker = `/object/public/${bucket}/`;
            const idx = publicUrl.indexOf(marker);
            
            if (idx === -1) return null;
            
            const filePath = publicUrl.substring(idx + marker.length);
            // Query string varsa temizle
            return filePath.split('?')[0];
        } catch {
            return null;
        }
    }

    // ============ AVATAR YÜKLE ============
    async uploadAvatar(userId, file) {
        try {
            if (!userId) throw new Error('Kullanıcı ID gerekli');
            if (!file) throw new Error('Dosya seçilmedi');
            if (!this._isImage(file.name)) {
                throw new Error('Sadece görsel dosyaları yüklenebilir');
            }
            if (file.size > this.limits.AVATAR) {
                throw new Error(`Avatar ${this._formatSize(this.limits.AVATAR)}'dan büyük olamaz`);
            }

            const ext = this._getExt(file.name);
            const fileName = `${Date.now()}-${this._generateId()}.${ext}`;
            const filePath = `${userId}/${fileName}`;

            const { error: uploadError } = await this._getSupabase().storage
                .from(this.buckets.AVATARS)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = this._getSupabase().storage
                .from(this.buckets.AVATARS)
                .getPublicUrl(filePath);

            return { success: true, url: publicUrl, path: filePath };
        } catch (error) {
            console.error('Avatar yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ ESKİ AVATARI SİL ============
    async deleteOldAvatar(avatarUrl) {
        try {
            if (!avatarUrl) return { success: true };

            const filePath = this._extractFilePath(avatarUrl, this.buckets.AVATARS);
            if (!filePath) return { success: true };

            const { error } = await this._getSupabase().storage
                .from(this.buckets.AVATARS)
                .remove([filePath]);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Eski avatar silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ SOHBET MEDYASI YÜKLE ============
    async uploadChatMedia(conversationId, file, onProgress = null) {
        try {
            if (!conversationId) throw new Error('Sohbet ID gerekli');
            if (!file) throw new Error('Dosya seçilmedi');

            let maxSize = this.limits.FILE;
            if (this._isImage(file.name)) maxSize = this.limits.IMAGE;
            else if (this._isVideo(file.name)) maxSize = this.limits.VIDEO;
            else if (this._isAudio(file.name)) maxSize = this.limits.AUDIO;

            if (file.size > maxSize) {
                throw new Error(`Dosya ${this._formatSize(maxSize)}'dan büyük olamaz`);
            }

            const ext = this._getExt(file.name);
            const fileName = `${Date.now()}-${this._generateId()}.${ext}`;
            const filePath = `${conversationId}/${fileName}`;

            const { error: uploadError } = await this._getSupabase().storage
                .from(this.buckets.CHAT_MEDIA)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            if (onProgress) onProgress(100);

            const { data: { publicUrl } } = this._getSupabase().storage
                .from(this.buckets.CHAT_MEDIA)
                .getPublicUrl(filePath);

            return {
                success: true,
                url: publicUrl,
                path: filePath,
                fileType: this._getFileType(file.name),
                fileName: file.name,
                fileSize: file.size,
                fileSizeFormatted: this._formatSize(file.size)
            };
        } catch (error) {
            console.error('Medya yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ DOSYA YÜKLE ============
    async uploadFile(conversationId, file) {
        try {
            if (!conversationId) throw new Error('Sohbet ID gerekli');
            if (!file) throw new Error('Dosya seçilmedi');
            if (file.size > this.limits.FILE) {
                throw new Error(`Dosya ${this._formatSize(this.limits.FILE)}'dan büyük olamaz`);
            }

            const ext = this._getExt(file.name);
            const fileName = `${Date.now()}-${this._generateId()}.${ext}`;
            const filePath = `${conversationId}/${fileName}`;

            const { error: uploadError } = await this._getSupabase().storage
                .from(this.buckets.FILES)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = this._getSupabase().storage
                .from(this.buckets.FILES)
                .getPublicUrl(filePath);

            return {
                success: true,
                url: publicUrl,
                path: filePath,
                fileName: file.name,
                fileSize: file.size,
                fileSizeFormatted: this._formatSize(file.size)
            };
        } catch (error) {
            console.error('Dosya yüklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ DOSYA SİL ============
    async deleteFile(bucketName, fileUrl) {
        try {
            if (!fileUrl) return { success: true };

            const filePath = this._extractFilePath(fileUrl, bucketName);
            if (!filePath) return { success: false, error: 'Geçersiz URL' };

            const { error } = await this._getSupabase().storage
                .from(bucketName)
                .remove([filePath]);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Dosya silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ DOSYA İNDİR ============
    async downloadFile(bucketName, filePath) {
        try {
            const { data, error } = await this._getSupabase().storage
                .from(bucketName)
                .download(filePath);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Dosya indirilemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ DOSYA VAR MI ============
    async fileExists(bucketName, filePath) {
        try {
            // Klasör ve dosya adını ayır
            const lastSlash = filePath.lastIndexOf('/');
            const dir = lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
            const filename = lastSlash > 0 ? filePath.substring(lastSlash + 1) : filePath;

            const { data, error } = await this._getSupabase().storage
                .from(bucketName)
                .list(dir, { search: filename });

            if (error) throw error;
            return (data || []).some(f => f.name === filename);
        } catch (error) {
            console.error('Dosya kontrol hatası:', error);
            return false;
        }
    }

    // ============ KLASÖR LİSTELE ============
    async listFiles(bucketName, folderPath = '') {
        try {
            const { data, error } = await this._getSupabase().storage
                .from(bucketName)
                .list(folderPath, {
                    limit: 100,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Dosyalar listelenemedi:', error);
            return [];
        }
    }

    // ============ MEDYA GALERİSİ ============
    async getConversationMedia(conversationId) {
        try {
            const { data, error } = await this._getSupabase()
                .from('messages')
                .select('id, media_url, type, created_at, sender_id')
                .eq('conversation_id', conversationId)
                .not('media_url', 'is', null)
                .eq('is_deleted', false)
                .in('type', ['image', 'video'])
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Medya galerisi alınamadı:', error);
            return [];
        }
    }

    // ============ DEPOLAMA KULLANIMI ============
    async getStorageUsage(userId) {
        try {
            const supabase = this._getSupabase();

            // Avatar boyutu
            let avatarSize = 0;
            try {
                const { data: avatars } = await supabase.storage
                    .from(this.buckets.AVATARS)
                    .list(userId);
                (avatars || []).forEach(f => {
                    avatarSize += f.metadata?.size || 0;
                });
            } catch {}

            // Kullanıcının sohbetlerindeki medya boyutu
            let mediaSize = 0;
            try {
                const { data: convs } = await supabase
                    .from('conversation_members')
                    .select('conversation_id')
                    .eq('user_id', userId);

                for (const conv of (convs || [])) {
                    const { data: files } = await supabase.storage
                        .from(this.buckets.CHAT_MEDIA)
                        .list(conv.conversation_id, { limit: 1000 });
                    (files || []).forEach(f => {
                        mediaSize += f.metadata?.size || 0;
                    });
                }
            } catch {}

            const totalSize = avatarSize + mediaSize;

            return {
                total: totalSize,
                formatted: this._formatSize(totalSize),
                avatar: this._formatSize(avatarSize),
                media: this._formatSize(mediaSize)
            };
        } catch (error) {
            console.error('Depolama bilgisi alınamadı:', error);
            return { total: 0, formatted: '0 Bytes', avatar: '0 Bytes', media: '0 Bytes' };
        }
    }

    // ============ TOPLU SİL ============
    async deleteAllFilesInFolder(bucketName, folderPath) {
        try {
            const files = await this.listFiles(bucketName, folderPath);
            if (files.length === 0) return { success: true, deleted: 0 };

            const paths = files.map(f => `${folderPath}/${f.name}`);
            const { error } = await this._getSupabase().storage
                .from(bucketName)
                .remove(paths);

            if (error) throw error;
            return { success: true, deleted: paths.length };
        } catch (error) {
            console.error('Klasör silinemedi:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global
const storageManager = new StorageManager();
