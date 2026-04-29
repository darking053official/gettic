const express = require('express');
const auth = require('../middleware/auth');
const Channel = require('../models/Channel');
const Server = require('../models/Server');
const router = express.Router();

// Kanal oluştur
router.post('/:serverId', auth, async (req, res) => {
  try {
    const { name, type, category, topic } = req.body;
    const server = await Server.findById(req.params.serverId);
    if (!server) return res.status(404).json({ error: 'Sunucu bulunamadı' });
    
    const isOwner = server.ownerId === req.userId;
    const isMod = server.members.some(m => m.userId === req.userId && m.roles.includes('mod'));
    if (!isOwner && !isMod) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    
    const channel = new Channel({ name, type, category, topic, serverId: req.params.serverId });
    await channel.save();
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kanal sil
router.delete('/:serverId/:channelId', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) return res.status(404).json({ error: 'Sunucu bulunamadı' });
    
    const isOwner = server.ownerId === req.userId;
    const isMod = server.members.some(m => m.userId === req.userId && m.roles.includes('mod'));
    if (!isOwner && !isMod) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    
    await Channel.findByIdAndDelete(req.params.channelId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
