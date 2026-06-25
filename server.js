// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC SERVER.JS v2.0 - MAX GÜVENLİK                          ║
// ╚══════════════════════════════════════════════════════════════════╝

'use strict';
require('dotenv').config();

// ── Ortam değişkeni kontrolü ──────────────────────────────────────
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Eksik env değişkenleri:', missing.join(', '));
  process.exit(1);
}

const crypto      = require('crypto');
const path        = require('path');
const mongoose    = require('mongoose');
const express     = require('express');
const cors        = require('cors');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const { createServer } = require('http');
const { Server }  = require('socket.io');
const rateLimit   = require('express-rate-limit');
const slowDown    = require('express-slow-down');
const helmet      = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp         = require('hpp');
const xss         = require('xss');
const useragent   = require('express-useragent');
const requestIp   = require('request-ip');
const validator   = require('validator');
const cookieParser = require('cookie-parser');

// ── Opsiyonel ─────────────────────────────────────────────────────
let nodemailer, googleApis;
try { nodemailer = require('nodemailer'); googleApis = require('googleapis'); } catch {}

// ═══════════════════════════════════════════════════════════════════
// SABİTLER
// ═══════════════════════════════════════════════════════════════════
const PORT          = parseInt(process.env.PORT) || 3000;
const JWT_SECRET    = process.env.JWT_SECRET;
const JWT_REFRESH   = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES   = process.env.JWT_EXPIRES    || '15m';   // Kısa ömür
const JWT_R_EXPIRES = process.env.JWT_R_EXPIRES  || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const MAX_MSG_LEN   = 2000;
const MAX_FILE_MB   = 8;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://gettic.js.org,http://localhost:3000').split(',').map(s => s.trim());

// ═══════════════════════════════════════════════════════════════════
// EXPRESS + HTTP SERVER
// ═══════════════════════════════════════════════════════════════════
const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: {
    origin:      ALLOWED_ORIGINS,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout:   20000,
  pingInterval:  10000,
  transports:    ['websocket', 'polling'],
  maxHttpBufferSize: 1e6, // 1 MB
});

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITERS
// ═══════════════════════════════════════════════════════════════════
function _limiter(windowMin, max, msg) {
  return rateLimit({
    windowMs:          windowMin * 60 * 1000,
    max,
    message:           { error: msg },
    standardHeaders:   true,
    legacyHeaders:     false,
    keyGenerator:      req => req.clientIp || req.ip,
    handler:           (req, res, next, opts) => res.status(429).json({ error: opts.message.error }),
    skip:              req => process.env.NODE_ENV === 'test',
  });
}

const authLimiter    = _limiter(15, 10,  'Çok fazla deneme. 15 dakika bekle.');
const apiLimiter     = _limiter(1,  120, 'Çok fazla istek. 1 dakika bekle.');
const msgLimiter     = _limiter(0.05, 1, '3 saniyede 1 mesaj gönderebilirsin.'); // 3sn
const imgLimiter     = _limiter(1,  5,   'Dakikada 5 görsel sınırı.');
const searchLimiter  = _limiter(1,  30,  'Çok fazla arama isteği.');
const uploadLimiter  = _limiter(1,  10,  'Çok fazla yükleme isteği.');

// Yavaşlatıcı (brute-force önlemi)
const authSlowDown = slowDown({
  windowMs:   15 * 60 * 1000,
  delayAfter: 5,
  delayMs:    (used) => (used - 5) * 500,  // ← BU SATIR DEĞİŞTİ
  maxDelayMs: 5000,
  keyGenerator: req => req.clientIp || req.ip,
  skip: req => process.env.NODE_ENV === 'test',
});

// ═══════════════════════════════════════════════════════════════════
// GÜVENLİK MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

// ── Helmet (HTTP güvenlik başlıkları) ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "https://cdn.jsdelivr.net", "https://cdn.socket.io", "https://cdnjs.cloudflare.com", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
      scriptSrcAttr:  ["'none'"],
      styleSrc:       ["'self'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      imgSrc:         ["'self'", "data:", "blob:", "https:", "http:"],
      fontSrc:        ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      connectSrc:     ["'self'", "wss:", "ws:", "https://api.cerebras.ai", "https://image.pollinations.ai"],
      mediaSrc:       ["'self'", "blob:", "data:"],
      workerSrc:      ["'self'", "blob:"],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      baseUri:        ["'self'"],
      formAction:     ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // SharedArrayBuffer için false
  crossOriginOpenerPolicy:   { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl:        { allow: false },
  frameguard:                { action: 'deny' },
  hsts:                      { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen:                  true,
  noSniff:                   true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy:            { policy: 'strict-origin-when-cross-origin' },
  xssFilter:                 true,
}));

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: izin verilmeyen origin: ' + origin));
  },
  methods:          ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders:   ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  exposedHeaders:   ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials:      true,
  maxAge:           600,
}));

// ── Body parser ───────────────────────────────────────────────────
app.use(express.json({
  limit:  `${MAX_FILE_MB}mb`,
  verify: (req, res, buf) => { req.rawBody = buf; }, // HMAC doğrulama için
}));
app.use(express.urlencoded({ extended: true, limit: `${MAX_FILE_MB}mb` }));

// cookie
app.use(cookieParser());

// ── IP & User-Agent ───────────────────────────────────────────────
app.use(requestIp.mw());
app.use(useragent.express());
app.use((req, res, next) => {
  req.uaString  = req.useragent?.source?.slice(0, 200) || 'Unknown';
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ── MongoDB injection & HPP ────────────────────────────────────────
app.use(mongoSanitize({
  replaceWith:   '_',
  onSanitize:    ({ req, key }) => console.warn(`[Security] MongoDB inject attempt — ${req.clientIp} — ${key}`),
}));
app.use(hpp({ whitelist: [] }));

// ── XSS sanitize ──────────────────────────────────────────────────
const XSS_OPTS = {
  whiteList:          {},
  stripIgnoreTag:     true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
};

function _sanitizeDeep(obj, depth = 0) {
  if (depth > 10) return obj;
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key].slice(0, 10000), XSS_OPTS);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      _sanitizeDeep(obj[key], depth + 1);
    }
  }
  return obj;
}

