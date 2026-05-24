// ╔══════════════════════════════════════════════════════════════════╗
// ║                    GETTIC SERVER - MAX GÜVENLİK                  ║
// ╚══════════════════════════════════════════════════════════════════╝

require('dotenv').config();

// ==================== PAKETLER ====================
const https = require('https');
const dns = require('dns');
const crypto = require('crypto');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss');
const { createChallenge, verifySolution } = require('altcha-lib');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const useragent = require('express-useragent');
const requestIp = require('request-ip');

// ==================== RATE LIMITERS ====================
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip + req.headers['user-agent'],
    message: { error: 'Çok fazla deneme! 15 dakika bekle.' }
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    keyGenerator: (req) => req.ip,
    message: { error: 'Çok fazla istek! 1 dakika bekle.' }
});

const messageLimiter = rateLimit({
    windowMs: 3 * 1000,
    max: 1,
    keyGenerator: (req) => req.ip,
    message: { error: '3 saniye bekleyin.' }
});

const imageLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Çok fazla görsel! 1 dakika bekle.' }
});

// ==================== EXPRESS APP ====================
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: ['https://gettic.js.org', 'http://localhost:3000'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }
});

// ==================== GÜVENLİK MIDDLEWARE ====================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdn.socket.io", "https://cdnjs.cloudflare.com", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
            styleSrc: ["'self'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "'unsafe-inline'", "blob:"],
            imgSrc: ["'self'", "data:", "https:", "http:", "https://raw.githubusercontent.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            connectSrc: ["'self'", "wss://", "https://api.cerebras.ai", "https://image.pollinations.ai"],
            frameSrc: ["'none'"],
            mediaSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
}));

app.use(cors({
    origin: ['https://gettic.js.org', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 600
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(hpp({ whitelist: ['content', 'username', 'message'] }));
app.use(requestIp.mw());
app.use(useragent.express());

// XSS Sanitization
app.use((req, res, next) => {
    const sanitize = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = xss(obj[key], { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] });
            } else if (typeof obj[key] === 'object') {
                sanitize(obj[key]);
            }
        }
    };
    sanitize(req.body);
    sanitize(req.query);
    sanitize(req.params);
    next();
});

// IP ve User-Agent loglama
app.use((req, res, next) => {
    req.clientIp = requestIp.getClientIp(req);
    req.userAgent = req.useragent?.source || 'Unknown';
    next();
});

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
    next();
});

// Statik dosya önbelleği
app.use((req, res, next) => {
    if (req.url.match(/\.(js|css|png|jpg|svg|ico|woff|woff2|ttf)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
    next();
});

// ==================== MONGOOSE SCHEMALAR (MAX GÜVENLİK) ====================
const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'Kullanıcı adı zorunlu'], 
        unique: true, 
        trim: true, 
        minlength: [3, 'En az 3 karakter'],
        maxlength: [20, 'En fazla 20 karakter'],
        match: [/^[a-zA-Z0-9_]+$/, 'Sadece harf, rakam ve alt çizgi']
    },
    password: { 
        type: String, 
        required: [true, 'Şifre zorunlu'], 
        minlength: [6, 'En az 6 karakter'],
        maxlength: [100, 'Çok uzun şifre']
    },
    avatar: { type: String, default: '', maxlength: 500 },
    status: { type: String, default: 'online', enum: ['online', 'idle', 'dnd', 'offline'] },
    lastSeen: { type: Date, default: Date.now },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
    channelId: { type: String, required: true, index: true, maxlength: 50 },
    content: { type: String, default: '', maxlength: [2000, 'Mesaj çok uzun'] },
    senderName: { type: String, required: true, maxlength: [32, 'İsim çok uzun'] },
    senderId: { type: String, required: true },
    reactions: { type: Object, default: {} },
    edited: { type: Boolean, default: false },
    image: { type: String, default: null, maxlength: 2000 },
    file: { type: Object, default: null },
    ip: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: true }
});
const Message = mongoose.model('Message', MessageSchema);

const ChannelSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, match: [/^[a-zA-Z0-9_-]+$/, 'Geçersiz ID'] },
    name: { type: String, required: true, maxlength: [50, 'Kanal adı çok uzun'] },
    type: { type: String, default: 'text', enum: ['text', 'voice'] },
    category: { type: String, default: 'METİN', maxlength: 50 },
    topic: { type: String, default: '', maxlength: [200, 'Konu çok uzun'] },
    serverId: { type: String, default: 'gettic' },
    createdBy: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Channel = mongoose.model('Channel', ChannelSchema);

