require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // index.html için

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'gettic-full-package-secret-2026';

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  status: { type: String, default: 'online' }
});

const User = mongoose.model('User', userSchema);

const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log('🔌 Kullanıcı bağlandı:', socket.id);

  socket.on('login', ({ token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.username = decoded.username;
      socket.emit('loginSuccess', { username: socket.username });
    } catch (e) {
      socket.emit('error', 'Geçersiz oturum');
    }
  });

  socket.on('sendMessage', (data) => {
    if (!socket.username) return;
    io.emit('newMessage', {
      senderName: socket.username,
      content: data.content,
      timestamp: Date.now()
    });
  });
});

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const user = new User({ username, password: hashed });
    await user.save();
    res.json({ success: true, message: 'Hesap oluşturuldu' });
  } catch (err) {
    res.status(400).json({ error: 'Kayıt başarısız' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Hatalı bilgiler' });
    }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, username });
  } catch (err) {
    res.status(500).json({ error: 'Giriş hatası' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Gettic Full Paket ${PORT} portunda çalışıyor`);
});
