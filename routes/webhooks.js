const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const Webhook = require('../models/Webhook');
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

// WEBHOOK LİSTESİ
router.get('/', authMiddleware, async (req, res) => {
    try {
        const webhooks = await Webhook.find({ ownerId: req.userId });
        res.json(webhooks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WEBHOOK OLUŞTUR
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Webhook adı gerekli' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        const token = 'wh_' + uuidv4().replace(/-/g, '').substring(0, 24);

        const webhook = new Webhook({
            name,
            token,
            ownerId: req.userId
        });

        await webhook.save();
        res.status(201).json(webhook);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WEBHOOK SİL
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const webhook = await Webhook.findById(req.params.id);
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook bulunamadı' });
        }
        if (webhook.ownerId !== req.userId) {
            return res.status(403).json({ error: 'Bu webhooku silme yetkiniz yok' });
        }
        await webhook.deleteOne();
        res.json({ success: true, message: 'Webhook silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WEBHOOK İLE MESAJ GÖNDER (PUBLIC)
router.post('/:token', async (req, res) => {
    try {
        const { content } = req.body;
        const webhook = await Webhook.findOne({ token: req.params.token });
        
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook bulunamadı' });
        }

        console.log(`📨 Webhook "${webhook.name}" mesaj gönderdi: ${content}`);

        res.json({
            success: true,
            message: 'Mesaj başarıyla gönderildi',
            webhook: webhook.name,
            timestamp: new Date()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
