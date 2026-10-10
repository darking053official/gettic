// ============================================
// GETTIC - CONFIG (Premium)
// ============================================

(function() {
    'use strict';
    
    // Çift yükleme koruması
    if (window.GETTIC_CONFIG) {
        console.warn('Gettic config zaten yüklü, tekrar yüklenmedi');
        return;
    }

    // ============ SUPABASE ============
    const SUPABASE_URL = 'https://ayucfychcemsvzlgsdqq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dWNmeWNoY2Vtc3Z6bGdzZHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDAwODksImV4cCI6MjEwNDM3NjA4OX0.XhXZjzy58cWuAhejswK_44_Y8JJKdSzPI4QCUrS8ipg';

    // window.supabase kontrolü
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
        console.error('Supabase SDK yüklenmedi! CDN kontrol edin.');
        window.GETTIC_CONFIG = { loaded: false, error: 'Supabase SDK missing' };
        return;
    }

    // Client oluştur
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
            storageKey: 'gettic-auth-token',
            flowType: 'pkce'
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        },
        global: {
            headers: {
                'x-application-name': 'gettic'
            }
        }
    });

    // ============ UYGULAMA ============
    const APP = {
        name: 'Gettic',
        version: '1.0.0',
        description: 'Gizlilik odaklı mesajlaşma',
        url: 'https://gettic.dpdns.org'
    };

    // ============ VARSAYILANLAR ============
    const DEFAULT_AVATAR = 'logo.png';
    const MAX_MESSAGE_LENGTH = 2000;
    const MAX_FILE_SIZE_MB = 8;
    const MAX_AVATAR_SIZE_MB = 2;
    const MESSAGES_PER_PAGE = 50;

    // ============ MESAJ TİPLERİ ============
    const MESSAGE_TYPES = {
        TEXT: 'text',
        IMAGE: 'image',
        VIDEO: 'video',
        VOICE: 'voice',
        FILE: 'file'
    };

    // ============ SOHBET TİPLERİ ============
    const CONVERSATION_TYPES = {
        DIRECT: 'direct',
        GROUP: 'group'
    };

    // ============ KULLANICI DURUMLARI ============
    const USER_STATUS = {
        ONLINE: 'online',
        OFFLINE: 'offline',
        AWAY: 'away',
        BUSY: 'busy'
    };

    // ============ KULLANICI ROLLERİ ============
    const USER_ROLES = {
        ADMIN: 'admin',
        MODERATOR: 'moderator',
        MEMBER: 'member'
    };

    // ============ TABLO İSİMLERİ ============
    const TABLES = {
        PROFILES: 'profiles',
        CONVERSATIONS: 'conversations',
        CONVERSATION_MEMBERS: 'conversation_members',
        MESSAGES: 'messages',
        MESSAGE_READS: 'message_reads',
        NOTIFICATIONS: 'notifications',
        BLOCKED_USERS: 'blocked_users'
    };

    // ============ STORAGE BUCKET'LARI ============
    const BUCKETS = {
        AVATARS: 'avatars',
        CHAT_MEDIA: 'chat-media',
        FILES: 'files'
    };

    // ============ DOSYA TİPLERİ ============
    const FILE_TYPES = {
        IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        VIDEO: ['mp4', 'webm', 'ogg', 'mov'],
        AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
        DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx']
    };

    // ============ TEMA ============
    const THEME = {
        DARK: 'dark',
        DARKER: 'darker',
        AMOLED: 'amoled'
    };

    // ============ HATA MESAJLARI (TÜRKÇE) ============
    const ERROR_MESSAGES = {
        'Invalid login credentials': 'Email veya şifre hatalı',
        'Email not confirmed': 'Email adresiniz doğrulanmamış',
        'User already registered': 'Bu email zaten kayıtlı',
        'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalı',
        'Email rate limit exceeded': 'Çok fazla deneme yaptınız, bekleyin',
        'signup disabled': 'Kayıt şu anda devre dışı',
        'Invalid email': 'Geçersiz email adresi',
        'User not found': 'Kullanıcı bulunamadı',
        'Invalid token': 'Geçersiz token',
        'For security purposes, you can only request this once every 60 seconds': '60 saniye bekleyin',
        'Failed to fetch': 'Bağlantı hatası'
    };

    // ============ YARDIMCI ============
    function translateError(msg) {
        if (!msg) return 'Bilinmeyen hata';
        for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
            if (msg.includes(key)) return value;
        }
        return msg;
    }

    // ============ LOCALSTORAGE ============
    const STORAGE_KEYS = {
        SETTINGS: 'gettic_settings',
        THEME: 'gettic_theme',
        LAST_CONVERSATION: 'gettic_last_conversation',
        PWA_DISMISSED: 'pwa_dismissed'
    };

    // ============ GLOBAL EXPORT ============
    window.GETTIC_CONFIG = {
        loaded: true,
        supabase,
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        APP,
        DEFAULT_AVATAR,
        MAX_MESSAGE_LENGTH,
        MAX_FILE_SIZE_MB,
        MAX_AVATAR_SIZE_MB,
        MESSAGES_PER_PAGE,
        MESSAGE_TYPES,
        CONVERSATION_TYPES,
        USER_STATUS,
        USER_ROLES,
        TABLES,
        BUCKETS,
        FILE_TYPES,
        THEME,
        ERROR_MESSAGES,
        STORAGE_KEYS,
        translateError
    };

    // Kısayollar (window'a)
    window.supabaseClient = supabase;
    window.translateError = translateError;
    window.APP_CONFIG = APP;

    console.log(`✅ Gettic v${APP.version} yüklendi`);
})();