app.use((req, res, next) => {
  _sanitizeDeep(req.body);
  _sanitizeDeep(req.query);
  _sanitizeDeep(req.params);
  next();
});

// ── Ek güvenlik başlıkları ────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options',              'nosniff');
  res.setHeader('X-Frame-Options',                     'DENY');
  res.setHeader('X-XSS-Protection',                   '1; mode=block');
  res.setHeader('X-Download-Options',                  'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies',   'none');
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()');
  next();
});

// ── Statik dosya önbellekleme ──────────────────────────────────────
app.use((req, res, next) => {
  if (/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|wasm)$/.test(req.url)) {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
  if (req.url.endsWith('.wasm')) res.type('application/wasm');
  next();
});

// ── API global limiter ─────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Request loglama (üretimde düz log, geliştirmede renkli) ───────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms     = Date.now() - start;
    const status = res.statusCode;
    const color  = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    if (process.env.NODE_ENV !== 'production' || status >= 400) {
      console.log(`${color}[${status}]\x1b[0m ${req.method} ${req.url} — ${ms}ms — ${req.clientIp}`);
    }
  });
  next();
});

// ═══════════════════════════════════════════════════════════════════
// MONGOOSE MODELLER
// ═══════════════════════════════════════════════════════════════════
const UserSchema = new mongoose.Schema({
  username:      { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 32,
                   match: [/^[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+$/, 'Geçersiz karakter'] },
  password:      { type: String, required: true, select: false },
  email:         { type: String, default: '', select: false },
  avatar:        { type: String, default: '', maxlength: 500 },
  status:        { type: String, default: 'online', enum: ['online', 'idle', 'dnd', 'offline', 'invisible'] },
  level:         { type: Number, default: 1 },
  xp:            { type: Number, default: 0 },
  lastSeen:      { type: Date, default: Date.now },
  ip:            { type: String, default: '', select: false },
  userAgent:     { type: String, default: '', select: false },
  loginAttempts: { type: Number, default: 0, select: false },
  lockedUntil:   { type: Date, default: null, select: false },
  banned:        { type: Boolean, default: false },
  bannedReason:  { type: String, default: '' },
  twoFASecret:   { type: String, default: null, select: false },
  refreshTokens: { type: [String], default: [], select: false }, // refresh token listesi
  createdAt:     { type: Date, default: Date.now },
});
UserSchema.index({ username: 1 });
UserSchema.index({ createdAt: -1 });
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
  channelId:   { type: String, required: true, index: true, maxlength: 50 },
  content:     { type: String, default: '', maxlength: MAX_MSG_LEN },
  senderName:  { type: String, required: true, maxlength: 32 },
  senderId:    { type: String, required: true, maxlength: 50 },
  reactions:   { type: Object, default: {} },
  edited:      { type: Boolean, default: false },
  pinned:      { type: Boolean, default: false },
  replyTo:     { type: Object, default: null },
  image:       { type: String, default: null, maxlength: 2_000_000 }, // base64
  file:        { type: Object, default: null },
  voiceUrl:    { type: String, default: null },
  isBot:       { type: Boolean, default: false },
  readBy:      { type: [String], default: [] },
  ip:          { type: String, default: '', select: false },
  createdAt:   { type: Date, default: Date.now, index: true },
});
MessageSchema.index({ channelId: 1, createdAt: -1 });
const Message = mongoose.model('Message', MessageSchema);

const ChannelSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true, maxlength: 50, match: [/^[a-z0-9\-]+$/, 'Geçersiz ID'] },
  name:        { type: String, required: true, maxlength: 50 },
  type:        { type: String, default: 'text', enum: ['text', 'voice', 'forum', 'stage', 'announce'] },
  category:    { type: String, default: 'METİN', maxlength: 32 },
  topic:       { type: String, default: '', maxlength: 200 },
  private:     { type: Boolean, default: false },
  nsfw:        { type: Boolean, default: false },
  slowMode:    { type: Number, default: 0, min: 0, max: 3600 },
  position:    { type: Number, default: 0 },
  serverId:    { type: String, default: 'gettic', maxlength: 50 },
  createdBy:   { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
});
const Channel = mongoose.model('Channel', ChannelSchema);

const DMSchema = new mongoose.Schema({
  participants: [{ type: String, maxlength: 32 }],
  messages: [{
    id:       { type: String, default: () => crypto.randomUUID() },
    sender:   { type: String, maxlength: 32 },
    senderId: { type: String, maxlength: 50 },
    text:     { type: String, maxlength: MAX_MSG_LEN },
    edited:   { type: Boolean, default: false },
    read:     { type: Boolean, default: false },
    reactions:{ type: Object, default: {} },
    time:     { type: Date, default: Date.now },
  }],
  updatedAt: { type: Date, default: Date.now },
});
DMSchema.index({ participants: 1 });
const DM = mongoose.model('DM', DMSchema);

const BotSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  name:        { type: String, required: true, maxlength: 32 },
  prefix:      { type: String, default: '!', maxlength: 5 },
  token:       { type: String, required: true, unique: true, select: false },
  description: { type: String, default: '', maxlength: 128 },
  avatar:      { type: String, default: '' },
  createdBy:   { type: String, required: true },
  creatorName: { type: String, required: true, maxlength: 32 },
  active:      { type: Boolean, default: true },
  commands:    { type: [String], default: [] },
  messageCount:{ type: Number, default: 0 },
  commandCount:{ type: Number, default: 0 },
  lastActive:  { type: Date, default: null },
  createdAt:   { type: Date, default: Date.now },
});
const Bot = mongoose.model('Bot', BotSchema);

const NotificationSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  title:     { type: String, required: true, maxlength: 100 },
  body:      { type: String, default: '', maxlength: 300 },
  type:      { type: String, default: 'general' },
  read:      { type: Boolean, default: false },
  channelId: { type: String, default: null },
  sender:    { type: String, default: null },
  msgId:     { type: String, default: null },
  ts:        { type: Date, default: Date.now, index: true },
});
NotificationSchema.index({ userId: 1, ts: -1 });
const Notification = mongoose.model('Notification', NotificationSchema);

