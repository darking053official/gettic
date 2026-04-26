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
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ['https://gettic.js.org', 'http://localhost:3000', '*'], methods: ['GET','POST','DELETE','PATCH'] } });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'gettic_secret_2024';
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) { console.error('MONGO_URI eksik!'); process.exit(1); }

const publicDir = path.join(__dirname, 'public');
const hasPublic = fs.existsSync(publicDir) && fs.existsSync(path.join(publicDir,'index.html'));
const staticDir = hasPublic ? publicDir : __dirname;
const indexFile = path.join(staticDir, 'index.html');

app.use(express.static(staticDir));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 300 }));

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB baglandi'))
  .catch(e => console.error('MongoDB hatasi:', e.message));

const OID = mongoose.Schema.Types.ObjectId;

const UserSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, minlength: 3, maxlength: 32 },
  password:    { type: String, required: true },
  avatar:      { type: String, default: '' },
  banner:      { type: String, default: '' },
  bio:         { type: String, default: '' },
  status:      { type: String, enum: ['online','idle','dnd','invisible'], default: 'online' },
  customStatus:{ type: String, default: '' },
  badges:      [String],
  friends:     [{ type: OID, ref: 'User' }],
  blocked:     [{ type: OID, ref: 'User' }],
  friendReqs:  [{ from: { type: OID, ref: 'User' }, createdAt: { type: Date, default: Date.now } }],
  settings: {
    theme:    { type: String, default: 'dark' },
    language: { type: String, default: 'tr' },
    font:     { type: String, default: 'inter' },
    fontSize: { type: Number, default: 14 },
    notifications: { type: Boolean, default: true },
    sounds:   { type: Boolean, default: true },
    compact:  { type: Boolean, default: false },
    inputStyle:{ type: String, default: 'modern' }
  },
  createdAt: { type: Date, default: Date.now }
});

const ServerSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  icon:        { type: String, default: '' },
  banner:      { type: String, default: '' },
  ownerId:     { type: OID, ref: 'User', required: true },
  members: [{
    userId:    OID, roles: [String], nickname: String,
    muted: { type: Boolean, default: false }, mutedUntil: Date,
    banned: { type: Boolean, default: false }, joinedAt: { type: Date, default: Date.now }
  }],
  roles: [{ name: String, color: String, permissions: [String], position: Number }],
  inviteCode:  { type: String, unique: true, default: () => uuidv4().slice(0,8) },
  isPublic:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now }
});

const ChannelSchema = new mongoose.Schema({
  serverId:  { type: OID, required: true },
  name:      { type: String, required: true },
  type:      { type: String, enum: ['text','voice','forum','stage','rules','announce'], default: 'text' },
  category:  { type: String, default: '' },
  topic:     { type: String, default: '' },
  position:  { type: Number, default: 0 },
  isPrivate: { type: Boolean, default: false },
  slowmode:  { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  channelId:    { type: OID, required: true },
  senderId:     OID,
  senderName:   { type: String, required: true },
  senderAvatar: { type: String, default: '' },
  content:      { type: String, required: true, maxlength: 2000 },
  isBot:        { type: Boolean, default: false },
  botName:      { type: String, default: '' },
  reactions:    [{ emoji: String, users: [OID] }],
  pinned:       { type: Boolean, default: false },
  editedAt:     Date,
  replyTo:      { type: OID, default: null },
  createdAt:    { type: Date, default: Date.now }
});

const PollSchema = new mongoose.Schema({
  channelId: { type: OID, required: true },
  creatorId: OID,
  question:  String,
  options:   [{ text: String, votes: [OID] }],
  endsAt:    Date,
  closed:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const BotSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  token:       { type: String, unique: true, default: () => 'bot_'+uuidv4().replace(/-/g,'') },
  ownerId:     { type: OID, required: true },
  prefix:      { type: String, default: '/' },
  description: { type: String, default: '' },
  isOnline:    { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});

const WebhookSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  token:     { type: String, unique: true, default: () => 'wh_'+uuidv4().replace(/-/g,'') },
  channelId: { type: OID, required: true },
  serverId:  { type: OID, required: true },
  ownerId:   { type: OID, required: true },
  createdAt: { type: Date, default: Date.now }
});

