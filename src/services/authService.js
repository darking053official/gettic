// ============================================
// GETTIC - SERVICES/AUTHSERVICE.JS
// Auth iş mantığı
// ============================================

const { supabase, supabaseAdmin } = require('../config/supabase');
const { environment } = require('../config/environment');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { logger } = require('../utils/logger');
const { sendEmail, emailTemplates } = require('./emailService');

class AuthService {
    // Kullanıcı kaydı
    async register(email, password, username, fullName = null) {
        try {
            // Supabase ile kayıt
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                        full_name: fullName || username
                    }
                }
            });

            if (authError) throw authError;

            // Profil oluştur
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    id: authData.user.id,
                    username,
                    full_name: fullName || username,
                    status: 'online'
                }]);

            if (profileError) {
                logger.error('Profil oluşturma hatası:', profileError);
            }

            // Hoş geldin emaili gönder
            await this.sendWelcomeEmail(email, username);

            // Token oluştur
            const token = generateToken({ sub: authData.user.id, email });
            const refreshToken = generateRefreshToken({ sub: authData.user.id });

            return {
                success: true,
                user: {
                    id: authData.user.id,
                    email,
                    username,
                    full_name: fullName || username
                },
                token,
                refreshToken
            };
        } catch (error) {
            logger.error('Register service hatası:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Kullanıcı girişi
    async login(email, password) {
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;

            // Profili getir
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            // Kullanıcıyı online işaretle
            await this.updateUserStatus(authData.user.id, 'online');

            // Token oluştur
            const token = generateToken({ sub: authData.user.id, email });
            const refreshToken = generateRefreshToken({ sub: authData.user.id });

            return {
                success: true,
                user: {
                    id: authData.user.id,
                    email: authData.user.email,
                    username: profile?.username,
                    full_name: profile?.full_name,
                    avatar_url: profile?.avatar_url
                },
                token,
                refreshToken
            };
        } catch (error) {
            logger.error('Login service hatası:', error);
            return {
                success: false,
                error: 'Email veya şifre hatalı'
            };
        }
    }

    // Token yenile
    async refreshToken(refreshToken) {
        try {
            const decoded = verifyRefreshToken(refreshToken);
            
            if (!decoded) {
                return {
                    success: false,
                    error: 'Geçersiz refresh token'
                };
            }

            const newToken = generateToken({ sub: decoded.sub });
            const newRefreshToken = generateRefreshToken({ sub: decoded.sub });

            return {
                success: true,
                token: newToken,
                refreshToken: newRefreshToken
            };
        } catch (error) {
            logger.error('Refresh token service hatası:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Çıkış yap
    async logout(userId) {
        try {
            if (userId) {
                await this.updateUserStatus(userId, 'offline');
            }

            await supabase.auth.signOut();

            return { success: true };
        } catch (error) {
            logger.error('Logout service hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Kullanıcı durumunu güncelle
    async updateUserStatus(userId, status) {
        try {
            const updates = { status };
            
            if (status === 'offline') {
                updates.last_seen = new Date();
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            logger.error('Durum güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Şifre sıfırlama emaili gönder
    async forgotPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${environment.ALLOWED_ORIGINS[0]}/reset-password.html`
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Şifre sıfırlama emaili gönderildi'
            };
        } catch (error) {
            logger.error('Forgot password service hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Şifre güncelle
    async updatePassword(newPassword) {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            logger.error('Şifre güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Hoş geldin emaili gönder
    async sendWelcomeEmail(email, username) {
        try {
            const html = emailTemplates.welcome(username);
            
            await sendEmail({
                to: email,
                subject: 'Gettic\'e Hoş Geldiniz!',
                html
            });

            return { success: true };
        } catch (error) {
            logger.error('Hoş geldin emaili hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Email doğrula
    async verifyEmail(token) {
        try {
            const { error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'email'
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            logger.error('Email doğrulama hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Google ile giriş
    async loginWithGoogle() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${environment.ALLOWED_ORIGINS[0]}/chat.html`
                }
            });

            if (error) throw error;

            return { success: true, url: data.url };
        } catch (error) {
            logger.error('Google giriş hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // GitHub ile giriş
    async loginWithGithub() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${environment.ALLOWED_ORIGINS[0]}/chat.html`
                }
            });

            if (error) throw error;

            return { success: true, url: data.url };
        } catch (error) {
            logger.error('GitHub giriş hatası:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AuthService();
