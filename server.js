require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // 100MB dosya transfer desteği
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gettic_db')
    .then(() => console.log('✅ Veritabanı Bağlantısı Başarılı'))
    .catch(err => console.error('❌ DB Hatası:', err));

// Mesaj Şeması
const Message = mongoose.model('Message', {
    room: String,
    sender: String,
    content: String,
    type: { type: String, default: 'text' },
    timestamp: { type: Date, default: Date.now }
});

// Socket.io Mantığı
io.on('connection', (socket) => {
    // Oda Katılımı
    socket.on('joinRoom', async (room) => {
        socket.join(room);
        const history = await Message.find({ room }).sort({ timestamp: -1 }).limit(50);
        socket.emit('loadHistory', history.reverse());
    });

    // Mesaj İşleme (Kullanıcı veya Bot)
    socket.on('sendMessage', async (data) => {
        const newMessage = new Message({
            room: data.room,
            sender: data.sender,
            content: data.content
        });
        await newMessage.save();
        io.to(data.room).emit('receiveMessage', newMessage);
    });

    // Bot Entegrasyon Kanalları
    socket.on('botAction', (data) => {
        // Bot komutlarını ve yetkilerini burada işle
        console.log(`🤖 Bot İşlemi: ${data.action}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 GETTIC Sunucusu Yayında: http://localhost:${PORT}`);
});
