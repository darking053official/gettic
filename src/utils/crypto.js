// ============================================
// GETTIC - UTILS/CRYPTO.JS
// AES şifreleme
// ============================================

const crypto = require('crypto');
const { environment } = require('../config/environment');
const { logger } = require('./logger');

// AES-256-GCM şifreleme
function encrypt(text, key = environment.JWT_SECRET) {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key.slice(0, 32)), iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            iv: iv.toString('hex'),
            encryptedData: encrypted,
            authTag: authTag.toString('hex')
        };
    } catch (error) {
        logger.error('Şifreleme hatası:', error);
        return null;
    }
}

// AES-256-GCM çözme
function decrypt(encryptedData, iv, authTag, key = environment.JWT_SECRET) {
    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(key.slice(0, 32)),
            Buffer.from(iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        logger.error('Çözme hatası:', error);
        return null;
    }
}

// Basit şifreleme (mesaj içeriği için)
function simpleEncrypt(text, key = environment.JWT_SECRET) {
    try {
        const cipher = crypto.createCipher('aes-256-ctr', key.slice(0, 32));
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    } catch (error) {
        logger.error('Basit şifreleme hatası:', error);
        return null;
    }
}

// Basit çözme
function simpleDecrypt(encryptedText, key = environment.JWT_SECRET) {
    try {
        const decipher = crypto.createDecipher('aes-256-ctr', key.slice(0, 32));
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        logger.error('Basit çözme hatası:', error);
        return null;
    }
}

// Hash oluştur (SHA-256)
function createHash(text) {
    try {
        return crypto.createHash('sha256').update(text).digest('hex');
    } catch (error) {
        logger.error('Hash oluşturma hatası:', error);
        return null;
    }
}

// HMAC oluştur
function createHmac(text, key = environment.JWT_SECRET) {
    try {
        return crypto.createHmac('sha256', key).update(text).digest('hex');
    } catch (error) {
        logger.error('HMAC oluşturma hatası:', error);
        return null;
    }
}

// Rastgele token oluştur
function generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Rastgele ID oluştur
function generateRandomId() {
    return crypto.randomUUID();
}

module.exports = {
    encrypt,
    decrypt,
    simpleEncrypt,
    simpleDecrypt,
    createHash,
    createHmac,
    generateRandomToken,
    generateRandomId
};
