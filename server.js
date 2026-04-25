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
    cors: { origin: "*", methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
    maxHttpBufferSize: 10e6,
    pingTimeout: 60000,
    transports: ['polling', 'websocket']
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// ============ MODELS ============
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },
    banner: { type: String, default: '' },
    status: { type: String, enum: ['online', 'idle', 'dnd', 'invisible'], default: 'online' },
    bio: { type: String, default: '', maxlength: 200 },
    badges: { type: [String], default: ['Üye'] },
    createdAt: { type: Date, default: Date.now }
});
userSchema.pre('save', async function(next) { if (!this.isModified('password')) return next(); this.password = await bcrypt.hash(this.password, 10); next(); });
userSchema.methods.comparePassword = async function(p) { return await bcrypt.compare(p, this.password); };
userSchema.methods.toJSON = function() { const u = this.toObject(); delete u.password; return u; };
const User = mongoose.model('User', userSchema);

const serverSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    icon: { type: String, default: '' },
    inviteCode: { type: String, unique: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
});
const Server = mongoose.model('Server', serverSchema);

const channelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server' },
    type: { type: String, enum: ['text', 'voice', 'forum', 'stage'], default: 'text' },
    topic: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Channel = mongoose.model('Channel', channelSchema);

const messageSchema = new mongoose.Schema({
    content: { type: String, default: '' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, required: true },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
    type: { type: String, default: 'text' },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    reactions: [{ emoji: String, users: [String] }],
    isBot: { type: Boolean, default: false },
    botName: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

const webhookSchema = new mongoose.Schema({
    name: { type: String, required: true },
    server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server' },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
    token: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});
const Webhook = mongoose.model('Webhook', webhookSchema);

const botSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    prefix: { type: String, default: '/' },
    description: { type: String, default: '' },
    token: { type: String, required: true, unique: true },
    isOnline: { type: Boolean, default: false },
    commands: [{ name: String, response: String }],
    createdAt: { type: Date, default: Date.now }
});
const Bot = mongoose.model('Bot', botSchema);

// ============ AUTH ============
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Token gerekli' });
        const d = jwt.verify(token, process.env.JWT_SECRET || 'gettic2024secret');
        req.user = await User.findById(d.userId);
        if (!req.user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        next();
    } catch (e) { res.status(401).json({ error: 'Geçersiz token' }); }
};

// ============ AUTH ROUTES ============
app.post('/api/register', async (req, res) => {
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
    } catch (e) { res.status(500).json({ error: 'Kayıt başarısız' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
        if (!(await user.comparePassword(password))) return res.status(400).json({ error: 'Şifre hatalı' });
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'gettic2024secret', { expiresIn: '30d' });
        res.json({ user, token });
    } catch (e) { res.status(500).json({ error: 'Giriş başarısız' }); }
});

app.get('/api/me', auth, async (req, res) => { res.json(req.user); });

app.patch('/api/me', auth, async (req, res) => {
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

// ============ SERVERS ============
app.get('/api/servers', auth, async (req, res) => {
    try { res.json(await Server.find({ members: req.user._id })); } catch (e) { res.json([]); }
});

app.post('/api/servers', auth, async (req, res) => {
    try {
        const { name, template } = req.body;
        if (!name) return res.status(400).json({ error: 'Sunucu adı gerekli' });
        const inviteCode = crypto.randomBytes(4).toString('hex');
        const server = new Server({ name, owner: req.user._id, inviteCode, members: [req.user._id] });
        await server.save();
        // Default channels based on template
        const defaultChannels = template === 'gaming' 
            ? [{ name: 'genel', type: 'text' }, { name: 'oyun', type: 'text' }, { name: 'sesli', type: 'voice' }]
            : template === 'work'
            ? [{ name: 'genel', type: 'text' }, { name: 'projeler', type: 'text' }, { name: 'toplanti', type: 'voice' }]
            : [{ name: 'genel', type: 'text' }, { name: 'sesli', type: 'voice' }];
        for (const ch of defaultChannels) {
            await new Channel({ name: ch.name, server: server._id, type: ch.type }).save();
        }
        res.status(201).json(server);
    } catch (e) { res.status(500).json({ error: 'Sunucu oluşturulamadı' }); }
});

app.post('/api/servers/join', auth, async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const server = await Server.findOne({ inviteCode });
        if (!server) return res.status(404).json({ error: 'Geçersiz davet kodu' });
        if (!server.members.includes(req.user._id)) {
            server.members.push(req.user._id);
            await server.save();
        }
        res.json(server);
    } catch (e) { res.status(500).json({ error: 'Sunucuya katılınamadı' }); }
});