const AuditSchema = new mongoose.Schema({
  userId:  { type: String, index: true },
  action:  { type: String, required: true },
  target:  { type: String, default: '' },
  ip:      { type: String, default: '' },
  meta:    { type: Object, default: {} },
  ts:      { type: Date, default: Date.now, index: true, expires: 30 * 24 * 3600 }, // 30 gün TTL
});
const Audit = mongoose.model('Audit', AuditSchema);

// ═══════════════════════════════════════════════════════════════════
// ROOM MODEL (G-POINT ARENA)
// ═══════════════════════════════════════════════════════════════════
const RoomSchema = new mongoose.Schema({
  roomId:      { type: String, required: true, unique: true, maxlength: 50 },
  players:     { type: [String], default: [] },
  maxPlayers:  { type: Number, default: 4 },
  status:      { type: String, default: 'waiting', enum: ['waiting', 'playing', 'finished'] },
  createdAt:   { type: Date, default: Date.now, index: { expires: '1h' } }, // 1 saat sonra otomatik sil
  updatedAt:   { type: Date, default: Date.now },
});
const Room = mongoose.model('Room', RoomSchema);
// ═══════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════
function _genAccessToken(userId) {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
function _genRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH, { expiresIn: JWT_R_EXPIRES });
}

function _audit(userId, action, target = '', ip = '', meta = {}) {
  Audit.create({ userId, action, target, ip, meta }).catch(() => {});
}

function _validateStr(val, min, max, name) {
  if (!val || typeof val !== 'string') return `${name} gerekli`;
  if (val.length < min) return `${name} en az ${min} karakter`;
  if (val.length > max) return `${name} en fazla ${max} karakter`;
  return null;
}

// ── Token cookie helpers ───────────────────────────────────────────
function _setRefreshCookie(res, token) {
  res.cookie('rt', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/api/auth',
  });
}

// ═══════════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token gerekli' });
  }
  const token = authHeader.slice(7);
  if (!token || token.length > 512) return res.status(401).json({ error: 'Geçersiz token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') return res.status(401).json({ error: 'Geçersiz token tipi' });

    const user = await User.findById(decoded.userId).select('_id username banned');
    if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    if (user.banned) return res.status(403).json({ error: 'Hesabınız yasaklandı' });

    req.userId   = String(user._id);
    req.username = user.username;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token süresi doldu', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}

// Admin middleware
async function adminMiddleware(req, res, next) {
  const admins = (process.env.ADMIN_USERS || '').split(',').map(s => s.trim());
  if (!admins.includes(req.username)) return res.status(403).json({ error: 'Yetki gerekli' });
  next();
}

// ═══════════════════════════════════════════════════════════════════
// STATİK DOSYALAR
// ═══════════════════════════════════════════════════════════════════
app.use('/app', express.static(path.join(__dirname, 'app'), {
  maxAge:      '7d',
  etag:        true,
  lastModified: true,
  fallthrough:  true,
  index:        false,
  setHeaders:   (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  },
}));
app.use(express.static(path.join(__dirname), {
  maxAge:      '1d',
  index:       false,
}));

// ═══════════════════════════════════════════════════════════════════
// SAYFALAR
// ═══════════════════════════════════════════════════════════════════
const _sendApp = (f) => (req, res) => res.sendFile(path.join(__dirname, f));
app.get('/',      _sendApp('index.html'));
app.get('/ai',    _sendApp('ai/index.html'));
app.get('/mc',    _sendApp('mc/index.html'));
app.get('/app',   _sendApp('app/index.html'));
app.get('/app/*', _sendApp('app/index.html'));

// ═══════════════════════════════════════════════════════════════════
// G-POINT ARENA ROUTE (YENİ)
// ═══════════════════════════════════════════════════════════════════
app.get('/gpoint', (req, res) => {
  res.sendFile(path.join(__dirname, 'gpont', 'index.html'));
});
app.get('/gpoint/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'gpont', 'game.html'));
});
app.use('/gpoint/css', express.static(path.join(__dirname, 'gpont', 'css')));
app.use('/gpoint/js', express.static(path.join(__dirname, 'gpont', 'js')));
app.use('/gpoint/assets', express.static(path.join(__dirname, 'gpont', 'assets')));

