// ============================================
// GETTIC - MIDDLEWARE/SANITIZE.JS
// XSS ve input temizleme middleware
// ============================================

const xss = require('xss');
const { logger } = require('../utils/logger');

// XSS temizleme seçenekleri
const xssOptions = {
    whiteList: {}, // Tüm HTML etiketlerini engelle
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
};

// String temizleme
function sanitizeString(str) {
    if (!str || typeof str !== 'string') return str;
    return xss(str.trim(), xssOptions);
}

// Object temizleme
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' ? sanitizeString(item) : 
                typeof item === 'object' ? sanitizeObject(item) : item
            );
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

// Sanitize middleware
function sanitize(req, res, next) {
    try {
        if (req.body) {
            req.body = sanitizeObject(req.body);
        }
        
        if (req.query) {
            req.query = sanitizeObject(req.query);
        }
        
        if (req.params) {
            req.params = sanitizeObject(req.params);
        }
        
        next();
    } catch (error) {
        logger.error('Sanitize hatası:', error);
        return res.status(400).json({
            success: false,
            error: 'Geçersiz input'
        });
    }
}

// SQL injection koruması
function preventSqlInjection(value) {
    if (typeof value !== 'string') return value;
    
    // Tehlikeli karakterleri temizle
    return value
        .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, char => {
            switch (char) {
                case "\0":
                    return "\\0";
                case "\x08":
                    return "\\b";
                case "\x09":
                    return "\\t";
                case "\x1a":
                    return "\\z";
                case "\n":
                    return "\\n";
                case "\r":
                    return "\\r";
                case "\"":
                case "'":
                case "\\":
                case "%":
                    return "\\" + char;
                default:
                    return char;
            }
        });
}

module.exports = {
    sanitize,
    sanitizeString,
    sanitizeObject,
    preventSqlInjection
};
