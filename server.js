// ╔══════════════════════════════════════════════════════════════════╗
// ║                    GETTIC SERVER - MAX GÜVENLİK                  ║
// ╚══════════════════════════════════════════════════════════════════╝

require('dotenv').config();

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
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const useragent = require('express-useragent');
const requestIp = require('request-ip');

// ==================== RATE LIMITERS ====================
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Çok fazla deneme! 15 dakika bekle.' } });
const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 100, message: { error: 'Çok fazla istek! 1 dakika bekle.' } });
const messageLimiter = rateLimit({ windowMs: 3 * 1000, max: 1, message: { error: '3 saniye bekleyin.' } });
const imageLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'Çok fazla görsel! 1 dakika bekle.' } });

// ==================== EXPRESS APP ====================
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: ['https://gettic.js.org', 'http://localhost:3000'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] } });

// ==================== GÜVENLİK ====================
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

app.use(cors({ origin: ['https://gettic.js.org', 'http://localhost:3000'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true, maxAge: 600 }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(hpp({ whitelist: ['content', 'username', 'message'] }));
app.use(requestIp.mw());
app.use(useragent.express());

// XSS
app.use((req, res, next) => {
    const sanitize = (obj) => { if (!obj || typeof obj !== 'object') return; for (let key in obj) { if (typeof obj[key] === 'string') { obj[key] = xss(obj[key], { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] }); } else if (typeof obj[key] === 'object') { sanitize(obj[key]); } } };
    sanitize(req.body); sanitize(req.query); sanitize(req.params);
    next();
});

app.use((req, res, next) => { req.clientIp = requestIp.getClientIp(req); req.userAgent = req.useragent?.source || 'Unknown'; next(); });
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('X-XSS-Protection', '1; mode=block'); res.setHeader('X-Download-Options', 'noopen'); res.setHeader('X-Permitted-Cross-Domain-Policies', 'none'); next(); });
app.use((req, res, next) => {
    if (req.url.endsWith('.wasm')) res.type('application/wasm');
    if (req.url.match(/\.(js|css|png|jpg|svg|ico|woff|woff2|ttf)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
    next();
});

// ==================== MONGOOSE SCHEMALAR ====================
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20, match: [/^[a-zA-Z0-9_]+$/, 'Geçersiz karakter'] },
    password: { type: String, required: true, minlength: 6, maxlength: 100 },
    avatar: { type: String, default: '' }, status: { type: String, default: 'online', enum: ['online', 'idle', 'dnd', 'offline'] },
    lastSeen: { type: Date, default: Date.now }, ip: { type: String, default: '' }, userAgent: { type: String, default: '' },
    loginAttempts: { type: Number, default: 0 }, lockedUntil: { type: Date, default: null }, createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
    channelId: { type: String, required: true, index: true, maxlength: 50 }, content: { type: String, default: '', maxlength: 2000 },
    senderName: { type: String, required: true, maxlength: 32 }, senderId: { type: String, required: true },
    reactions: { type: Object, default: {} }, edited: { type: Boolean, default: false },
    image: { type: String, default: null }, file: { type: Object, default: null }, ip: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: true }
});
const Message = mongoose.model('Message', MessageSchema);

const ChannelSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, match: [/^[a-zA-Z0-9_-]+$/, 'Geçersiz ID'] },
    name: { type: String, required: true, maxlength: 50 }, type: { type: String, default: 'text', enum: ['text', 'voice'] },
    category: { type: String, default: 'METİN' }, topic: { type: String, default: '', maxlength: 200 },
    serverId: { type: String, default: 'gettic' }, createdBy: { type: String, default: '' }, createdAt: { type: Date, default: Date.now }
});
const Channel = mongoose.model('Channel', ChannelSchema);

const DMSchema = new mongoose.Schema({
    participants: [{ type: String }], messages: [{ sender: String, text: { type: String, maxlength: 2000 }, time: { type: Date, default: Date.now } }],
    updatedAt: { type: Date, default: Date.now }
});
const DM = mongoose.model('DM', DMSchema);

const BotSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 32 }, prefix: { type: String, default: '/', maxlength: 5 },
    token: { type: String, required: true, unique: true }, ownerId: { type: String, required: true },
    ownerName: { type: String, required: true }, description: { type: String, default: '' }, active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Bot = mongoose.model('Bot', BotSchema);

const WebhookSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 32 }, token: { type: String, required: true, unique: true },
    channelId: { type: String, default: 'genel-sohbet' }, ownerId: { type: String, required: true },
    active: { type: Boolean, default: true }, callCount: { type: Number, default: 0 }, lastCall: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});
