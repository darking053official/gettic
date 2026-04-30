const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const Bot = require('../models/Bot');
const User = require('../models/User');
const router = express.Router();

// AUTH MIDDLEWARE
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token gerekli' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Geçersiz token' });
    }
};

// BOT LİSTESİ
router.get('/', authMiddleware, async (req, res) => {
    try {
        const bots = await Bot.find({ ownerId: req.userId });
        res.json(bots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// BOT OLUŞTUR
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, prefix } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Bot adı gerekli' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        const token = 'bot_' + uuidv4().replace(/-/g, '').substring(0, 24);

        const bot = new Bot({
            name,
            prefix: prefix || '/',
            token,
            ownerId: req.userId,
            ownerName: user.username
        });

        await bot.save();
        res.status(201).json(bot);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// BOT SİL
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id);
        if (!bot) {
            return res.status(404).json({ error: 'Bot bulunamadı' });
        }
        if (bot.ownerId !== req.userId) {
            return res.status(403).json({ error: 'Bu botu silme yetkiniz yok' });
        }
        await bot.deleteOne();
        res.json({ success: true, message: 'Bot silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
