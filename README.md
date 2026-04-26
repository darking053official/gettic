<p align="center">
  <img src="https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png" alt="Gettic Logo" width="150">
</p>

<h1 align="center">Gettic</h1>

<p align="center">Modern Sohbet Platformu</p>

<p align="center">
  <a href="https://gettic.js.org"><img src="https://img.shields.io/badge/Web-gettic.js.org-blue"></a>
  <a href="https://github.com/darking053official/gettic"><img src="https://img.shields.io/badge/GitHub-A%C3%A7%C4%B1k_Kaynak-green"></a>
  <a href="https://www.npmjs.com/package/gettic.js"><img src="https://img.shields.io/npm/v/gettic.js?color=red"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/Lisans-MIT-yellow"></a>
</p>

<hr>

<h2>🚀 Özellikler</h2>

<table>
  <tr>
    <td width="33%">
      <h3>💬 İletişim</h3>
      <ul>
        <li>Gerçek zamanlı mesajlaşma (Socket.io)</li>
        <li>Sesli kanallar (WebRTC)</li>
        <li>Kamera ve ekran paylaşımı</li>
        <li>Direkt Mesaj (DM)</li>
        <li>Grup sohbetleri</li>
        <li>Stage kanalları</li>
        <li>Forum kanalları</li>
        <li>Sesli mesajlar</li>
        <li>Threads (Konu başlıkları)</li>
        <li>Soundboard (Ses paneli)</li>
        <li>Mesaj düzenleme/silme</li>
        <li>Mesaj yanıtlama/alıntılama</li>
        <li>Mesaj sabitleme (Pin)</li>
        <li>Tepkiler (Reactions)</li>
      </ul>
    </td>
    <td width="33%">
      <h3>🛡️ Güvenlik</h3>
      <ul>
        <li>Rol sistemi</li>
        <li>Kullanıcı engelleme/susturma</li>
        <li>Denetim kaydı (Audit Log)</li>
        <li>AutoMod (Otomatik moderasyon)</li>
        <li>JWT kimlik doğrulama</li>
        <li>Bcrypt şifre hashleme</li>
        <li>Rate limiting</li>
        <li>CORS koruması</li>
        <li>XSS koruması</li>
      </ul>
      <h3>🤖 Entegrasyon</h3>
      <ul>
        <li>Bot sistemi</li>
        <li>Webhook desteği</li>
        <li>Push-to-Talk</li>
        <li>npm kütüphanesi</li>
        <li>REST API</li>
        <li>HTTP Panel</li>
      </ul>
    </td>
    <td width="33%">
      <h3>🎨 Kişiselleştirme</h3>
      <ul>
        <li>5 tema (Koyu/Açık/Mavi/Gece/Yeşil)</li>
        <li>Özel emojiler</li>
        <li>GIF profil resimleri</li>
        <li>Profil banner</li>
        <li>Yazı fontu değiştirme</li>
        <li>Dil seçeneği (TR/EN)</li>
        <li>Mobil uyumlu</li>
        <li>Bildirim sesi</li>
      </ul>
      <h3>🏠 Sunucu</h3>
      <ul>
        <li>Sunucu oluşturma</li>
        <li>Kanal kategorileri</li>
        <li>Özel kanal (şifreli)</li>
        <li>Davet linki</li>
        <li>Sunucu şablonları</li>
      </ul>
    </td>
  </tr>
</table>

<hr>

<h2>📦 Hızlı Başlangıç</h2>

<h3>Web Sitesi</h3>
<pre><code>https://gettic.js.org</code></pre>

<h3>Bot Oluşturma</h3>
<pre><code>npm install gettic.js</code></pre>

<pre><code>const { Client } = require('gettic.js');

const bot = new Client({
    url: 'https://gettic.js.org',
    token: 'BOT_TOKEN',
    username: 'BenimBot',
    prefix: '/'
});

bot.on('ready', () => {
    console.log('✅ Bot hazır!');
    bot.send('genel', 'Merhaba Gettic!');
});

bot.command('ping', ctx => ctx.reply(`🏓 Pong! ${bot.ping}ms`));
bot.command('yardim', ctx => ctx.reply('📋 /ping, /yardim, /sunucu'));

bot.connect();</code></pre>

<h3>Webhook</h3>
<pre><code>const { WebhookClient } = require('gettic.js');
const webhook = new WebhookClient('WEBHOOK_URL');
await webhook.send('Merhaba!');</code></pre>

<h3>REST API</h3>
<pre><code>const { RESTClient } = require('gettic.js');
const api = new RESTClient({ token: 'TOKEN' });
const rooms = await api.getRooms();</code></pre>

<hr>

<h2>🛠️ Kendi Sunucunda</h2>
<pre><code>git clone https://github.com/darking053official/gettic.git
cd gettic
npm install
node server.js</code></pre>

<hr>

<h2>📚 API Referansı</h2>
<table>
  <tr><th>Method</th><th>Endpoint</th><th>Açıklama</th></tr>
  <tr><td>POST</td><td>/api/register</td><td>Kayıt ol</td></tr>
  <tr><td>POST</td><td>/api/login</td><td>Giriş yap</td></tr>
  <tr><td>GET</td><td>/api/servers</td><td>Sunucu listesi</td></tr>
  <tr><td>POST</td><td>/api/servers</td><td>Sunucu oluştur</td></tr>
  <tr><td>GET</td><td>/api/channels/:id/messages</td><td>Mesajları getir</td></tr>
  <tr><td>POST</td><td>/api/channels/:id/messages</td><td>Mesaj gönder</td></tr>
  <tr><td>GET</td><td>/api/bots</td><td>Bot listesi</td></tr>
  <tr><td>POST</td><td>/api/bots</td><td>Bot oluştur</td></tr>
  <tr><td>GET</td><td>/api/webhooks</td><td>Webhook listesi</td></tr>
  <tr><td>POST</td><td>/api/webhooks</td><td>Webhook oluştur</td></tr>
  <tr><td>POST</td><td>/api/webhook/:token</td><td>Webhook gönder</td></tr>
</table>

<hr>

<h2>🔗 Bağlantılar</h2>
<ul>
  <li><b>Web:</b> <a href="https://gettic.js.org">gettic.js.org</a></li>
  <li><b>GitHub:</b> <a href="https://github.com/darking053official/gettic">github.com/darking053official/gettic</a></li>
  <li><b>npm:</b> <a href="https://www.npmjs.com/package/gettic.js">npmjs.com/package/gettic.js</a></li>
</ul>

<hr>

<h2>📄 Lisans</h2>
<p>MIT © 2026 Gettic</p>

<hr>

<p align="center">
  <sub>Made with ❤️ by darking053</sub>
</p>
