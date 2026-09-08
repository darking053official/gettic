// ============================================
// GETTIC - SUPABASE CONFIG
// ============================================

// Supabase yapılandırması
// Bu değerler GitHub Secrets'tan gelecek
const SUPABASE_URL = 'https://ayucfychcemsvzlgsdqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dWNmeWNoY2Vtc3Z6bGdzZHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDAwODksImV4cCI6MjEwNDM3NjA4OX0.XhXZjzy58cWuAhejswK_44_Y8JJKdSzPI4QCUrS8ipg';

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
