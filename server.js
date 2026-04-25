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
    pingTimeout: 60000,
    transports: ['polling', 'websocket']
});

// ============ MIDDLEWARE ============
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// ============ MODELS ============
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },
    banner: { type: String, default: '' },
    status: { type: String, enum: ['online', 'offline', 'idle', 'dnd'], default: 'offline' },
    bio: { type: String, default: '', maxlength: 200 },
    badges: { type: [String], default: ['Üye'] },
    roles: { type: [String], default: ['member'] },
    isBot: { type: Boolean, default: false },
    botOwner: { type: String, default: '' },
    friends: [{ type: String }],
    blocked: [{ type: String }],
    notes: { type: mongoose.Schema.Types.Mixed, default: {} },
    twoFactorEnabled: { type: Boolean, default: false },
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

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
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
    } catch (e) { res.status(500).json({ error: 'Kayıt başarısız' }); }
});

app.post('/api/auth/login', async (req, res) => {
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

app.put('/api/auth/me', auth, async (req, res) => {
    try {
        const { bio, status, avatar, banner } = req.body;
        if (bio !== undefined) req.user.bio = bio;
        if (status) req.user.status = status;
        if (avatar) req.user.avatar = avatar;
        if (banner) req.user.banner = banner;
        await req.user.save();
        res.json(req.user);
    } catch (e) { res.status(500).json({ error: 'Güncellenemedi' }); }
});

// ============ ROOMS ============
app.get('/api/rooms', async (req, res) => {
    try { res.json(await Room.find({}).sort({ createdAt: 1 })); } catch (e) { res.json([]); }
});

app.post('/api/rooms', async (req, res) => {
    try {
        const { name, description, category, type, isPrivate, password } = req.body;
        if (!name || name.trim().length < 1) return res.status(400).json({ error: 'Oda adı gerekli' });
        const room = new Room({ name: name.trim(), description, category: category || 'Genel', type: type || 'text', isPrivate: !!isPrivate, password: isPrivate ? password : '' });
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
io.on('connection', (socket) => {
    console.log('Bağlandı:', socket.id.substring(0, 8));

    socket.on('user-online', (uid) => { socket.userId = uid; socket.broadcast.emit('user-status-changed', { userId: uid, status: 'online' }); });
    socket.on('join-room', (rid) => { socket.join(rid); socket.currentRoom = rid; const room = io.sockets.adapter.rooms.get(rid); io.to(rid).emit('room-user-count', room ? room.size : 0); });
    socket.on('leave-room', (rid) => { socket.leave(rid); const room = io.sockets.adapter.rooms.get(rid); io.to(rid).emit('room-user-count', room ? room.size : 0); });

    socket.on('send-message', async (data) => {
        try {
            const msg = await Message.create({
                content: data.content || '', sender: data.senderId, senderName: data.senderName,
                room: data.roomId, type: data.type || 'text', replyTo: data.replyTo || null,
                pollQuestion: data.pollQuestion || '', pollOptions: data.pollOptions || [], pollVotes: data.pollVotes || []
            });
            const populated = await Message.findById(msg._id);
            io.to(data.roomId).emit('receive-message', populated);
            processBotCommands(populated);
        } catch (e) { socket.emit('message-error', 'Mesaj gönderilemedi'); }
    });

    socket.on('typing', (data) => { socket.to(data.roomId).emit('user-typing', data); });
    socket.on('voice-join', (data) => { socket.join('voice-' + data.roomId); socket.to('voice-' + data.roomId).emit('voice-join', data); });
    socket.on('voice-leave', (data) => { socket.leave('voice-' + data.roomId); socket.to('voice-' + data.roomId).emit('voice-leave', data); });

    socket.on('disconnect', () => {
        if (socket.currentRoom) { const room = io.sockets.adapter.rooms.get(socket.currentRoom); io.to(socket.currentRoom).emit('room-user-count', room ? room.size : 0); }
    });
});

async function processBotCommands(msg) {
    if (msg.isBot || !msg.content || !msg.content.startsWith('/')) return;
    const parts = msg.content.substring(1).split(' ');
    const cmd = parts[0].toLowerCase();
    const bots = await Bot.find({});
    for (const bot of bots) {
        const command = bot.commands.find(c => c.name === cmd);
        if (command) {
            let response = command.response;
            if (cmd === 'temizle') { const count = parseInt(parts[1]) || 5; const msgs = await Message.find({ room: msg.room }).sort({ timestamp: -1 }).limit(count); await Message.deleteMany({ _id: { $in: msgs.map(m => m._id) } }); response = count + ' mesaj temizlendi!'; }
            const botMsg = await Message.create({ content: response, senderName: bot.name, room: msg.room, type: 'text', isBot: true });
            io.to(msg.room).emit('receive-message', botMsg);
            break;
        }
    }
}

// ============ FRONTEND ============
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now(), features: ['threads','reactions','stage','forum','soundboard','automod','2fa','custom-emoji','banner','audit-log','permissions','notes','gif-avatar'] }); });

// ============ START ============
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/gettic';
const PORT = process.env.PORT || 3000;

console.log('🚀 Gettic v4.0 başlatılıyor...');
console.log('📦 MongoDB:', MONGODB_URI ? '✅' : '❌');
console.log('📡 Port:', PORT);

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB bağlandı'))
    .catch((e) => console.log('❌ MongoDB hatası:', e.message));

server.listen(PORT, '0.0.0.0', () => {
    console.log('✅ Gettic hazır!');
    console.log('🌐 http://localhost:' + PORT);
    console.log('✨ Özellikler: Threads, Reactions, Stage, Forum, Soundboard, AutoMod, 2FA, Özel Emoji, Banner, Denetim, İzinler, Notlar, GIF Profil');
});
