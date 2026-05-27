// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC AUTH.JS v2.0 - Giriş / Kayıt / Profil                   ║
// ╚══════════════════════════════════════════════════════════════════╝

function _authLog(msg, level = 'log') {
  console[level](`%c[Auth] ${msg}`, 'color:#34d399;font-weight:bold');
}

// ============ STATE ============
const authState = {
  mode:        'login',   // 'login' | 'register'
  loading:     false,
  captchaToken: null,
};

// ============ GİRİŞ EKRANINI RENDER ET ============
function renderAuthScreen() {
  const container = document.getElementById('authScreen');
  if (!container) return;

  container.innerHTML = `
    <div class="auth-bg">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">G</div>
          <span class="auth-logo-text">Gettic</span>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab ${authState.mode === 'login' ? 'act' : ''}"
            onclick="setAuthMode('login')">Giriş Yap</button>
          <button class="auth-tab ${authState.mode === 'register' ? 'act' : ''}"
            onclick="setAuthMode('register')">Kayıt Ol</button>
        </div>

        <div class="auth-error" id="authError" style="display:none"></div>

        <form class="auth-form" onsubmit="handleAuthSubmit(event)" autocomplete="on" novalidate>
          <div class="auth-field">
            <label class="auth-label" for="authUsername">Kullanıcı Adı</label>
            <div class="auth-input-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input class="auth-input" id="authUsername" type="text" name="username"
                placeholder="kullaniciadi" maxlength="32" autocomplete="username"
                oninput="clearAuthError()" required>
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-label" for="authPassword">Şifre</label>
            <div class="auth-input-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input class="auth-input" id="authPassword" type="password" name="password"
                placeholder="••••••••" maxlength="128" autocomplete="${authState.mode === 'login' ? 'current-password' : 'new-password'}"
                oninput="clearAuthError()" required>
              <button type="button" class="auth-eye" onclick="togglePasswordVisibility('authPassword', this)"
                title="Şifreyi göster/gizle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          ${authState.mode === 'register' ? `
            <div class="auth-field">
              <label class="auth-label" for="authPasswordConfirm">Şifre Tekrar</label>
              <div class="auth-input-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input class="auth-input" id="authPasswordConfirm" type="password"
                  placeholder="••••••••" maxlength="128" autocomplete="new-password"
                  oninput="clearAuthError()" required>
              </div>
            </div>` : ''}

          <!-- gCaptcha -->
          <div class="auth-captcha" id="gcaptchaContainer">
            <div id="gcaptcha"></div>
          </div>

          <button type="submit" class="auth-submit" id="authSubmitBtn">
            <span id="authSubmitLabel">
              ${authState.mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </span>
            <div class="auth-submit-spinner" id="authSpinner" style="display:none"></div>
          </button>
        </form>

        <div class="auth-footer">
          ${authState.mode === 'login'
            ? 'Hesabın yok mu? <button class="auth-link" onclick="setAuthMode(\'register\')">Kayıt Ol</button>'
            : 'Zaten hesabın var mı? <button class="auth-link" onclick="setAuthMode(\'login\')">Giriş Yap</button>'}
        </div>

        <div class="auth-version">Gettic v2.0</div>
      </div>
    </div>`;

  // gCaptcha yükle
  _initGCaptcha();

  // Input odak
  setTimeout(() => document.getElementById('authUsername')?.focus(), 100);
}

// ============ MOD DEĞİŞTİR ============
function setAuthMode(mode) {
  authState.mode = mode;
  clearAuthError();
  renderAuthScreen();
}

// ============ CAPTCHA ============
function _initGCaptcha() {
  const el = document.getElementById('gcaptcha');
  if (!el) return;

  // gCaptcha script yüklü mü?
  if (typeof gCaptcha !== 'undefined' && gCaptcha.render) {
    try {
      gCaptcha.render('gcaptcha', {
        callback: token => { authState.captchaToken = token; },
        'expired-callback': () => { authState.captchaToken = null; },
      });
      return;
    } catch {}
  }

  // Fallback: basit slider captcha
  _renderSliderCaptcha(el);
}

