// ============================================
// GETTIC - SECURITY/CSRF.JS
// CSRF koruması
// ============================================

const crypto = require('crypto');
const { environment } = require('../config/environment');
const { logger } = require('../utils/logger');

// CSRF token oluştur
function generateCsrfToken() {
    try {
        return crypto.randomBytes(32).toString('hex');
    } catch (error) {
        logger.error('CSRF token oluşturma hatası:', error);
        return null;
    }
}

// CSRF token doğrula
function validateCsrfToken(req, res, next) {
    try {
        // GET isteklerini atla
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            return next();
        }
        
        // Token'ı header'dan al
        const token = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
        
        if (!token) {
            return res.status(403).json({
                success: false,
                error: 'CSRF token eksik'
            });
        }
        
        // Session'daki token ile karşılaştır
        const sessionToken = req.session?.csrfToken;
        
        if (!sessionToken || token !== sessionToken) {
            return res.status(403).json({
                success: false,
                error: 'Geçersiz CSRF token'
            });
        }
        
        next();
    } catch (error) {
        logger.error('CSRF doğrulama hatası:', error);
        return res.status(500).json({
            success: false,
            error: 'CSRF doğrulama hatası'
        });
    }
}

// CSRF middleware (session'a token ekle)
function csrfMiddleware(req, res, next) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = generateCsrfToken();
    }
    
    // Token'ı response header'ına ekle
    res.setHeader('X-CSRF-Token', req.session.csrfToken);
    
    // Token'ı cookie'ye ekle
    res.cookie('XSRF-TOKEN', req.session.csrfToken, {
        httpOnly: false,
        secure: environment.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400000 // 24 saat
    });
    
    next();
}

// Double submit cookie pattern
function doubleSubmitCookie(req, res, next) {
    try {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            return next();
        }
        
        const headerToken = req.headers['x-csrf-token'];
        const cookieToken = req.cookies['XSRF-TOKEN'];
        
        if (!headerToken || !cookieToken || headerToken !== cookieToken) {
            return res.status(403).json({
                success: false,
                error: 'CSRF token eşleşmiyor'
            });
        }
        
        next();
    } catch (error) {
        logger.error('Double submit cookie hatası:', error);
        return res.status(500).json({
            success: false,
            error: 'CSRF doğrulama hatası'
        });
    }
}

module.exports = {
    generateCsrfToken,
    validateCsrfToken,
    csrfMiddleware,
    doubleSubmitCookie
};