// ═══════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
app.post('/api/auth/register', authLimiter, authSlowDown, async (req, res) => {
  try {
    const { username, password, gcaptcha } = req.body;

    // Captcha
    if (!gcaptcha || typeof gcaptcha !== 'string' || !gcaptcha.startsWith('gcaptcha_')) {
      return res.status(400).json({ error: 'Doğrulama gerekli' });
    }

    // Validasyon
    const uErr = _validateStr(username, 3, 32, 'Kullanıcı adı');
    if (uErr) return res.status(400).json({ error: uErr });
    if (!/^[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+$/.test(username)) {
      return res.status(400).json({ error: 'Geçersiz karakterler (sadece harf, rakam, _)' });
    }
    const pErr = _validateStr(password, 6, 128, 'Şifre');
    if (pErr) return res.status(400).json({ error: pErr });

    // Mevcut kullanıcı
    const existing = await User.findOne({ username: { $eq: username } });
    if (existing) return res.status(409).json({ error: 'Bu kullanıcı adı alınmış' });

    // Hash
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user   = await User.create({
      username, password: hashed,
      ip: req.clientIp, userAgent: req.uaString,
    });

    const access  = _genAccessToken(user._id);
    const refresh = _genRefreshToken(user._id);

    await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refresh } });
    _setRefreshCookie(res, refresh);
    _audit(user._id, 'register', username, req.clientIp);

    res.status(201).json({
      token: access,
      user:  { _id: user._id, username: user.username, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error('[Register]', err.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.post('/api/auth/login', authLimiter, authSlowDown, async (req, res) => {
  try {
    const { username, password, gcaptcha } = req.body;

    if (!gcaptcha || typeof gcaptcha !== 'string' || !gcaptcha.startsWith('gcaptcha_')) {
      return res.status(400).json({ error: 'Doğrulama gerekli' });
    }
    if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });

    const user = await User.findOne({ username: { $eq: username } })
      .select('+password +loginAttempts +lockedUntil +refreshTokens +banned');
    if (!user) {
      // Timing attack'ı önlemek için sahte bcrypt
      await bcrypt.compare(password, '$2a$12$fakehashfakehashfakehashfakehashfakehashfakehash');
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre yanlış' });
    }

    if (user.banned) return res.status(403).json({ error: 'Hesabınız yasaklandı: ' + (user.bannedReason || '') });

    // Kilit kontrolü
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(423).json({ error: `Hesap kilitli. ${mins} dakika bekle.` });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = (user.loginAttempts || 0) + 1;
      const update   = { loginAttempts: attempts };
      if (attempts >= 5) update.lockedUntil = new Date(Date.now() + 30 * 60000);
      await User.findByIdAndUpdate(user._id, update);
      _audit(user._id, 'login_fail', username, req.clientIp, { attempts });
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre yanlış' });
    }

    // Başarılı
    const access  = _genAccessToken(user._id);
    const refresh = _genRefreshToken(user._id);

    // Eski refresh token listesini temizle (max 5 cihaz)
    const tokens = (user.refreshTokens || []).slice(-4);
    tokens.push(refresh);
    await User.findByIdAndUpdate(user._id, {
      loginAttempts: 0,
      lockedUntil:   null,
      status:        'online',
      lastSeen:      new Date(),
      ip:            req.clientIp,
      userAgent:     req.uaString,
      refreshTokens: tokens,
    });

    _setRefreshCookie(res, refresh);
    _audit(user._id, 'login', username, req.clientIp);

    res.json({
      token: access,
      user:  { _id: user._id, username: user.username, avatar: user.avatar, status: user.status, level: user.level },
    });
  } catch (err) {
    console.error('[Login]', err.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Token yenile
app.post('/api/auth/refresh', async (req, res) => {
  const rt = req.cookies?.rt;
  if (!rt) return res.status(401).json({ error: 'Refresh token gerekli' });

  try {
    const decoded = jwt.verify(rt, JWT_REFRESH);
    if (decoded.type !== 'refresh') throw new Error('Geçersiz tip');

    const user = await User.findById(decoded.userId).select('+refreshTokens +banned');
    if (!user || user.banned) return res.status(401).json({ error: 'Yetkisiz' });
    if (!user.refreshTokens?.includes(rt)) return res.status(401).json({ error: 'Token geçersiz' });

    // Rotate — eski sil, yeni ekle
    const newRefresh = _genRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: rt },
      $push: { refreshTokens: newRefresh },
    });

    _setRefreshCookie(res, newRefresh);
    res.json({ token: _genAccessToken(user._id) });
  } catch {
    res.clearCookie('rt', { path: '/api/auth' });
    res.status(401).json({ error: 'Geçersiz refresh token' });
  }
});

// Çıkış
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  const rt = req.cookies?.rt;
  if (rt) {
    await User.findByIdAndUpdate(req.userId, { $pull: { refreshTokens: rt } });
    res.clearCookie('rt', { path: '/api/auth' });
  }
  await User.findByIdAndUpdate(req.userId, { status: 'offline', lastSeen: new Date() });
  _audit(req.userId, 'logout', '', req.clientIp);
  res.json({ success: true });
});

// Ben kimim?
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-__v');
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(user);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// Profil güncelle
app.put('/api/me', authMiddleware, async (req, res) => {
  try {
    const allowed  = ['avatar', 'status'];
    const updates  = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.status && !['online','idle','dnd','offline','invisible'].includes(updates.status)) {
      return res.status(400).json({ error: 'Geçersiz durum' });
    }
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-__v');
    res.json(user);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// Şifre değiştir
app.post('/api/me/password', authMiddleware, authLimiter, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const pErr = _validateStr(newPassword, 6, 128, 'Yeni şifre');
    if (pErr) return res.status(400).json({ error: pErr });

    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Mevcut şifre yanlış' });

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await User.findByIdAndUpdate(req.userId, {
      password:      hashed,
      refreshTokens: [], // tüm oturumları sonlandır
    });

    res.clearCookie('rt', { path: '/api/auth' });
    _audit(req.userId, 'password_change', '', req.clientIp);
    res.json({ success: true, message: 'Şifre değiştirildi. Tekrar giriş yapın.' });
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// Hesap sil
app.delete('/api/me', authMiddleware, authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Şifre yanlış' });

    await User.findByIdAndDelete(req.userId);
    await Message.deleteMany({ senderId: req.userId });
    res.clearCookie('rt', { path: '/api/auth' });
    _audit(req.userId, 'account_delete', user.username, req.clientIp);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ═══════════════════════════════════════════════════════════════════
// KANAL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/channels', authMiddleware, async (req, res) => {
  try {
    const serverId = (req.query.server || 'gettic').slice(0, 50);
    const channels = await Channel.find({ serverId }).sort({ position: 1, createdAt: 1 }).limit(100);
    res.json(channels);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/channels', authMiddleware, async (req, res) => {
  try {
    const { id, name, type, category, topic, private: priv, nsfw, slowMode } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID ve isim gerekli' });
    if (!/^[a-z0-9\-]{1,50}$/.test(id)) return res.status(400).json({ error: 'Geçersiz kanal ID' });

    const existing = await Channel.findOne({ id: { $eq: id } });
    if (existing) {
      Object.assign(existing, { name, type, category, topic, private: priv, nsfw, slowMode });
      await existing.save();
      return res.json(existing);
    }
    const channel = await Channel.create({
      id, name: name.slice(0, 50), type: type || 'text',
      category: (category || 'METİN').slice(0, 32),
      topic: (topic || '').slice(0, 200),
      private: !!priv, nsfw: !!nsfw,
      slowMode: Math.min(Math.max(parseInt(slowMode) || 0, 0), 3600),
      serverId: 'gettic', createdBy: req.userId,
    });
    io.emit('channel_created', channel);
    _audit(req.userId, 'channel_create', id, req.clientIp);
    res.status(201).json(channel);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.put('/api/channels/:channelId', authMiddleware, async (req, res) => {
  try {
    if (!/^[a-z0-9\-]{1,50}$/.test(req.params.channelId)) return res.status(400).json({ error: 'Geçersiz ID' });
    const allowed = ['name','topic','type','category','private','nsfw','slowMode','position'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const channel = await Channel.findOneAndUpdate({ id: req.params.channelId }, updates, { new: true });
    if (!channel) return res.status(404).json({ error: 'Kanal bulunamadı' });
    io.emit('channel_updated', channel);
    res.json(channel);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.delete('/api/channels/:channelId', authMiddleware, async (req, res) => {
  try {
    if (req.params.channelId === 'genel-sohbet') return res.status(400).json({ error: 'Bu kanal silinemez' });
    await Channel.deleteOne({ id: req.params.channelId });
    await Message.deleteMany({ channelId: req.params.channelId });
    io.emit('channel_deleted', { id: req.params.channelId });
    _audit(req.userId, 'channel_delete', req.params.channelId, req.clientIp);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// Email
app.post('/api/email/send', authLimiter, async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) return res.status(400).json({ error: 'Eksik bilgi' });

    const { google } = require('googleapis');
    const nodemailer = require('nodemailer');

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const info = await transporter.sendMail({
      from: `"Gettic Güvenlik" <${process.env.GMAIL_USER}>`,
      to, subject, html,
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('❌ Email hatası:', error.message);
    res.status(500).json({ error: 'Email gönderilemedi' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// MESAJ ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/channels/:channelId/messages', authMiddleware, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const before = req.query.before;
    const query  = { channelId: req.params.channelId };
    if (before) query.createdAt = { $lt: new Date(before) };
    const msgs = await Message.find(query).sort({ createdAt: -1 }).limit(limit);
    res.json(msgs.reverse());
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/channels/:channelId/messages', authMiddleware, msgLimiter, async (req, res) => {
  try {
    const content = req.body.content?.trim();
    if (content && content.length > MAX_MSG_LEN) return res.status(400).json({ error: `Mesaj max ${MAX_MSG_LEN} karakter` });

    // Slow mode kontrolü
    const ch = await Channel.findOne({ id: req.params.channelId });
    if (ch?.slowMode > 0) {
      const lastMsg = await Message.findOne({ channelId: req.params.channelId, senderId: req.userId }).sort({ createdAt: -1 });
      if (lastMsg && Date.now() - lastMsg.createdAt.getTime() < ch.slowMode * 1000) {
        return res.status(429).json({ error: `Yavaş mod: ${ch.slowMode}s bekle` });
      }
    }

    const msg = await Message.create({
      ...req.body,
      content:    content || '',
      channelId:  req.params.channelId,
      senderId:   req.userId,
      senderName: req.username,
      ip:         req.clientIp,
    });
    res.status(201).json(msg);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.put('/api/messages/:msgId', authMiddleware, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ error: 'Mesaj bulunamadı' });
    if (String(msg.senderId) !== req.userId) return res.status(403).json({ error: 'Yetki yok' });
    const content = req.body.content?.trim();
    if (!content || content.length > MAX_MSG_LEN) return res.status(400).json({ error: 'Geçersiz içerik' });
    msg.content = content; msg.edited = true;
    await msg.save();
    io.to(msg.channelId).emit('edit_message', { id: msg._id, content, channelId: msg.channelId });
    res.json(msg);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.delete('/api/messages/:msgId', authMiddleware, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ error: 'Mesaj bulunamadı' });
    const admins = (process.env.ADMIN_USERS || '').split(',');
    if (String(msg.senderId) !== req.userId && !admins.includes(req.username)) {
      return res.status(403).json({ error: 'Yetki yok' });
    }
    await msg.deleteOne();
    io.to(msg.channelId).emit('delete_message', { id: msg._id, channelId: msg.channelId });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ═══════════════════════════════════════════════════════════════════
// DM ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/dm/:username', authMiddleware, async (req, res) => {
  try {
    const other = req.params.username.slice(0, 32);
    const participants = [req.username, other].sort();
    const dm = await DM.findOne({ participants }).select('messages').lean();
    res.json(dm?.messages || []);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/dm', authMiddleware, msgLimiter, async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'Eksik parametre' });
    const text = message.text?.trim();
    if (!text || text.length > MAX_MSG_LEN) return res.status(400).json({ error: 'Geçersiz mesaj' });

    const participants = [req.username, to.slice(0, 32)].sort();
    let dm = await DM.findOne({ participants });
    if (!dm) dm = new DM({ participants, messages: [] });

    const msgObj = { id: crypto.randomUUID(), sender: req.username, senderId: req.userId, text, time: new Date() };
    dm.messages.push(msgObj);
    if (dm.messages.length > 500) dm.messages = dm.messages.slice(-500);
    dm.updatedAt = new Date();
    await dm.save();
    res.status(201).json(msgObj);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ═══════════════════════════════════════════════════════════════════
// KULLANICI ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ banned: { $ne: true } }, 'username avatar status lastSeen createdAt level').sort({ lastSeen: -1 }).limit(100);
    res.json(users);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.get('/api/users/search', authMiddleware, searchLimiter, async (req, res) => {
  try {
    const q = (req.query.q || '').replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]/g, '').slice(0, 20);
    if (q.length < 2) return res.json([]);
    const users = await User.find({
      username: { $regex: new RegExp('^' + q, 'i') },
      banned:   { $ne: true },
    }, 'username avatar status').limit(20);
    res.json(users);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ═══════════════════════════════════════════════════════════════════
// BOT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/bots', authMiddleware, async (req, res) => {
  try {
    const bots = await Bot.find({ createdBy: req.userId }).select('-token');
    res.json(bots);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/bots', authMiddleware, async (req, res) => {
  try {
    const count = await Bot.countDocuments({ createdBy: req.userId });
    if (count >= 10) return res.status(400).json({ error: 'Maksimum 10 bot' });
    const bot = await Bot.create({ ...req.body, createdBy: req.userId, creatorName: req.username });
    _audit(req.userId, 'bot_create', bot.id, req.clientIp);
    res.status(201).json({ ...bot.toObject(), token: undefined });
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.delete('/api/bots/:botId', authMiddleware, async (req, res) => {
  try {
    const bot = await Bot.findOne({ id: req.params.botId });
    if (!bot) return res.status(404).json({ error: 'Bot bulunamadı' });
    if (bot.createdBy !== req.userId) return res.status(403).json({ error: 'Yetki yok' });
    await bot.deleteOne();
    _audit(req.userId, 'bot_delete', req.params.botId, req.clientIp);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ═══════════════════════════════════════════════════════════════════
// BİLDİRİM ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.userId }).sort({ ts: -1 }).limit(50);
    res.json(notifs);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.post('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const { title, body, type, channelId, sender, msgId } = req.body;
    if (!title) return res.status(400).json({ error: 'Başlık gerekli' });
    const n = await Notification.create({ userId: req.userId, title: title.slice(0,100), body: (body||'').slice(0,300), type, channelId, sender, msgId });
    res.status(201).json(n);
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId }, { read: true });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
});

// ═══════════════════════════════════════════════════════════════════
// HATA RAPORU
// ═══════════════════════════════════════════════════════════════════
app.post('/api/errors', authMiddleware, apiLimiter, async (req, res) => {
  // Sadece logla
  const { type, message, stack } = req.body;
  console.error(`[ClientError] ${req.username} — ${type}: ${message?.slice(0,200)}`);
  res.json({ received: true });
});

// ═══════════════════════════════════════════════════════════════════
// PING / HEALTH
// ═══════════════════════════════════════════════════════════════════
app.get('/ping', (req, res) => res.set('Cache-Control','no-store').json({ ok: true }));
app.get('/api/health', (req, res) => res.json({
  status:   'ok',
  uptime:   Math.round(process.uptime()),
  memory:   Math.round(process.memoryUsage().heapUsed / 1048576) + 'MB',
  mongo:    mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  ts:       new Date().toISOString(),
}));

// ═══════════════════════════════════════════════════════════════════
// SOCKET.IO
// ═══════════════════════════════════════════════════════════════════

// Socket auth middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token || token.length > 512) return next(new Error('Token gerekli'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') return next(new Error('Geçersiz token tipi'));
    const user = await User.findById(decoded.userId).select('username banned');
    if (!user || user.banned) return next(new Error('Yetkisiz'));
    socket.userId   = String(user._id);
    socket.username = user.username;
    next();
  } catch (err) {
    next(new Error('Geçersiz token'));
  }
});

// Online kullanıcılar
const onlineUsers = new Map(); // userId → { socketId, username, channelId }

io.on('connection', socket => {
  const uid  = socket.userId;
  const uname = socket.username;

  onlineUsers.set(uid, { socketId: socket.id, username: uname, channelId: null });
  io.emit('user_online', { userId: uid, username: uname });
  User.findByIdAndUpdate(uid, { status: 'online', lastSeen: new Date() }).exec();

  _log(`[Socket] ${uname} bağlandı (${socket.id})`);

  // ── Kanal ────────────────────────────────────────────────────────
  socket.on('join_channel', channelId => {
    if (typeof channelId !== 'string' || channelId.length > 50) return;
    socket.rooms.forEach(room => { if (room !== socket.id && room !== 'global') socket.leave(room); });
    socket.join(channelId);
    const u = onlineUsers.get(uid);
    if (u) u.channelId = channelId;
  });

  socket.on('leave_channel', channelId => {
    if (typeof channelId === 'string') socket.leave(channelId);
  });

  // ── Mesaj ─────────────────────────────────────────────────────────
  const _msgCooldowns = new Map();
  socket.on('send_message', async data => {
    try {
      // Rate limit (socket başına)
      const now     = Date.now();
      const lastMsg = _msgCooldowns.get(uid) || 0;
      if (now - lastMsg < 800) return; // 800ms
      _msgCooldowns.set(uid, now);

      const content = (data.content || '').trim().slice(0, MAX_MSG_LEN);
      if (!content && !data.image && !data.file && !data.voiceUrl) return;

      const msg = await Message.create({
        channelId:  (data.channelId || '').slice(0, 50),
        content,
        senderName: uname,
        senderId:   uid,
        reactions:  {},
        replyTo:    data.replyTo || null,
        image:      data.image   || null,
        file:       data.file    || null,
        voiceUrl:   data.voiceUrl || null,
        isBot:      false,
        readBy:     [uid],
        ip:         socket.handshake.address,
      });

      io.to(msg.channelId).emit('new_message', msg);
    } catch (e) {
      socket.emit('error', { message: 'Mesaj gönderilemedi' });
    }
  });

  // ── Mesaj sil ─────────────────────────────────────────────────────
  socket.on('delete_message', async ({ id, channelId }) => {
    try {
      const msg = await Message.findById(id);
      if (!msg) return;
      if (String(msg.senderId) !== uid) return;
      await msg.deleteOne();
      io.to(channelId).emit('delete_message', { id, channelId });
    } catch {}
  });

  // ── Mesaj düzenle ─────────────────────────────────────────────────
  socket.on('edit_message', async ({ id, content, channelId }) => {
    try {
      const msg = await Message.findById(id);
      if (!msg || String(msg.senderId) !== uid) return;
      const clean = content?.trim().slice(0, MAX_MSG_LEN);
      if (!clean) return;
      msg.content = clean; msg.edited = true;
      await msg.save();
      io.to(channelId).emit('edit_message', { id, content: clean, channelId });
    } catch {}
  });

  // ── Pin ───────────────────────────────────────────────────────────
  socket.on('pin_message', async ({ id, pinned, channelId }) => {
    try {
      await Message.findByIdAndUpdate(id, { pinned: !!pinned });
      io.to(channelId).emit('pin_message', { id, pinned, channelId });
    } catch {}
  });

  // ── Tepki ─────────────────────────────────────────────────────────
  socket.on('react_message', async ({ id, reaction, channelId }) => {
    const ALLOWED_REACTIONS = ['like','heart','laugh','fire','sad','wow','clap','eyes'];
    if (!ALLOWED_REACTIONS.includes(reaction)) return;
    try {
      const msg = await Message.findById(id);
      if (!msg) return;
      if (!msg.reactions[reaction]) msg.reactions[reaction] = [];
      const idx = msg.reactions[reaction].indexOf(uid);
      if (idx === -1) msg.reactions[reaction].push(uid);
      else            msg.reactions[reaction].splice(idx, 1);
      if (msg.reactions[reaction].length === 0) delete msg.reactions[reaction];
      msg.markModified('reactions');
      await msg.save();
      io.to(channelId).emit('react_message', { id, reaction, userId: uid, channelId });
    } catch {}
  });

  // ── Okundu ───────────────────────────────────────────────────────
  socket.on('mark_read', async ({ messageId, channelId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: uid } });
      socket.to(channelId).emit('mark_read', { messageId, userId: uid });
    } catch {}
  });

  // ── Typing ────────────────────────────────────────────────────────
  const _typingTimeout = new Map();
  socket.on('typing_start', ({ channelId }) => {
    if (typeof channelId !== 'string') return;
    socket.to(channelId).emit('typing_start', { channelId, username: uname, userId: uid });
    clearTimeout(_typingTimeout.get(uid));
    _typingTimeout.set(uid, setTimeout(() => {
      socket.to(channelId).emit('typing_stop', { userId: uid });
    }, 4000));
  });

  socket.on('typing_stop', ({ channelId }) => {
    clearTimeout(_typingTimeout.get(uid));
    if (typeof channelId === 'string') {
      socket.to(channelId).emit('typing_stop', { userId: uid });
    }
  });

  // ── DM ───────────────────────────────────────────────────────────
  socket.on('dm_message', async data => {
    try {
      const to      = (data.to || '').slice(0, 32);
      const message = data.message;
      if (!to || !message?.text) return;

      const text = message.text.trim().slice(0, MAX_MSG_LEN);
      if (!text) return;

      const participants = [uname, to].sort();
      let dm = await DM.findOne({ participants });
      if (!dm) dm = new DM({ participants, messages: [] });

      const msgObj = { id: message.id || crypto.randomUUID(), sender: uname, senderId: uid, text, time: new Date(), reactions: {}, read: false };
      dm.messages.push(msgObj);
      if (dm.messages.length > 500) dm.messages = dm.messages.slice(-500);
      dm.updatedAt = new Date();
      await dm.save();

      // Alıcıyı bul ve gönder
      const recipientSocket = [...io.sockets.sockets.values()].find(s => s.username === to);
      if (recipientSocket) {
        recipientSocket.emit('dm_message', { sender: uname, senderId: uid, message: msgObj });
      }
    } catch {}
  });

  socket.on('dm_delete', async ({ to, messageId }) => {
    try {
      const participants = [uname, (to||'').slice(0,32)].sort();
      const dm = await DM.findOne({ participants });
      if (!dm) return;
      dm.messages = dm.messages.filter(m => m.id !== messageId);
      await dm.save();
      const rs = [...io.sockets.sockets.values()].find(s => s.username === to);
      if (rs) rs.emit('dm_delete', { sender: uname, messageId });
    } catch {}
  });

  socket.on('dm_react', async data => {
    const rs = [...io.sockets.sockets.values()].find(s => s.username === data.to);
    if (rs) rs.emit('dm_react', { ...data, sender: uname, userId: uid });
  });

  socket.on('dm_typing_start', ({ to }) => {
    const rs = [...io.sockets.sockets.values()].find(s => s.username === to);
    if (rs) rs.emit('dm_typing_start', { from: uname });
  });

  socket.on('dm_typing_stop', ({ to }) => {
    const rs = [...io.sockets.sockets.values()].find(s => s.username === to);
    if (rs) rs.emit('dm_typing_stop', { from: uname });
  });

  socket.on('dm_read', async ({ with: other }) => {
    try {
      const participants = [uname, (other||'').slice(0,32)].sort();
      const dm = await DM.findOne({ participants });
      if (!dm) return;
      dm.messages.forEach(m => { if (m.sender !== uname) m.read = true; });
      await dm.save();
      const rs = [...io.sockets.sockets.values()].find(s => s.username === other);
      if (rs) rs.emit('dm_read', { with: uname, reader: uname });
    } catch {}
  });

  // ── Kanal yönetimi ────────────────────────────────────────────────
  socket.on('channel_created',    ch  => socket.broadcast.emit('channel_created', ch));
  socket.on('channel_deleted',    d   => socket.broadcast.emit('channel_deleted', d));
  socket.on('channel_updated',    ch  => socket.broadcast.emit('channel_updated', ch));
  socket.on('channels_reordered', ord => socket.broadcast.emit('channels_reordered', ord));
  socket.on('category_created',   d   => socket.broadcast.emit('category_created', d));
  socket.on('category_deleted',   d   => socket.broadcast.emit('category_deleted', d));

  // ── Durum ─────────────────────────────────────────────────────────
  socket.on('statusChange', async ({ status }) => {
    const allowed = ['online','idle','dnd','offline','invisible'];
    if (!allowed.includes(status)) return;
    await User.findByIdAndUpdate(uid, { status });
    socket.broadcast.emit('user_status', { userId: uid, username: uname, status });
  });

  // ── Ses kanalı ────────────────────────────────────────────────────
  socket.on('join_voice', ({ channelId }) => {
    socket.join('voice_' + channelId);
    socket.to('voice_' + channelId).emit('voice_user_joined', { userId: uid, username: uname });
    // Tüm ses kullanıcılarını gönder
    const users = [...io.sockets.sockets.values()]
      .filter(s => s.rooms.has('voice_' + channelId))
      .map(s => ({ userId: s.userId, username: s.username }));
    io.to('voice_' + channelId).emit('voice_users_updated', { channelId, users });
  });

  socket.on('leave_voice', ({ channelId }) => {
    socket.leave('voice_' + channelId);
    io.to('voice_' + channelId).emit('voice_user_left', { userId: uid });
  });

  // ── Anket ─────────────────────────────────────────────────────────
  socket.on('poll_vote', data => {
    if (typeof data.option !== 'number') return;
    socket.to(data.channelId).emit('poll_vote', { ...data, userId: uid });
  });

  // ── Şikayet ──────────────────────────────────────────────────────
  socket.on('report_message', async ({ id, reason, channelId }) => {
    console.warn(`[Report] ${uname} — msg:${id} — ${(reason||'').slice(0,100)}`);
    _audit(uid, 'report', id, socket.handshake.address, { reason, channelId });
  });

  // ── Disconnect ────────────────────────────────────────────────────
  socket.on('disconnect', async reason => {
    onlineUsers.delete(uid);
    io.emit('user_offline', { userId: uid, username: uname });
    await User.findByIdAndUpdate(uid, { status: 'offline', lastSeen: new Date() });
    _log(`[Socket] ${uname} ayrıldı (${reason})`);
  });

  socket.on('error', err => {
    console.error(`[Socket Error] ${uname}:`, err.message);
  });
});

// ── Oda listesi (MongoDB) ──────────────────────────────────────────

// Tüm odaları listele
socket.on('get_rooms', async () => {
  try {
    const rooms = await Room.find({ status: 'waiting' }).sort({ createdAt: -1 }).limit(50);
    socket.emit('room_list', rooms.map(r => ({
      roomId: r.roomId,
      players: r.players,
      maxPlayers: r.maxPlayers,
    })));
  } catch {}
});

// Oda oluştur
socket.on('create_room', async ({ room, username }) => {
  try {
    let existing = await Room.findOne({ roomId: room });
    if (existing) {
      // Oda varsa katıl
      if (!existing.players.includes(username)) {
        existing.players.push(username);
        existing.updatedAt = new Date();
        await existing.save();
      }
      socket.join(room);
      io.to(room).emit('room_players', existing.players);
      return;
    }

    const newRoom = new Room({
      roomId: room,
      players: [username],
      maxPlayers: 4,
    });
    await newRoom.save();
    socket.join(room);
    io.emit('room_list_update'); // tüm istemcilere güncelleme
    io.to(room).emit('room_players', newRoom.players);
  } catch (err) {
    socket.emit('error', { message: 'Oda oluşturulamadı' });
  }
});

// Odaya katıl
socket.on('join_room', async ({ room, username }) => {
  try {
    const roomDoc = await Room.findOne({ roomId: room });
    if (!roomDoc) return socket.emit('error', { message: 'Oda bulunamadı' });
    if (roomDoc.players.length >= roomDoc.maxPlayers) {
      return socket.emit('error', { message: 'Oda dolu' });
    }
    if (!roomDoc.players.includes(username)) {
      roomDoc.players.push(username);
      roomDoc.updatedAt = new Date();
      await roomDoc.save();
    }
    socket.join(room);
    io.to(room).emit('room_players', roomDoc.players);
  } catch {}
});

// Oyun başlat
socket.on('start_game', async ({ room }) => {
  try {
    const roomDoc = await Room.findOne({ roomId: room });
    if (!roomDoc) return;
    if (roomDoc.players.length < 2) {
      return socket.emit('error', { message: 'En az 2 oyuncu gerekli' });
    }
    roomDoc.status = 'playing';
    await roomDoc.save();
    io.to(room).emit('game_started', { players: roomDoc.players });
  } catch {}
});

// Oyuncu hareket
socket.on('player_move_arena', (data) => {
  socket.to(data.room).emit('player_moved_arena', {
    ...data,
    userId: socket.userId,
    username: socket.username,
  });
});

// Oyuncu ateş
socket.on('player_shoot_arena', (data) => {
  socket.to(data.room).emit('player_shot_arena', {
    ...data,
    userId: socket.userId,
    username: socket.username,
  });
});

// Oyuncu hasar aldı
socket.on('player_damage', async ({ room, target, damage }) => {
  // Oyun mantığı burada
  socket.to(room).emit('player_hit', { target, damage, from: socket.userId });
});

// Bağlantı kopunca odadan çıkar
socket.on('disconnect', async () => {
  try {
    const username = socket.username;
    if (!username) return;

    const rooms = await Room.find({ players: username });
    for (const room of rooms) {
      room.players = room.players.filter(p => p !== username);
      if (room.players.length === 0) {
        await Room.deleteOne({ roomId: room.roomId });
        io.emit('room_deleted', { roomId: room.roomId });
      } else {
        await room.save();
        io.to(room.roomId).emit('room_players', room.players);
      }
    }
    io.emit('room_list_update');
  } catch (err) {
    console.error('[Disconnect]', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 404 & HATA YÖNETİCİSİ
// ═══════════════════════════════════════════════════════════════════
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint bulunamadı' });
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Global hata yakalayıcı
app.use((err, req, res, next) => {
  if (err.message?.startsWith('CORS')) return res.status(403).json({ error: err.message });
  console.error('[Express Error]', err.message);
  res.status(500).json({ error: 'Sunucu hatası' });
});

// ═══════════════════════════════════════════════════════════════════
// YARDIMCI
// ═══════════════════════════════════════════════════════════════════
function _log(...args) {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
}

// Beklenmeyen hata yakalayıcılar
process.on('uncaughtException',  err => console.error('[UncaughtException]',  err));
process.on('unhandledRejection', err => console.error('[UnhandledRejection]', err));

// Graceful shutdown
function _shutdown() {
  console.log('\n[Server] Kapatılıyor...');
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      console.log('[Server] Bağlantılar kapatıldı.');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', _shutdown);
process.on('SIGINT',  _shutdown);

// ═══════════════════════════════════════════════════════════════════
// BAŞLAT
// ═══════════════════════════════════════════════════════════════════
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize:      10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:  45000,
})
.then(() => {
  console.log('✅ MongoDB bağlantısı kuruldu');
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gettic sunucu: http://localhost:${PORT}`);
    console.log(`🛡️  Güvenlik: Helmet, Rate Limit, XSS, HPP, MongoSanitize`);
    console.log(`🔐  JWT: Access ${JWT_EXPIRES} / Refresh ${JWT_R_EXPIRES}`);
  });
})
.catch(err => {
  console.error('❌ MongoDB bağlantı hatası:', err.message);
  process.exit(1);
});
