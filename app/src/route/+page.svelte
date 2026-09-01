<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth';

  $: if ($authStore.isAuthenticated) {
    goto('/chat');
  }
</script>

<div class="landing">
  <div class="logo">
    <h1>Gettic</h1>
    <p>Ücretsiz ve Güvenli Mesajlaşma</p>
  </div>
  
  <div class="buttons">
    <a href="/login" class="btn btn-primary">Giriş Yap</a>
    <a href="/register" class="btn btn-secondary">Kayıt Ol</a>
  </div>
  
  <div class="features">
    <div class="feature">
      <h3>Uçtan Uca Şifreli</h3>
      <p>Mesajlarınız sadece sizin ve alıcının görebileceği şekilde şifrelenir</p>
    </div>
    <div class="feature">
      <h3>Hızlı ve Güvenli</h3>
      <p>Matrix protokolü ile merkeziyetsiz ve güvenli iletişim</p>
    </div>
    <div class="feature">
      <h3>Tamamen Ücretsiz</h3>
      <p>Hiçbir ücret veya abonelik gerektirmez</p>
    </div>
  </div>
</div>

<style>
  .landing {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%);
    color: white;
    gap: 2rem;
  }

  .logo {
    text-align: center;
  }

  .logo h1 {
    font-size: 4rem;
    font-weight: bold;
    background: linear-gradient(135deg, #0084ff, #00b4d8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .logo p {
    font-size: 1.2rem;
    color: #a0a0a0;
  }

  .buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .btn {
    padding: 0.8rem 2rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .btn-primary {
    background: #0084ff;
    color: white;
  }

  .btn-primary:hover {
    background: #0066cc;
    transform: translateY(-2px);
  }

  .btn-secondary {
    background: transparent;
    color: #0084ff;
    border: 2px solid #0084ff;
  }

  .btn-secondary:hover {
    background: rgba(0, 132, 255, 0.1);
    transform: translateY(-2px);
  }

  .features {
    display: flex;
    gap: 3rem;
    margin-top: 2rem;
    max-width: 800px;
  }

  .feature {
    text-align: center;
    color: #a0a0a0;
    flex: 1;
  }

  .feature h3 {
    color: #0084ff;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }

  .feature p {
    font-size: 0.9rem;
    line-height: 1.4;
  }
</style>
