// ============================================
// GETTIC - SERVER.JS
// Ana Express sunucusu
// ============================================

const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const { logger } = require('./utils/logger');
const { environment } = require('./config/environment');
const { supabase } = require('./config/supabase');
const { verifyToken } = require('./utils/jwt');
const userService = require('./services/userService');
const messageService = require('./services/messageService');

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
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Socket.IO bağlantı yönetimi
io.on('connection', (socket) => {
    logger.info(`Yeni bağlantı: ${socket.id}`);

    // Kullanıcı kimlik doğrulama
    socket.on('authenticate', async (token) => {
        try {
            const decoded = verifyToken(token);
            
            if (decoded) {
                socket.userId = decoded.sub;
                socket.join(`user:${decoded.sub}`);
                logger.info(`Kullanıcı doğrulandı: ${decoded.sub}`);
                
                // Kullanıcıyı online işaretle
                await userService.updateUserStatus(decoded.sub, 'online');
                
                // Diğer kullanıcılara bildir
                socket.broadcast.emit('user-online', { userId: decoded.sub });
                
                socket.emit('authenticated', { 
                    success: true,
                    userId: decoded.sub
                });
            } else {
                socket.emit('authenticated', { 
                    success: false, 
                    error: 'Geçersiz token' 
                });
            }
        } catch (error) {
            logger.error('Socket auth hatası:', error);
            socket.emit('authenticated', { 
                success: false, 
                error: 'Auth hatası' 
            });
        }
    });

    // Sohbete katıl
    socket.on('join-conversation', async (conversationId) => {
        if (!socket.userId) {
            socket.emit('error', { message: 'Önce giriş yapın' });
            return;
        }

        try {
            // Üyelik kontrolü
            const { data: memberCheck } = await supabase
                .from('conversation_members')
                .select('user_id')
                .eq('conversation_id', conversationId)
                .eq('user_id', socket.userId)
                .single();

            if (!memberCheck) {
                socket.emit('error', { message: 'Bu sohbete erişiminiz yok' });
                return;
            }

            socket.join(`conversation:${conversationId}`);
            logger.info(`Kullanıcı ${socket.userId} sohbete katıldı: ${conversationId}`);
            
            // Mesajları okundu işaretle
            await messageService.markConversationRead(conversationId, socket.userId);
            
            socket.emit('joined-conversation', { conversationId });
        } catch (error) {
            logger.error('Sohbete katılma hatası:', error);
            socket.emit('error', { message: 'Sohbete katılınamadı' });
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
            const { conversationId, content, type = 'text', mediaUrl = null } = data;
            
            if (!socket.userId) {
                socket.emit('error', { message: 'Oturum gerekli' });
                return;
            }

            if (!content && !mediaUrl) {
                socket.emit('error', { message: 'Mesaj içeriği boş' });
                return;
            }

            const result = await messageService.createMessage(
                conversationId,
                socket.userId,
                content,
                type,
                mediaUrl
            );

            if (result.success) {
                // Sohbetteki herkese mesajı ilet
                io.to(`conversation:${conversationId}`).emit('new-message', result.message);
                
                // Gönderene onay
                socket.emit('message-sent', result.message);
            } else {
                socket.emit('error', { message: result.error });
            }
        } catch (error) {
            logger.error('Mesaj gönderme hatası:', error);
            socket.emit('error', { message: 'Mesaj gönderilemedi' });
        }
    });

    // Yazıyor göstergesi
    socket.on('typing', (conversationId) => {
        if (socket.userId) {
            socket.to(`conversation:${conversationId}`).emit('user-typing', {
                userId: socket.userId,
                conversationId,
                timestamp: new Date()
            });
        }
    });

    // Yazıyor göstergesi bitti
    socket.on('stop-typing', (conversationId) => {
        if (socket.userId) {
            socket.to(`conversation:${conversationId}`).emit('user-stop-typing', {
                userId: socket.userId,
                conversationId
            });
        }
    });

    // Okundu işaretle
    socket.on('mark-read', async (conversationId) => {
        if (!socket.userId) return;

        try {
            await messageService.markConversationRead(conversationId, socket.userId);
            
            socket.to(`conversation:${conversationId}`).emit('messages-read', {
                userId: socket.userId,
                conversationId,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Okundu işaretleme hatası:', error);
        }
    });

    // Bağlantı koptuğunda
    socket.on('disconnect', async () => {
        if (socket.userId) {
            logger.info(`Bağlantı koptu: ${socket.id}, Kullanıcı: ${socket.userId}`);
            
            // Kullanıcıyı offline işaretle
            await userService.updateUserStatus(socket.userId, 'offline');
            
            // Diğer kullanıcılara bildir
            socket.broadcast.emit('user-offline', { 
                userId: socket.userId,
                timestamp: new Date()
            });
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
