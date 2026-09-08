// ============================================
// GETTIC - ROUTES/MESSAGEROUTES.JS
// /api/messages rotaları
// ============================================

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Tüm rotalar korumalı
router.use(authenticate);

// Sohbet mesajlarını getir
router.get('/:conversationId', messageController.getMessages);

// Mesaj gönder
router.post('/:conversationId', messageController.sendMessage);

// Mesaj düzenle
router.put('/:messageId', messageController.editMessage);

// Mesaj sil
router.delete('/:messageId', messageController.deleteMessage);

// Mesajı okundu işaretle
router.post('/:messageId/read', messageController.markAsRead);

// Sohbetteki tüm mesajları okundu işaretle
router.post('/:conversationId/read-all', messageController.markConversationAsRead);

// Mesaj ara
router.get('/:conversationId/search', messageController.searchMessages);

module.exports = router;
