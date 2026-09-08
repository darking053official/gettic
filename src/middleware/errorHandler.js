// ============================================
// GETTIC - MIDDLEWARE/ERRORHANDLER.JS
// Hata yakalama middleware
// ============================================

const { logger } = require('../utils/logger');
const { environment } = require('../config/environment');

// 404 handler
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: 'Endpoint bulunamadı'
    });
}

// Genel hata yakalayıcı
function errorHandler(err, req, res, next) {
    logger.error('Hata:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.clientIp
    });

    // Supabase hataları
    if (err.code && err.code.startsWith('PGRST')) {
        return res.status(400).json({
            success: false,
            error: 'Veritabanı hatası'
        });
    }

    // JWT hataları
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Geçersiz token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token süresi doldu'
        });
    }

    // Multer hataları
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Dosya boyutu çok büyük'
            });
        }
        
        return res.status(400).json({
            success: false,
            error: 'Dosya yükleme hatası'
        });
    }

    // Rate limit hataları
    if (err.name === 'RateLimitError') {
        return res.status(429).json({
            success: false,
            error: 'Çok fazla istek gönderdiniz'
        });
    }

    // Production'da detaylı hata gösterme
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 
        ? 'Sunucu hatası' 
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(environment.NODE_ENV === 'development' && {
            stack: err.stack
        })
    });
}

module.exports = {
    notFoundHandler,
    errorHandler
};
