require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
    maxHttpBufferSize: 10e6,
    pingTimeout: 60000
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// ============ MODELS ============
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },
    status: { type: String, enum: ['online', 'offline', 'idle', 'dnd'], default: 'offline' },
    bio: { type: String, default: '', maxlength: 200 },
    badges: { type: [String], default: ['Üye'] },
    roles: { type: [String], default: ['member'] },
    isBot: { type: Boolean, default: false },
    botOwner: { type: String, default: '' },
    friends: [{ type: String }],
    blocked: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try { this.password = await bcrypt.hash(this.password, 10); next(); } catch (e) { next(e); }
});
userSchema.methods.comparePassword = async function(p) { return await bcrypt.compare(p, this.password); };
userSchema.methods.toJSON = function() { const u = this.toObject(); delete u.password; return u; };
const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
    content: { type: String, default: '' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, required: true },
    room: { type: String, required: true },
    type: { type: String, default: 'text' },
    edited: { type: Boolean, default: false },
    replyTo: { type: mongoose.Schema.Types.Mixed, default: null },
    pollQuestion: { type: String, default: '' },
    pollOptions: [{ type: String }],
    pollVotes: [{ type: Number }],
    isBot: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'Genel' },
    type: { type: String, default: 'text' },
    isPrivate: { type: Boolean, default: false },
    password: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Room = mongoose.model('Room', roomSchema);

const webhookSchema = new mongoose.Schema({
    name: { type: String, required: true },
    room: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Webhook = mongoose.model('Webhook', webhookSchema);

const botSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    token: { type: String, required: true },
    commands: [{ name: String, response: String }],
    createdAt: { type: Date, default: Date.now }
});
const Bot = mongoose.model('Bot', botSchema);

// ============ AUTH MIDDLEWARE ============
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Token gerekli' });
        const d = jwt.verify(token, process.env.JWT_SECRET || 'gettic2024secret');
        const user = await User.findById(d.userId);
        if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        req.user = user; next();
    } catch (e) { res.status(401).json({ error: 'Geçersiz token' }); }
};

// ============ RATE LIMITER ============
const rateLimit = {};
function rateLimiter(max, windowMs) {
    return (req, res, next) => {
        const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
        if (!rateLimit[ip]) rateLimit[ip] = [];
        const now = Date.now();
        rateLimit[ip] = rateLimit[ip].filter(t => now - t < windowMs);
        if (rateLimit[ip].length >= max) return res.status(429).json({ error: 'Çok fazla istek! Biraz bekle.' });
        rateLimit[ip].push(now);
        next();
    };
}

// ============ AUTH ROUTES ============
app.post('/api/auth/register', rateLimiter(5, 60000), async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
        if (username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
        if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
        if (await User.findOne({ username })) return res.status(400).json({ error: 'Bu kullanıcı adı alınmış' });
        const user = new User({ username, password, badges: ['Üye'] });
        await user.save();
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'gettic2024secret', { expiresIn: '30d' });
        res.status(201).json({ user, token });
    } catch (e) { console.error('Register:', e); res.status(500).json({ error: 'Kayıt başarısız' }); }
});

app.post('/api/auth/login', rateLimiter(10, 60000), async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
        if (!(await user.comparePassword(password))) return res.status(400).json({ error: 'Şifre hatalı' });
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'gettic2024secret', { expiresIn: '30d' });
        res.json({ user, token });
    } catch (e) { res.status(500).json({ error: 'Giriş başarısız' }); }
});

app.get('/api/auth/me', auth, async (req, res) => { res.json(req.user); });

// ============ ROOMS ============
app.get('/api/rooms', async (req, res) => {
    try { res.json(await Room.find({}).sort({ createdAt: 1 })); } catch (e) { res.json([]); }
});

