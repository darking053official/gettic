// ============================================
// GETTIC - SUPABASE CONFIG
// ============================================

// Supabase yapılandırması
// Bu değerler GitHub Secrets'tan gelecek
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Supabase client oluştur
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Uygulama sabitleri
const APP_NAME = 'Gettic';
const DEFAULT_AVATAR = 'logo.png';
const MAX_MESSAGE_LENGTH = 2000;
const MAX_FILE_SIZE_MB = 8;

// Mesaj tipleri
const MESSAGE_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    FILE: 'file',
    VOICE: 'voice'
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

// Supabase tablo isimleri
const TABLES = {
    PROFILES: 'profiles',
    CONVERSATIONS: 'conversations',
    CONVERSATION_MEMBERS: 'conversation_members',
    MESSAGES: 'messages',
    MESSAGE_READS: 'message_reads'
};

// Export et (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        supabase,
        APP_NAME,
        DEFAULT_AVATAR,
        MAX_MESSAGE_LENGTH,
        MAX_FILE_SIZE_MB,
        MESSAGE_TYPES,
        CONVERSATION_TYPES,
        USER_STATUS,
        TABLES
    };
}
