require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
    maxHttpBufferSize: 10e6
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// ================ MODELS ================
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },
    status: { type: String, enum: ['online', 'offline', 'idle', 'dnd'], default: 'offline' },
    bio: { type: String, default: '', maxlength: 200 },
    badges: { type: [String], default: ['Üye'] },
    roles: { type: [String], default: ['member'] },
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

// ================ AUTH MIDDLEWARE ================
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

// ================ RATE LIMITER ================
const rateLimit = {};
function rateLimiter(max, windowMs) {
    return (req, res, next) => {
        const ip = req.ip || '127.0.0.1';
        if (!rateLimit[ip]) rateLimit[ip] = [];
        const now = Date.now();
        rateLimit[ip] = rateLimit[ip].filter(t => now - t < windowMs);
        if (rateLimit[ip].length >= max) return res.status(429).json({ error: 'Çok fazla istek! Sakin ol.' });
        rateLimit[ip].push(now);
        next();
    };
}

// ================ AUTH ROUTES ================
app.post('/api/auth/register', rateLimiter(5, 60000), async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
        if (username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
        if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
        if (await User.findOne({ username })) return res.status(400).json({ error: 'Bu kullanıcı adı alınmış' });
        const user = new User({ username, password });
        await user.save();
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'gettic2024secret', { expiresIn: '30d' });
        res.status(201).json({ user, token });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Kayıt başarısız' }); }
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
    } catch (e) { console.error(e); res.status(500).json({ error: 'Giriş başarısız' }); }
});

app.get('/api/auth/me', auth, async (req, res) => { res.json(req.user); });

app.put('/api/auth/me', auth, async (req, res) => {
    try {
        const { bio, status, avatar } = req.body;
        if (bio !== undefined) req.user.bio = bio;
        if (status) req.user.status = status;
        if (avatar) req.user.avatar = avatar;
        await req.user.save();
        res.json(req.user);
    } catch (e) { res.status(500).json({ error: 'Güncellenemedi' }); }
});

// ================ ROOMS ================
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

// ================ MESSAGES ================
app.put('/api/messages/:id', async (req, res) => {
    try {
        const msg = await Message.findByIdAndUpdate(req.params.id, { content: req.body.content, edited: true }, { new: true });
        if (!msg) return res.status(404).json({ error: 'Mesaj bulunamadı' });
        res.json(msg);
    } catch (e) { res.status(500).json({ error: 'Düzenlenemedi' }); }
});

app.delete('/api/messages/:id', async (req, res) => {
    try {
        const msg = await Message.findByIdAndDelete(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Mesaj bulunamadı' });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Silinemedi' }); }
});

// ================ SEARCH ================
app.get('/api/search/messages', async (req, res) => {
    try {
        const { q, room } = req.query;
        if (!q) return res.json([]);
        const msgs = await Message.find({ room, content: { $regex: q, $options: 'i' } }).sort({ timestamp: -1 }).limit(50);
        res.json(msgs);
    } catch (e) { res.json([]); }
});

// ================ SOCKET.IO ================
const onlineUsers = {};

io.on('connection', (socket) => {
    console.log('👤 Bağlandı:', socket.id.substring(0, 8));

    socket.on('user-online', (uid) => {
        socket.userId = uid;
        onlineUsers[uid] = 'online';
        io.emit('user-online-update', onlineUsers);
        socket.broadcast.emit('user-status-changed', { userId: uid, status: 'online' });
    });

    socket.on('join-room', (rid) => {
        socket.join(rid);
        socket.currentRoom = rid;
        const room = io.sockets.adapter.rooms.get(rid);
        io.to(rid).emit('room-user-count', room ? room.size : 0);
    });

    socket.on('leave-room', (rid) => {
        socket.leave(rid);
        const room = io.sockets.adapter.rooms.get(rid);
        io.to(rid).emit('room-user-count', room ? room.size : 0);
    });

    socket.on('send-message', async (data) => {
        try {
            const msg = await Message.create({
                content: data.content || '',
                sender: data.senderId,
                senderName: data.senderName,
                room: data.roomId,
                type: data.type || 'text',
                replyTo: data.replyTo || null,
                pollQuestion: data.pollQuestion || '',
                pollOptions: data.pollOptions || [],
                pollVotes: data.pollVotes || []
            });
            const populated = await Message.findById(msg._id).populate('sender', 'username avatar');
            io.to(data.roomId).emit('receive-message', populated);
        } catch (e) {
            console.error('Mesaj hatası:', e.message);
            socket.emit('message-error', 'Mesaj gönderilemedi');
        }
    });

    socket.on('typing', (data) => { socket.to(data.roomId).emit('user-typing', data); });
    socket.on('voice-join', (data) => { socket.join('voice-' + data.roomId); socket.voiceRoom = data.roomId; socket.to('voice-' + data.roomId).emit('voice-join', data); });
    socket.on('voice-leave', (data) => { socket.leave('voice-' + data.roomId); socket.to('voice-' + data.roomId).emit('voice-leave', data); });

    socket.on('disconnect', () => {
        console.log('👋 Ayrıldı:', socket.id.substring(0, 8));
        if (socket.userId) { delete onlineUsers[socket.userId]; io.emit('user-online-update', onlineUsers); socket.broadcast.emit('user-status-changed', { userId: socket.userId, status: 'offline' }); }
        if (socket.voiceRoom) socket.to('voice-' + socket.voiceRoom).emit('voice-leave', { userId: socket.userId });
        if (socket.currentRoom) { const room = io.sockets.adapter.rooms.get(socket.currentRoom); io.to(socket.currentRoom).emit('room-user-count', room ? room.size : 0); }
    });
});

// ================ FRONTEND ================
app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });
app.get('*', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// ================ START ================
const MONGODB_URI = process.env.MONGODB_URI;
console.log('🚀 Gettic v2.0 başlatılıyor...');
console.log('📦 MongoDB:', MONGODB_URI ? '✅ Yüklendi' : '❌ Yüklenmedi!');

mongoose.connect(MONGODB_URI || 'mongodb://127.0.0.1:27017/gettic')
    .then(() => console.log('✅ MongoDB bağlandı'))
    .catch((e) => console.log('❌ MongoDB hatası:', e.message));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Gettic ${PORT} portunda çalışıyor`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🎯 200+ özellik hazır!`);
});
