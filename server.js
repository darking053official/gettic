const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Statik dosyalar
app.use(express.static(path.join(__dirname)));

// MongoDB Schema'lar
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    password: { type: String, required: true, minlength: 6 },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const BotSchema = new mongoose.Schema({
    name: { type: String, required: true },
    prefix: { type: String, default: '/' },
    token: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    ownerName: { type: String, required: true },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const Bot = mongoose.model('Bot', BotSchema);

const WebhookSchema = new mongoose.Schema({
    name: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Webhook = mongoose.model('Webhook', WebhookSchema);

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Geçersiz token' });
    }
};

// AI Chat Schema
const ChatSchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    chatCount: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', ChatSchema);

// ==================== MINECRAFT SUNUCU ====================
let mcServerProcess = null;
let serverStatus = {
    online: false,
    players: 0,
    maxPlayers: 20,
    startedAt: null
};

function startMinecraftServer() {
    const mcPath = path.join(__dirname, 'mc', 'minecraft');
    
    console.log('MC dizini:', mcPath);
    
    if (!fs.existsSync(mcPath)) {
        console.error('MC klasoru bulunamadi:', mcPath);
        return;
    }
    
    console.log('Klasor icerigi:', fs.readdirSync(mcPath));
    
    if (!fs.existsSync(path.join(mcPath, 'bedrock_server'))) {
        console.log('bedrock_server parcalari birlestiriliyor...');
        try {
            const parts = [
                'bedrock_server_part_aa',
                'bedrock_server_part_ab', 
                'bedrock_server_part_ac',
                'bedrock_server_part_ad',
                'bedrock_server_part_ae'
            ];
            
            const fd = fs.openSync(path.join(mcPath, 'bedrock_server'), 'w');
            
            for (const part of parts) {
                const partPath = path.join(mcPath, part);
                if (!fs.existsSync(partPath)) {
                    console.error(`Parca bulunamadi: ${part}`);
                    fs.closeSync(fd);
                    return;
                }
                const data = fs.readFileSync(partPath);
                fs.writeSync(fd, data);
                console.log(`${part} yazildi`);
            }
            
            fs.closeSync(fd);
            fs.chmodSync(path.join(mcPath, 'bedrock_server'), 0o755);
            console.log('bedrock_server hazir');
            
            for (const part of parts) {
                const partPath = path.join(mcPath, part);
                if (fs.existsSync(partPath)) {
                    fs.unlinkSync(partPath);
                }
            }
            
        } catch (e) {
            console.error('Birlestirme hatasi:', e.message);
            return;
        }
    }
    
    launchBedrockServer(mcPath);
}

function launchBedrockServer(targetPath) {
    console.log('Minecraft sunucusu baslatiliyor...');
    
    try {
        mcServerProcess = spawn('./bedrock_server', [], {
            cwd: targetPath,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        serverStatus.startedAt = new Date().toISOString();
        
        mcServerProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[MC]', output.trim());
            if (output.includes('Server started')) {
                serverStatus.online = true;
                console.log('MC Sunucu aktif!');
            }
        });
        
        mcServerProcess.stderr.on('data', (data) => {
            console.error('[MC]', data.toString().trim());
        });
        
        mcServerProcess.on('close', (code) => {
            serverStatus.online = false;
            console.log('MC Sunucu kapandi (kod:', code, ')');
            mcServerProcess = null;
        });
        
        mcServerProcess.on('error', (err) => {
            console.error('MC Sunucu baslatma hatasi:', err.message);
        });
        
    } catch (e) {
        console.error('MC Sunucu spawn hatasi:', e.message);
    }
}

// MC API proxy - LocalToNet CORS cozumu
app.get('/api/mc', async (req, res) => {
    try {
        const response = await fetch('https://localtonet.com/api/v1/tunnels', {
            headers: { 'Authorization': `Bearer 9vOCzt74nRjJyY5FK0kTDoESBN1M3pG8qf6WdsVZgelUi` }
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.json({ error: 'API baglanti hatasi' });
    }
});

// MC durum endpoint'i
app.get('/api/mc/status', (req, res) => {
    res.json(serverStatus);
});

// MC sayfasi
app.get('/mc', (req, res) => {
    res.sendFile(path.join(__dirname, 'mc', 'index.html'));
});

// ==================== AI ENDPOINTS ====================

app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId, chatId, mode } = req.body;
        
        if (!message?.trim()) return res.status(400).json({ error: 'Mesaj gerekli' });
        if (!sessionId) return res.status(400).json({ error: 'Kullanıcı adı gerekli' });

        const username = sessionId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayChats = await Chat.countDocuments({ username, createdAt: { $gte: today } });
        if (todayChats >= 15) return res.status(429).json({ error: 'Günlük limit doldu (15/15)', remainingChats: 0 });

        let chat = chatId ? await Chat.findById(chatId) : null;
        if (!chat) {
            chat = new Chat({ username, sessionId, messages: [] });
        }

        const systemPrompt = mode === 'think' 
            ? 'Sen derin düşünen, analitik bir asistansın. İsmin Gettic AI. Her soruyu adım adım analiz et, detaylı ve kapsamlı cevaplar ver. Türkçe konuş. Kullanıcıya adıyla hitap et.'
            : 'Sen hızlı ve pratik bir asistansın. İsmin Gettic AI. Kısa, net ve doğrudan cevaplar ver. En fazla 2-3 cümle kullan. Türkçe konuş. Kullanıcıya adıyla hitap et.';

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chat.messages.slice(-15).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message }
        ];

        chat.messages.push({ role: 'user', content: message, timestamp: new Date() });

        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.AI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                messages,
                max_tokens: mode === 'think' ? 800 : 250,
                temperature: mode === 'think' ? 0.8 : 0.4
            })
        });

        const data = await response.json();
        if (!response.ok) return res.status(500).json({ error: 'AI API hatası' });

        const reply = data.choices[0].message.content;
        chat.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
        chat.updatedAt = new Date();
        await chat.save();

        res.json({ 
            reply, 
            chatId: chat._id, 
            remainingChats: 15 - todayChats - 1 
        });

    } catch (error) {
        console.error('AI Hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/chats/:username', async (req, res) => {
    try {
        const chats = await Chat.find({ 
            username: req.params.username 
        }).sort({ updatedAt: -1 }).limit(10);
        
        res.json(chats.map(c => ({
            id: c._id,
            messageCount: c.messages.length,
            lastMessage: c.messages[c.messages.length - 1]?.content?.substring(0, 50),
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/chat/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Sohbet bulunamadı' });
        res.json(chat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/chat/:id', async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/ai', (req, res) => {
    res.sendFile(path.join(__dirname, 'ai', 'index.html'));
});

// ==================== API ROUTES ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://gettic.js.org');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (username.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter' });
        if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter' });
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Kullanıcı adı zaten alınmış' });
        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashed });
        await user.save();
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, username: user.username } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Şifre yanlış' });
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { _id: user._id, username: user.username } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/bots', authMiddleware, async (req, res) => {
    try {
        const bots = await Bot.find({ ownerId: req.userId });
        res.json(bots);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bots', authMiddleware, async (req, res) => {
    try {
        const { name, prefix, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Bot adı gerekli' });
        const user = await User.findById(req.userId);
        const token = 'bot_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const bot = new Bot({ name, prefix: prefix || '/', token, ownerId: req.userId, ownerName: user.username, description });
        await bot.save();
        res.json(bot);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/bots/:id', authMiddleware, async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id);
        if (!bot) return res.status(404).json({ error: 'Bot bulunamadı' });
        if (bot.ownerId !== req.userId) return res.status(403).json({ error: 'Yetkiniz yok' });
        await bot.deleteOne();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/webhooks', authMiddleware, async (req, res) => {
    try {
        const webhooks = await Webhook.find({ ownerId: req.userId });
        res.json(webhooks);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/webhooks', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Webhook adı gerekli' });
        const token = 'wh_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const webhook = new Webhook({ name, token, ownerId: req.userId });
        await webhook.save();
        res.json(webhook);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/webhooks/:id', authMiddleware, async (req, res) => {
    try {
        const webhook = await Webhook.findById(req.params.id);
        if (!webhook) return res.status(404).json({ error: 'Webhook bulunamadı' });
        if (webhook.ownerId !== req.userId) return res.status(403).json({ error: 'Yetkiniz yok' });
        await webhook.deleteOne();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// ==================== GÖRSEL OLUŞTURMA ====================

app.post('/api/image', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt?.trim()) {
            return res.status(400).json({ error: 'Prompt gerekli' });
        }

        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

        res.json({ 
            success: true,
            image: imageUrl,
            prompt: prompt
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
    console.log('Yeni socket baglantisi:', socket.id);
    
    socket.on('join_channel', (channelId) => {
        socket.join(channelId);
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
        console.log('Socket ayrildi:', socket.id);
    });
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB baglantisi basarili');
        httpServer.listen(PORT, () => {
            console.log(`Gettic API ${PORT} portunda calisiyor`);
            // Minecraft sunucusunu baslat
            startMinecraftServer();
        });
    })
    .catch(err => console.error('MongoDB baglanti hatasi:', err));