const DMSchema = new mongoose.Schema({
    participants: [{ type: String }],
    messages: [{
        sender: String,
        text: { type: String, maxlength: 2000 },
        time: { type: Date, default: Date.now }
    }],
    updatedAt: { type: Date, default: Date.now }
});
const DM = mongoose.model('DM', DMSchema);

const BotSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 32 },
    prefix: { type: String, default: '/', maxlength: 5 },
    token: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    ownerName: { type: String, required: true },
    description: { type: String, default: '', maxlength: 200 },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Bot = mongoose.model('Bot', BotSchema);

const WebhookSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 32 },
    token: { type: String, required: true, unique: true },
    channelId: { type: String, default: 'genel-sohbet' },
    ownerId: { type: String, required: true },
    active: { type: Boolean, default: true },
    callCount: { type: Number, default: 0, max: 1000 },
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
        content: { type: String, required: true, maxlength: 4000 },
        timestamp: { type: Date, default: Date.now }
    }],
    chatCount: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        
        // Kullanıcı var mı kontrol et
        const user = await User.findById(req.userId).select('_id');
        if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        
        next();
    } catch {
        res.status(401).json({ error: 'Geçersiz token' });
    }
};

// ==================== STATİK DOSYALAR ====================
app.use('/app', express.static(path.join(__dirname, 'app'), { maxAge: '7d', fallthrough: true }));
app.use(express.static(path.join(__dirname)));

// ==================== SAYFALAR ====================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/ai', (req, res) => res.sendFile(path.join(__dirname, 'ai', 'index.html')));
app.get('/mc', (req, res) => res.sendFile(path.join(__dirname, 'mc', 'index.html')));
app.get('/apis/list', (req, res) => res.sendFile(path.join(__dirname, 'apis', 'list.html')));
app.get('/apis/list/add', (req, res) => res.sendFile(path.join(__dirname, 'apis', 'add.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'app', 'index.html')));
app.get('/app/*', (req, res) => res.sendFile(path.join(__dirname, 'app', 'index.html')));

// GCaptcha doğrulama endpoint'i
app.post('/api/gcaptcha/verify', async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({ error: 'Token gerekli' });
    }
    
    // Token formatı: gcaptcha_TIMESTAMP_RANDOM
    if (!token.startsWith('gcaptcha_')) {
        return res.status(400).json({ error: 'Geçersiz token' });
    }
    
    const parts = token.split('_');
    if (parts.length < 3) {
        return res.status(400).json({ error: 'Geçersiz token formatı' });
    }
    
    const timestamp = parseInt(parts[1]);
    const random = parts[2];
    
    // 5 dakikadan eski token'lar geçersiz
    if (Date.now() - timestamp > 300000) {
        return res.status(400).json({ error: 'Token süresi doldu, lütfen tekrar doğrulayın' });
    }
    
    // Timestamp geçerli mi?
    if (isNaN(timestamp) || timestamp > Date.now()) {
        return res.status(400).json({ error: 'Geçersiz token zamanı' });
    }
    
    // Random kısmı minimum 6 karakter
    if (random.length < 6) {
        return res.status(400).json({ error: 'Geçersiz token' });
    }
    
    // Başarılı
    res.json({ 
        success: true, 
        message: 'Doğrulama başarılı',
        verified: true
    });
});

// ==================== AUTH ENDPOINTS ====================
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, password, altcha: payload } = req.body;
        if (!payload) return res.status(400).json({ error: 'Doğrulama gerekli' });
        const ok = await verifySolution(payload, process.env.ALTCHA_HMAC_KEY || crypto.randomBytes(32).toString('hex'));
        if (!ok) return res.status(400).json({ error: 'Doğrulama başarısız' });
        
        // Validasyon
        if (!username || username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter' });
        if (username.length > 20) return res.status(400).json({ error: 'Kullanıcı adı en fazla 20 karakter' });
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Geçersiz karakterler' });
        if (!password || password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter' });
        if (password.length > 100) return res.status(400).json({ error: 'Şifre çok uzun' });
        
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Kullanıcı adı alınmış' });
        
        const hashed = await bcrypt.hash(password, 12);
        const user = new User({ 
            username, 
            password: hashed,
            ip: req.clientIp,
            userAgent: req.userAgent
        });
        await user.save();
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, username: user.username } });
    } catch (err) { 
        console.error('Register hatası:', err.message);
        res.status(500).json({ error: 'Sunucu hatası' }); 
    }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { username, password, altcha: payload } = req.body;
        if (!payload) return res.status(400).json({ error: 'Doğrulama gerekli' });
        const ok = await verifySolution(payload, process.env.ALTCHA_HMAC_KEY || crypto.randomBytes(32).toString('hex'));
        if (!ok) return res.status(400).json({ error: 'Doğrulama başarısız' });
        
        if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
        
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        
        // Hesap kilitli mi?
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
            return res.status(423).json({ error: `Hesap kilitli! ${minutes} dakika bekle.` });
        }
        
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            if (user.loginAttempts >= 5) {
                user.lockedUntil = new Date(Date.now() + 30 * 60000); // 30 dakika kilit
            }
            await user.save();
            return res.status(401).json({ error: 'Şifre yanlış' });
        }
        
        // Başarılı giriş
        user.status = 'online';
        user.lastSeen = new Date();
        user.loginAttempts = 0;
        user.lockedUntil = null;
        user.ip = req.clientIp;
        user.userAgent = req.userAgent;
        await user.save();
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, username: user.username } });
    } catch (err) { 
        console.error('Login hatası:', err.message);
        res.status(500).json({ error: 'Sunucu hatası' }); 
    }
});

