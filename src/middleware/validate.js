// ============================================
// GETTIC - MIDDLEWARE/VALIDATE.JS
// Input doğrulama middleware
// ============================================

const { validationResult, body, param, query } = require('express-validator');

// Doğrulama sonuçlarını kontrol et
function validate(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Doğrulama hatası',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    
    next();
}

// Register doğrulama kuralları
const registerRules = [
    body('email')
        .isEmail()
        .withMessage('Geçersiz email adresi')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Şifre en az 8 karakter olmalı')
        .matches(/[A-Z]/)
        .withMessage('Şifre en az bir büyük harf içermeli')
        .matches(/[0-9]/)
        .withMessage('Şifre en az bir rakam içermeli'),
    
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Kullanıcı adı 3-20 karakter arası olmalı')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir'),
    
    body('full_name')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Ad soyad en fazla 50 karakter olabilir')
];

// Login doğrulama kuralları
const loginRules = [
    body('email')
        .isEmail()
        .withMessage('Geçersiz email adresi')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Şifre gerekli')
];

// Mesaj gönderme doğrulama kuralları
const messageRules = [
    body('content')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Mesaj 2000 karakterden uzun olamaz'),
    
    body('type')
        .optional()
        .isIn(['text', 'image', 'video', 'voice', 'file'])
        .withMessage('Geçersiz mesaj tipi'),
    
    body('mediaUrl')
        .optional()
        .isURL()
        .withMessage('Geçersiz medya URL')
];

// Kullanıcı adı doğrulama
const usernameRules = [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Kullanıcı adı 3-20 karakter arası olmalı')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir')
];

// Grup oluşturma doğrulama
const groupRules = [
    body('name')
        .isLength({ min: 3, max: 50 })
        .withMessage('Grup adı 3-50 karakter arası olmalı'),
    
    body('memberIds')
        .isArray({ min: 1 })
        .withMessage('En az bir üye seçilmeli')
];

// ID doğrulama
const idParamRules = [
    param('id')
        .isUUID()
        .withMessage('Geçersiz ID formatı')
];

module.exports = {
    validate,
    registerRules,
    loginRules,
    messageRules,
    usernameRules,
    groupRules,
    idParamRules
};
