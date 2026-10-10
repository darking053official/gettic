// ============================================
// GETTIC - AUTH (Premium)
// ============================================

const SUPABASE_URL = 'https://ayucfychcemsvzlgsdqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dWNmeWNoY2Vtc3Z6bGdzZHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDAwODksImV4cCI6MjEwNDM3NjA4OX0.XhXZjzy58cWuAhejswK_44_Y8JJKdSzPI4QCUrS8ipg';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'gettic-auth'
    }
});

// ============ HATA YÖNETİMİ ============
const ERROR_MESSAGES = {
    'Invalid login credentials': 'Email veya şifre hatalı',
    'Email not confirmed': 'Email adresiniz doğrulanmamış',
    'User already registered': 'Bu email zaten kayıtlı',
    'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalı',
    'Email rate limit exceeded': 'Çok fazla deneme yaptınız, bekleyin',
    'signup disabled': 'Kayıt şu anda devre dışı',
    'Invalid email': 'Geçersiz email adresi',
    'Email link is invalid or has expired': 'Email linki geçersiz veya süresi dolmuş'
};

function translateError(msg) {
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
        if (msg.includes(key)) return value;
    }
    return msg;
}

// ============ BİLDİRİM ============
let errorTimeout = null;

window.showError = function(msg) {
    const el = document.getElementById('errorMessage');
    if (!el) return;
    
    const safeMsg = String(msg).replace(/[<>&"']/g, c => ({
        '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
    }[c]));
    
    el.innerHTML = `
        <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="flex-1">
                <p class="font-semibold text-red-400 text-sm">Hata</p>
                <p class="text-red-300 text-sm mt-1">${safeMsg}</p>
            </div>
            <button onclick="copyError(this)" data-error="${safeMsg}" class="text-xs bg-red-500/20 hover:bg-red-500/30 px-2 py-1 rounded transition" title="Kopyala">
                <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
            </button>
        </div>
    `;
    el.classList.remove('hidden');
    
    if (errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => el.classList.add('hidden'), 8000);
};

window.showSuccess = function(msg) {
    const el = document.getElementById('errorMessage');
    if (!el) return;
    el.innerHTML = `
        <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="flex-1">
                <p class="font-semibold text-green-400 text-sm">Başarılı</p>
                <p class="text-green-300 text-sm mt-1">${msg}</p>
            </div>
        </div>
    `;
    el.classList.remove('hidden', 'bg-red-500/10', 'border-red-500/30');
    el.classList.add('bg-green-500/10', 'border-green-500/30');
    
    if (errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => {
        el.classList.add('hidden');
        el.classList.remove('bg-green-500/10', 'border-green-500/30');
        el.classList.add('bg-red-500/10', 'border-red-500/30');
    }, 4000);
};

window.copyError = function(btn) {
    const msg = btn.getAttribute('data-error');
    navigator.clipboard.writeText(msg).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        setTimeout(() => btn.innerHTML = original, 1500);
    });
};

window.hideError = function() {
    const el = document.getElementById('errorMessage');
    if (el) el.classList.add('hidden');
    if (errorTimeout) clearTimeout(errorTimeout);
};

// ============ TAB YÖNETİMİ ============
window.showLoginTab = function() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginTab').className = 'flex-1 py-2 rounded-lg bg-accent text-white font-semibold transition';
    document.getElementById('registerTab').className = 'flex-1 py-2 rounded-lg bg-bg-tertiary text-gray-400 font-semibold transition';
    document.getElementById('subtitle').textContent = 'Tekrar hoş geldiniz';
    window.hideError();
};

window.showRegisterTab = function() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginTab').className = 'flex-1 py-2 rounded-lg bg-bg-tertiary text-gray-400 font-semibold transition';
    document.getElementById('registerTab').className = 'flex-1 py-2 rounded-lg bg-accent text-white font-semibold transition';
    document.getElementById('subtitle').textContent = 'Ücretsiz hesap oluşturun';
    window.hideError();
};

// ============ ŞİFRE GÖSTER/GİZLE ============
window.toggleLoginPass = function() {
    const input = document.getElementById('loginPassword');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
};

window.toggleRegPass = function() {
    const input = document.getElementById('regPassword');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
};

// ============ YARDIMCI FONKSİYONLAR ============
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.6' : '1';
    btn.style.cursor = loading ? 'not-allowed' : 'pointer';
}

