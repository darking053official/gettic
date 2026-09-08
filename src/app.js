// ============================================
// GETTIC - APP.JS
// Express app yapılandırması
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const useragent = require('express-useragent');
const requestIp = require('request-ip');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss');
const path = require('path');

const { environment } = require('./config/environment');
const { corsConfig } = require('./security/corsConfig');
const { helmetConfig } = require('./security/helmetConfig');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

// Express app oluştur
const app = express();

// Güvenlik middleware'leri
app.use(helmet(helmetConfig));
app.use(cors(corsConfig));
app.use(cookieParser());
app.use(useragent.express());
app.use(requestIp.mw());
app.use(mongoSanitize());
app.use(hpp());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS koruması
app.use((req, res, next) => {
    if (req.body) {
        const sanitize = (obj) => {
            for (let key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = xss(obj[key]);
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitize(obj[key]);
                }
            }
        };
        sanitize(req.body);
    }
    next();
});

// Rate limiting
app.use('/api/', rateLimiter);

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - IP: ${req.clientIp}`);
    });
    next();
});

// Statik dosyalar (public klasörü)
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: environment.NODE_ENV
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint bulunamadı'
    });
});

// Hata yakalama
app.use(errorHandler);

module.exports = app;
