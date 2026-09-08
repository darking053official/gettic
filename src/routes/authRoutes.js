// ============================================
// GETTIC - ROUTES/AUTHROUTES.JS
// /api/auth rotaları
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

// Public rotalar
router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.updatePassword);

// Korumalı rotalar
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.updatePassword);
router.post('/verify-email/:token', authController.verifyEmail);

module.exports = router;