const Webhook = mongoose.model('Webhook', WebhookSchema);

const ApiListSchema = new mongoose.Schema({ key: { type: String, required: true, unique: true }, value: { type: String, default: null }, updatedAt: { type: Date, default: Date.now } });
const ApiList = mongoose.model('ApiList', ApiListSchema);

const ChatSchema = new mongoose.Schema({
    username: { type: String, required: true, index: true }, sessionId: { type: String, required: true },
    messages: [{ role: { type: String, enum: ['user', 'assistant', 'system'], required: true }, content: { type: String, required: true, maxlength: 4000 }, timestamp: { type: Date, default: Date.now } }],
    chatCount: { type: Number, default: 1 }, createdAt: { type: Date, default: Date.now }, updatedAt: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        const user = await User.findById(req.userId).select('_id');
        if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        next();
    } catch { res.status(401).json({ error: 'Geçersiz token' }); }
};

// ==================== STATİK DOSYALAR ====================
app.use('/app', express.static(path.join(__dirname, 'app'), { maxAge: '7d', fallthrough: true }));
app.use(express.static(path.join(__dirname)));

// ==================== SAYFALAR ====================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/ai', (req, res) => res.sendFile(path.join(__dirname, 'ai', 'index.html')));
app.get('/mc', (req, res) => res.sendFile(path.join(__dirname, 'mc', 'index.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'app', 'index.html')));
app.get('/app/*', (req, res) => res.sendFile(path.join(__dirname, 'app', 'index.html')));

// ==================== AUTH ENDPOINTS ====================
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, password, gcaptcha } = req.body;
        if (!gcaptcha || !gcaptcha.startsWith('gcaptcha_')) return res.status(400).json({ error: 'Lütfen doğrulamayı yapın' });
        
        if (!username || username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter' });
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Geçersiz karakterler' });
        if (!password || password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter' });
        
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Kullanıcı adı alınmış' });
        
        const hashed = await bcrypt.hash(password, 12);
        const user = new User({ username, password: hashed, ip: req.clientIp, userAgent: req.userAgent });
        await user.save();
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, username: user.username } });
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { username, password, gcaptcha } = req.body;
        if (!gcaptcha || !gcaptcha.startsWith('gcaptcha_')) return res.status(400).json({ error: 'Lütfen doğrulamayı yapın' });
        
        if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
        
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
            return res.status(423).json({ error: `Hesap kilitli! ${minutes} dakika bekle.` });
        }
        
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            if (user.loginAttempts >= 5) user.lockedUntil = new Date(Date.now() + 30 * 60000);
            await user.save();
            return res.status(401).json({ error: 'Şifre yanlış' });
        }
        
        user.status = 'online'; user.lastSeen = new Date(); user.loginAttempts = 0; user.lockedUntil = null;
        user.ip = req.clientIp; user.userAgent = req.userAgent;
        await user.save();
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, username: user.username } });
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.get('/api/me', authMiddleware, async (req, res) => {
    try { const user = await User.findById(req.userId).select('-password -loginAttempts -lockedUntil'); if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' }); res.json(user); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.put('/api/me', authMiddleware, async (req, res) => {
    try { const updates = req.body; delete updates.password; delete updates.username; delete updates._id; const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password'); res.json(user); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ==================== KANAL ENDPOINTS ====================
app.get('/api/channels', authMiddleware, async (req, res) => { try { res.json(await Channel.find({ serverId: req.query.server || 'gettic' })); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); } });
app.post('/api/channels', authMiddleware, async (req, res) => {
    try { const { id, name } = req.body; if (!id || !name) return res.status(400).json({ error: 'ID ve isim gerekli' }); const existing = await Channel.findOne({ id }); if (existing) { Object.assign(existing, req.body); await existing.save(); return res.json(existing); } const channel = new Channel(req.body); await channel.save(); res.json(channel); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
});
app.put('/api/channels/:channelId', authMiddleware, async (req, res) => { try { const channel = await Channel.findOneAndUpdate({ id: req.params.channelId }, req.body, { new: true }); if (!channel) return res.status(404).json({ error: 'Kanal bulunamadı' }); res.json(channel); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); } });
app.delete('/api/channels/:channelId', authMiddleware, async (req, res) => { try { await Channel.deleteOne({ id: req.params.channelId }); await Message.deleteMany({ channelId: req.params.channelId }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); } });

// ==================== MESAJ ENDPOINTS ====================
app.get('/api/channels/:channelId/messages', authMiddleware, async (req, res) => { try { const limit = Math.min(parseInt(req.query.limit) || 100, 200); res.json((await Message.find({ channelId: req.params.channelId }).sort({ createdAt: -1 }).limit(limit)).reverse()); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); } });
app.post('/api/channels/:channelId/messages', authMiddleware, messageLimiter, async (req, res) => { try { const content = req.body.content?.trim(); if (!content || content.length > 2000) return res.status(400).json({ error: 'Mesaj 1-2000 karakter arası olmalı' }); const msg = new Message({ ...req.body, content, channelId: req.params.channelId, ip: req.clientIp }); await msg.save(); res.json(msg); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); } });

// ==================== DM ENDPOINTS ====================
app.get('/api/dm/:username', authMiddleware, async (req, res) => { try { res.json(await DM.find({ participants: { $all: [req.userId, req.params.username] } }).sort({ updatedAt: -1 })); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); } });
app.post('/api/dm/send', authMiddleware, messageLimiter, async (req, res) => { try { const { to, text } = req.body; if (!text || text.length > 2000) return res.status(400).json({ error: 'Mesaj 1-2000 karakter arası olmalı' }); const participants = [req.userId, to].sort(); let dm = await DM.findOne({ participants: { $all: participants, $size: 2 } }); if (!dm) dm = new DM({ participants, messages: [] }); dm.messages.push({ sender: req.userId, text, time: new Date() }); dm.updatedAt = new Date(); await dm.save(); res.json(dm); } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); } });

