require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB bağlandı'))
  .catch(err => console.error('MongoDB hatası:', err));

// ============ ROUTES ============
app.use('/api/auth', require('./routes/auth'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/bots', require('./routes/bots'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/dms', require('./routes/dms'));
app.use('/api/friends', require('./routes/friends'));

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('🔌 Socket bağlandı:', socket.id);
  
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    console.log(`📡 ${socket.id} joined channel ${channelId}`);
  });
  
  socket.on('leave_channel', (channelId) => {
    socket.leave(channelId);
  });
  
  socket.on('send_message', async (data) => {
    io.to(data.channelId).emit('new_message', data);
  });
  
  socket.on('typing', ({ channelId, username }) => {
    socket.to(channelId).emit('user_typing', { username, channelId });
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Socket ayrıldı:', socket.id);
  });
});

// ============ STATIC FRONTEND (React build) ============
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ============ SERVER START ============
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
});