const DmSchema = new mongoose.Schema({
  participants: [OID],
  messages: [{
    _id:       { type: OID, default: () => new mongoose.Types.ObjectId() },
    senderId:  OID, senderName: String, content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const User    = mongoose.model('User', UserSchema);
const GServer = mongoose.model('GServer', ServerSchema);
const Channel = mongoose.model('Channel', ChannelSchema);
const Message = mongoose.model('Message', MessageSchema);
const Poll    = mongoose.model('Poll', PollSchema);
const Bot     = mongoose.model('Bot', BotSchema);
const Webhook = mongoose.model('Webhook', WebhookSchema);
const Dm      = mongoose.model('Dm', DmSchema);

const auth = async (req, res, next) => {
  const t = req.headers.authorization?.split(' ')[1];
  if (!t) return res.status(401).json({ error: 'Token gerekli' });
  try {
    const d = jwt.verify(t, JWT_SECRET);
    req.user = await User.findById(d.id).select('-password');
    if (!req.user) return res.status(401).json({ error: 'Kullanici bulunamadi' });
    next();
  } catch { res.status(401).json({ error: 'Gecersiz token' }); }
};

const san = u => ({ id: u._id, username: u.username, avatar: u.avatar, banner: u.banner,
  bio: u.bio, status: u.status, customStatus: u.customStatus, badges: u.badges,
  settings: u.settings, createdAt: u.createdAt });

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Eksik bilgi' });
    if (password.length < 6) return res.status(400).json({ error: 'Sifre en az 6 karakter' });
    if (await User.findOne({ username })) return res.status(400).json({ error: 'Kullanici adi alinmis' });
    const user = await User.create({ username, password: await bcrypt.hash(password, 12) });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: san(user) });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(400).json({ error: 'Kullanici adi veya sifre hatali' });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: san(user) });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.get('/api/me', auth, (req, res) => res.json(san(req.user)));
app.patch('/api/me', auth, async (req, res) => {
  try {
    const allowed = ['bio','avatar','banner','status','customStatus','settings'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select('-password');
    res.json(san(user));
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.get('/api/users/search', auth, async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  const users = await User.find({ username: { $regex: q, $options: 'i' }, _id: { $ne: req.user._id } })
    .select('username avatar status customStatus badges').limit(15);
  res.json(users);
});

app.get('/api/users/:id', auth, async (req, res) => {
  const u = await User.findById(req.params.id).select('-password -friendReqs');
  if (!u) return res.status(404).json({ error: 'Bulunamadi' });
  res.json(u);
});

app.get('/api/friends', auth, async (req, res) => {
  const u = await User.findById(req.user._id).populate('friends','username avatar status customStatus').populate('friendReqs.from','username avatar');
  res.json({ friends: u.friends, requests: u.friendReqs });
});

app.post('/api/friends/request', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const target = await User.findOne({ username });
    if (!target) return res.status(404).json({ error: 'Kullanici bulunamadi' });
    if (target._id.toString() === req.user._id.toString()) return res.status(400).json({ error: 'Kendine istek gonderemezsin' });
    const already = req.user.friends.map(f=>f.toString()).includes(target._id.toString());
    if (already) return res.status(400).json({ error: 'Zaten arkadassiniz' });
    const sent = target.friendReqs.find(r => r.from?.toString() === req.user._id.toString());
    if (sent) return res.status(400).json({ error: 'Istek zaten gonderildi' });
    await User.findByIdAndUpdate(target._id, { $push: { friendReqs: { from: req.user._id } } });
    io.to(`user:${target._id}`).emit('friend_request', { from: req.user._id, username: req.user.username, avatar: req.user.avatar });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.post('/api/friends/accept', auth, async (req, res) => {
  try {
    const { fromId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $pull: { friendReqs: { from: fromId } }, $addToSet: { friends: fromId } });
    await User.findByIdAndUpdate(fromId, { $addToSet: { friends: req.user._id } });
    io.to(`user:${fromId}`).emit('friend_accepted', { userId: req.user._id, username: req.user.username });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.post('/api/friends/decline', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { friendReqs: { from: req.body.fromId } } });
  res.json({ success: true });
});

app.delete('/api/friends/:id', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { friends: req.params.id } });
  await User.findByIdAndUpdate(req.params.id, { $pull: { friends: req.user._id } });
  res.json({ success: true });
});

