// ============================================
// GETTIC - UTILS/BCRYPT.JS
// Şifre hashleme
// ============================================

const bcrypt = require('bcryptjs');
const { environment } = require('../config/environment');
const { logger } = require('./logger');

// Şifre hashle
async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(environment.BCRYPT_ROUNDS);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (error) {
        logger.error('Şifre hashleme hatası:', error);
        return null;
    }
}

// Şifre karşılaştır
async function comparePassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        logger.error('Şifre karşılaştırma hatası:', error);
        return false;
    }
}

// Şifre gücü kontrolü
function checkPasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    const strengths = ['Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok Güçlü'];
    
    return {
        score: Math.min(score, 4),
        label: strengths[Math.min(score, 4)]
    };
}

// Rastgele şifre oluştur
function generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    
    return password;
}

module.exports = {
    hashPassword,
    comparePassword,
    checkPasswordStrength,
    generateRandomPassword
};