// ==================== KULLANICI ENDPOINTS ====================
app.get('/api/users', apiLimiter, async (req, res) => { try { res.json(await User.find({}, 'username avatar status createdAt').sort({ createdAt: -1 }).limit(50)); } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); } });
app.get('/api/users/search', apiLimiter, async (req, res) => { try { const q = (req.query.q || '').replace(/[^a-zA-Z0-9_]/g, ''); if (q.length < 2) return res.json([]); res.json(await User.find({ username: { $regex: q, $options: 'i' } }, 'username avatar').limit(20)); } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); } });

// ==================== EMAIL ENDPOINTS ====================
async function createTransporter() {
    const oauth2Client = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
    oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const accessToken = await new Promise((resolve, reject) => { oauth2Client.getAccessToken((err, token) => err ? reject(err) : resolve(token)); });
    return nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { type: 'OAuth2', user: process.env.GMAIL_USER, clientId: process.env.GMAIL_CLIENT_ID, clientSecret: process.env.GMAIL_CLIENT_SECRET, refreshToken: process.env.GMAIL_REFRESH_TOKEN, accessToken } });
}

app.post('/api/email/send', authLimiter, async (req, res) => {
    try { const { to, subject, html } = req.body; if (!to || !subject || !html) return res.status(400).json({ error: 'Eksik bilgi' }); const transporter = await createTransporter(); const info = await transporter.sendMail({ from: `"Gettic" <${process.env.GMAIL_USER}>`, to, subject, html }); res.json({ success: true, messageId: info.messageId }); } catch (error) { res.status(500).json({ error: 'Email gönderilemedi' }); }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ==================== 404 ====================
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '404.html')));

// ==================== SOCKET.IO ====================
io.use((socket, next) => { const token = socket.handshake.auth.token; if (!token) return next(new Error('Token gerekli')); try { socket.userId = jwt.verify(token, process.env.JWT_SECRET).userId; next(); } catch (err) { next(new Error('Geçersiz token')); } });

io.on('connection', (socket) => {
    socket.on('join_channel', (channelId) => socket.join(channelId));
    socket.on('leave_channel', (channelId) => socket.leave(channelId));
    socket.on('send_message', async (data) => { try { const content = data.content?.trim()?.slice(0, 2000); if (!content) return; const msg = new Message({ channelId: data.channelId, content, senderName: data.senderName?.slice(0, 32), senderId: data.senderId, image: data.image || null, file: data.file || null, ip: socket.handshake.address, createdAt: new Date() }); const saved = await msg.save(); io.to(data.channelId).emit('new_message', saved); } catch(e) { socket.emit('error', { message: 'Mesaj gönderilemedi' }); } });
    socket.on('typing', ({ channelId, username }) => socket.to(channelId).emit('user_typing', { username, channelId }));
    socket.on('disconnect', () => {});
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => { console.log('✅ MongoDB'); httpServer.listen(PORT, () => console.log(`🚀 Gettic :${PORT}`)); })
    .catch(err => console.error('❌ MongoDB:', err));