app.get('/api/servers/:id', auth, async (req, res) => {
    try { res.json(await Server.findById(req.params.id)); } catch (e) { res.status(404).json({ error: 'Bulunamadı' }); }
});

app.delete('/api/servers/:id', auth, async (req, res) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server || server.owner.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetkisiz' });
        await Channel.deleteMany({ server: server._id });
        await server.deleteOne();
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Silinemedi' }); }
});

// ============ CHANNELS ============
app.get('/api/servers/:id/channels', auth, async (req, res) => {
    try { res.json(await Channel.find({ server: req.params.id })); } catch (e) { res.json([]); }
});

app.post('/api/servers/:id/channels', auth, async (req, res) => {
    try {
        const { name, type, topic } = req.body;
        if (!name) return res.status(400).json({ error: 'Kanal adı gerekli' });
        const channel = new Channel({ name, server: req.params.id, type: type || 'text', topic });
        await channel.save();
        io.to('server:' + req.params.id).emit('channel_created', channel);
        res.status(201).json(channel);
    } catch (e) { res.status(500).json({ error: 'Kanal oluşturulamadı' }); }
});

// ============ MESSAGES ============
app.get('/api/channels/:id/messages', auth, async (req, res) => {
    try {
        const msgs = await Message.find({ channel: req.params.id }).sort({ createdAt: -1 }).limit(100);
        res.json(msgs.reverse());
    } catch (e) { res.json([]); }
});

app.post('/api/channels/:id/messages', auth, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Mesaj boş olamaz' });
        const msg = new Message({ content, sender: req.user._id, senderName: req.user.username, channel: req.params.id });
        await msg.save();
        const populated = await Message.findById(msg._id);
        io.to('channel:' + req.params.id).emit('new_message', populated);
        res.status(201).json(populated);
    } catch (e) { res.status(500).json({ error: 'Mesaj gönderilemedi' }); }
});

app.patch('/api/messages/:id', auth, async (req, res) => {
    try {
        const msg = await Message.findByIdAndUpdate(req.params.id, { content: req.body.content, edited: true, editedAt: new Date() }, { new: true });
        io.to('channel:' + msg.channel).emit('message_edited', msg);
        res.json(msg);
    } catch (e) { res.status(500).json({ error: 'Düzenlenemedi' }); }
});

app.delete('/api/messages/:id', auth, async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Bulunamadı' });
        io.to('channel:' + msg.channel).emit('message_deleted', { id: req.params.id });
        await msg.deleteOne();
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Silinemedi' }); }
});

app.post('/api/messages/:id/react', auth, async (req, res) => {
    try {
        const { emoji } = req.body;
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Bulunamadı' });
        let reaction = msg.reactions.find(r => r.emoji === emoji);
        if (!reaction) { reaction = { emoji, users: [] }; msg.reactions.push(reaction); }
        const idx = reaction.users.indexOf(req.user.username);
        if (idx > -1) reaction.users.splice(idx, 1);
        else reaction.users.push(req.user.username);
        msg.reactions = msg.reactions.filter(r => r.users.length > 0);
        await msg.save();
        io.to('channel:' + msg.channel).emit('reaction_update', { messageId: msg._id, reactions: msg.reactions });
        res.json(msg.reactions);
    } catch (e) { res.status(500).json({ error: 'Tepki eklenemedi' }); }
});

// ============ BOTS ============
app.get('/api/bots', auth, async (req, res) => {
    try { res.json(await Bot.find({ owner: req.user._id })); } catch (e) { res.json([]); }
});

