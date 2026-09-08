// ============================================
// GETTIC - AUTH MANAGER
// ============================================

// Input doğrulama fonksiyonları
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function isValidUsername(username) {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    return regex.test(username);
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
        this.init();
    }

    async init() {
        const { data: { session } } = await supabase.auth.getSession();
        this.currentUser = session?.user || null;
        
        if (this.currentUser) {
            await this.loadProfile();
            await this.updateUserStatus('online');
        }
    }

    // Kullanıcı profili yükle
    async loadProfile() {
        if (!this.currentUser) return null;
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
        
        if (error) {
            console.error('Profil yüklenemedi:', error);
            return null;
        }
        
        this.currentProfile = profile;
        return profile;
    }

    // Kayıt ol
    async register(email, password, username) {
        try {
            // Input doğrulama
            if (!isValidEmail(email)) {
                return { success: false, error: 'Geçersiz email adresi' };
            }
            
            if (!isValidUsername(username)) {
                return { success: false, error: 'Kullanıcı adı 3-20 karakter arası olmalı ve sadece harf, rakam ve alt çizgi içermeli' };
            }
            
            if (password.length < 8) {
                return { success: false, error: 'Şifre en az 8 karakter olmalı' };
            }
            
            // Kullanıcı adı kontrolü
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .single();
            
            if (existingUser) {
                return { success: false, error: 'Bu kullanıcı adı zaten kullanılıyor' };
            }
            
            // Kayıt işlemi
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username,
                        full_name: username
                    }
                }
            });
            
            if (error) {
                if (error.message.includes('already registered')) {
                    return { success: false, error: 'Bu email zaten kayıtlı' };
                }
                return { success: false, error: error.message };
            }
            
            if (data.user) {
                // Profil oluştur
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            username: username,
                            full_name: username,
                            avatar_url: null,
                            status: 'online'
                        }
                    ]);
                
                if (profileError) {
                    console.error('Profil oluşturma hatası:', profileError);
                }
                
                this.currentUser = data.user;
                await this.loadProfile();
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Kayıt hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Giriş yap
    async login(email, password) {
        try {
            // Input doğrulama
            if (!isValidEmail(email)) {
                return { success: false, error: 'Geçersiz email adresi' };
            }
            
            if (!password) {
                return { success: false, error: 'Şifre gerekli' };
            }
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    return { success: false, error: 'Email veya şifre hatalı' };
                }
                return { success: false, error: error.message };
            }
            
            this.currentUser = data.user;
            await this.loadProfile();
            await this.updateUserStatus('online');
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Giriş hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Çıkış yap
    async logout() {
        try {
            if (this.currentUser) {
                await this.updateUserStatus('offline');
            }
            
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            this.currentProfile = null;
            
            window.location.href = 'index.html';
            
            return { success: true };
        } catch (error) {
            console.error('Çıkış hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // Kullanıcı durumunu güncelle
    async updateUserStatus(status) {
        if (!this.currentUser) return;
        
        const updates = {
            status: status
        };
        
        if (status === 'offline') {
            updates.last_seen = new Date();
        }
        
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', this.currentUser.id);
        
        if (error) {
            console.error('Durum güncelleme hatası:', error);
        }
    }

    // Mevcut kullanıcıyı getir
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        this.currentUser = user;
        
        if (user && !this.currentProfile) {
            await this.loadProfile();
        }
        
        return user;
    }

    // Kullanıcı profili getir
    async getUserProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Profil getirme hatası:', error);
            return null;
        }
        
        return data;
    }

    // Profil güncelle
    async updateProfile(updates) {
        if (!this.currentUser) {
            return { success: false, error: 'Oturum yok' };
        }
        
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', this.currentUser.id)
            .select()
            .single();
        
        if (error) {
            console.error('Profil güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
        
        this.currentProfile = data;
        return { success: true, profile: data };
    }

    // Avatar yükle
    async uploadAvatar(file) {
        if (!this.currentUser) {
            return { success: false, error: 'Oturum yok' };
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${this.currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `${this.currentUser.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);
        
        if (uploadError) {
            console.error('Avatar yükleme hatası:', uploadError);
            return { success: false, error: uploadError.message };
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        
        const result = await this.updateProfile({ avatar_url: publicUrl });
        return result;
    }

    // Şifre değiştir
    async changePassword(newPassword) {
        if (!this.currentUser) {
            return { success: false, error: 'Oturum yok' };
        }
        
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            console.error('Şifre değiştirme hatası:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true };
    }

    // Email değiştir
    async changeEmail(newEmail) {
        if (!this.currentUser) {
            return { success: false, error: 'Oturum yok' };
        }
        
        if (!isValidEmail(newEmail)) {
            return { success: false, error: 'Geçersiz email adresi' };
        }
        
        const { error } = await supabase.auth.updateUser({
            email: newEmail
        });
        
        if (error) {
            console.error('Email değiştirme hatası:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true };
    }

    // Şifre sıfırlama emaili gönder
    async resetPassword(email) {
        if (!isValidEmail(email)) {
            return { success: false, error: 'Geçersiz email adresi' };
        }
        
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        
        if (error) {
            console.error('Şifre sıfırlama hatası:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true };
    }

    // Oturum kontrolü
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Google ile giriş
    async loginWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/chat.html'
            }
        });
        
        if (error) {
            console.error('Google giriş hatası:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true };
    }

    // GitHub ile giriş
    async loginWithGithub() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin + '/chat.html'
            }
        });
        
        if (error) {
            console.error('GitHub giriş hatası:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true };
    }
}

// Global auth manager
const authManager = new AuthManager();
