require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'gettic_super_secret_2024';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gettic';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// ─── MongoDB Bağlantısı ───────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB bağlandı'))
  .catch(err => console.error('❌ MongoDB hatası:', err));

// ─── Schemas ──────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 32 },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  status: { type: String, enum: ['online', 'idle', 'dnd', 'invisible'], default: 'online' },
  badges: [String],
  createdAt: { type: Date, default: Date.now }
});

const ServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, default: '' },
  banner: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ userId: mongoose.Schema.Types.ObjectId, roles: [String], joinedAt: { type: Date, default: Date.now } }],
  roles: [{
    name: String,
    color: String,
    permissions: [String],
    position: Number
  }],
  inviteCode: { type: String, unique: true, default: () => uuidv4().slice(0, 8) },
  createdAt: { type: Date, default: Date.now }
});

const ChannelSchema = new mongoose.Schema({
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'voice', 'forum', 'stage'], default: 'text' },
  category: { type: String, default: '' },
  topic: { type: String, default: '' },
  position: { type: Number, default: 0 },
  isPrivate: { type: Boolean, default: false },
  password: { type: String, default: '' },
  slowmode: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String, required: true },
  content: { type: String, required: true, maxlength: 2000 },
  isBot: { type: Boolean, default: false },
  botName: { type: String, default: '' },
  reactions: [{
    emoji: String,
    users: [mongoose.Schema.Types.ObjectId]
  }],
  pinned: { type: Boolean, default: false },
  editedAt: { type: Date },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  attachments: [{ name: String, url: String, size: Number }],
  createdAt: { type: Date, default: Date.now }
});

const BotSchema = new mongoose.Schema({
  name: { type: String, required: true },
  token: { type: String, unique: true, default: () => 'bot_' + uuidv4().replace(/-/g, '') },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prefix: { type: String, default: '/' },
  avatar: { type: String, default: '' },
  description: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', default: null },
  createdAt: { type: Date, default: Date.now }
});

const WebhookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  token: { type: String, unique: true, default: () => 'wh_' + uuidv4().replace(/-/g, '') },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const DmSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{
    senderId: mongoose.Schema.Types.ObjectId,
    senderName: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const User     = mongoose.model('User', UserSchema);
const GServer  = mongoose.model('GServer', ServerSchema);
const Channel  = mongoose.model('Channel', ChannelSchema);
const Message  = mongoose.model('Message', MessageSchema);
const Bot      = mongoose.model('Bot', BotSchema);
const Webhook  = mongoose.model('Webhook', WebhookSchema);
const Dm       = mongoose.model('Dm', DmSchema);

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token gerekli' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
};

// ─── API: Auth ────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: 'Bu kullanıcı adı alınmış' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ username, password: hashed });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, username: user.username, avatar: user.avatar, status: user.status } });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Yanlış şifre' });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, username: user.username, avatar: user.avatar, status: user.status } });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.get('/api/me', auth, (req, res) => res.json(req.user));

