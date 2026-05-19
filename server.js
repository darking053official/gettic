const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }
});

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    // Sadece statik dosyaları önbelleğe al, API'leri elleme
    if (req.url.match(/\.(js|css|png|jpg|svg|ico|woff|woff2|ttf)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
    next();
});

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
    if (req.url.endsWith('.js') || req.url.endsWith('.jsx')) res.type('application/javascript');
    if (req.url.endsWith('.css')) res.type('text/css');
    if (req.url.endsWith('.json')) res.type('application/json');
    next();
});

// ==================== MONGOOSE SCHEMALAR ====================
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },
    status: { type: String, default: 'online' },
    lastSeen: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
    channelId: { type: String, required: true, index: true },
    content: { type: String, default: '' },
    senderName: { type: String, required: true },
    senderId: { type: String, required: true },
    reactions: { type: Object, default: {} },
    edited: { type: Boolean, default: false },
    image: { type: String, default: null },
    file: { type: Object, default: null },
    createdAt: { type: Date, default: Date.now, index: true }
});
const Message = mongoose.model('Message', MessageSchema);

const ChannelSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, default: 'text' },
    category: { type: String, default: 'METİN' },
    topic: { type: String, default: '' },
    serverId: { type: String, default: 'gettic' },
    createdBy: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Channel = mongoose.model('Channel', ChannelSchema);

const DMSchema = new mongoose.Schema({
    participants: [{ type: String }],
    messages: [{
        sender: String,
        text: String,
        time: { type: Date, default: Date.now }
    }],
    updatedAt: { type: Date, default: Date.now }
});
const DM = mongoose.model('DM', DMSchema);

const BotSchema = new mongoose.Schema({
    name: { type: String, required: true },
    prefix: { type: String, default: '/' },
    token: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    ownerName: { type: String, required: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Bot = mongoose.model('Bot', BotSchema);

const WebhookSchema = new mongoose.Schema({
    name: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    channelId: { type: String, default: 'genel-sohbet' },
    ownerId: { type: String, required: true },
    active: { type: Boolean, default: true },
    callCount: { type: Number, default: 0 },
    lastCall: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});
const Webhook = mongoose.model('Webhook', WebhookSchema);

const ApiListSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now }
});
const ApiList = mongoose.model('ApiList', ApiListSchema);

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

// ==================== AUTH MIDDLEWARE ====================
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

// ==================== CORS HEADERS ====================
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://gettic.js.org');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// ==================== STATİK DOSYALAR ====================
app.use('/app', express.static(path.join(__dirname, 'app'), {
    maxAge: '7d',
    fallthrough: true
}));
app.use(express.static(path.join(__dirname)));

// ==================== ANA SAYFALAR ====================
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/ai', (req, res) => { res.sendFile(path.join(__dirname, 'ai', 'index.html')); });
app.get('/mc', (req, res) => { res.sendFile(path.join(__dirname, 'mc', 'index.html')); });
app.get('/apis/list', (req, res) => { res.sendFile(path.join(__dirname, 'apis', 'list.html')); });
app.get('/apis/list/add', (req, res) => { res.sendFile(path.join(__dirname, 'apis', 'add.html')); });

// ==================== SPA - EN ALTTA ====================
app.get('/app', (req, res) => { res.sendFile(path.join(__dirname, 'app', 'index.html')); });
app.get('/app/*', (req, res) => { res.sendFile(path.join(__dirname, 'app', 'index.html')); });

// ==================== AUTH ENDPOINTS ====================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter' });
        if (!password || password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter' });
        
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
        
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, username: user.username } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/me', authMiddleware, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password;
        const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/me', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.userId);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== KANAL ENDPOINTS ====================
