const express = require('express');
const auth = require('../middleware/auth');
const Webhook = require('../models/Webhook');
const Server = require('../models/Server');
const Message = require('../models/Message');
const router = express.Router();

// Webhook listesi
router.get('/', auth, async (req, res) => {
  try {
    const webhooks = await Webhook.find({ ownerId: req.userId });
    res.json(webhooks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { name, serverId, channelId } = req.body;
    
    const server = await Server.findById(serverId);
    if (!server) return res.status(404).json({ error: 'Sunucu bulunamadı' });
    
    const isOwner = server.ownerId === req.userId;
    const isMod = server.members.some(m => m.userId === req.userId && m.roles.includes('mod'));
    if (!isOwner && !isMod) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    
    const token = 'wh_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const webhook = new Webhook({
      name,
      token,
      serverId,
      channelId,
      ownerId: req.userId
    });
    
    await webhook.save();
    res.json(webhook);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook sil
router.delete('/:id', auth, async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ error: 'Webhook bulunamadı' });
    if (webhook.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    
    await webhook.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook ile mesaj gönder (PUBLIC - token ile)
router.post('/:token', async (req, res) => {
  try {
    const { content, embed } = req.body;
    const webhook = await Webhook.findOne({ token: req.params.token });
    if (!webhook) return res.status(404).json({ error: 'Webhook bulunamadı' });
    
    const message = new Message({
      channelId: webhook.channelId,
      senderId: 'webhook_' + webhook._id,
      senderName: webhook.name,
      content: content || embed?.title || 'Webhook mesajı',
      isBot: true,
      botName: webhook.name
    });
    
    await message.save();
    res.json({ success: true, messageId: message._id, channelId: webhook.channelId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
