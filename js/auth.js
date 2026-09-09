// ============================================
// GETTIC - AUTH
// ============================================

const SUPABASE_URL = 'https://ayucfychcemsvzlgsdqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dWNmeWNoY2Vtc3Z6bGdzZHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDAwODksImV4cCI6MjEwNDM3NjA4OX0.XhXZjzy58cWuAhejswK_44_Y8JJKdSzPI4QCUrS8ipg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showError(msg) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
}

function hideError() {
    const el = document.getElementById('errorMessage');
    if (el) el.classList.add('hidden');
}

function showLoginTab() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginTab').className = 'flex-1 py-2 rounded-lg bg-accent text-white font-semibold transition';
    document.getElementById('registerTab').className = 'flex-1 py-2 rounded-lg bg-bg-tertiary text-gray-400 font-semibold transition';
    document.getElementById('subtitle').textContent = 'Tekrar hoş geldiniz';
    hideError();
}

function showRegisterTab() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginTab').className = 'flex-1 py-2 rounded-lg bg-bg-tertiary text-gray-400 font-semibold transition';
    document.getElementById('registerTab').className = 'flex-1 py-2 rounded-lg bg-accent text-white font-semibold transition';
    document.getElementById('subtitle').textContent = 'Ücretsiz hesap oluşturun';
    hideError();
}

function toggleLoginPass() {
    const input = document.getElementById('loginPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleRegPass() {
    const input = document.getElementById('regPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function doLogin() {
    hideError();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showError('Email ve şifre gerekli');
        return;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        showError(error.message.includes('Invalid') ? 'Email veya şifre hatalı' : error.message);
        return;
    }
    
    window.location.href = 'chat.html';
}

async function doRegister() {
    hideError();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!username || !email || !password) {
        showError('Tüm alanları doldurun');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Şifreler eşleşmiyor');
        return;
    }
    
    if (password.length < 8) {
        showError('Şifre en az 8 karakter olmalı');
        return;
    }
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, full_name: username } }
    });
    
    if (error) {
        showError(error.message);
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
}

async function doGoogleLogin() {
    hideError();
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/chat.html' }
    });
    if (error) showError(error.message);
}

async function doGithubLogin() {
    hideError();
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin + '/chat.html' }
    });
    if (error) showError(error.message);
}
