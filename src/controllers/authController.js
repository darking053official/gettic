// ============================================
// GETTIC - CONTROLLERS/AUTHCONTROLLER.JS
// Kayıt, giriş, token işlemleri
// ============================================

const { supabase, supabaseAdmin } = require('../config/supabase');
const { environment } = require('../config/environment');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { logger } = require('../utils/logger');
const { sendEmail } = require('../services/emailService');

// Kullanıcı kaydı
async function register(req, res, next) {
    try {
        const { email, password, username, full_name } = req.body;

        // Input doğrulama
        if (!email || !password || !username) {
            return res.status(400).json({
                success: false,
                error: 'Email, şifre ve kullanıcı adı zorunludur'
            });
        }

        // Email formatı kontrol
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz email adresi'
            });
        }

        // Kullanıcı adı kontrol
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                error: 'Kullanıcı adı 3-20 karakter arası olmalı ve sadece harf, rakam ve alt çizgi içermeli'
            });
        }

        // Şifre kontrol
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Şifre en az 8 karakter olmalı'
            });
        }

        // Supabase ile kayıt
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    full_name: full_name || username
                }
            }
        });

        if (authError) {
            logger.error('Kayıt hatası:', authError);
            return res.status(400).json({
                success: false,
                error: authError.message
            });
        }

        // Profil oluştur
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: authData.user.id,
                    username,
                    full_name: full_name || username,
                    status: 'online'
                }
            ]);

        if (profileError) {
            logger.error('Profil oluşturma hatası:', profileError);
        }

        // Token oluştur
        const token = generateToken({ sub: authData.user.id, email });
        const refreshToken = generateRefreshToken({ sub: authData.user.id });

        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı',
            user: {
                id: authData.user.id,
                email,
                username,
                full_name: full_name || username
            },
            token,
            refreshToken
        });
    } catch (error) {
        logger.error('Register controller hatası:', error);
        next(error);
    }
}

// Kullanıcı girişi
async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email ve şifre zorunludur'
            });
        }

        // Supabase ile giriş
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            logger.error('Giriş hatası:', authError);
            return res.status(401).json({
                success: false,
                error: 'Email veya şifre hatalı'
            });
        }

        // Profili getir
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        // Token oluştur
        const token = generateToken({ sub: authData.user.id, email });
        const refreshToken = generateRefreshToken({ sub: authData.user.id });

        // Kullanıcıyı online işaretle
        await supabase
            .from('profiles')
            .update({ status: 'online' })
            .eq('id', authData.user.id);

        res.json({
            success: true,
            message: 'Giriş başarılı',
            user: {
                id: authData.user.id,
                email: authData.user.email,
                username: profile?.username,
                full_name: profile?.full_name,
                avatar_url: profile?.avatar_url
            },
            token,
            refreshToken
        });
    } catch (error) {
        logger.error('Login controller hatası:', error);
        next(error);
    }
}

// Token yenileme
async function refreshToken(req, res, next) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token gerekli'
            });
        }

        const decoded = verifyRefreshToken(refreshToken);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Geçersiz refresh token'
            });
        }

        // Yeni token oluştur
        const newToken = generateToken({ sub: decoded.sub });
        const newRefreshToken = generateRefreshToken({ sub: decoded.sub });

        res.json({
            success: true,
            token: newToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        logger.error('Refresh token hatası:', error);
        next(error);
    }
}

// Çıkış yap
async function logout(req, res, next) {
    try {
        const userId = req.user?.id;

        if (userId) {
            // Kullanıcıyı offline işaretle
            await supabase
                .from('profiles')
                .update({ 
                    status: 'offline',
                    last_seen: new Date()
                })
                .eq('id', userId);
        }

        // Supabase çıkış
        const { error } = await supabase.auth.signOut();

        if (error) {
            logger.error('Çıkış hatası:', error);
        }

        res.json({
            success: true,
            message: 'Çıkış başarılı'
        });
    } catch (error) {
        logger.error('Logout controller hatası:', error);
        next(error);
    }
}

// Şifre sıfırlama emaili gönder
async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email gerekli'
            });
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${environment.ALLOWED_ORIGINS[0]}/reset-password.html`
        });

        if (error) {
            logger.error('Şifre sıfırlama hatası:', error);
        }

        // Her durumda başarılı yanıt dön (email var mı yok mu belli etme)
        res.json({
            success: true,
            message: 'Şifre sıfırlama emaili gönderildi'
        });
    } catch (error) {
        logger.error('Forgot password hatası:', error);
        next(error);
    }
}

// Şifre güncelle
async function updatePassword(req, res, next) {
    try {
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Şifre en az 8 karakter olmalı'
            });
        }

        const { error } = await supabase.auth.updateUser({
            password
        });

        if (error) {
            logger.error('Şifre güncelleme hatası:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Şifre güncellendi'
        });
    } catch (error) {
        logger.error('Update password hatası:', error);
        next(error);
    }
}

// Email doğrulama
async function verifyEmail(req, res, next) {
    try {
        const { token } = req.params;

        const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
        });

        if (error) {
            logger.error('Email doğrulama hatası:', error);
            return res.status(400).json({
                success: false,
                error: 'Geçersiz doğrulama tokeni'
            });
        }

        res.json({
            success: true,
            message: 'Email doğrulandı'
        });
    } catch (error) {
        logger.error('Verify email hatası:', error);
        next(error);
    }
}

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    forgotPassword,
    updatePassword,
    verifyEmail
};
