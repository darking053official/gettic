// ============================================
// GETTIC - UTILS/JWT.JS
// JWT oluşturma ve doğrulama
// ============================================

const jwt = require('jsonwebtoken');
const { environment } = require('../config/environment');
const { logger } = require('./logger');

// Access token oluştur
function generateToken(payload, expiresIn = null) {
    try {
        return jwt.sign(
            payload,
            environment.JWT_SECRET,
            {
                expiresIn: expiresIn || environment.JWT_EXPIRES_IN,
                issuer: 'gettic',
                audience: 'gettic-users'
            }
        );
    } catch (error) {
        logger.error('Token oluşturma hatası:', error);
        return null;
    }
}

// Refresh token oluştur
function generateRefreshToken(payload, expiresIn = null) {
    try {
        return jwt.sign(
            payload,
            environment.JWT_REFRESH_SECRET,
            {
                expiresIn: expiresIn || environment.JWT_REFRESH_EXPIRES_IN,
                issuer: 'gettic',
                audience: 'gettic-users'
            }
        );
    } catch (error) {
        logger.error('Refresh token oluşturma hatası:', error);
        return null;
    }
}

// Access token doğrula
function verifyToken(token) {
    try {
        return jwt.verify(token, environment.JWT_SECRET, {
            issuer: 'gettic',
            audience: 'gettic-users'
        });
    } catch (error) {
        logger.error('Token doğrulama hatası:', error.message);
        return null;
    }
}

// Refresh token doğrula
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, environment.JWT_REFRESH_SECRET, {
            issuer: 'gettic',
            audience: 'gettic-users'
        });
    } catch (error) {
        logger.error('Refresh token doğrulama hatası:', error.message);
        return null;
    }
}

// Token decode et (doğrulama yapmadan)
function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        logger.error('Token decode hatası:', error);
        return null;
    }
}

// Token süresi kontrol
function isTokenExpired(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
}

// Token'dan kullanıcı ID'si al
function getUserIdFromToken(token) {
    const decoded = verifyToken(token);
    return decoded ? decoded.sub : null;
}

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
    verifyRefreshToken,
    decodeToken,
    isTokenExpired,
    getUserIdFromToken
};
