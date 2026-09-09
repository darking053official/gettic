// ============================================
// GETTIC - AUTH
// ============================================

const SUPABASE_URL = 'https://ayucfychcemsvzlgsdqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dWNmeWNoY2Vtc3Z6bGdzZHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDAwODksImV4cCI6MjEwNDM3NjA4OX0.XhXZjzy58cWuAhejswK_44_Y8JJKdSzPI4QCUrS8ipg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.showError = function(msg) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.innerHTML = `
            <div class="flex items-start justify-between gap-2">
                <span>${msg}</span>
                <button onclick="copyError('${msg.replace(/'/g, "\\'")}')" class="text-xs bg-red-500/30 hover:bg-red-500/50 px-2 py-1 rounded transition whitespace-nowrap">
                    Kopyala
                </button>
            </div>
        `;
        errorDiv.classList.remove('hidden');
    }
    alert('HATA: ' + msg);
};

window.copyError = function(msg) {
    navigator.clipboard.writeText(msg).then(() => {
        alert('Hata kopyalandı!');
    }).catch(() => {
        alert('Kopyalanamadı: ' + msg);
    });
};

window.hideError = function() {
    const el = document.getElementById('errorMessage');
    if (el) el.classList.add('hidden');
};

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

window.toggleLoginPass = function() {
    const input = document.getElementById('loginPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
};

window.toggleRegPass = function() {
    const input = document.getElementById('regPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
};

window.doLogin = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        window.showError('Email ve şifre gerekli');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            window.showError(error.message.includes('Invalid') ? 'Email veya şifre hatalı' : error.message);
            return;
        }
        
        window.location.href = 'chat.html';
    } catch (err) {
        window.showError(err.message);
    }
};

window.doRegister = async function() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!username || !email || !password) {
        window.showError('Tüm alanları doldurun');
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
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username, full_name: username } }
        });
        
        if (error) {
            window.showError(error.message);
            return;
        }
        
        if (data.user) {
            await supabase.from('profiles').insert([{
                id: data.user.id,
                username,
                full_name: username,
                status: 'online'
            }]);
        }
        
        window.location.href = 'chat.html';
    } catch (err) {
        window.showError(err.message);
    }
};

window.doGoogleLogin = async function() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/chat.html' }
        });
        if (error) window.showError(error.message);
    } catch (err) {
        window.showError(err.message);
    }
};

window.doGithubLogin = async function() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin + '/chat.html' }
        });
        if (error) window.showError(error.message);
    } catch (err) {
        window.showError(err.message);
    }
};