app.post('/api/rooms', rateLimiter(10, 30000), async (req, res) => {
    try {
        const { name, description, category, isPrivate, password } = req.body;
        if (!name || name.trim().length < 1) return res.status(400).json({ error: 'Oda adı gerekli' });
        const room = new Room({ name: name.trim(), description, category: category || 'Genel', isPrivate: !!isPrivate, password: isPrivate ? password : '' });
        await room.save();
        res.status(201).json(room);
    } catch (e) { res.status(500).json({ error: 'Oda oluşturulamadı' }); }
});

app.get('/api/rooms/:id/messages', async (req, res) => {
    try {
        const msgs = await Message.find({ room: req.params.id }).sort({ timestamp: -1 }).limit(100);
        res.json(msgs.reverse());
    } catch (e) { res.json([]); }
});

// ============ MESSAGES ============
app.put('/api/messages/:id', async (req, res) => {
    try {
        const msg = await Message.findByIdAndUpdate(req.params.id, { content: req.body.content, edited: true }, { new: true });
        if (!msg) return res.status(404).json({ error: 'Mesaj bulunamadı' });
        res.json(msg);
    } catch (e) { res.status(500).json({ error: 'Düzenlenemedi' }); }
});

app.delete('/api/messages/:id', async (req, res) => {
    try { await Message.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi' }); }
});

// ============ WEBHOOKS ============
app.post('/api/webhooks', auth, async (req, res) => {
    try {
        const { name, room } = req.body;
        if (!name || !room) return res.status(400).json({ error: 'İsim ve oda gerekli' });
        const token = crypto.randomBytes(16).toString('hex');
        const url = '/api/webhook/' + token;
        const webhook = new Webhook({ name, room, url, token });
        await webhook.save();
        res.status(201).json(webhook);
    } catch (e) { res.status(500).json({ error: 'Webhook oluşturulamadı' }); }
});

app.post('/api/webhook/:token', async (req, res) => {
    try {
        const webhook = await Webhook.findOne({ token: req.params.token });
        if (!webhook) return res.status(404).json({ error: 'Webhook bulunamadı' });
        const { content, username } = req.body;
        if (!content) return res.status(400).json({ error: 'İçerik gerekli' });
        const msg = await Message.create({ content, senderName: username || webhook.name, room: webhook.room, type: 'text', isBot: true });
        io.to(webhook.room).emit('receive-message', msg);
        res.json({ ok: true, message: msg });
    } catch (e) { res.status(500).json({ error: 'Webhook hatası' }); }
});

app.get('/api/webhooks', auth, async (req, res) => {
    try { res.json(await Webhook.find({})); } catch (e) { res.json([]); }
});

app.delete('/api/webhooks/:id', auth, async (req, res) => {
    try { await Webhook.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi' }); }
});

// ============ BOTS ============
app.post('/api/bots', auth, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Bot adı gerekli' });
        if (await Bot.findOne({ name })) return res.status(400).json({ error: 'Bu bot adı kullanılıyor' });
        const token = crypto.randomBytes(16).toString('hex');
        const bot = new Bot({ name, owner: req.user.username, token, commands: [
            { name: 'ping', response: 'Pong!' },
            { name: 'yardim', response: '/ping, /sa, /temizle, /anket' }
        ]});
        await bot.save();
        res.status(201).json(bot);
    } catch (e) { res.status(500).json({ error: 'Bot oluşturulamadı' }); }
});

app.get('/api/bots', auth, async (req, res) => {
    try { res.json(await Bot.find({})); } catch (e) { res.json([]); }
});

app.delete('/api/bots/:id', auth, async (req, res) => {
    try { await Bot.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi' }); }
});

// ============ SOCKET.IO ============
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ['polling', 'websocket'],
    allowEIO3: true
});

// ============ FRONTEND ============
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() }); });

// ============ START ============
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/gettic';
const PORT = process.env.PORT || 3000;

console.log('Gettic v3.0 başlatılıyor...');
console.log('Port:', PORT);

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB bağlandı'))
    .catch((e) => console.log('MongoDB hatası:', e.message));

server.listen(PORT, '0.0.0.0', () => {
    console.log('Gettic hazır! Port: ' + PORT);
});
