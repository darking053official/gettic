const express = require('express');
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const router = express.Router();

// Kanal mesajlarını getir
router.get('/:channelId', auth, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;
    let query = { channelId: req.params.channelId };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mesaj gönder
router.post('/:channelId', auth, async (req, res) => {
  try {
    const { content, replyTo } = req.body;
    const user = await require('../models/User').findById(req.userId);
    
    const message = new Message({
      channelId: req.params.channelId,
      senderId: req.userId,
      senderName: user.username,
      senderAvatar: user.avatar,
      content,
      replyTo
    });
    
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mesaj sil
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Mesaj bulunamadı' });
    if (message.senderId !== req.userId) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    
    await message.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mesaja tepki ekle
router.post('/:messageId/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Mesaj bulunamadı' });
    
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      if (!existingReaction.users.includes(req.userId)) {
        existingReaction.users.push(req.userId);
      }
    } else {
      message.reactions.push({ emoji, users: [req.userId] });
    }
    
    await message.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