function _renderSliderCaptcha(container) {
  let solved = false;
  container.innerHTML = `
    <div class="captcha-slider-wrap">
      <div class="captcha-label">Doğrulamak için kaydır →</div>
      <div class="captcha-track">
        <div class="captcha-fill" id="captchaFill"></div>
        <div class="captcha-thumb" id="captchaThumb">›</div>
      </div>
    </div>`;

  const thumb  = container.querySelector('#captchaThumb');
  const fill   = container.querySelector('#captchaFill');
  const track  = container.querySelector('.captcha-track');
  let dragging = false, startX = 0;

  const onStart = (e) => {
    if (solved) return;
    dragging = true;
    startX   = (e.touches?.[0] || e).clientX;
  };

  const onMove = (e) => {
    if (!dragging) return;
    const cx    = (e.touches?.[0] || e).clientX;
    const maxW  = track.clientWidth - thumb.clientWidth - 4;
    const pct   = Math.min(Math.max((cx - track.getBoundingClientRect().left - thumb.clientWidth / 2), 0), maxW);
    thumb.style.left = pct + 'px';
    fill.style.width = (pct + thumb.clientWidth) + 'px';

    if (pct >= maxW - 4) {
      solved = true; dragging = false;
      thumb.style.left     = maxW + 'px';
      fill.style.width     = '100%';
      thumb.textContent    = '✓';
      thumb.style.background = '#10b981';
      fill.style.background  = '#10b981';
      authState.captchaToken = 'gcaptcha_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      container.querySelector('.captcha-label').textContent = '✓ Doğrulandı';
    }
  };

  const onEnd = () => {
    if (dragging && !solved) {
      dragging = false;
      thumb.style.left = '0';
      fill.style.width = '0';
    }
  };

  thumb.addEventListener('mousedown',  onStart);
  thumb.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('mousemove',  onMove);
  document.addEventListener('touchmove',  onMove, { passive: true });
  document.addEventListener('mouseup',    onEnd);
  document.addEventListener('touchend',   onEnd);
}

