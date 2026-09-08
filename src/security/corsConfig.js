// ============================================
// GETTIC - SECURITY/CORSCONFIG.JS
// CORS politikaları
// ============================================

const { environment } = require('../config/environment');

const corsConfig = {
    // İzin verilen originler
    origin: function(origin, callback) {
        // Postman gibi araçlar için (origin yoksa izin ver)
        if (!origin) {
            return callback(null, true);
        }
        
        // Development modunda tüm originlere izin ver
        if (environment.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        // Production'da sadece izin verilen originler
        if (environment.ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        
        // İzin verilmeyen origin
        const error = new Error('CORS policy: Bu origin izinli değil');
        error.status = 403;
        return callback(error, false);
    },
    
    // İzin verilen metodlar
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    
    // İzin verilen headerlar
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-Token',
        'Accept',
        'Origin'
    ],
    
    // CORS headerlarının tarayıcıya açılması
    exposedHeaders: [
        'Content-Length',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
    ],
    
    // Credentials (cookie, authorization header) kullanımı
    credentials: true,
    
    // Preflight isteklerinin cache süresi
    maxAge: 86400, // 24 saat
    
    // OPTIONS isteklerini otomatik cevapla
    preflightContinue: false,
    
    // Başarılı OPTIONS cevabı
    optionsSuccessStatus: 204
};

module.exports = { corsConfig };
