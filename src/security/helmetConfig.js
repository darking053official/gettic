// ============================================
// GETTIC - SECURITY/HELMETCONFIG.JS
// Helmet güvenlik ayarları
// ============================================

const { environment } = require('../config/environment');

const helmetConfig = {
    // Content Security Policy
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
    
    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: {
        policy: 'same-origin-allow-popups'
    },
    
    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: {
        policy: 'cross-origin'
    },
    
    // DNS Prefetch Control
    dnsPrefetchControl: {
        allow: false
    },
    
    // Expect-CT
    expectCt: {
        maxAge: 86400,
        enforce: true
    },
    
    // Frameguard
    frameguard: {
        action: 'deny'
    },
    
    // Hide Powered-By
    hidePoweredBy: true,
    
    // HSTS
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    
    // IE No Open
    ieNoOpen: true,
    
    // No Sniff
    noSniff: true,
    
    // Origin-Agent-Cluster
    originAgentCluster: true,
    
    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: {
        permittedPolicies: 'none'
    },
    
    // Referrer Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    
    // X-Download-Options
    xDownloadOptions: 'noopen',
    
    // X-Permitted-Cross-Domain-Policies
    xPermittedCrossDomainPolicies: 'none',
    
    // X-Powered-By
    xPoweredBy: false,
    
    // X-XSS-Protection
    xssFilter: true
};

module.exports = { helmetConfig };