app.get('/api/channels', authMiddleware, async (req, res) => {
    try {
        const channels = await Channel.find({ serverId: req.query.server || 'gettic' });
        res.json(channels);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/channels', authMiddleware, async (req, res) => {
    try {
        const existing = await Channel.findOne({ id: req.body.id });
        if (existing) {
            Object.assign(existing, req.body);
            await existing.save();
            return res.json(existing);
        }
        const channel = new Channel(req.body);
        await channel.save();
        res.json(channel);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/channels/:channelId', authMiddleware, async (req, res) => {
    try {
        const channel = await Channel.findOneAndUpdate(
            { id: req.params.channelId },
            req.body,
            { new: true }
        );
        if (!channel) return res.status(404).json({ error: 'Kanal bulunamadı' });
        res.json(channel);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/channels/:channelId', authMiddleware, async (req, res) => {
    try {
        await Channel.deleteOne({ id: req.params.channelId });
        await Message.deleteMany({ channelId: req.params.channelId });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== MESAJ ENDPOINTS ====================
app.get('/api/channels/:channelId/messages', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const messages = await Message.find({ channelId: req.params.channelId })
            .sort({ createdAt: -1 }).limit(limit);
        res.json(messages.reverse());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/channels/:channelId/messages', authMiddleware, async (req, res) => {
    try {
        const msg = new Message({
            ...req.body,
            channelId: req.params.channelId
        });
        await msg.save();
        res.json(msg);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/channels/:channelId/messages/:msgId', authMiddleware, async (req, res) => {
    try {
        const msg = await Message.findByIdAndUpdate(
            req.params.msgId,
            { content: req.body.content, edited: true },
            { new: true }
        );
        if (!msg) return res.status(404).json({ error: 'Mesaj bulunamadı' });
        res.json(msg);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/channels/:channelId/messages/:msgId', authMiddleware, async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.msgId);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== DM ENDPOINTS ====================
app.get('/api/dm/:username', authMiddleware, async (req, res) => {
    try {
        const dms = await DM.find({
            participants: { $all: [req.userId, req.params.username] }
        }).sort({ updatedAt: -1 });
        res.json(dms);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dm/send', authMiddleware, async (req, res) => {
    try {
        const { to, text } = req.body;
        const participants = [req.userId, to].sort();
        
        let dm = await DM.findOne({ participants: { $all: participants, $size: 2 } });
        if (!dm) {
            dm = new DM({ participants, messages: [] });
        }
        
        dm.messages.push({
            sender: req.userId,
            text,
            time: new Date()
        });
        dm.updatedAt = new Date();
        await dm.save();
        
        res.json(dm);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== KULLANICI ENDPOINTS ====================
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username avatar status createdAt').sort({ createdAt: -1 }).limit(50);
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const users = await User.find({}, 'username avatar createdAt').sort({ createdAt: -1 }).limit(limit);
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        const users = await User.find({ username: { $regex: q, $options: 'i' } }, 'username avatar').limit(20);
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/suggestions', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.userId } }, 'username avatar').sort({ createdAt: -1 }).limit(10);
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user/roles', authMiddleware, async (req, res) => {
    try {
        res.json({}); // Rol sistemi localStorage'da
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/roles', authMiddleware, async (req, res) => {
    try {
        res.json({ success: true }); // Rol sistemi localStorage'da
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== BOT ENDPOINTS ====================
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

// ==================== WEBHOOK ENDPOINTS ====================
app.get('/api/webhooks', authMiddleware, async (req, res) => {
    try {
        const webhooks = await Webhook.find({ ownerId: req.userId });
        res.json(webhooks);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/webhooks', authMiddleware, async (req, res) => {
    try {
        const { name, channelId } = req.body;
        if (!name) return res.status(400).json({ error: 'Webhook adı gerekli' });
        const token = 'wh_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const webhook = new Webhook({ name, token, channelId: channelId || 'genel-sohbet', ownerId: req.userId });
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

// Webhook tetikleme (dışarıdan çağrılır)
app.post('/api/webhooks/:webhookId/:token', async (req, res) => {
    try {
        const { webhookId, token } = req.params;
        const { content, username, avatar_url } = req.body;
        
        if (!content) return res.status(400).json({ error: 'content gerekli' });
        
        const webhook = await Webhook.findOne({ _id: webhookId, token });
        if (!webhook) return res.status(404).json({ error: 'Webhook bulunamadı' });
        if (!webhook.active) return res.status(403).json({ error: 'Webhook pasif' });
        
        const msg = {
            channelId: webhook.channelId,
            content,
            senderName: username || webhook.name,
            senderId: 'webhook_' + webhookId,
            createdAt: new Date().toISOString()
        };
        
        io.to(webhook.channelId).emit('new_message', msg);
        
        webhook.callCount = (webhook.callCount || 0) + 1;
        webhook.lastCall = new Date();
        await webhook.save();
        
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== AI ENDPOINTS ====================
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId, chatId, mode } = req.body;
        if (!message?.trim()) return res.status(400).json({ error: 'Mesaj gerekli' });
        if (!sessionId) return res.status(400).json({ error: 'Kullanıcı adı gerekli' });

        const username = sessionId;
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const todayChats = await Chat.countDocuments({ username, createdAt: { $gte: today } });
        if (todayChats >= 15) return res.status(429).json({ error: 'Günlük limit doldu (15/15)', remainingChats: 0 });

        let chat = chatId ? await Chat.findById(chatId) : null;
        if (!chat) chat = new Chat({ username, sessionId, messages: [] });

        const systemPrompt = mode === 'think'
            ? 'Sen derin düşünen, analitik bir asistansın. İsmin Gettic AI.'
            : 'Sen hızlı ve pratik bir asistansın. İsmin Gettic AI. Kısa, net cevaplar ver.';

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chat.messages.slice(-15).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message }
        ];

        chat.messages.push({ role: 'user', content: message, timestamp: new Date() });

        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.AI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama3.1-8b', messages, max_tokens: mode==='think'?800:250, temperature: mode==='think'?0.8:0.4 })
        });

        const data = await response.json();
        if (!response.ok) return res.status(500).json({ error: 'AI API hatası' });

        const reply = data.choices[0].message.content;
        chat.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
        chat.updatedAt = new Date();
        await chat.save();

        res.json({ reply, chatId: chat._id, remainingChats: 15 - todayChats - 1 });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/chats/:username', async (req, res) => {
    try {
        const chats = await Chat.find({ username: req.params.username }).sort({ updatedAt: -1 }).limit(10);
        res.json(chats.map(c => ({ id: c._id, messageCount: c.messages.length, lastMessage: c.messages[c.messages.length-1]?.content?.substring(0,50), createdAt: c.createdAt, updatedAt: c.updatedAt })));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/chat/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Sohbet bulunamadı' });
        res.json(chat);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/chat/:id', async (req, res) => {
    try { await Chat.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== GÖRSEL OLUŞTURMA ====================
app.post('/api/image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt gerekli' });
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random()*100000)}`;
        res.json({ success: true, image: imageUrl, prompt });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== EMAİL GÖNDERME ====================
const transporter = nodemailer.createTransport({
    host: 'smtp.elasticemail.com',
    port: 2525,
    secure: false,
    auth: {
        user: 'tahakrky@protonmail.com',
        pass: process.env.EMAIL_TOKEN
    }
});

app.post('/api/email/send', async (req, res) => {
    try {
        const { to, subject, html } = req.body;
        if (!to || !subject || !html) return res.status(400).json({ error: 'Eksik bilgi' });

        await transporter.sendMail({
            from: '"Gettic" <tahakrky@protonmail.com>',
            to: to,
            subject: subject,
            html: html
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/email/test', async (req, res) => {
    try {
        // Önce transporter'ın çalıştığını kontrol et
        if (!transporter) {
            return res.json({ error: 'transporter tanımlı değil' });
        }
        
        const info = await transporter.sendMail({
            from: '"Gettic" <tahakrky@protonmail.com>',
            to: 'tahakrky@protonmail.com',
            subject: 'Gettic Test',
            html: '<p>Test</p>'
        });
        res.json({ success: true, id: info.messageId });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// ==================== API LIST ====================
app.get('/api/list', async (req, res) => {
    try {
        const items = await ApiList.find().sort({ key: 1 });
        if (items.length === 0) {
            const cats = ['auth','user','message','channel','system'];
            const defs = [];
            cats.forEach(c => { for(let i=1;i<=20;i++) defs.push({ key: `${c}_${i}`, value: null }); });
            await ApiList.insertMany(defs);
            return res.json({ status: 'ok', total: 100, data: {} });
        }
        const data = {};
        items.forEach(i => data[i.key] = i.value);
        res.json({ status: 'ok', total: items.length, data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/list/bulk', async (req, res) => {
    try {
        const ops = Object.entries(req.body.data||{}).map(([k,v]) => ({ updateOne: { filter: { key: k }, update: { $set: { value: v||null, updatedAt: new Date() } }, upsert: true } }));
        if (ops.length) await ApiList.bulkWrite(ops);
        res.json({ status: 'ok', message: `${ops.length} endpoint güncellendi` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/list/reset', async (req, res) => {
    try {
        await ApiList.deleteMany({});
        const cats = ['auth','user','message','channel','system'];
        const defs = [];
        cats.forEach(c => { for(let i=1;i<=20;i++) defs.push({ key: `${c}_${i}`, value: null }); });
        await ApiList.insertMany(defs);
        res.json({ status: 'ok', message: 'Sıfırlandı' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => { res.json({ status: 'ok', timestamp: new Date() }); });

// ==================== 404 ====================
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
    console.log('🔌 Yeni socket:', socket.id);
    
    socket.on('join_channel', (channelId) => { socket.join(channelId); });
    socket.on('leave_channel', (channelId) => { socket.leave(channelId); });
    
    socket.on('send_message', async (data) => {
        io.to(data.channelId).emit('new_message', data);
    });
    
    socket.on('typing', ({ channelId, username }) => {
        socket.to(channelId).emit('user_typing', { username, channelId });
    });
    
    socket.on('voice_join', (data) => { socket.to(data.channel).emit('user_joined_voice', { userId: socket.id }); });
    socket.on('voice_leave', (data) => { socket.to(data?.channel).emit('user_left_voice', { userId: socket.id }); });
    
    socket.on('disconnect', () => { console.log('🔌 Socket ayrıldı:', socket.id); });
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB bağlantısı başarılı');
        httpServer.listen(PORT, () => { console.log(`🚀 Gettic API ${PORT} portunda çalışıyor`); });
    })
    .catch(err => console.error('❌ MongoDB bağlantı hatası:', err));