// ============ GİRİŞ ============
window.doLogin = async function() {
    window.hideError();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = event?.target;
    
    if (!email || !password) {
        window.showError('Email ve şifre gerekli');
        return;
    }
    
    if (!isValidEmail(email)) {
        window.showError('Geçersiz email adresi');
        return;
    }
    
    setLoading(btn, true);
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            window.showError(translateError(error.message));
            setLoading(btn, false);
            return;
        }
        
        window.location.href = 'chat.html';
    } catch (err) {
        window.showError('Bağlantı hatası: ' + err.message);
        setLoading(btn, false);
    }
};

// ============ KAYIT ============
window.doRegister = async function() {
    window.hideError();
    
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const btn = event?.target;
    
    if (!username || !email || !password) {
        window.showError('Tüm alanları doldurun');
        return;
    }
    
    if (!isValidEmail(email)) {
        window.showError('Geçersiz email adresi');
        return;
    }
    
    if (!isValidUsername(username)) {
        window.showError('Kullanıcı adı 3-20 karakter olmalı (harf, rakam, _)');
        return;
    }
    
    if (password !== confirmPassword) {
        window.showError('Şifreler eşleşmiyor');
        return;
    }
    
    if (password.length < 8) {
        window.showError('Şifre en az 8 karakter olmalı');
        return;
    }
    
    setLoading(btn, true);
    
    try {
        // Kullanıcı adı kontrolü
        const { data: existing } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle();
        
        if (existing) {
            window.showError('Bu kullanıcı adı zaten alınmış');
            setLoading(btn, false);
            return;
        }
        
        // Kayıt
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username, full_name: username } }
        });
        
        if (error) {
            window.showError(translateError(error.message));
            setLoading(btn, false);
            return;
        }
        
        // Zaten kayıtlı email kontrolü (Supabase hata vermez, identities boş olur)
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            window.showError('Bu email zaten kayıtlı. Giriş yapmayı deneyin.');
            setLoading(btn, false);
            return;
        }
        
        // Profil oluştur (upsert - trigger ile çakışmasın)
        if (data.user) {
            await supabase.from('profiles').upsert([{
                id: data.user.id,
                username,
                full_name: username,
                status: 'online'
            }], { onConflict: 'id' });
        }
        
        // Email doğrulama gerekiyorsa
        if (data.user && !data.session) {
            window.showSuccess('Kayıt başarılı! Email adresinizi doğrulayın.');
            setLoading(btn, false);
            return;
        }
        
        window.location.href = 'chat.html';
    } catch (err) {
        window.showError('Bağlantı hatası: ' + err.message);
        setLoading(btn, false);
    }
};

// ============ SOSYAL GİRİŞ ============
window.doGoogleLogin = async function() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/chat.html' }
        });
        if (error) window.showError(translateError(error.message));
    } catch (err) {
        window.showError('Google giriş hatası: ' + err.message);
    }
};

window.doGithubLogin = async function() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin + '/chat.html' }
        });
        if (error) window.showError(translateError(error.message));
    } catch (err) {
        window.showError('GitHub giriş hatası: ' + err.message);
    }
};

// ============ ŞİFRE SIFIRLAMA ============
window.doForgotPassword = async function() {
    const email = prompt('Email adresinizi girin:');
    if (!email) return;
    
    if (!isValidEmail(email)) {
        window.showError('Geçersiz email adresi');
        return;
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/auth.html'
        });
        
        if (error) {
            window.showError(translateError(error.message));
            return;
        }
        
        window.showSuccess('Şifre sıfırlama linki email adresinize gönderildi');
    } catch (err) {
        window.showError('Hata: ' + err.message);
    }
};

// ============ ENTER İLE SUBMIT ============
document.addEventListener('DOMContentLoaded', async () => {
    // Oturum kontrolü
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'chat.html';
        return;
    }
    
    // Enter tuşu desteği
    const loginPass = document.getElementById('loginPassword');
    const regPass = document.getElementById('regConfirmPassword');
    
    if (loginPass) {
        loginPass.addEventListener('keypress', e => {
            if (e.key === 'Enter') window.doLogin();
        });
    }
    
    if (regPass) {
        regPass.addEventListener('keypress', e => {
            if (e.key === 'Enter') window.doRegister();
        });
    }
});
