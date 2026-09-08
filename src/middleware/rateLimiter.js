// ============================================
// GETTIC - MIDDLEWARE/RATELIMITER.JS
// Rate limiting middleware
// ============================================

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { environment } = require('../config/environment');

// Genel API rate limit
const apiLimiter = rateLimit({
    windowMs: environment.RATE_LIMIT_WINDOW_MS,
    max: environment.RATE_LIMIT_MAX,
    message: {
        success: false,
        error: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.clientIp || req.ip;
    }
});

// Login rate limit (daha sıkı)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 5, // 5 deneme
    message: {
        success: false,
        error: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Register rate limit
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    max: 3, // 3 kayıt
    message: {
        success: false,
        error: 'Çok fazla kayıt denemesi, lütfen 1 saat sonra tekrar deneyin'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Mesaj gönderme rate limit
const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 dakika
    max: 30, // 30 mesaj
    message: {
        success: false,
        error: 'Çok hızlı mesaj gönderiyorsunuz'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Dosya yükleme rate limit
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    max: 50, // 50 yükleme
    message: {
        success: false,
        error: 'Çok fazla dosya yüklediniz'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Slow down (kademeli yavaşlatma)
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 dakika
    delayAfter: 100, // 100 istekten sonra
    delayMs: 500 // 500ms gecikme
});

module.exports = {
    apiLimiter,
    loginLimiter,
    registerLimiter,
    messageLimiter,
    uploadLimiter,
    speedLimiter,
    rateLimiter: apiLimiter
};
