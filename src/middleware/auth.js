// ============================================
// GETTIC - MIDDLEWARE/AUTH.JS
// JWT doğrulama middleware
// ============================================

const { verifyToken } = require('../utils/jwt');
const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');

// JWT doğrulama middleware
async function authenticate(req, res, next) {
    try {
        // Token'ı header'dan al
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Oturum tokeni gerekli'
            });
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Oturum tokeni gerekli'
            });
        }

        // Token'ı doğrula
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Geçersiz veya süresi dolmuş token'
            });
        }

        // Kullanıcıyı getir
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', decoded.sub)
            .single();

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }

        // Kullanıcıyı request'e ekle
        req.user = {
            id: user.id,
            email: decoded.email,
            username: user.username,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            status: user.status,
            profile: user
        };

        next();
    } catch (error) {
        logger.error('Auth middleware hatası:', error);
        return res.status(401).json({
            success: false,
            error: 'Oturum doğrulanamadı'
        });
    }
}

// Opsiyonel auth (token varsa doğrula, yoksa devam et)
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token);
            
            if (decoded) {
                const { data: user } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', decoded.sub)
                    .single();
                
                if (user) {
                    req.user = {
                        id: user.id,
                        email: decoded.email,
                        username: user.username,
                        profile: user
                    };
                }
            }
        }
        
        next();
    } catch (error) {
        next();
    }
}

// Admin yetkisi kontrolü
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Oturum gerekli'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Bu işlem için admin yetkisi gerekli'
        });
    }

    next();
}

// Moderator yetkisi kontrolü
function requireModerator(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Oturum gerekli'
        });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
            success: false,
            error: 'Bu işlem için moderatör yetkisi gerekli'
        });
    }

    next();
}

module.exports = {
    authenticate,
    optionalAuth,
    requireAdmin,
    requireModerator
};
