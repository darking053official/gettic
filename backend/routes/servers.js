const express = require('express');
const auth = require('../middleware/auth');
const Server = require('../models/Server');
const Channel = require('../models/Channel');
const router = express.Router();

// Tüm sunucularım
router.get('/', auth, async (req, res) => {
  try {
    const servers = await Server.find({ 'members.userId': req.userId });
    res.json(servers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sunucu oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, icon, banner, template } = req.body;
    const user = await require('../models/User').findById(req.userId);
    
    const server = new Server({
      name,
      description,
      icon,
      banner,
      ownerId: req.userId,
      ownerName: user.username,
      members: [{ userId: req.userId, username: user.username, roles: ['owner'] }],
      inviteCode: Math.random().toString(36).substring(2, 10),
      template: template || 'default'
    });
    
    await server.save();
    
    // Varsayılan kanalları oluştur
    const channels = [
      { name: 'genel', type: 'text', serverId: server._id },
      { name: 'sohbet', type: 'text', serverId: server._id },
      { name: 'sesli', type: 'voice', serverId: server._id }
    ];
    await Channel.insertMany(channels);
    
    res.json(server);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sunucuya katıl (davet kodu ile)
router.post('/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const server = await Server.findOne({ inviteCode });
    if (!server) {
      return res.status(404).json({ error: 'Sunucu bulunamadı' });
    }
    
    const user = await require('../models/User').findById(req.userId);
    const alreadyMember = server.members.some(m => m.userId === req.userId);
    
    if (!alreadyMember) {
      server.members.push({ userId: req.userId, username: user.username, roles: ['member'] });
      await server.save();
    }
    
    res.json(server);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sunucu sil
router.delete('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) return res.status(404).json({ error: 'Sunucu bulunamadı' });
    if (server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    
    await Channel.deleteMany({ serverId: server._id });
    await server.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sunucu kanalları
router.get('/:id/channels', auth, async (req, res) => {
  try {
    const channels = await Channel.find({ serverId: req.params.id });
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