app.patch('/api/me', auth, async (req, res) => {
  try {
    const { bio, avatar, status } = req.body;
    const update = {};
    if (bio !== undefined) update.bio = bio;
    if (avatar !== undefined) update.avatar = avatar;
    if (status !== undefined) update.status = status;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── API: Servers ─────────────────────────────────────────────────────────────
app.get('/api/servers', auth, async (req, res) => {
  const servers = await GServer.find({ 'members.userId': req.user._id });
  res.json(servers);
});

app.post('/api/servers', auth, async (req, res) => {
  try {
    const { name, template } = req.body;
    if (!name) return res.status(400).json({ error: 'Sunucu adı gerekli' });
    const srv = await GServer.create({
      name,
      ownerId: req.user._id,
      members: [{ userId: req.user._id, roles: ['owner'] }]
    });
    // Default kanallar
    const defaultChannels = template === 'gaming'
      ? [{ name: 'genel', type: 'text' }, { name: 'oyun-sohbet', type: 'text' }, { name: 'ses-kanalı', type: 'voice' }]
      : template === 'work'
      ? [{ name: 'genel', type: 'text' }, { name: 'duyurular', type: 'text' }, { name: 'toplantı', type: 'voice' }]
      : [{ name: 'genel', type: 'text' }, { name: 'tanışma', type: 'text' }];

    await Channel.insertMany(defaultChannels.map(c => ({ ...c, serverId: srv._id })));
    res.json(srv);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.post('/api/servers/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const srv = await GServer.findOne({ inviteCode });
    if (!srv) return res.status(404).json({ error: 'Geçersiz davet kodu' });
    const already = srv.members.find(m => m.userId.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ error: 'Zaten bu sunucudasın' });
    srv.members.push({ userId: req.user._id, roles: ['member'] });
    await srv.save();
    res.json(srv);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.get('/api/servers/:id', auth, async (req, res) => {
  const srv = await GServer.findById(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(srv);
});

app.delete('/api/servers/:id', auth, async (req, res) => {
  const srv = await GServer.findById(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Bulunamadı' });
  if (srv.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetki yok' });
  await GServer.deleteOne({ _id: srv._id });
  await Channel.deleteMany({ serverId: srv._id });
  await Message.deleteMany({ channelId: { $in: (await Channel.find({ serverId: srv._id })).map(c => c._id) } });
  res.json({ success: true });
});

// ─── API: Channels ────────────────────────────────────────────────────────────
app.get('/api/servers/:serverId/channels', auth, async (req, res) => {
  const channels = await Channel.find({ serverId: req.params.serverId }).sort('position');
  res.json(channels);
});

app.post('/api/servers/:serverId/channels', auth, async (req, res) => {
  try {
    const { name, type, category, topic } = req.body;
    const srv = await GServer.findById(req.params.serverId);
    if (!srv || srv.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetki yok' });
    const ch = await Channel.create({ serverId: req.params.serverId, name, type: type || 'text', category, topic });
    io.to(`server:${req.params.serverId}`).emit('channel_created', ch);
    res.json(ch);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.delete('/api/servers/:serverId/channels/:id', auth, async (req, res) => {
  const srv = await GServer.findById(req.params.serverId);
  if (!srv || srv.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetki yok' });
  await Channel.deleteOne({ _id: req.params.id });
  io.to(`server:${req.params.serverId}`).emit('channel_deleted', { id: req.params.id });
  res.json({ success: true });
});

// ─── API: Messages ────────────────────────────────────────────────────────────
app.get('/api/channels/:channelId/messages', auth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const before = req.query.before;
  const query = { channelId: req.params.channelId };
  if (before) query.createdAt = { $lt: new Date(before) };
  const msgs = await Message.find(query).sort({ createdAt: -1 }).limit(limit);
  res.json(msgs.reverse());
});

app.post('/api/channels/:channelId/messages', auth, async (req, res) => {
  try {
    const { content, replyTo } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Mesaj boş olamaz' });
    const ch = await Channel.findById(req.params.channelId);
    if (!ch) return res.status(404).json({ error: 'Kanal bulunamadı' });
    const msg = await Message.create({
      channelId: req.params.channelId,
      senderId: req.user._id,
      senderName: req.user.username,
      content: content.trim(),
      replyTo: replyTo || null
    });
    io.to(`channel:${req.params.channelId}`).emit('new_message', msg);
    res.json(msg);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.delete('/api/messages/:id', auth, async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Bulunamadı' });
  if (msg.senderId?.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetki yok' });
  await Message.deleteOne({ _id: msg._id });
  io.to(`channel:${msg.channelId}`).emit('message_deleted', { id: req.params.id });
  res.json({ success: true });
});

app.patch('/api/messages/:id', auth, async (req, res) => {
  const { content } = req.body;
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Bulunamadı' });
  if (msg.senderId?.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetki yok' });
  msg.content = content;
  msg.editedAt = new Date();
  await msg.save();
  io.to(`channel:${msg.channelId}`).emit('message_edited', msg);
  res.json(msg);
});

// Pin mesaj
app.post('/api/messages/:id/pin', auth, async (req, res) => {
  const msg = await Message.findByIdAndUpdate(req.params.id, { pinned: true }, { new: true });
  res.json(msg);
});

// Reaction
app.post('/api/messages/:id/react', auth, async (req, res) => {
  const { emoji } = req.body;
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Bulunamadı' });
  const existing = msg.reactions.find(r => r.emoji === emoji);
  if (existing) {
    const idx = existing.users.indexOf(req.user._id);
    if (idx === -1) existing.users.push(req.user._id);
    else existing.users.splice(idx, 1);
  } else {
    msg.reactions.push({ emoji, users: [req.user._id] });
  }
  await msg.save();
  io.to(`channel:${msg.channelId}`).emit('reaction_update', { messageId: msg._id, reactions: msg.reactions });
  res.json(msg);
});

// ─── API: Bots ────────────────────────────────────────────────────────────────
app.get('/api/bots', auth, async (req, res) => {
  const bots = await Bot.find({ ownerId: req.user._id });
  res.json(bots);
});

app.post('/api/bots', auth, async (req, res) => {
  try {
    const { name, prefix, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Bot adı gerekli' });
    const bot = await Bot.create({ name, prefix: prefix || '/', description, ownerId: req.user._id });
    res.json(bot);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.delete('/api/bots/:id', auth, async (req, res) => {
  const bot = await Bot.findOne({ _id: req.params.id, ownerId: req.user._id });
  if (!bot) return res.status(404).json({ error: 'Bulunamadı' });
  await Bot.deleteOne({ _id: bot._id });
  res.json({ success: true });
});

app.post('/api/bots/:id/regenerate', auth, async (req, res) => {
  const bot = await Bot.findOne({ _id: req.params.id, ownerId: req.user._id });
  if (!bot) return res.status(404).json({ error: 'Bulunamadı' });
  bot.token = 'bot_' + uuidv4().replace(/-/g, '');
  await bot.save();
  res.json({ token: bot.token });
});

// Bot token ile mesaj gönderme (gettic.js kütüphanesi için)
app.post('/api/bot/send', async (req, res) => {
  try {
    const { token, room, message } = req.body;
    const bot = await Bot.findOne({ token });
    if (!bot) return res.status(401).json({ error: 'Geçersiz bot token' });
    const ch = await Channel.findOne({ name: room });
    if (!ch) return res.status(404).json({ error: 'Kanal bulunamadı' });
    const msg = await Message.create({
      channelId: ch._id,
      senderName: bot.name,
      content: message,
      isBot: true,
      botName: bot.name
    });
    io.to(`channel:${ch._id}`).emit('new_message', msg);
    res.json({ success: true, messageId: msg._id });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── API: Webhooks ────────────────────────────────────────────────────────────
app.get('/api/webhooks', auth, async (req, res) => {
  const webhooks = await Webhook.find({ ownerId: req.user._id }).populate('channelId', 'name');
  res.json(webhooks);
});

app.post('/api/webhooks', auth, async (req, res) => {
  try {
    const { name, channelId, serverId } = req.body;
    if (!name || !channelId || !serverId) return res.status(400).json({ error: 'Eksik bilgi' });
    const wh = await Webhook.create({ name, channelId, serverId, ownerId: req.user._id });
    res.json(wh);
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.delete('/api/webhooks/:id', auth, async (req, res) => {
  await Webhook.deleteOne({ _id: req.params.id, ownerId: req.user._id });
  res.json({ success: true });
});

// Webhook ile mesaj gönderme
app.post('/api/webhook/:token', async (req, res) => {
  try {
    const wh = await Webhook.findOne({ token: req.params.token });
    if (!wh) return res.status(401).json({ error: 'Geçersiz webhook token' });
    const { content, embed } = req.body;
    const msgContent = embed
      ? `**${embed.title || ''}**\n${embed.description || ''}\n${(embed.fields || []).map(f => `**${f.name}:** ${f.value}`).join('\n')}`
      : content;
    if (!msgContent) return res.status(400).json({ error: 'İçerik gerekli' });
    const msg = await Message.create({
      channelId: wh.channelId,
      senderName: wh.name,
      content: msgContent,
      isBot: true,
      botName: wh.name
    });
    io.to(`channel:${wh.channelId}`).emit('new_message', msg);
    res.json({ success: true, messageId: msg._id });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── API: DM ─────────────────────────────────────────────────────────────────
app.get('/api/users/search', auth, async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  const users = await User.find({ username: { $regex: q, $options: 'i' }, _id: { $ne: req.user._id } })
    .select('username avatar status').limit(10);
  res.json(users);
});

app.get('/api/dm/:userId', auth, async (req, res) => {
  let dm = await Dm.findOne({ participants: { $all: [req.user._id, req.params.userId] } });
  if (!dm) dm = await Dm.create({ participants: [req.user._id, req.params.userId], messages: [] });
  res.json(dm);
});

app.post('/api/dm/:userId/send', auth, async (req, res) => {
  const { content } = req.body;
  let dm = await Dm.findOne({ participants: { $all: [req.user._id, req.params.userId] } });
  if (!dm) dm = await Dm.create({ participants: [req.user._id, req.params.userId], messages: [] });
  const msg = { senderId: req.user._id, senderName: req.user.username, content, createdAt: new Date() };
  dm.messages.push(msg);
  await dm.save();
  io.to(`dm:${dm._id}`).emit('dm_message', msg);
  res.json(msg);
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
const onlineUsers = new Map(); // socketId -> { userId, username, status }

io.on('connection', (socket) => {
  console.log('🔌 Yeni bağlantı:', socket.id);

  socket.on('auth', async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return socket.emit('auth_error', 'Geçersiz token');
      socket.userId = user._id.toString();
      socket.username = user.username;
      onlineUsers.set(socket.id, { userId: user._id.toString(), username: user.username, status: user.status });
      socket.emit('auth_success', { userId: user._id, username: user.username });
      io.emit('user_online', { userId: user._id, username: user.username, status: user.status });
    } catch {
      socket.emit('auth_error', 'Geçersiz token');
    }
  });

  socket.on('join_channel', (channelId) => {
    socket.join(`channel:${channelId}`);
    socket.emit('joined_channel', channelId);
  });

  socket.on('leave_channel', (channelId) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on('join_server', (serverId) => {
    socket.join(`server:${serverId}`);
  });

  socket.on('join_dm', (dmId) => {
    socket.join(`dm:${dmId}`);
  });

  socket.on('typing', ({ channelId }) => {
    socket.to(`channel:${channelId}`).emit('user_typing', {
      userId: socket.userId,
      username: socket.username,
      channelId
    });
  });

  socket.on('status_change', async ({ status }) => {
    if (socket.userId) {
      await User.findByIdAndUpdate(socket.userId, { status });
      const userData = onlineUsers.get(socket.id);
      if (userData) userData.status = status;
      io.emit('user_status', { userId: socket.userId, status });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.id);
      io.emit('user_offline', { userId: socket.userId });
    }
    console.log('🔌 Bağlantı kapandı:', socket.id);
  });
});

// ─── Serve index.html ─────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Gettic sunucusu çalışıyor: http://localhost:${PORT}`);
});
