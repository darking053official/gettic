// ========================================================
// GETTIC SERVER.JS - Kurumsal İletişim Platformu
// Railway uyumlu - Login, Socket.io, gettic.js entegrasyonu
// ========================================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150
});
app.use('/api/', limiter);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Gettic MongoDB bağlantısı başarılı'))
  .catch(err => console.error('❌ MongoDB hatası:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'gettic-kurumsal-gizli-anahtar-2026';

// ====================== MONGOOSE SCHEMALARI ======================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  avatar: { type: String, default: 'https://gettic-production.up.railway.app/logo.png' },
  status: { type: String, default: 'online' },
  joinedAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  room: String,
  senderName: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// ====================== SOCKET.IO ======================
const io = new Server(server, {
  cors: { origin: "*" }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Yeni bağlantı:', socket.id);

  socket.on('login', ({ token }) => {
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.username = decoded.username;
        onlineUsers.set(socket.id, socket.username);
        socket.emit('loginSuccess', { username: socket.username });
      } catch (e) {
        socket.emit('loginError', 'Oturum geçersiz');
      }
    }
  });

  socket.on('sendMessage', async (data) => {
    if (!socket.username) return;

    const msg = new Message({
      room: data.room,
      senderName: socket.username,
      content: data.content
    });
    await msg.save();

    io.to(data.room).emit('newMessage', {
      senderName: socket.username,
      content: data.content
    });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
  });
});

// ====================== API ROUTES ======================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.json({ success: true, message: 'Gettic hesabı oluşturuldu.' });
  } catch (err) {
    res.status(400).json({ error: 'Kayıt başarısız. Kullanıcı adı zaten alınmış olabilir.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, username });
  } catch (err) {
    res.status(500).json({ error: 'Giriş işlemi başarısız.' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    platform: 'Gettic Kurumsal İletişim Platformu',
    version: '1.0.0',
    status: 'active',
    features: 'Görüntülü Görüşme, Ekran Paylaşımı, Gerçek Zamanlı Mesajlaşma'
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Gettic Platform ${PORT} portunda çalışıyor`);
  console.log(`🌐 https://gettic-production.up.railway.app`);
});
