// ============================================
// GETTIC - ROUTES/CHATROUTES.JS
// /api/chat rotaları
// ============================================

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Tüm rotalar korumalı
router.use(authenticate);

// Sohbet listesi
router.get('/', chatController.getConversations);

// Sohbet detayı
router.get('/:conversationId', chatController.getConversation);

// Direkt sohbet oluştur
router.post('/direct', chatController.createDirectConversation);

// Grup sohbeti oluştur
router.post('/group', chatController.createGroupConversation);

// Grup bilgilerini güncelle
router.put('/:conversationId', chatController.updateGroupInfo);

// Gruba üye ekle
router.post('/:conversationId/members', chatController.addGroupMember);

// Gruptan üye çıkar
router.delete('/:conversationId/members/:memberId', chatController.removeGroupMember);

// Sohbetten ayrıl
router.delete('/:conversationId/leave', chatController.leaveConversation);

module.exports = router;
