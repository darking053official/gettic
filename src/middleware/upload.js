// ============================================
// GETTIC - MIDDLEWARE/UPLOAD.JS
// Dosya yükleme middleware (Multer)
// ============================================

const multer = require('multer');
const path = require('path');
const { logger } = require('../utils/logger');
const { environment } = require('../config/environment');

// Dosya filtreleme
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // Görseller
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        // Videolar
        'video/mp4',
        'video/webm',
        // Ses
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        // Dökümanlar
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Desteklenmeyen dosya tipi'), false);
    }
};

// Memory storage kullan (Supabase'e direkt yükleme için)
const storage = multer.memoryStorage();

// Upload middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(environment.MAX_FILE_SIZE) || 20 * 1024 * 1024, // 20MB
        files: 1
    }
});

// Avatar upload middleware
const avatarUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Sadece görsel dosyaları yüklenebilir'), false);
        }
    },
    limits: {
        fileSize: parseInt(environment.MAX_AVATAR_SIZE) || 2 * 1024 * 1024, // 2MB
        files: 1
    }
});

// Dosya yükleme hata yakalama
function handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Dosya boyutu çok büyük'
            });
        }
        
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Çok fazla dosya yüklendi'
            });
        }
        
        return res.status(400).json({
            success: false,
            error: 'Dosya yükleme hatası'
        });
    }
    
    if (err) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    
    next();
}

module.exports = {
    upload,
    avatarUpload,
    handleUploadError
};
