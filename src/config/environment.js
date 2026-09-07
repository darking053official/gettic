// ============================================
// GETTIC - CONFIG/ENVIRONMENT.JS
// Ortam değişkenleri (GitHub Secrets'tan okur)
// ============================================

require('dotenv').config();

const environment = {
    // Node.js ortamı
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Sunucu portu
    PORT: parseInt(process.env.PORT) || 3000,
    
    // Supabase yapılandırması
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    
    // JWT yapılandırması
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    
    // Bcrypt yapılandırması
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    
    // CORS yapılandırması
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'https://gettic.js.org,http://localhost:3000').split(',').map(s => s.trim()),
    
    // Rate limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    
    // Email yapılandırması
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
    SMTP_USER: process.env.SMTP_USER || 'gettic.noreply@gmail.com',
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM || 'Gettic <gettic.noreply@gmail.com>',
    
    // Google OAuth (opsiyonel)
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    
    // GitHub OAuth (opsiyonel)
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI,
    
    // Log yapılandırması
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_FILE: process.env.LOG_FILE || 'logs/gettic.log',
    
    // Güvenlik
    CSRF_SECRET: process.env.CSRF_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,
    
    // Dosya yükleme limitleri
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '20mb',
    MAX_AVATAR_SIZE: process.env.MAX_AVATAR_SIZE || '2mb',
    
    // Redis (opsiyonel)
    REDIS_URL: process.env.REDIS_URL,
    
    // Sentry (opsiyonel)
    SENTRY_DSN: process.env.SENTRY_DSN,
};

// Gerekli değişkenleri kontrol et
function validateEnvironment() {
    const required = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET'
    ];
    
    const missing = required.filter(key => !environment[key]);
    
    if (missing.length > 0) {
        console.error('========================================');
        console.error('EKSİK ORTAM DEĞİŞKENLERİ:');
        missing.forEach(key => console.error(`  - ${key}`));
        console.error('========================================');
        console.error('Lütfen GitHub Secrets veya .env dosyasında bu değişkenleri tanımlayın');
        console.error('Örnek .env dosyası için .env.example dosyasına bakın');
        console.error('========================================');
        
        if (environment.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
    
    // Production'da güvenlik kontrolü
    if (environment.NODE_ENV === 'production') {
        if (!environment.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn('UYARI: SUPABASE_SERVICE_ROLE_KEY tanımlanmamış. Admin işlemleri çalışmayacak.');
        }
        
        if (environment.JWT_SECRET === environment.JWT_REFRESH_SECRET) {
            console.warn('UYARI: JWT_SECRET ve JWT_REFRESH_SECRET aynı olmamalı.');
        }
        
        if (!environment.SMTP_PASS) {
            console.warn('UYARI: SMTP_PASS tanımlanmamış. Email gönderimi çalışmayacak.');
        }
    }
}

// Development modunda kontrol et
validateEnvironment();

// Environment bilgilerini logla (development'ta)
if (environment.NODE_ENV === 'development') {
    console.log('========================================');
    console.log('GETTIC ENVIRONMENT');
    console.log('========================================');
    console.log(`NODE_ENV: ${environment.NODE_ENV}`);
    console.log(`PORT: ${environment.PORT}`);
    console.log(`SUPABASE_URL: ${environment.SUPABASE_URL ? '✔️ Tanımlı' : '❌ Eksik'}`);
    console.log(`SUPABASE_ANON_KEY: ${environment.SUPABASE_ANON_KEY ? '✔️ Tanımlı' : '❌ Eksik'}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY: ${environment.SUPABASE_SERVICE_ROLE_KEY ? '✔️ Tanımlı' : '❌ Eksik'}`);
    console.log(`JWT_SECRET: ${environment.JWT_SECRET ? '✔️ Tanımlı' : '❌ Eksik'}`);
    console.log(`JWT_REFRESH_SECRET: ${environment.JWT_REFRESH_SECRET ? '✔️ Tanımlı' : '❌ Eksik'}`);
    console.log(`SMTP_USER: ${environment.SMTP_USER}`);
    console.log(`SMTP_PASS: ${environment.SMTP_PASS ? '✔️ Tanımlı' : '❌ Eksik'}`);
    console.log(`ALLOWED_ORIGINS: ${environment.ALLOWED_ORIGINS.join(', ')}`);
    console.log('========================================');
}

module.exports = { environment };