app.post('/api/bots', auth, async (req, res) => {
    try {
        const { name, prefix, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Bot adı gerekli' });
        const token = crypto.randomBytes(16).toString('hex');
        const bot = new Bot({ name, owner: req.user._id, prefix: prefix || '/', description, token });
        await bot.save();
        res.status(201).json(bot);
    } catch (e) { res.status(500).json({ error: 'Bot oluşturulamadı' }); }
});

app.delete('/api/bots/:id', auth, async (req, res) => {
    try { await Bot.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi' }); }
});

app.post('/api/bots/:id/regenerate', auth, async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id);
        if (!bot) return res.status(404).json({ error: 'Bulunamadı' });
        bot.token = crypto.randomBytes(16).toString('hex');
        await bot.save();
        res.json(bot);
    } catch (e) { res.status(500).json({ error: 'Token yenilenemedi' }); }
});

app.post('/api/bot/send', async (req, res) => {
    try {
        const { token, channelId, content } = req.body;
        const bot = await Bot.findOne({ token });
        if (!bot) return res.status(401).json({ error: 'Geçersiz token' });
        const msg = new Message({ content, senderName: bot.name, channel: channelId, isBot: true, botName: bot.name });
        await msg.save();
        io.to('channel:' + channelId).emit('new_message', msg);
        res.json(msg);
    } catch (e) { res.status(500).json({ error: 'Mesaj gönderilemedi' }); }
});

// ============ WEBHOOKS ============
app.get('/api/webhooks', auth, async (req, res) => {
    try { res.json(await Webhook.find({}).populate('channel')); } catch (e) { res.json([]); }
});

app.post('/api/webhooks', auth, async (req, res) => {
    try {
        const { name, serverId, channelId } = req.body;
        if (!name || !serverId || !channelId) return res.status(400).json({ error: 'Tüm alanlar gerekli' });
        const token = crypto.randomBytes(16).toString('hex');
        const webhook = new Webhook({ name, server: serverId, channel: channelId, token });
        await webhook.save();
        res.status(201).json(webhook);
    } catch (e) { res.status(500).json({ error: 'Webhook oluşturulamadı' }); }
});

app.delete('/api/webhooks/:id', auth, async (req, res) => {
    try { await Webhook.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi' }); }
});

app.post('/api/webhook/:token', async (req, res) => {
    try {
        const webhook = await Webhook.findOne({ token: req.params.token });
        if (!webhook) return res.status(404).json({ error: 'Webhook bulunamadı' });
        const { content, embed } = req.body;
        let finalContent = content || '';
        if (embed) {
            finalContent = `**${embed.title || ''}**\n${embed.description || ''}`;
            if (embed.fields) embed.fields.forEach(f => finalContent += `\n**${f.name}**: ${f.value}`);
        }
        if (!finalContent) return res.status(400).json({ error: 'İçerik gerekli' });
        const msg = new Message({ content: finalContent, senderName: webhook.name, channel: webhook.channel, isBot: true, botName: webhook.name });
        await msg.save();
        io.to('channel:' + webhook.channel).emit('new_message', msg);
        res.json({ ok: true, message: msg });
    } catch (e) { res.status(500).json({ error: 'Webhook hatası' }); }
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
    socket.on('auth', async (token) => {
        try {
            const d = jwt.verify(token, process.env.JWT_SECRET || 'gettic2024secret');
            socket.userId = d.userId;
            socket.emit('auth_success', { userId: d.userId });
        } catch (e) { socket.emit('auth_error', { error: 'Geçersiz token' }); }
    });

    socket.on('join_server', (serverId) => { socket.join('server:' + serverId); });
    socket.on('join_channel', (channelId) => { socket.join('channel:' + channelId); });
    socket.on('leave_channel', (channelId) => { socket.leave('channel:' + channelId); });

    socket.on('typing', ({ channelId }) => {
        socket.to('channel:' + channelId).emit('user_typing', { username: socket.username || 'Biri', channelId });
    });

    socket.on('status_change', ({ status }) => {
        socket.username = status;
        socket.broadcast.emit('user_online', { userId: socket.userId, status });
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('user_offline', { userId: socket.userId });
    });
});

// ============ FRONTEND ============
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime() }); });

// ============ START ============
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/gettic';
const PORT = process.env.PORT || 3000;

console.log('🚀 Gettic başlatılıyor...');
mongoose.connect(MONGODB_URI).then(() => console.log('✅ MongoDB')).catch(e => console.log('❌', e.message));
server.listen(PORT, '0.0.0.0', () => console.log(`✅ Port: ${PORT}`));
