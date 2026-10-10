// ============================================
// GETTIC - CONSTANTS
// Uygulama sabitleri (değer tutmaz, sadece tanımlar)
// ============================================

(function() {
    'use strict';
    
    if (window.CONST) {
        console.warn('Constants zaten yüklü');
        return;
    }

    // Tablolar
    const TABLES = {
        PROFILES: 'profiles',
        CONVERSATIONS: 'conversations',
        CONVERSATION_MEMBERS: 'conversation_members',
        MESSAGES: 'messages',
        MESSAGE_READS: 'message_reads',
        NOTIFICATIONS: 'notifications',
        BLOCKED_USERS: 'blocked_users'
    };

    // Storage bucket'ları
    const BUCKETS = {
        AVATARS: 'avatars',
        CHAT_MEDIA: 'chat-media',
        FILES: 'files'
    };

    // Mesaj tipleri
    const MESSAGE_TYPES = {
        TEXT: 'text',
        IMAGE: 'image',
        VIDEO: 'video',
        VOICE: 'voice',
        FILE: 'file'
    };

    // Sohbet tipleri
    const CONVERSATION_TYPES = {
        DIRECT: 'direct',
        GROUP: 'group'
    };

    // Kullanıcı durumları
    const USER_STATUS = {
        ONLINE: 'online',
        OFFLINE: 'offline',
        AWAY: 'away',
        BUSY: 'busy'
    };

    // Kullanıcı rolleri
    const USER_ROLES = {
        ADMIN: 'admin',
        MODERATOR: 'moderator',
        MEMBER: 'member'
    };

    // Bildirim tipleri
    const NOTIFICATION_TYPES = {
        INFO: 'info',
        SUCCESS: 'success',
        WARNING: 'warning',
        ERROR: 'error'
    };

    // Dosya tipleri
    const FILE_TYPES = {
        IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        VIDEO: ['mp4', 'webm', 'ogg', 'mov'],
        AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
        DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx']
    };

    // Limitler
    const LIMITS = {
        MESSAGE_MAX_LENGTH: 2000,
        MESSAGE_MIN_LENGTH: 1,
        MESSAGES_PER_PAGE: 50,
        CONVERSATIONS_PER_PAGE: 20,
        NOTIFICATIONS_PER_PAGE: 50,
        USERNAME_MIN: 3,
        USERNAME_MAX: 20,
        PASSWORD_MIN: 8,
        PASSWORD_MAX: 100,
        GROUP_NAME_MIN: 3,
        GROUP_NAME_MAX: 50,
        GROUP_MAX_MEMBERS: 100,
        AVATAR_SIZE_MB: 2,
        IMAGE_SIZE_MB: 8,
        VIDEO_SIZE_MB: 20,
        AUDIO_SIZE_MB: 10,
        FILE_SIZE_MB: 20
    };

    // Zaman (ms)
    const TIME = {
        SECOND: 1000,
        MINUTE: 60000,
        HOUR: 3600000,
        DAY: 86400000,
        WEEK: 604800000,
        TYPING_TIMEOUT: 3000,
        PRESENCE_TIMEOUT: 60000,
        TOAST_DURATION: 4000,
        ERROR_DURATION: 8000,
        RETRY_DELAY: 2000
    };

    // Tema
    const THEMES = {
        DARK: 'dark',
        DARKER: 'darker',
        AMOLED: 'amoled'
    };

    // Yazı boyutları
    const FONT_SIZES = {
        SMALL: 'small',
        MEDIUM: 'medium',
        LARGE: 'large'
    };

    // Varsayılan ayarlar
    const DEFAULT_SETTINGS = {
        theme: 'dark',
        fontSize: 'medium',
        desktopNotifications: true,
        soundNotifications: true,
        messagePreview: true,
        showOnlineStatus: true,
        showLastSeen: true,
        sendReadReceipts: true,
        publicProfile: false
    };

    // Regex
    const REGEX = {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
        URL: /^https?:\/\/.+/,
        PHONE: /^\+?[0-9]{10,15}$/
    };

    // Realtime
    const REALTIME = {
        EVENTS: {
            INSERT: 'INSERT',
            UPDATE: 'UPDATE',
            DELETE: 'DELETE',
            TYPING: 'typing',
            SYNC: 'sync'
        },
        CHANNELS: {
            MESSAGES: 'messages',
            TYPING: 'typing',
            PRESENCE: 'presence',
            NOTIFICATIONS: 'notifications'
        }
    };

    // URL'ler
    const URLS = {
        HOME: '/index.html',
        AUTH: '/auth.html',
        CHAT: '/chat.html',
        PROFILE: '/profile.html',
        SETTINGS: '/settings.html'
    };

    // Mesaj metinleri
    const MESSAGES = {
        ERRORS: {
            AUTH_REQUIRED: 'Oturum açmanız gerekiyor',
            INVALID_CREDENTIALS: 'Email veya şifre hatalı',
            USERNAME_TAKEN: 'Bu kullanıcı adı zaten kullanılıyor',
            EMAIL_TAKEN: 'Bu email zaten kayıtlı',
            INVALID_EMAIL: 'Geçersiz email adresi',
            INVALID_USERNAME: 'Geçersiz kullanıcı adı',
            PASSWORD_TOO_SHORT: 'Şifre çok kısa',
            PASSWORDS_DONT_MATCH: 'Şifreler eşleşmiyor',
            MESSAGE_TOO_LONG: 'Mesaj çok uzun',
            FILE_TOO_LARGE: 'Dosya boyutu çok büyük',
            INVALID_FILE_TYPE: 'Geçersiz dosya tipi',
            NO_ACCESS: 'Bu sohbete erişiminiz yok',
            NOT_FOUND: 'Bulunamadı',
            RATE_LIMITED: 'Çok fazla istek gönderdiniz',
            UNKNOWN: 'Bir hata oluştu'
        },
        SUCCESS: {
            MESSAGE_SENT: 'Mesaj gönderildi',
            MESSAGE_EDITED: 'Mesaj düzenlendi',
            MESSAGE_DELETED: 'Mesaj silindi',
            PROFILE_UPDATED: 'Profil güncellendi',
            AVATAR_UPDATED: 'Avatar güncellendi',
            SETTINGS_SAVED: 'Ayarlar kaydedildi',
            PASSWORD_CHANGED: 'Şifre değiştirildi',
            EMAIL_CHANGED: 'Email değiştirildi',
            COPIED: 'Kopyalandı'
        }
    };

    // Yardımcı fonksiyonlar
    function isValidEmail(email) {
        return REGEX.EMAIL.test(email);
    }

    function isValidUsername(username) {
        return REGEX.USERNAME.test(username);
    }

    function isImageFile(filename) {
        return FILE_TYPES.IMAGE.includes(filename.split('.').pop().toLowerCase());
    }

    function isVideoFile(filename) {
        return FILE_TYPES.VIDEO.includes(filename.split('.').pop().toLowerCase());
    }

    function isAudioFile(filename) {
        return FILE_TYPES.AUDIO.includes(filename.split('.').pop().toLowerCase());
    }

    // Global export
    window.CONST = {
        loaded: true,
        TABLES,
        BUCKETS,
        MESSAGE_TYPES,
        CONVERSATION_TYPES,
        USER_STATUS,
        USER_ROLES,
        NOTIFICATION_TYPES,
        FILE_TYPES,
        LIMITS,
        TIME,
        THEMES,
        FONT_SIZES,
        DEFAULT_SETTINGS,
        REGEX,
        REALTIME,
        URLS,
        MESSAGES,
        isValidEmail,
        isValidUsername,
        isImageFile,
        isVideoFile,
        isAudioFile
    };

    console.log('✅ Constants yüklendi');
})();