app.get('/api/servers', auth, async (req, res) => {
  const servers = await GServer.find({ 'members.userId': req.user._id, 'members.banned': { $ne: true } });
  res.json(servers);
});

app.get('/api/servers/discover', auth, async (req, res) => {
  const servers = await GServer.find({ isPublic: true }).limit(30);
  res.json(servers);
});

app.post('/api/servers', auth, async (req, res) => {
  try {
    const { name, description, icon, banner, template } = req.body;
    if (!name) return res.status(400).json({ error: 'Ad gerekli' });
    const srv = await GServer.create({ name, description: description||'', icon: icon||'', banner: banner||'', ownerId: req.user._id, members: [{ userId: req.user._id, roles: ['owner'] }] });
    const tpl = template === 'gaming'
      ? [{ name:'genel',type:'text' },{ name:'oyun-sohbet',type:'text' },{ name:'duyurular',type:'announce' },{ name:'ses',type:'voice' }]
      : template === 'work'
      ? [{ name:'genel',type:'text' },{ name:'duyurular',type:'announce' },{ name:'toplanti',type:'voice' },{ name:'forum',type:'forum' }]
      : [{ name:'genel',type:'text' },{ name:'tanisma',type:'text' }];
    await Channel.insertMany(tpl.map((c,i) => ({ ...c, serverId: srv._id, position: i })));
    res.json(srv);
  } catch(e) { console.error(e); res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.patch('/api/servers/:id', auth, async (req, res) => {
  try {
    const srv = await GServer.findById(req.params.id);
    if (!srv || srv.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetki yok' });
    const { name, description, icon, banner, isPublic } = req.body;
    const u = {};
    if (name !== undefined) u.name = name;
    if (description !== undefined) u.description = description;
    if (icon !== undefined) u.icon = icon;
    if (banner !== undefined) u.banner = banner;
    if (isPublic !== undefined) u.isPublic = isPublic;
    const updated = await GServer.findByIdAndUpdate(req.params.id, u, { new: true });
    io.to(`server:${req.params.id}`).emit('server_updated', updated);
    res.json(updated);
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.post('/api/servers/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const srv = await GServer.findOne({ inviteCode });
    if (!srv) return res.status(404).json({ error: 'Gecersiz davet kodu' });
    const m = srv.members.find(m => m.userId.toString() === req.user._id.toString());
    if (m?.banned) return res.status(403).json({ error: 'Sunucudan banlisin' });
    if (m) return res.status(400).json({ error: 'Zaten bu sunucudasin' });
    srv.members.push({ userId: req.user._id, roles: ['member'] });
    await srv.save();
    io.to(`server:${srv._id}`).emit('member_join', { userId: req.user._id, username: req.user.username, avatar: req.user.avatar });
    res.json(srv);
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.post('/api/servers/:id/leave', auth, async (req, res) => {
  try {
    const srv = await GServer.findById(req.params.id);
    if (!srv) return res.status(404).json({ error: 'Bulunamadi' });
    if (srv.ownerId.toString() === req.user._id.toString()) return res.status(400).json({ error: 'Sahip ayrilmak icin once sil' });
    srv.members = srv.members.filter(m => m.userId.toString() !== req.user._id.toString());
    await srv.save();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.delete('/api/servers/:id', auth, async (req, res) => {
  try {
    const srv = await GServer.findById(req.params.id);
    if (!srv || srv.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetki yok' });
    const chs = await Channel.find({ serverId: srv._id });
    await Message.deleteMany({ channelId: { $in: chs.map(c=>c._id) } });
    await Channel.deleteMany({ serverId: srv._id });
    await GServer.deleteOne({ _id: srv._id });
    io.to(`server:${req.params.id}`).emit('server_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.post('/api/servers/:id/members/:uid/kick', auth, async (req, res) => {
  try {
    const srv = await GServer.findById(req.params.id);
    if (!srv) return res.status(404).json({ error: 'Bulunamadi' });
    const myM = srv.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!myM?.roles.includes('owner') && !myM?.roles.includes('mod')) return res.status(403).json({ error: 'Yetki yok' });
    srv.members = srv.members.filter(m => m.userId.toString() !== req.params.uid);
    await srv.save();
    io.to(`user:${req.params.uid}`).emit('kicked', { serverId: req.params.id });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.post('/api/servers/:id/members/:uid/ban', auth, async (req, res) => {
  try {
    const srv = await GServer.findById(req.params.id);
    if (!srv) return res.status(404).json({ error: 'Bulunamadi' });
    const myM = srv.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!myM?.roles.includes('owner') && !myM?.roles.includes('mod')) return res.status(403).json({ error: 'Yetki yok' });
    const target = srv.members.find(m => m.userId.toString() === req.params.uid);
    if (target) { target.banned = true; target.roles = ['banned']; }
    await srv.save();
    io.to(`user:${req.params.uid}`).emit('banned', { serverId: req.params.id });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.post('/api/servers/:id/members/:uid/timeout', auth, async (req, res) => {
  try {
    const { minutes } = req.body;
    const srv = await GServer.findById(req.params.id);
    if (!srv) return res.status(404).json({ error: 'Bulunamadi' });
    const myM = srv.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!myM?.roles.includes('owner') && !myM?.roles.includes('mod')) return res.status(403).json({ error: 'Yetki yok' });
    const target = srv.members.find(m => m.userId.toString() === req.params.uid);
    if (target) { target.muted = true; target.mutedUntil = new Date(Date.now() + (minutes||5)*60000); }
    await srv.save();
    io.to(`user:${req.params.uid}`).emit('timeout', { serverId: req.params.id, until: target?.mutedUntil });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.get('/api/servers/:id/members', auth, async (req, res) => {
  try {
    const srv = await GServer.findById(req.params.id);
    if (!srv) return res.status(404).json({ error: 'Bulunamadi' });
    const ids = srv.members.filter(m => !m.banned).map(m => m.userId);
    const users = await User.find({ _id: { $in: ids } }).select('username avatar status customStatus badges');
    const result = srv.members.filter(m => !m.banned).map(m => {
      const u = users.find(u => u._id.toString() === m.userId.toString());
      return { ...(u?.toObject()||{}), roles: m.roles, nickname: m.nickname, muted: m.muted, mutedUntil: m.mutedUntil, joinedAt: m.joinedAt };
    });
    res.json(result);
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.get('/api/servers/:serverId/channels', auth, async (req, res) => {
  res.json(await Channel.find({ serverId: req.params.serverId }).sort('position'));
});

app.post('/api/servers/:serverId/channels', auth, async (req, res) => {
  try {
    const { name, type, category, topic } = req.body;
    const srv = await GServer.findById(req.params.serverId);
    if (!srv) return res.status(404).json({ error: 'Sunucu bulunamadi' });
    const myM = srv.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!myM?.roles.includes('owner') && !myM?.roles.includes('mod')) return res.status(403).json({ error: 'Yetki yok' });
    const count = await Channel.countDocuments({ serverId: req.params.serverId });
    const ch = await Channel.create({ serverId: req.params.serverId, name, type: type||'text', category, topic, position: count });
    io.to(`server:${req.params.serverId}`).emit('channel_created', ch);
    res.json(ch);
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.delete('/api/servers/:serverId/channels/:id', auth, async (req, res) => {
  try {
    const srv = await GServer.findById(req.params.serverId);
    if (!srv) return res.status(404).json({ error: 'Bulunamadi' });
    const myM = srv.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!myM?.roles.includes('owner') && !myM?.roles.includes('mod')) return res.status(403).json({ error: 'Yetki yok' });
    await Channel.deleteOne({ _id: req.params.id });
    await Message.deleteMany({ channelId: req.params.id });
    io.to(`server:${req.params.serverId}`).emit('channel_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.get('/api/channels/:channelId/messages', auth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit)||50, 100);
  const q = { channelId: req.params.channelId };
  if (req.query.before) q.createdAt = { $lt: new Date(req.query.before) };
  const msgs = await Message.find(q).sort({ createdAt: -1 }).limit(limit);
  res.json(msgs.reverse());
});

app.post('/api/channels/:channelId/messages', auth, async (req, res) => {
  try {
    const { content, replyTo } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Mesaj bos olamaz' });
    const msg = await Message.create({ channelId: req.params.channelId, senderId: req.user._id, senderName: req.user.username, senderAvatar: req.user.avatar||'', content: content.trim(), replyTo: replyTo||null });
    io.to(`channel:${req.params.channelId}`).emit('new_message', msg);
    res.json(msg);
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.delete('/api/messages/:id', auth, async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Bulunamadi' });
  if (msg.senderId?.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetki yok' });
  await Message.deleteOne({ _id: msg._id });
  io.to(`channel:${msg.channelId}`).emit('message_deleted', { id: req.params.id });
  res.json({ success: true });
});

app.patch('/api/messages/:id', auth, async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Bulunamadi' });
  if (msg.senderId?.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Yetki yok' });
  msg.content = req.body.content; msg.editedAt = new Date();
  await msg.save();
  io.to(`channel:${msg.channelId}`).emit('message_edited', msg);
  res.json(msg);
});

app.post('/api/messages/:id/pin', auth, async (req, res) => {
  const msg = await Message.findByIdAndUpdate(req.params.id, { pinned: true }, { new: true });
  io.to(`channel:${msg.channelId}`).emit('message_pinned', msg);
  res.json(msg);
});

app.post('/api/messages/:id/react', auth, async (req, res) => {
  const { emoji } = req.body;
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Bulunamadi' });
  const ex = msg.reactions.find(r => r.emoji === emoji);
  if (ex) {
    const i = ex.users.map(u=>u.toString()).indexOf(req.user._id.toString());
    if (i === -1) ex.users.push(req.user._id); else ex.users.splice(i,1);
    if (ex.users.length === 0) msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
  } else { msg.reactions.push({ emoji, users: [req.user._id] }); }
  await msg.save();
  io.to(`channel:${msg.channelId}`).emit('reaction_update', { messageId: msg._id, reactions: msg.reactions });
  res.json(msg);
});

app.get('/api/channels/:channelId/polls', auth, async (req, res) => {
  res.json(await Poll.find({ channelId: req.params.channelId, closed: false }).sort('-createdAt').limit(10));
});

app.post('/api/channels/:channelId/polls', auth, async (req, res) => {
  try {
    const { question, options, duration } = req.body;
    if (!question || !options?.length) return res.status(400).json({ error: 'Soru ve secenekler gerekli' });
    const poll = await Poll.create({ channelId: req.params.channelId, creatorId: req.user._id, question, options: options.map(o=>({text:o,votes:[]})), endsAt: duration ? new Date(Date.now()+duration*60000) : null });
    io.to(`channel:${req.params.channelId}`).emit('new_poll', poll);
    res.json(poll);
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.post('/api/polls/:id/vote', auth, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);
    if (!poll || poll.closed) return res.status(400).json({ error: 'Anket kapali' });
    poll.options.forEach(o => { o.votes = o.votes.filter(v => v.toString() !== req.user._id.toString()); });
    if (optionIndex >= 0 && optionIndex < poll.options.length) poll.options[optionIndex].votes.push(req.user._id);
    await poll.save();
    io.to(`channel:${poll.channelId}`).emit('poll_update', poll);
    res.json(poll);
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.get('/api/dms', auth, async (req, res) => {
  try {
    const dms = await Dm.find({ participants: req.user._id }).sort('-updatedAt');
    const result = await Promise.all(dms.map(async dm => {
      const pid = dm.participants.find(p => p.toString() !== req.user._id.toString());
      const partner = pid ? await User.findById(pid).select('username avatar status') : null;
      return { _id: dm._id, partner, lastMessage: dm.messages[dm.messages.length-1]||null };
    }));
    res.json(result);
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.get('/api/dm/:userId', auth, async (req, res) => {
  let dm = await Dm.findOne({ participants: { $all: [req.user._id, req.params.userId] } });
  if (!dm) dm = await Dm.create({ participants: [req.user._id, req.params.userId], messages: [] });
  res.json({ dmId: dm._id, messages: dm.messages.slice(-50) });
});

app.post('/api/dm/:userId/send', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Bos mesaj' });
    let dm = await Dm.findOne({ participants: { $all: [req.user._id, req.params.userId] } });
    if (!dm) dm = await Dm.create({ participants: [req.user._id, req.params.userId], messages: [] });
    const msg = { senderId: req.user._id, senderName: req.user.username, content: content.trim(), createdAt: new Date() };
    dm.messages.push(msg);
    await dm.save();
    const added = dm.messages[dm.messages.length-1];
    io.to(`dm:${dm._id}`).emit('dm_message', { dmId: dm._id, message: added });
    io.to(`user:${req.params.userId}`).emit('dm_notify', { dmId: dm._id, from: req.user.username, avatar: req.user.avatar, content: content.trim() });
    res.json(added);
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.get('/api/bots', auth, async (req, res) => res.json(await Bot.find({ ownerId: req.user._id })));
app.post('/api/bots', auth, async (req, res) => {
  try {
    const { name, prefix, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Ad gerekli' });
    res.json(await Bot.create({ name, prefix: prefix||'/', description, ownerId: req.user._id }));
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});
app.delete('/api/bots/:id', auth, async (req, res) => { await Bot.deleteOne({ _id: req.params.id, ownerId: req.user._id }); res.json({ success: true }); });
app.post('/api/bots/:id/regenerate', auth, async (req, res) => {
  const bot = await Bot.findOne({ _id: req.params.id, ownerId: req.user._id });
  if (!bot) return res.status(404).json({ error: 'Bulunamadi' });
  bot.token = 'bot_'+uuidv4().replace(/-/g,''); await bot.save(); res.json({ token: bot.token });
});
app.post('/api/bot/send', async (req, res) => {
  try {
    const { token, room, message } = req.body;
    const bot = await Bot.findOne({ token });
    if (!bot) return res.status(401).json({ error: 'Gecersiz bot token' });
    const ch = await Channel.findOne({ name: room });
    if (!ch) return res.status(404).json({ error: 'Kanal bulunamadi' });
    const msg = await Message.create({ channelId: ch._id, senderName: bot.name, content: message, isBot: true, botName: bot.name });
    io.to(`channel:${ch._id}`).emit('new_message', msg);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

app.get('/api/webhooks', auth, async (req, res) => res.json(await Webhook.find({ ownerId: req.user._id }).populate('channelId','name')));
app.post('/api/webhooks', auth, async (req, res) => {
  try {
    const { name, channelId, serverId } = req.body;
    if (!name||!channelId||!serverId) return res.status(400).json({ error: 'Eksik bilgi' });
    res.json(await Webhook.create({ name, channelId, serverId, ownerId: req.user._id }));
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});
app.delete('/api/webhooks/:id', auth, async (req, res) => { await Webhook.deleteOne({ _id: req.params.id, ownerId: req.user._id }); res.json({ success: true }); });
app.post('/api/webhook/:token', async (req, res) => {
  try {
    const wh = await Webhook.findOne({ token: req.params.token });
    if (!wh) return res.status(401).json({ error: 'Gecersiz token' });
    const { content, embed } = req.body;
    const msgContent = embed
      ? `**${embed.title||''}**\n${embed.description||''}\n${(embed.fields||[]).map(f=>`**${f.name}:** ${f.value}`).join('\n')}`
      : content;
    if (!msgContent) return res.status(400).json({ error: 'Icerik gerekli' });
    const msg = await Message.create({ channelId: wh.channelId, senderName: wh.name, content: msgContent, isBot: true, botName: wh.name });
    io.to(`channel:${wh.channelId}`).emit('new_message', msg);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
});

const onlineUsers = new Map();
io.on('connection', socket => {
  socket.on('auth', async token => {
    try {
      const d = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(d.id).select('-password');
      if (!user) return socket.emit('auth_error', 'Gecersiz token');
      socket.userId = user._id.toString(); socket.username = user.username;
      socket.join(`user:${user._id}`);
      onlineUsers.set(socket.id, { userId: user._id.toString(), username: user.username, status: user.status });
      socket.emit('auth_success', { userId: user._id, username: user.username });
      io.emit('user_online', { userId: user._id, username: user.username, status: user.status });
    } catch { socket.emit('auth_error', 'Gecersiz token'); }
  });

  socket.on('join_channel', id => socket.join(`channel:${id}`));
  socket.on('leave_channel', id => socket.leave(`channel:${id}`));
  socket.on('join_server',  id => socket.join(`server:${id}`));
  socket.on('join_dm',      id => socket.join(`dm:${id}`));
  socket.on('leave_dm',     id => socket.leave(`dm:${id}`));
  socket.on('typing', ({ channelId }) => socket.to(`channel:${channelId}`).emit('user_typing', { userId: socket.userId, username: socket.username, channelId }));
  socket.on('dm_typing', ({ dmId }) => socket.to(`dm:${dmId}`).emit('dm_user_typing', { username: socket.username }));
  socket.on('status_change', async ({ status }) => {
    if (socket.userId) {
      await User.findByIdAndUpdate(socket.userId, { status });
      const u = onlineUsers.get(socket.id); if (u) u.status = status;
      io.emit('user_status', { userId: socket.userId, status });
    }
  });
  socket.on('voice_join', ({ channelId }) => {
    socket.join(`voice:${channelId}`);
    socket.to(`voice:${channelId}`).emit('voice_user_join', { userId: socket.userId, username: socket.username });
  });
  socket.on('voice_leave', ({ channelId }) => {
    socket.leave(`voice:${channelId}`);
    socket.to(`voice:${channelId}`).emit('voice_user_leave', { userId: socket.userId });
  });
  socket.on('disconnect', () => {
    if (socket.userId) { onlineUsers.delete(socket.id); io.emit('user_offline', { userId: socket.userId }); }
  });
});

app.get('*', (req, res) => {
  if (fs.existsSync(indexFile)) res.sendFile(indexFile);
  else res.status(404).send('index.html bulunamadi');
});

server.listen(PORT, () => console.log(`🚀 Gettic: https://gettic.js.org | Local: http://localhost:${PORT}`);
  console.log(`📁 Static: ${staticDir}`););
