// ============================================
// GETTIC - ROUTES/USERROUTES.JS
// /api/users rotaları
// ============================================

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, usernameRules } = require('../middleware/validate');
const { upload, avatarUpload, handleUploadError } = require('../middleware/upload');
const { apiLimiter, uploadLimiter } = require('../middleware/rateLimiter');

// Tüm rotalar korumalı
router.use(authenticate);

// Kullanıcı ara
router.get('/search', userController.searchUsers);

// Kendi profilini getir
router.get('/me', userController.getMyProfile);

// Profili güncelle
router.put('/me', validate, usernameRules, userController.updateProfile);

// Avatar yükle
router.post('/me/avatar', 
    uploadLimiter,
    avatarUpload.single('avatar'),
    handleUploadError,
    userController.uploadAvatar
);

// Durum güncelle
router.put('/me/status', userController.updateStatus);

// Kullanıcı engelle
router.post('/block', userController.blockUser);

// Engeli kaldır
router.post('/unblock', userController.unblockUser);

// Engellenen kullanıcılar
router.get('/blocked/list', userController.getBlockedUsers);

// Kullanıcı profili getir (parametreli rotalar en sonda olmalı)
router.get('/:userId', userController.getUserProfile);

// Kullanıcı istatistikleri
router.get('/:userId/stats', userController.getUserStats);

module.exports = router;
