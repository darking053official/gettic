<script lang="ts">
  import { goto } from '$app/navigation';
  import { register } from '$lib/api/auth';
  import { authStore } from '$lib/stores/auth';

  let username = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let isLoading = false;
  let errorMessage = '';
  let showPassword = false;
  let showConfirmPassword = false;

  $: if ($authStore.isAuthenticated) {
    goto('/chat');
  }

  function validateForm(): boolean {
    if (!username || !email || !password || !confirmPassword) {
      errorMessage = 'Lütfen tüm alanları doldurun';
      return false;
    }

    if (username.length < 3) {
      errorMessage = 'Kullanıcı adı en az 3 karakter olmalı';
      return false;
    }

    if (!email.includes('@')) {
      errorMessage = 'Geçerli bir email adresi girin';
      return false;
    }

    if (password.length < 8) {
      errorMessage = 'Şifre en az 8 karakter olmalı';
      return false;
    }

    if (password !== confirmPassword) {
      errorMessage = 'Şifreler eşleşmiyor';
      return false;
    }

    return true;
  }

  async function handleRegister() {
    if (!validateForm()) {
      return;
    }

    isLoading = true;
    errorMessage = '';

    try {
      await register({ username, email, password });
      goto('/chat');
    } catch (error: any) {
      if (error.status === 409) {
        errorMessage = 'Bu email veya kullanıcı adı zaten kullanılıyor';
      } else if (error.status === 0) {
        errorMessage = 'Sunucuya bağlanılamadı';
      } else {
        errorMessage = error.message || 'Kayıt başarısız';
      }
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="auth-container">
  <div class="auth-box">
    <div class="auth-header">
      <h1>Gettic</h1>
      <p>Yeni hesap oluşturun</p>
    </div>

    {#if errorMessage}
      <div class="error-message">
        {errorMessage}
      </div>
    {/if}

    <form on:submit|preventDefault={handleRegister}>
      <div class="form-group">
        <label for="username">Kullanıcı Adı</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          placeholder="kullanici_adi"
          required
          disabled={isLoading}
        />
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="ornek@email.com"
          required
          disabled={isLoading}
        />
      </div>

      <div class="form-group">
        <label for="password">Şifre</label>
        <div class="password-input">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="En az 8 karakter"
            required
            disabled={isLoading}
          />
          <button
            type="button"
            class="toggle-password"
            on:click={() => showPassword = !showPassword}
            disabled={isLoading}
          >
            {showPassword ? 'Gizle' : 'Göster'}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label for="confirmPassword">Şifre Tekrar</label>
        <div class="password-input">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            bind:value={confirmPassword}
            placeholder="Şifrenizi tekrar girin"
            required
            disabled={isLoading}
          />
          <button
            type="button"
            class="toggle-password"
            on:click={() => showConfirmPassword = !showConfirmPassword}
            disabled={isLoading}
          >
            {showConfirmPassword ? 'Gizle' : 'Göster'}
          </button>
        </div>
      </div>

      <button type="submit" class="submit-btn" disabled={isLoading}>
        {isLoading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
      </button>
    </form>

    <div class="auth-footer">
      <p>Zaten hesabınız var mı? <a href="/login">Giriş yapın</a></p>
    </div>
  </div>
</div>

<style>
  .auth-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%);
    padding: 1rem;
  }

  .auth-box {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 2.5rem;
    width: 100%;
    max-width: 400px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .auth-header h1 {
    font-size: 2.5rem;
    background: linear-gradient(135deg, #0084ff, #00b4d8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .auth-header p {
    color: #a0a0a0;
    font-size: 1rem;
  }

  .error-message {
    background: rgba(255, 0, 0, 0.1);
    border: 1px solid rgba(255, 0, 0, 0.3);
    color: #ff6b6b;
    padding: 0.8rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    text-align: center;
    font-size: 0.9rem;
  }

  .form-group {
    margin-bottom: 1.2rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #e0e0e0;
    font-size: 0.9rem;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 0.8rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  input:focus {
    outline: none;
    border-color: #0084ff;
    background: rgba(255, 255, 255, 0.15);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .password-input {
    position: relative;
  }

  .toggle-password {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #0084ff;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
  }

  .toggle-password:hover {
    text-decoration: underline;
  }

  .submit-btn {
    width: 100%;
    padding: 0.8rem;
    background: #0084ff;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 1rem;
  }

  .submit-btn:hover:not(:disabled) {
    background: #0066cc;
    transform: translateY(-2px);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .auth-footer {
    text-align: center;
    margin-top: 1.5rem;
    color: #a0a0a0;
    font-size: 0.9rem;
  }

  .auth-footer a {
    color: #0084ff;
    text-decoration: none;
    font-weight: 500;
  }

  .auth-footer a:hover {
    text-decoration: underline;
  }
</style>
