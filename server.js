const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Schema'lar
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    password: { type: String, required: true, minlength: 6 },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const BotSchema = new mongoose.Schema({
    name: { type: String, required: true },
    prefix: { type: String, default: '/' },
    token: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    ownerName: { type: String, required: true },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Bot = mongoose.model('Bot', BotSchema);

const WebhookSchema = new mongoose.Schema({
    name: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Webhook = mongoose.model('Webhook', WebhookSchema);

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Geçersiz token' });
    }
};

// AI Chat Schema
const ChatSchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    chatCount: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', ChatSchema);

// ==================== AI ENDPOINTS ====================
// ==================== AI ENDPOINTS ====================

app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId, history } = req.body;
        
        if (!message?.trim()) {
            return res.status(400).json({ error: 'Mesaj gerekli' });
        }
        if (!sessionId) {
            return res.status(400).json({ error: 'Kullanıcı adı gerekli' });
        }

        const username = sessionId;

        // Kullanıcının bugünkü sohbet sayısını kontrol et
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayChats = await Chat.countDocuments({
            username: username,
            createdAt: { $gte: today }
        });

        if (todayChats >= 15) {
            return res.status(429).json({ error: 'Günlük sohbet limitiniz doldu (15/15)' });
        }

        // Mevcut sohbeti bul veya yeni oluştur
        let chat = await Chat.findOne({ 
            username: username,
            updatedAt: { $gte: today }
        }).sort({ updatedAt: -1 });

        if (!chat) {
            chat = new Chat({
                username: username,
                sessionId: sessionId,
                messages: [{ role: 'system', content: 'Sen hatasız Türkçe konuşan akıllı bir asistansın. İsmin Gettic AI. Kullanıcıya adıyla hitap et. Kısa, öz ve samimi cevaplar ver.' }]
            });
        }

        // Kullanıcı mesajını ekle
        chat.messages.push({ role: 'user', content: message, timestamp: new Date() });

        // Cerebras API çağrısı
        const messagesToSend = chat.messages.slice(-20).map(m => ({
            role: m.role,
            content: m.content
        }));

        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.AI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                messages: messagesToSend,
                max_tokens: 500
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(500).json({ error: 'AI API hatası', details: data });
        }

        const reply = data.choices[0].message.content;

        // AI yanıtını kaydet
        chat.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
        chat.updatedAt = new Date();
        await chat.save();

        res.json({ 
            reply: reply,
            chatId: chat._id,
            messageCount: chat.messages.length,
            remainingChats: 15 - todayChats
        });

    } catch (error) {
        console.error('AI Hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

// Kullanıcının sohbet geçmişini getir
app.get('/api/chats/:username', async (req, res) => {
    try {
        const chats = await Chat.find({ 
            username: req.params.username 
        }).sort({ updatedAt: -1 }).limit(10);
        
        res.json(chats.map(c => ({
            id: c._id,
            messageCount: c.messages.length,
            lastMessage: c.messages[c.messages.length - 1]?.content?.substring(0, 50),
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Belirli sohbeti getir
app.get('/api/chat/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Sohbet bulunamadı' });
        res.json(chat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sohbet sil
app.delete('/api/chat/:id', async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI sayfası
app.get('/ai', (req, res) => {
    res.sendFile(path.join(__dirname, 'ai', 'index.html'));
});

// ==================== API ROUTES ====================

// Ana sayfa (API bilgilendirme)
app.get('/', (req, res) => {
    res.json({
        name: 'Gettic API',
        version: '2.0.0',
        endpoints: {
            auth: '/api/auth',
            bots: '/api/bots',
            webhooks: '/api/webhooks',
            health: '/api/health',
            ai: '/ai'
        },
        frontend: 'https://gettic.js.org'
    });
});

// CORS headers for frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://gettic.js.org');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter' });
        if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter' });
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Kullanıcı adı zaten alınmış' });
        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashed });
        await user.save();
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, username: user.username } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Şifre yanlış' });
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, username: user.username } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bot Routes
app.get('/api/bots', authMiddleware, async (req, res) => {
    try {
        const bots = await Bot.find({ ownerId: req.userId });
        res.json(bots);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bots', authMiddleware, async (req, res) => {
    try {
        const { name, prefix, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Bot adı gerekli' });
        const user = await User.findById(req.userId);
        const token = 'bot_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const bot = new Bot({ name, prefix: prefix || '/', token, ownerId: req.userId, ownerName: user.username, description });
        await bot.save();
        res.json(bot);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/bots/:id', authMiddleware, async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id);
        if (!bot) return res.status(404).json({ error: 'Bot bulunamadı' });
        if (bot.ownerId !== req.userId) return res.status(403).json({ error: 'Yetkiniz yok' });
        await bot.deleteOne();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Webhook Routes
app.get('/api/webhooks', authMiddleware, async (req, res) => {
    try {
        const webhooks = await Webhook.find({ ownerId: req.userId });
        res.json(webhooks);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/webhooks', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Webhook adı gerekli' });
        const token = 'wh_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const webhook = new Webhook({ name, token, ownerId: req.userId });
        await webhook.save();
        res.json(webhook);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/webhooks/:id', authMiddleware, async (req, res) => {
    try {
        const webhook = await Webhook.findById(req.params.id);
        if (!webhook) return res.status(404).json({ error: 'Webhook bulunamadı' });
        if (webhook.ownerId !== req.userId) return res.status(403).json({ error: 'Yetkiniz yok' });
        await webhook.deleteOne();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
    console.log('🔌 Yeni socket bağlantısı:', socket.id);
    
    socket.on('join_channel', (channelId) => {
        socket.join(channelId);
        console.log(`📡 ${socket.id} joined channel: ${channelId}`);
    });
    
    socket.on('leave_channel', (channelId) => {
        socket.leave(channelId);
    });
    
    socket.on('send_message', async (data) => {
        io.to(data.channelId).emit('new_message', data);
    });
    
    socket.on('typing', ({ channelId, username }) => {
        socket.to(channelId).emit('user_typing', { username, channelId });
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Socket ayrıldı:', socket.id);
    });
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB bağlantısı başarılı');
        httpServer.listen(PORT, () => {
            console.log(`🚀 Gettic API ${PORT} portunda çalışıyor`);
        });
    })
    .catch(err => console.error('❌ MongoDB bağlantı hatası:', err));
