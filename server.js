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
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }));
app.use(express.json());
app.use(express.static(__dirname));

// ================ MODELS ================
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },
    status: { type: String, enum: ['online', 'offline', 'idle', 'dnd'], default: 'offline' },
    roles: { type: [String], default: ['member'] },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
    content: { type: String, required: true, maxlength: 2000 },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    room: { type: String, required: true },
    type: { type: String, default: 'text' },
    edited: { type: Boolean, default: false },
    replyTo: { type: mongoose.Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, default: 'text' },
    isPrivate: { type: Boolean, default: false },
    password: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// ================ AUTH ================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Tüm alanlar gerekli' });
        if (username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter' });
        if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter' });

        const exist = await User.findOne({ username });
        if (exist) return res.status(400).json({ error: 'Bu kullanıcı adı alınmış' });

        const user = new User({ username, password });
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'gettic2024', { expiresIn: '30d' });
        res.status(201).json({ user, token });
    } catch (e) {
        res.status(500).json({ error: 'Kayıt başarısız: ' + e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Kullanıcı bulunamadı' });

        const match = await user.comparePassword(password);
        if (!match) return res.status(400).json({ error: 'Şifre hatalı' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'gettic2024', { expiresIn: '30d' });
        res.json({ user, token });
    } catch (e) {
        res.status(500).json({ error: 'Giriş başarısız' });
    }
});

// ================ ROOMS ================
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await Room.find({});
        res.json(rooms);
    } catch (e) {
        res.json([]);
    }
});

app.post('/api/rooms', async (req, res) => {
    try {
        const { name, description, isPrivate, password } = req.body;
        if (!name) return res.status(400).json({ error: 'Oda adı gerekli' });
        const room = new Room({ name, description, isPrivate, password: isPrivate ? password : '' });
        await room.save();
        res.status(201).json(room);
    } catch (e) {
        res.status(500).json({ error: 'Oda oluşturulamadı' });
    }
});

app.get('/api/rooms/:id/messages', async (req, res) => {
    try {
        const msgs = await Message.find({ room: req.params.id }).sort({ timestamp: -1 }).limit(50);
        res.json(msgs.reverse());
    } catch (e) {
        res.json([]);
    }
});

// ================ MESSAGES ================
app.put('/api/messages/:id', async (req, res) => {
    try {
        const msg = await Message.findByIdAndUpdate(req.params.id, { content: req.body.content, edited: true }, { new: true });
        res.json(msg);
    } catch (e) {
        res.status(500).json({ error: 'Düzenlenemedi' });
    }
});

app.delete('/api/messages/:id', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Silinemedi' });
    }
});

// ================ SOCKET.IO ================
io.on('connection', (socket) => {
    console.log('👤 Bağlandı:', socket.id);

    socket.on('user-online', (uid) => {
        socket.userId = uid;
        socket.broadcast.emit('user-status-changed', { userId: uid, status: 'online' });
    });

    socket.on('join-room', (rid) => {
        socket.join(rid);
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
                content: data.content,
                sender: data.senderId,
                senderName: data.senderName,
                room: data.roomId,
                type: data.type || 'text',
                replyTo: data.replyTo || null
            });
            const populated = await Message.findById(msg._id).populate('sender', 'username');
            io.to(data.roomId).emit('receive-message', populated);
        } catch (e) {
            socket.emit('message-error', 'Mesaj gönderilemedi');
        }
    });

    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('user-typing', data);
    });

    socket.on('voice-join', (data) => {
        socket.join('voice-' + data.roomId);
        socket.voiceRoom = data.roomId;
        socket.to('voice-' + data.roomId).emit('voice-join', data);
        io.to('voice-' + data.roomId).emit('voice-users', getVoiceUsers(data.roomId));
    });

    socket.on('voice-leave', (data) => {
        socket.leave('voice-' + data.roomId);
        socket.to('voice-' + data.roomId).emit('voice-leave', data);
        io.to('voice-' + data.roomId).emit('voice-users', getVoiceUsers(data.roomId));
    });

    socket.on('voice-signal', (data) => {
        socket.to(data.to).emit('voice-signal', { ...data, from: socket.id });
    });

    socket.on('disconnect', () => {
        if (socket.voiceRoom) {
            socket.to('voice-' + socket.voiceRoom).emit('voice-leave', { userId: socket.userId });
            io.to('voice-' + socket.voiceRoom).emit('voice-users', getVoiceUsers(socket.voiceRoom));
        }
        if (socket.userId) {
            socket.broadcast.emit('user-status-changed', { userId: socket.userId, status: 'offline' });
        }
    });
});

function getVoiceUsers(roomId) {
    const room = io.sockets.adapter.rooms.get('voice-' + roomId);
    if (!room) return [];
    const users = [];
    room.forEach((sid) => {
        const s = io.sockets.sockets.get(sid);
        if (s && s.userId) users.push({ id: s.userId, sid: sid });
    });
    return users;
}

// ================ STATIC FILES ================
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// ================ SERVER START ================
const MONGODB_URI = process.env.MONGODB_URI;
console.log('🚀 Gettic başlatılıyor...');
console.log('📦 MongoDB:', MONGODB_URI ? '✅' : '❌');

mongoose.connect(MONGODB_URI || 'mongodb://127.0.0.1:27017/gettic')
    .then(() => console.log('✅ MongoDB bağlandı'))
    .catch((e) => console.log('❌ MongoDB hatası:', e.message));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Port: ${PORT}`));
