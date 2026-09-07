// ============================================
// GETTIC - CONSTANTS
// Uygulama sabitleri ve yapılandırmaları
// ============================================

// Uygulama Bilgileri
const APP_INFO = {
    name: 'Gettic',
    version: '0.0.1',
    description: 'Modern mesajlaşma uygulaması',
    author: 'darking053',
    website: 'https://github.com/darking053official/gettic'
};

// Supabase Tablo İsimleri
const TABLES = {
    PROFILES: 'profiles',
    CONVERSATIONS: 'conversations',
    CONVERSATION_MEMBERS: 'conversation_members',
    MESSAGES: 'messages',
    MESSAGE_READS: 'message_reads',
    NOTIFICATIONS: 'notifications'
};

// Storage Bucket İsimleri
const BUCKETS = {
    AVATARS: 'avatars',
    CHAT_MEDIA: 'chat-media',
    FILES: 'files'
};

// Mesaj Tipleri
const MESSAGE_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    VOICE: 'voice',
    FILE: 'file'
};

// Sohbet Tipleri
const CONVERSATION_TYPES = {
    DIRECT: 'direct',
    GROUP: 'group'
};

// Kullanıcı Durumları
const USER_STATUS = {
    ONLINE: 'online',
    OFFLINE: 'offline',
    AWAY: 'away',
    BUSY: 'busy'
};

// Kullanıcı Rolleri
const USER_ROLES = {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    MEMBER: 'member'
};

// Bildirim Tipleri
const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

// Dosya Tipleri
const FILE_TYPES = {
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    VIDEO: ['mp4', 'webm', 'ogg', 'mov'],
    AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
    DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx']
};

// Dosya Boyut Limitleri (MB)
const FILE_SIZE_LIMITS = {
    AVATAR: 2,
    IMAGE: 8,
    VIDEO: 20,
    AUDIO: 10,
    FILE: 20
};

// Mesaj Limitleri
const MESSAGE_LIMITS = {
    MAX_LENGTH: 2000,
    MIN_LENGTH: 1,
    MAX_MEDIA_PER_MESSAGE: 1
};

// Kullanıcı Adı Limitleri
const USERNAME_LIMITS = {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    ALLOWED_CHARS: /^[a-zA-Z0-9_]+$/
};

// Şifre Limitleri
const PASSWORD_LIMITS = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 100,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false
};

// Sayfalama
const PAGINATION = {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MESSAGES_PER_PAGE: 50,
    CONVERSATIONS_PER_PAGE: 20,
    NOTIFICATIONS_PER_PAGE: 50
};

// Realtime Events
const REALTIME_EVENTS = {
    MESSAGE_INSERT: 'INSERT',
    MESSAGE_UPDATE: 'UPDATE',
    MESSAGE_DELETE: 'DELETE',
    PRESENCE_JOIN: 'join',
    PRESENCE_LEAVE: 'leave',
    PRESENCE_SYNC: 'sync',
    TYPING: 'typing'
};

// Realtime Channels
const REALTIME_CHANNELS = {
    MESSAGES: 'messages',
    CONVERSATIONS: 'conversations',
    PRESENCE: 'presence',
    TYPING: 'typing',
    NOTIFICATIONS: 'notifications'
};

// LocalStorage Keys
const STORAGE_KEYS = {
    SETTINGS: 'gettic_settings',
    THEME: 'gettic_theme',
    TOKEN: 'gettic_token',
    REFRESH_TOKEN: 'gettic_refresh_token',
    USER_ID: 'gettic_user_id',
    LAST_CONVERSATION: 'gettic_last_conversation'
};

// Tema Seçenekleri
const THEMES = {
    DARK: 'dark',
    DARKER: 'darker',
    AMOLED: 'amoled'
};

// Yazı Boyutları
const FONT_SIZES = {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large'
};

// API Endpoints
const API_ENDPOINTS = {
    AUTH: '/api/auth',
    USERS: '/api/users',
    CHAT: '/api/chat',
    MESSAGES: '/api/messages',
    NOTIFICATIONS: '/api/notifications',
    UPLOAD: '/api/upload'
};

// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
};

// Hata Mesajları
const ERROR_MESSAGES = {
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
    NOT_CONVERSATION_MEMBER: 'Bu sohbete erişiminiz yok',
    CONVERSATION_NOT_FOUND: 'Sohbet bulunamadı',
    RATE_LIMITED: 'Çok fazla istek gönderdiniz',
    INTERNAL_ERROR: 'Bir hata oluştu'
};

// Başarı Mesajları
const SUCCESS_MESSAGES = {
    MESSAGE_SENT: 'Mesaj gönderildi',
    MESSAGE_EDITED: 'Mesaj düzenlendi',
    MESSAGE_DELETED: 'Mesaj silindi',
    PROFILE_UPDATED: 'Profil güncellendi',
    AVATAR_UPDATED: 'Avatar güncellendi',
    SETTINGS_SAVED: 'Ayarlar kaydedildi',
    PASSWORD_CHANGED: 'Şifre değiştirildi',
    EMAIL_CHANGED: 'Email değiştirildi'
};

// Zaman Sabitleri (milisaniye)
const TIME = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    TYPING_TIMEOUT: 3000,
    PRESENCE_TIMEOUT: 60000,
    TOKEN_REFRESH: 5 * 60 * 1000
};

// URL Sabitleri
const URLS = {
    HOME: '/',
    LOGIN: '/login.html',
    REGISTER: '/register.html',
    CHAT: '/chat.html',
    PROFILE: '/profile.html',
    SETTINGS: '/settings.html'
};

// Varsayılan Ayarlar
const DEFAULT_SETTINGS = {
    theme: THEMES.DARK,
    fontSize: FONT_SIZES.MEDIUM,
    desktopNotifications: true,
    soundNotifications: true,
    messagePreview: true,
    showOnlineStatus: true,
    showLastSeen: true,
    sendReadReceipts: true,
    publicProfile: false
};

// Regex Desenleri
const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
    URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    PHONE: /^\+?[0-9]{10,15}$/
};

// Export et
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APP_INFO,
        TABLES,
        BUCKETS,
        MESSAGE_TYPES,
        CONVERSATION_TYPES,
        USER_STATUS,
        USER_ROLES,
        NOTIFICATION_TYPES,
        FILE_TYPES,
        FILE_SIZE_LIMITS,
        MESSAGE_LIMITS,
        USERNAME_LIMITS,
        PASSWORD_LIMITS,
        PAGINATION,
        REALTIME_EVENTS,
        REALTIME_CHANNELS,
        STORAGE_KEYS,
        THEMES,
        FONT_SIZES,
        API_ENDPOINTS,
        HTTP_STATUS,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES,
        TIME,
        URLS,
        DEFAULT_SETTINGS,
        REGEX
    };
  }
