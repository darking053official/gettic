// ============================================
// GETTIC - CONFIG
// Supabase bağlantısı ve temel ayarlar
// ============================================

(function() {
    'use strict';
    
    if (window.CONFIG) {
        console.warn('Config zaten yüklü');
        return;
    }

    // Supabase
    const SUPABASE_URL = 'https://ayucfychcemsvzlgsdqq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dWNmeWNoY2Vtc3Z6bGdzZHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDAwODksImV4cCI6MjEwNDM3NjA4OX0.XhXZjzy58cWuAhejswK_44_Y8JJKdSzPI4QCUrS8ipg';

    if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase SDK yüklenmedi');
        window.CONFIG = { loaded: false };
        return;
    }

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
            storageKey: 'gettic-auth-token',
            flowType: 'pkce'
        },
        realtime: { params: { eventsPerSecond: 10 } },
        global: { headers: { 'x-application-name': 'gettic' } }
    });

    // App bilgileri
    const APP = {
        name: 'Gettic',
        version: '1.0.0',
        description: 'Gizlilik odaklı mesajlaşma',
        author: 'darking053',
        url: 'https://gettic.dpdns.org',
        github: 'https://github.com/darking053official/gettic'
    };

    // Storage keys (localStorage)
    const STORAGE_KEYS = {
        SETTINGS: 'gettic_settings',
        THEME: 'gettic_theme',
        USER_ID: 'gettic_user_id',
        LAST_CONVERSATION: 'gettic_last_conversation',
        PWA_DISMISSED: 'pwa_dismissed'
    };

    // Hata çevirileri (Supabase İngilizce → Türkçe)
    const ERROR_TRANSLATIONS = {
        'Invalid login credentials': 'Email veya şifre hatalı',
        'Email not confirmed': 'Email adresiniz doğrulanmamış',
        'User already registered': 'Bu email zaten kayıtlı',
        'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalı',
        'Email rate limit exceeded': 'Çok fazla deneme yaptınız, bekleyin',
        'Invalid email': 'Geçersiz email adresi',
        'User not found': 'Kullanıcı bulunamadı',
        'Invalid token': 'Geçersiz token',
        'Failed to fetch': 'Bağlantı hatası',
        'NetworkError': 'İnternet bağlantınızı kontrol edin'
    };

    function translateError(msg) {
        if (!msg) return 'Bilinmeyen hata';
        for (const [key, value] of Object.entries(ERROR_TRANSLATIONS)) {
            if (msg.includes(key)) return value;
        }
        return msg;
    }

    // Global export
    window.CONFIG = {
        loaded: true,
        supabase,
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        APP,
        STORAGE_KEYS,
        ERROR_TRANSLATIONS,
        translateError
    };

    // Kısayollar
    window.supabaseClient = supabase;
    window.translateError = translateError;

    console.log(`✅ Config yüklendi v${APP.version}`);
})();
