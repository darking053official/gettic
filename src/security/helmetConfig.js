const { environment } = require('../config/environment');

const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                'https://cdn.tailwindcss.com',
                'https://cdn.jsdelivr.net'
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://cdn.tailwindcss.com',
                'https://fonts.googleapis.com'
            ],
            fontSrc: [
                "'self'",
                'https://fonts.gstatic.com'
            ],
            imgSrc: [
                "'self'",
                'data:',
                'blob:',
                'https://*.supabase.co',
                'https://*.supabase.in'
            ],
            mediaSrc: [
                "'self'",
                'blob:',
                'https://*.supabase.co',
                'https://*.supabase.in'
            ],
            connectSrc: [
                "'self'",
                'https://*.supabase.co',
                'https://*.supabase.in',
                'wss://*.supabase.co',
                'wss://*.supabase.in'
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    
    crossOriginOpenerPolicy: {
        policy: 'same-origin-allow-popups'
    },
    
    crossOriginResourcePolicy: {
        policy: 'cross-origin'
    },
    
    dnsPrefetchControl: {
        allow: false
    },
    
    expectCt: {
        maxAge: 86400,
        enforce: true
    },
    
    frameguard: {
        action: 'deny'
    },
    
    hidePoweredBy: true,
    
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    
    noSniff: true,
    
    originAgentCluster: true,
    
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
};

module.exports = { helmetConfig };
