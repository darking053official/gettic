// ============================================
// GETTIC - UTILS/LOGGER.JS
// Loglama sistemi
// ============================================

const fs = require('fs');
const path = require('path');
const { environment } = require('../config/environment');

// Log seviyeleri
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

// Log dosyası yolu
const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, environment.LOG_FILE || 'gettic.log');

// Log dizinini oluştur
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Log yazma fonksiyonu
function writeLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...(data && { data })
    };
    
    const logString = JSON.stringify(logEntry);
    
    // Konsola yaz
    const consoleMethod = level === 'error' ? console.error : 
                          level === 'warn' ? console.warn : 
                          level === 'debug' ? console.debug : console.log;
    
    consoleMethod(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    
    // Dosyaya yaz
    fs.appendFile(logFile, logString + '\n', (err) => {
        if (err) {
            console.error('Log dosyasına yazılamadı:', err);
        }
    });
}

// Logger objesi
const logger = {
    error(message, data = null) {
        if (LOG_LEVELS[environment.LOG_LEVEL] >= LOG_LEVELS.error) {
            writeLog('error', message, data);
        }
    },
    
    warn(message, data = null) {
        if (LOG_LEVELS[environment.LOG_LEVEL] >= LOG_LEVELS.warn) {
            writeLog('warn', message, data);
        }
    },
    
    info(message, data = null) {
        if (LOG_LEVELS[environment.LOG_LEVEL] >= LOG_LEVELS.info) {
            writeLog('info', message, data);
        }
    },
    
    debug(message, data = null) {
        if (LOG_LEVELS[environment.LOG_LEVEL] >= LOG_LEVELS.debug) {
            writeLog('debug', message, data);
        }
    }
};

module.exports = { logger };