app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password -loginAttempts -lockedUntil');
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        res.json(user);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.put('/api/me', authMiddleware, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password;
        delete updates.username;
        delete updates._id;
        delete updates.loginAttempts;
        delete updates.lockedUntil;
        const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password -loginAttempts -lockedUntil');
        res.json(user);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.delete('/api/me', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.userId);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== KANAL ENDPOINTS ====================
app.get('/api/channels', authMiddleware, async (req, res) => {
    try {
        const channels = await Channel.find({ serverId: req.query.server || 'gettic' });
        res.json(channels);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/channels', authMiddleware, async (req, res) => {
    try {
        const { id, name } = req.body;
        if (!id || !name) return res.status(400).json({ error: 'ID ve isim gerekli' });
        if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Geçersiz kanal ID' });
        
        const existing = await Channel.findOne({ id });
        if (existing) {
            Object.assign(existing, req.body);
            await existing.save();
            return res.json(existing);
        }
        const channel = new Channel(req.body);
        await channel.save();
        res.json(channel);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.put('/api/channels/:channelId', authMiddleware, async (req, res) => {
    try {
        const channel = await Channel.findOneAndUpdate({ id: req.params.channelId }, req.body, { new: true });
        if (!channel) return res.status(404).json({ error: 'Kanal bulunamadı' });
        res.json(channel);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.delete('/api/channels/:channelId', authMiddleware, async (req, res) => {
    try {
        await Channel.deleteOne({ id: req.params.channelId });
        await Message.deleteMany({ channelId: req.params.channelId });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== MESAJ ENDPOINTS ====================
app.get('/api/channels/:channelId/messages', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 200);
        const messages = await Message.find({ channelId: req.params.channelId }).sort({ createdAt: -1 }).limit(limit);
        res.json(messages.reverse());
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/channels/:channelId/messages', authMiddleware, messageLimiter, async (req, res) => {
    try {
        const content = req.body.content?.trim();
        if (!content || content.length > 2000) return res.status(400).json({ error: 'Mesaj 1-2000 karakter arası olmalı' });
        
        const msg = new Message({ 
            ...req.body, 
            content,
            channelId: req.params.channelId,
            ip: req.clientIp
        });
        await msg.save();
        res.json(msg);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.put('/api/channels/:channelId/messages/:msgId', authMiddleware, async (req, res) => {
    try {
        const content = req.body.content?.trim();
        if (!content || content.length > 2000) return res.status(400).json({ error: 'Mesaj 1-2000 karakter arası olmalı' });
        
        const msg = await Message.findByIdAndUpdate(req.params.msgId, { content, edited: true }, { new: true });
        if (!msg) return res.status(404).json({ error: 'Mesaj bulunamadı' });
        res.json(msg);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.delete('/api/channels/:channelId/messages/:msgId', authMiddleware, async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.msgId);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== DM ENDPOINTS ====================
app.get('/api/dm/:username', authMiddleware, async (req, res) => {
    try {
        const dms = await DM.find({ participants: { $all: [req.userId, req.params.username] } }).sort({ updatedAt: -1 });
        res.json(dms);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/dm/send', authMiddleware, messageLimiter, async (req, res) => {
    try {
        const { to, text } = req.body;
        if (!text || text.length > 2000) return res.status(400).json({ error: 'Mesaj 1-2000 karakter arası olmalı' });
        
        const participants = [req.userId, to].sort();
        let dm = await DM.findOne({ participants: { $all: participants, $size: 2 } });
        if (!dm) dm = new DM({ participants, messages: [] });
        dm.messages.push({ sender: req.userId, text, time: new Date() });
        dm.updatedAt = new Date();
        await dm.save();
        res.json(dm);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== KULLANICI ENDPOINTS ====================
app.get('/api/users', apiLimiter, async (req, res) => {
    try {
        const users = await User.find({}, 'username avatar status createdAt').sort({ createdAt: -1 }).limit(50);
        res.json(users);
    } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.get('/api/users/recent', apiLimiter, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const users = await User.find({}, 'username avatar createdAt').sort({ createdAt: -1 }).limit(limit);
        res.json(users);
    } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.get('/api/users/search', apiLimiter, async (req, res) => {
    try {
        const q = (req.query.q || '').replace(/[^a-zA-Z0-9_]/g, '');
        if (q.length < 2) return res.json([]);
        const users = await User.find({ username: { $regex: q, $options: 'i' } }, 'username avatar').limit(20);
        res.json(users);
    } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.get('/api/users/suggestions', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.userId } }, 'username avatar').sort({ createdAt: -1 }).limit(10);
        res.json(users);
    } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== BOT ENDPOINTS ====================
app.get('/api/bots', authMiddleware, async (req, res) => {
    try {
        const bots = await Bot.find({ ownerId: req.userId });
        res.json(bots);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/bots', authMiddleware, async (req, res) => {
    try {
        const { name, prefix, description } = req.body;
        if (!name || name.length > 32) return res.status(400).json({ error: 'Geçersiz bot adı' });
        
        const user = await User.findById(req.userId);
        const token = 'bot_' + crypto.randomBytes(20).toString('hex');
        const bot = new Bot({ name, prefix: prefix || '/', token, ownerId: req.userId, ownerName: user.username, description });
        await bot.save();
        res.json(bot);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.delete('/api/bots/:id', authMiddleware, async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id);
        if (!bot) return res.status(404).json({ error: 'Bot bulunamadı' });
        if (bot.ownerId !== req.userId) return res.status(403).json({ error: 'Yetkiniz yok' });
        await bot.deleteOne();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== WEBHOOK ENDPOINTS ====================
app.get('/api/webhooks', authMiddleware, async (req, res) => {
    try {
        const webhooks = await Webhook.find({ ownerId: req.userId });
        res.json(webhooks);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/webhooks', authMiddleware, async (req, res) => {
    try {
        const { name, channelId } = req.body;
        if (!name || name.length > 32) return res.status(400).json({ error: 'Geçersiz isim' });
        
        const token = 'wh_' + crypto.randomBytes(20).toString('hex');
        const webhook = new Webhook({ name, token, channelId: channelId || 'genel-sohbet', ownerId: req.userId });
        await webhook.save();
        res.json(webhook);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.delete('/api/webhooks/:id', authMiddleware, async (req, res) => {
    try {
        const webhook = await Webhook.findById(req.params.id);
        if (!webhook) return res.status(404).json({ error: 'Webhook bulunamadı' });
        if (webhook.ownerId !== req.userId) return res.status(403).json({ error: 'Yetkiniz yok' });
        await webhook.deleteOne();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/webhooks/:webhookId/:token', async (req, res) => {
    try {
        const { webhookId, token } = req.params;
        const { content, username } = req.body;
        if (!content) return res.status(400).json({ error: 'content gerekli' });
        
        const webhook = await Webhook.findOne({ _id: webhookId, token });
        if (!webhook) return res.status(404).json({ error: 'Webhook bulunamadı' });
        if (!webhook.active) return res.status(403).json({ error: 'Webhook pasif' });
        if (webhook.callCount >= 1000) return res.status(429).json({ error: 'Webhook limiti doldu' });
        
        io.to(webhook.channelId).emit('new_message', {
            channelId: webhook.channelId,
            content: content.slice(0, 2000),
            senderName: username || webhook.name,
            senderId: 'webhook_' + webhookId,
            createdAt: new Date().toISOString()
        });
        
        webhook.callCount = (webhook.callCount || 0) + 1;
        webhook.lastCall = new Date();
        await webhook.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== AI ENDPOINTS ====================
app.post('/api/chat', apiLimiter, async (req, res) => {
    try {
        const { message, sessionId, chatId, mode } = req.body;
        if (!message?.trim()) return res.status(400).json({ error: 'Mesaj gerekli' });
        if (!sessionId) return res.status(400).json({ error: 'Kullanıcı adı gerekli' });
        
        const username = sessionId.replace(/[^a-zA-Z0-9_]/g, '');
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayChats = await Chat.countDocuments({ username, createdAt: { $gte: today } });
        if (todayChats >= 15) return res.status(429).json({ error: 'Günlük limit doldu (15/15)', remainingChats: 0 });
        
        let chat = chatId ? await Chat.findById(chatId) : null;
        if (!chat) chat = new Chat({ username, sessionId, messages: [] });
        
        const systemPrompt = mode === 'think' ? 'Sen derin düşünen bir asistansın.' : 'Sen hızlı bir asistansın. Kısa cevaplar ver.';
        const messages = [{ role: 'system', content: systemPrompt }, ...chat.messages.slice(-15), { role: 'user', content: message }];
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
    } catch (error) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== GÖRSEL OLUŞTURMA ====================
app.post('/api/image', imageLimiter, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt gerekli' });
        if (prompt.length > 500) return res.status(400).json({ error: 'Prompt çok uzun' });
        
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random()*100000)}`;
        res.json({ success: true, image: imageUrl, prompt });
    } catch (error) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== EMAIL ENDPOINTS ====================
async function createTransporter() {
    const oauth2Client = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
    oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => err ? reject(err) : resolve(token));
    });
    return nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { type: 'OAuth2', user: process.env.GMAIL_USER, clientId: process.env.GMAIL_CLIENT_ID, clientSecret: process.env.GMAIL_CLIENT_SECRET, refreshToken: process.env.GMAIL_REFRESH_TOKEN, accessToken }
    });
}

app.post('/api/email/send', authLimiter, async (req, res) => {
    try {
        const { to, subject, html } = req.body;
        if (!to || !subject || !html) return res.status(400).json({ error: 'Eksik bilgi' });
        const transporter = await createTransporter();
        const info = await transporter.sendMail({ from: `"Gettic" <${process.env.GMAIL_USER}>`, to, subject, html });
        res.json({ success: true, messageId: info.messageId });
    } catch (error) { res.status(500).json({ error: 'Email gönderilemedi' }); }
});

// ==================== API LIST ====================
app.get('/api/list', async (req, res) => {
    try {
        const items = await ApiList.find().sort({ key: 1 });
        const data = {};
        items.forEach(i => data[i.key] = i.value);
        res.json({ status: 'ok', total: items.length, data });
    } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ==================== 404 ====================
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '404.html')));

// ==================== SOCKET.IO ====================
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token gerekli'));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
    } catch (err) { next(new Error('Geçersiz token')); }
});

io.on('connection', (socket) => {
    socket.on('join_channel', (channelId) => socket.join(channelId));
    socket.on('leave_channel', (channelId) => socket.leave(channelId));
    socket.on('send_message', async (data) => {
        try {
            const content = data.content?.trim()?.slice(0, 2000);
            if (!content) return;
            const msg = new Message({ channelId: data.channelId, content, senderName: data.senderName?.slice(0, 32), senderId: data.senderId, image: data.image || null, file: data.file || null, ip: socket.handshake.address, createdAt: new Date() });
            const saved = await msg.save();
            io.to(data.channelId).emit('new_message', saved);
        } catch(e) { socket.emit('error', { message: 'Mesaj gönderilemedi' }); }
    });
    socket.on('typing', ({ channelId, username }) => socket.to(channelId).emit('user_typing', { username, channelId }));
    socket.on('voice_join', (data) => socket.to(data.channel).emit('user_joined_voice', { userId: socket.id }));
    socket.on('voice_leave', (data) => socket.to(data?.channel).emit('user_left_voice', { userId: socket.id }));
    socket.on('disconnect', () => {});
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => { console.log('✅ MongoDB'); httpServer.listen(PORT, () => console.log(`🚀 Gettic :${PORT}`)); })
    .catch(err => console.error('❌ MongoDB:', err));
