// ============================================
// GETTIC - SERVER.JS
// Ana Express sunucusu
// ============================================

const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const { logger } = require('./utils/logger');
const { environment } = require('./config/environment');

// HTTP Sunucusu oluştur
const server = http.createServer(app);

// Socket.IO yapılandırması
const io = new Server(server, {
    cors: {
        origin: environment.ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Socket.IO bağlantı yönetimi
io.on('connection', (socket) => {
    logger.info(`Yeni bağlantı: ${socket.id}`);

    // Kullanıcı kimlik doğrulama
    socket.on('authenticate', async (token) => {
        try {
            const { verifyToken } = require('./utils/jwt');
            const decoded = verifyToken(token);
            
            if (decoded) {
                socket.userId = decoded.sub;
                socket.join(`user:${decoded.sub}`);
                logger.info(`Kullanıcı doğrulandı: ${decoded.sub}`);
                
                // Kullanıcıyı online işaretle
                await require('./services/userService').updateUserStatus(decoded.sub, 'online');
                
                socket.emit('authenticated', { success: true });
            } else {
                socket.emit('authenticated', { success: false, error: 'Geçersiz token' });
            }
        } catch (error) {
            logger.error('Socket auth hatası:', error);
            socket.emit('authenticated', { success: false, error: 'Auth hatası' });
        }
    });

    // Sohbete katıl
    socket.on('join-conversation', (conversationId) => {
        if (socket.userId) {
            socket.join(`conversation:${conversationId}`);
            logger.info(`Kullanıcı ${socket.userId} sohbete katıldı: ${conversationId}`);
        }
    });

    // Sohbetten ayrıl
    socket.on('leave-conversation', (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
        logger.info(`Kullanıcı ${socket.userId} sohbetten ayrıldı: ${conversationId}`);
    });

    // Mesaj gönder
    socket.on('send-message', async (data) => {
        try {
            const { conversationId, content, type } = data;
            
            if (!socket.userId) {
                socket.emit('error', { message: 'Oturum gerekli' });
                return;
            }

            const messageService = require('./services/messageService');
            const result = await messageService.createMessage(
                conversationId,
                socket.userId,
                content,
                type
            );

            if (result.success) {
                io.to(`conversation:${conversationId}`).emit('new-message', result.message);
            }
        } catch (error) {
            logger.error('Mesaj gönderme hatası:', error);
        }
    });

    // Yazıyor göstergesi
    socket.on('typing', (conversationId) => {
        if (socket.userId) {
            socket.to(`conversation:${conversationId}`).emit('user-typing', {
                userId: socket.userId,
                conversationId
            });
        }
    });

    // Okundu işaretle
    socket.on('mark-read', async (conversationId) => {
        if (socket.userId) {
            await require('./services/messageService').markConversationRead(
                conversationId,
                socket.userId
            );
            
            socket.to(`conversation:${conversationId}`).emit('messages-read', {
                userId: socket.userId,
                conversationId
            });
        }
    });

    // Bağlantı koptuğunda
    socket.on('disconnect', async () => {
        if (socket.userId) {
            logger.info(`Bağlantı koptu: ${socket.id}, Kullanıcı: ${socket.userId}`);
            
            // Kullanıcıyı offline işaretle
            await require('./services/userService').updateUserStatus(socket.userId, 'offline');
            
            // Diğer kullanıcılara bildir
            io.emit('user-offline', { userId: socket.userId });
        }
    });
});

// Socket.IO'yu app'e ekle
app.set('io', io);

// Hata yakalama
process.on('uncaughtException', (error) => {
    logger.error('Yakalanmayan hata:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Yakalanmayan promise reddi:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM alındı, sunucu kapatılıyor...');
    server.close(() => {
        logger.info('Sunucu kapatıldı');
        process.exit(0);
    });
});

// Sunucuyu başlat
server.listen(environment.PORT, () => {
    logger.info(`Gettic sunucusu ${environment.NODE_ENV} modunda ${environment.PORT} portunda çalışıyor`);
    logger.info(`Health check: http://localhost:${environment.PORT}/health`);
});

module.exports = server;
