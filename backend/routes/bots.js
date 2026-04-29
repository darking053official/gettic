const express = require('express');
const auth = require('../middleware/auth');
const Bot = require('../models/Bot');
const router = express.Router();

// Bot listesi
router.get('/', auth, async (req, res) => {
  try {
    const bots = await Bot.find({ ownerId: req.userId });
    res.json(bots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bot oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { name, prefix, description } = req.body;
    const user = await require('../models/User').findById(req.userId);
    
    const token = 'bot_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const bot = new Bot({
      name,
      prefix: prefix || '/',
      description,
      token,
      ownerId: req.userId,
      ownerName: user.username
    });
    
    await bot.save();
    res.json(bot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bot sil
router.delete('/:id', auth, async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot bulunamadı' });
    if (bot.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    
    await bot.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Token yenile
router.post('/:id/regenerate', auth, async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot bulunamadı' });
    if (bot.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }
    
    bot.token = 'bot_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await bot.save();
    res.json({ token: bot.token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
