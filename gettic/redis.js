// redis.js - Redis Cache Modülü (server.js'e ek)
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
    connectTimeout: 10000
});

redis.on('connect', () => console.log('✅ Redis bağlandı'));
redis.on('error', (err) => console.log('⚠️ Redis hatası:', err.message));

// Cache middleware
const cacheMiddleware = (duration = 60) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') return next();
        
        const key = `cache:${req.originalUrl}`;
        try {
            const cached = await redis.get(key);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
            
            const originalJson = res.json.bind(res);
            res.json = function(body) {
                redis.setex(key, duration, JSON.stringify(body));
                return originalJson(body);
            };
            next();
        } catch (err) {
            next();
        }
    };
};

module.exports = { redis, cacheMiddleware };
