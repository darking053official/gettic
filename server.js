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

// Middleware
app.use(cors());
app.use(express.json());

// ================ MODELS ================

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: 'default-avatar.png' },
    status: { type: String, enum: ['online', 'offline', 'idle', 'dnd'], default: 'offline' },
    customStatus: { type: String, default: '' },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
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

// Message Schema
const messageSchema = new mongoose.Schema({
    content: { type: String, required: true, maxlength: 2000 },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    type: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
    edited: { type: Boolean, default: false },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Room Schema
const roomSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ 
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['owner', 'admin', 'mod', 'member'], default: 'member' }
    }],
    banner: { type: String, default: '' },
    password: { type: String, default: '' },
    isPrivate: { type: Boolean, default: false },
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    bannedWords: [String],
    createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// ================ JWT MIDDLEWARE ================

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Token gerekli' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Geçersiz token' });
    }
};

// ================ AUTH ROUTES ================

// Kayıt Ol
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Kullanıcı adı veya email zaten kullanılıyor' });
        }

        const user = new User({ username, email, password });
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ user, token });
    } catch (error) {
        res.status(500).json({ error: 'Kayıt başarısız' });
    }
});

// Giriş Yap
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Email veya şifre hatalı' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ error: 'Email veya şifre hatalı' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({ user, token });
    } catch (error) {
        res.status(500).json({ error: 'Giriş başarısız' });
    }
});

// Profil
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    res.json(req.user);
});

// Kullanıcı ara
app.get('/api/users/search', authMiddleware, async (req, res) => {
    try {
        const { q } = req.query;
        const users = await User.find({ 
            username: { $regex: q, $options: 'i' } 
        }).select('username avatar status').limit(10);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Arama başarısız' });
    }
});

// ================ ROOM ROUTES ================

// Oda oluştur
app.post('/api/rooms', authMiddleware, async (req, res) => {
    try {
        const { name, description, isPrivate, password } = req.body;

        const room = new Room({
            name,
            description,
            owner: req.user._id,
            isPrivate: isPrivate || false,
            password: isPrivate ? password : '',
            members: [{ user: req.user._id, role: 'owner' }]
        });

        await room.save();
        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ error: 'Oda oluşturulamadı' });
    }
});

// Tüm odaları listele
app.get('/api/rooms', authMiddleware, async (req, res) => {
    try {
        const rooms = await Room.find({ isPrivate: false })
            .populate('owner', 'username avatar')
            .select('-password');
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: 'Odalar listelenemedi' });
    }
});

// Odaya katıl
app.post('/api/rooms/:id/join', authMiddleware, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ error: 'Oda bulunamadı' });

        if (room.isPrivate) {
            const { password } = req.body;
            if (password !== room.password) {
                return res.status(403).json({ error: 'Geçersiz oda şifresi' });
            }
        }

        const isMember = room.members.find(m => m.user.toString() === req.user._id.toString());
        if (!isMember) {
            room.members.push({ user: req.user._id, role: 'member' });
            await room.save();
        }

        res.json(room);
    } catch (error) {
        res.status(500).json({ error: 'Odaya katılınamadı' });
    }
});

// Oda mesajlarını getir
app.get('/api/rooms/:id/messages', authMiddleware, async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.id })
            .populate('sender', 'username avatar')
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ error: 'Mesajlar getirilemedi' });
    }
});

// ================ MESSAGE ROUTES ================

// Mesaj düzenle
app.put('/api/messages/:id', authMiddleware, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Mesaj bulunamadı' });
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu mesajı düzenleyemezsin' });
        }

        message.content = req.body.content;
        message.edited = true;
        await message.save();

        res.json(message);
    } catch (error) {
        res.status(500).json({ error: 'Mesaj düzenlenemedi' });
    }
});

// Mesaj sil
app.delete('/api/messages/:id', authMiddleware, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Mesaj bulunamadı' });
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu mesajı silemezsin' });
        }

        await Message.findByIdAndDelete(req.params.id);
        res.json({ message: 'Mesaj silindi' });
    } catch (error) {
        res.status(500).json({ error: 'Mesaj silinemedi' });
    }
});

// ================ FRIEND ROUTES ================

// Arkadaş ekle
app.post('/api/friends/add', authMiddleware, async (req, res) => {
    try {
        const { friendId } = req.body;
        const friend = await User.findById(friendId);
        if (!friend) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

        if (req.user.friends.includes(friendId)) {
            return res.status(400).json({ error: 'Zaten arkadaşsınız' });
        }

        req.user.friends.push(friendId);
        friend.friends.push(req.user._id);
        
        await req.user.save();
        await friend.save();

        res.json({ message: 'Arkadaş eklendi' });
    } catch (error) {
        res.status(500).json({ error: 'Arkadaş eklenemedi' });
    }
});

// Arkadaş listesi
app.get('/api/friends', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('friends', 'username avatar status customStatus');
        res.json(user.friends);
    } catch (error) {
        res.status(500).json({ error: 'Arkadaş listesi alınamadı' });
    }
});

// ================ SOCKET.IO ================

const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('👤 Bağlandı:', socket.id);

    socket.on('user-online', (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.broadcast.emit('user-status-changed', { userId, status: 'online' });
    });

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        const room = io.sockets.adapter.rooms.get(roomId);
        const userCount = room ? room.size : 0;
        io.to(roomId).emit('room-user-count', userCount);
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        const room = io.sockets.adapter.rooms.get(roomId);
        const userCount = room ? room.size : 0;
        io.to(roomId).emit('room-user-count', userCount);
    });

    socket.on('send-message', async (data) => {
        try {
            const message = await Message.create({
                content: data.content,
                sender: data.senderId,
                senderName: data.senderName,
                room: data.roomId,
                type: data.type || 'text',
                replyTo: data.replyTo || null
            });

            const populatedMessage = await Message.findById(message._id)
                .populate('sender', 'username avatar');

            io.to(data.roomId).emit('receive-message', populatedMessage);
        } catch (error) {
            socket.emit('message-error', 'Mesaj gönderilemedi');
        }
    });

    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('user-typing', {
            userId: data.userId,
            userName: data.userName,
            isTyping: data.isTyping
        });
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            socket.broadcast.emit('user-status-changed', {
                userId: socket.userId,
                status: 'offline'
            });
        }
    });
});

// ================ SERVER START ================

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB bağlandı'))
    .catch(err => console.error('❌ MongoDB hatası:', err));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Server ${PORT} portunda çalışıyor`);
});