// ============ FORM GÖNDERİM ============
async function handleAuthSubmit(e) {
  e.preventDefault();
  if (authState.loading) return;

  const username = document.getElementById('authUsername')?.value?.trim();
  const password = document.getElementById('authPassword')?.value;
  const confirm  = document.getElementById('authPasswordConfirm')?.value;

  // Validasyon
  if (!username || username.length < 3) return showAuthError('Kullanıcı adı en az 3 karakter');
  if (!/^[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+$/.test(username)) return showAuthError('Geçersiz karakterler (harf, rakam, _ kullan)');
  if (!password || password.length < 6) return showAuthError('Şifre en az 6 karakter');

  if (authState.mode === 'register') {
    if (password !== confirm) return showAuthError('Şifreler eşleşmiyor');
    if (password.length > 128) return showAuthError('Şifre çok uzun');
  }

  if (!authState.captchaToken) return showAuthError('Lütfen doğrulamayı tamamlayın');

  // Yükle
  _setLoading(true);
  clearAuthError();

  try {
    let data;
    if (authState.mode === 'login') {
      data = await MongoSync.login(username, password, authState.captchaToken);
    } else {
      data = await MongoSync.register(username, password, authState.captchaToken);
    }

    if (!data) {
      return showAuthError('Bağlantı kurulamadı. Tekrar dene.');
    }

    if (data.error) {
      return showAuthError(data.error);
    }

    // Başarılı
    await _onAuthSuccess(data);

  } catch (err) {
    showAuthError('Bir hata oluştu: ' + err.message);
    _authLog('Auth hatası: ' + err.message, 'error');
  } finally {
    _setLoading(false);
  }
}

// ============ BAŞARILI GİRİŞ ============
async function _onAuthSuccess(data) {
  // Store'a kaydet
  Store.token = data.token;
  Store.user  = data.user;
  localStorage.setItem('gt_token', data.token);
  saveStore();

  _authLog(`Giriş başarılı: ${data.user.username}`);

  // Socket'e bağlan
  if (typeof initSocket === 'function') {
    initSocket(data.token);
  }

  // Auth ekranını gizle, app'i göster
  const authEl = document.getElementById('authScreen');
  const appEl  = document.getElementById('appScreen');

  if (authEl) {
    authEl.style.animation = 'authFadeOut .3s ease forwards';
    setTimeout(() => { authEl.style.display = 'none'; }, 300);
  }
  if (appEl) {
    appEl.style.display = '';
    appEl.style.animation = 'authFadeIn .3s ease forwards';
  }

  // Tam senkronizasyon
  await MongoSync.fullSync();

  // Hoş geldin toast
  if (authState.mode === 'register') {
    if (typeof toast === 'function') toast(`Hoş geldin, ${data.user.username}! 🎉`, 's');
  } else {
    if (typeof toast === 'function') toast(`Tekrar hoş geldin, ${data.user.username}!`, 's');
  }

  document.dispatchEvent(new CustomEvent('auth_success', { detail: data.user }));
}

// ============ OTURUM KONTROLÜ ============
async function checkSession() {
  const token = localStorage.getItem('gt_token');
  if (!token) {
    renderAuthScreen();
    return false;
  }

  // Token geçerliliğini kontrol et
  try {
    const payload   = JSON.parse(atob(token.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();

    if (isExpired) {
      // Refresh dene
      const res = await fetch(`${API}/api/auth/refresh`, {
        method:      'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data  = await res.json();
        Store.token = data.token;
        localStorage.setItem('gt_token', data.token);
      } else {
        // Refresh başarısız → login ekranı
        localStorage.removeItem('gt_token');
        renderAuthScreen();
        return false;
      }
    } else {
      Store.token = token;
    }

    // Kullanıcı bilgilerini yükle
    loadStore();
    return true;
  } catch {
    localStorage.removeItem('gt_token');
    renderAuthScreen();
    return false;
  }
}

// ============ ÇIKIŞ ============
async function logout() {
  if (!confirm('Çıkış yapmak istediğinizden emin misiniz?')) return;
  await handleLogout();
  renderAuthScreen();
}

// ============ ŞİFRE DEĞİŞTİR ============
async function changePassword(oldPassword, newPassword) {
  if (!oldPassword || !newPassword) throw new Error('Şifreler gerekli');
  if (newPassword.length < 6) throw new Error('Yeni şifre en az 6 karakter');

  const data = await MongoSync.changePassword(oldPassword, newPassword);
  if (!data) throw new Error('Bağlantı hatası');
  if (data.error) throw new Error(data.error);

  // Tüm oturumlar sonlandı — yeniden giriş
  Store.token = null;
  localStorage.removeItem('gt_token');
  if (typeof toast === 'function') toast('Şifre değiştirildi. Lütfen tekrar giriş yapın.', 'i');
  setTimeout(() => { handleLogout(); renderAuthScreen(); }, 1500);
  return data;
}

// ============ HESAP SİL ============
async function deleteAccount(password) {
  if (!password) throw new Error('Şifre gerekli');
  const data = await MongoSync.deleteAccount(password);
  if (!data) throw new Error('Bağlantı hatası');
  if (data.error) throw new Error(data.error);
  await handleLogout();
  renderAuthScreen();
  if (typeof toast === 'function') toast('Hesap silindi', 'i');
  return data;
}

// ============ PROFİL GÜNCELLE ============
async function updateProfile(updates) {
  const data = await MongoSync.updateMe(updates);
  if (!data) return toast?.('Güncelleme başarısız', 'e');
  if (data.error) return toast?.(data.error, 'e');
  Store.user = { ...Store.user, ...data };
  saveStore();
  if (typeof toast === 'function') toast('Profil güncellendi', 's');
  return data;
}

// ============ YARDIMCI ============
function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) {
    el.textContent    = msg;
    el.style.display  = 'flex';
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'authShake .4s ease';
  }
  _authLog('Auth hatası: ' + msg, 'warn');
}

function clearAuthError() {
  const el = document.getElementById('authError');
  if (el) el.style.display = 'none';
}

function _setLoading(loading) {
  authState.loading = loading;
  const btn     = document.getElementById('authSubmitBtn');
  const label   = document.getElementById('authSubmitLabel');
  const spinner = document.getElementById('authSpinner');
  if (!btn) return;
  btn.disabled = loading;
  if (label)   label.style.display  = loading ? 'none' : '';
  if (spinner) spinner.style.display = loading ? 'block' : 'none';
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.style.opacity = isText ? '0.5' : '1';
}

// ============ CSS ============
(function injectAuthStyles() {
  const id = 'gt-auth-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
/* ─── Auth arka plan ─── */
.auth-bg{
  position:fixed;inset:0;z-index:1000;
  display:flex;align-items:center;justify-content:center;
  background:var(--bg,#0f0a14);
  padding:16px;
}
.auth-bg::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse at 30% 20%, var(--ac,#6366f1)18 0%, transparent 60%),
             radial-gradient(ellipse at 70% 80%, #ec489912 0%, transparent 60%);
  pointer-events:none;
}

/* ─── Kart ─── */
.auth-card{
  position:relative;width:100%;max-width:400px;
  background:var(--bg1,#1a0f24);
  border:1px solid rgba(255,255,255,.08);
  border-radius:20px;padding:32px 28px;
  box-shadow:0 24px 64px rgba(0,0,0,.6);
  animation:authFadeIn .4s ease;
}
@keyframes authFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes authFadeOut{from{opacity:1}to{opacity:0;transform:scale(.97)}}
@keyframes authShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}

/* ─── Logo ─── */
.auth-logo{
  display:flex;align-items:center;justify-content:center;gap:10px;
  margin-bottom:24px;
}
.auth-logo-icon{
  width:40px;height:40px;border-radius:12px;
  background:var(--ac,#6366f1);color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:900;
}
.auth-logo-text{font-size:22px;font-weight:800;color:var(--t1,#fff)}

/* ─── Tabs ─── */
.auth-tabs{
  display:flex;gap:4px;margin-bottom:20px;
  background:var(--bg2,#241535);border-radius:12px;padding:4px;
}
.auth-tab{
  flex:1;padding:8px;border-radius:9px;border:none;cursor:pointer;
  font-size:13px;font-weight:600;color:var(--t3,#888);
  background:none;transition:all .15s;font-family:inherit;
}
.auth-tab.act{background:var(--bg1,#1a0f24);color:var(--t1,#fff);box-shadow:0 2px 8px rgba(0,0,0,.3)}

/* ─── Hata ─── */
.auth-error{
  display:flex;align-items:center;gap:8px;
  padding:10px 12px;border-radius:10px;
  background:#ef444420;border:1px solid #ef444430;
  color:#ef4444;font-size:12px;margin-bottom:14px;
}

/* ─── Alanlar ─── */
.auth-field{margin-bottom:14px}
.auth-label{display:block;font-size:11px;font-weight:600;color:var(--t3,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.auth-input-wrap{position:relative;display:flex;align-items:center}
.auth-input-wrap svg{position:absolute;left:11px;opacity:.4;pointer-events:none;flex-shrink:0}
.auth-input{
  width:100%;box-sizing:border-box;
  padding:10px 36px 10px 34px;
  background:var(--bg2,#241535);
  border:1.5px solid rgba(255,255,255,.08);
  border-radius:10px;font-size:14px;color:var(--t1,#fff);
  outline:none;transition:border .2s;font-family:inherit;
}
.auth-input:focus{border-color:var(--ac,#6366f1)}
.auth-input::placeholder{color:var(--t3,#888)}
.auth-eye{
  position:absolute;right:10px;background:none;border:none;
  cursor:pointer;opacity:.4;line-height:1;padding:4px;
  color:var(--t1,#fff);
}
.auth-eye:hover{opacity:.8}

/* ─── Captcha ─── */
.auth-captcha{margin:14px 0}
.captcha-slider-wrap{
  background:var(--bg2,#241535);border:1.5px solid rgba(255,255,255,.08);
  border-radius:10px;padding:12px;
}
.captcha-label{font-size:11px;color:var(--t3,#888);margin-bottom:8px;text-align:center}
.captcha-track{
  position:relative;height:32px;border-radius:8px;
  background:rgba(255,255,255,.05);overflow:hidden;
}
.captcha-fill{
  position:absolute;top:0;left:0;height:100%;width:0;
  background:var(--ac,#6366f1)33;transition:background .3s;border-radius:8px;
}
.captcha-thumb{
  position:absolute;top:2px;left:0;width:28px;height:28px;
  border-radius:6px;background:var(--ac,#6366f1);color:#fff;
  display:flex;align-items:center;justify-content:center;
  cursor:grab;font-size:18px;font-weight:700;
  user-select:none;transition:background .3s;z-index:2;
}
.captcha-thumb:active{cursor:grabbing}

/* ─── Submit butonu ─── */
.auth-submit{
  width:100%;padding:12px;border-radius:12px;
  background:var(--ac,#6366f1);color:#fff;
  border:none;cursor:pointer;font-size:14px;font-weight:700;
  font-family:inherit;transition:filter .15s,transform .1s;
  display:flex;align-items:center;justify-content:center;gap:8px;
  margin-top:6px;
}
.auth-submit:hover:not(:disabled){filter:brightness(1.12)}
.auth-submit:active:not(:disabled){transform:scale(.98)}
.auth-submit:disabled{opacity:.6;cursor:not-allowed}
.auth-submit-spinner{
  width:18px;height:18px;border-radius:50%;
  border:2.5px solid rgba(255,255,255,.2);
  border-top-color:#fff;
  animation:authSpin .7s linear infinite;
}
@keyframes authSpin{to{transform:rotate(360deg)}}

/* ─── Footer ─── */
.auth-footer{text-align:center;font-size:12px;color:var(--t3,#888);margin-top:16px}
.auth-link{background:none;border:none;color:var(--ac,#6366f1);cursor:pointer;font-size:12px;font-family:inherit;font-weight:600}
.auth-link:hover{text-decoration:underline}
.auth-version{text-align:center;font-size:10px;color:var(--t3,#888);margin-top:10px;opacity:.5}

/* ─── Mobil ─── */
@media (max-width:480px) {
  .auth-card{padding:24px 18px;border-radius:16px}
  .auth-logo-text{font-size:18px}
}
  `;
  document.head.appendChild(style);
})();

_authLog('v2.0 yüklendi ✓');
