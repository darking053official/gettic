// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC WEBHOOKS.JS v2.0 - Webhook Sistemi                      ║
// ╚══════════════════════════════════════════════════════════════════╝

function _whLog(msg, level = 'log') {
  console[level](`%c[Webhooks] ${msg}`, 'color:#f97316;font-weight:bold');
}

// ============ STATE ============
const webhookState = {
  webhooks: [],
  logs:     [],
};

function _saveWebhooks() {
  try { localStorage.setItem('gt_webhooks', JSON.stringify(webhookState.webhooks)); } catch {}
}

function _loadWebhooks() {
  try {
    const raw = localStorage.getItem('gt_webhooks');
    if (raw) webhookState.webhooks = JSON.parse(raw);
  } catch {}
}

// ============ WEBHOOK OLUŞTUR ============
function createWebhook(name, channelId, description = '') {
  name = name?.trim();
  if (!name || name.length < 1)   return toast('Webhook adı gerekli', 'e');
  if (name.length > 32)            return toast('İsim çok uzun', 'e');
  if (!channelId)                  return toast('Kanal seçin', 'e');
  if (webhookState.webhooks.length >= 20) return toast('Maksimum 20 webhook', 'w');

  const webhook = {
    id:          'wh_' + genId(),
    name,
    token:       'whk_' + genId() + '_' + Date.now().toString(36),
    channelId,
    description: description.slice(0, 128),
    createdBy:   Store.user?._id,
    creatorName: Store.user?.username,
    active:      true,
    callCount:   0,
    lastCall:    null,
    createdAt:   new Date().toISOString(),
  };

  webhookState.webhooks.push(webhook);
  _saveWebhooks();

  if (typeof SyncEngine !== 'undefined') {
    SyncEngine.add('/api/webhooks', 'POST', { ...webhook, token: webhook.token });
  }

  toast(`"${name}" webhook oluşturuldu`, 's');
  _whLog('Webhook oluşturuldu: ' + name);
  return webhook;
}

// ============ WEBHOOK SİL ============
function deleteWebhook(whId) {
  const wh = webhookState.webhooks.find(w => w.id === whId);
  if (!wh) return toast('Webhook bulunamadı', 'e');
  if (wh.createdBy !== Store.user?._id) return toast('Yetki yok', 'e');
  if (!confirm(`"${wh.name}" webhook silinsin mi?`)) return;

  webhookState.webhooks = webhookState.webhooks.filter(w => w.id !== whId);
  _saveWebhooks();

  if (typeof SyncEngine !== 'undefined') {
    SyncEngine.add(`/api/webhooks/${whId}`, 'DELETE', { id: whId });
  }

  toast('Webhook silindi');
  if (typeof Modal !== 'undefined' && Modal.current === 'webhooks') openModal('webhooks');
}

// ============ WEBHOOK TOGGLE ============
function toggleWebhook(whId) {
  const wh = webhookState.webhooks.find(w => w.id === whId);
  if (!wh) return;
  wh.active = !wh.active;
  _saveWebhooks();
  toast(wh.active ? 'Webhook aktif edildi' : 'Webhook durduruldu');
  if (typeof Modal !== 'undefined' && Modal.current === 'webhooks') openModal('webhooks');
}

// ============ WEBHOOK TOKEN YENİLE ============
function regenerateWebhookToken(whId) {
  const wh = webhookState.webhooks.find(w => w.id === whId);
  if (!wh) return;
  if (!confirm('Token yenilenecek. Mevcut entegrasyonlar çalışmayı durdurur. Devam?')) return;
  wh.token = 'whk_' + genId() + '_' + Date.now().toString(36);
  _saveWebhooks();
  toast('Token yenilendi');
  if (typeof Modal !== 'undefined' && Modal.current === 'webhookDetail') openModal('webhookDetail', { whId });
}

// ============ WEBHOOK URL KOPYALA ============
function copyWebhookUrl(token) {
  const url = `${API}/api/webhooks/trigger/${token}`;
  navigator.clipboard.writeText(url)
    .then(() => toast('Webhook URL kopyalandı'))
    .catch(() => toast('Kopyalanamadı', 'e'));
}

// ============ WEBHOOK TETİKLE (Test) ============
async function testWebhook(whId) {
  const wh = webhookState.webhooks.find(w => w.id === whId);
  if (!wh) return;

  const payload = {
    username: wh.name,
    content:  '🔔 Bu bir test mesajıdır!',
    embeds:   [{
      title:       'Webhook Test',
      description: `${wh.name} webhook başarıyla çalışıyor.`,
      color:       0x6366f1,
      timestamp:   new Date().toISOString(),
    }],
  };

  try {
    const res = await fetch(`${API}/api/webhooks/trigger/${wh.token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (res.ok) {
      toast('✅ Test başarılı!', 's');
      wh.callCount++;
      wh.lastCall = new Date().toISOString();
      _saveWebhooks();
    } else {
      toast('Test başarısız: HTTP ' + res.status, 'e');
    }
  } catch (e) {
    toast('Bağlantı hatası: ' + e.message, 'e');
  }
}

// ============ MODAL TEMPLATES ============
if (typeof MODAL_TEMPLATES !== 'undefined') {

  MODAL_TEMPLATES.webhooks = () => {
    const whs = webhookState.webhooks;
    return `
      <div class="gm-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
        <h2>Webhooklar</h2>
        <span class="gm-badge">${whs.length}/20</span>
        <button class="gm-header-btn" onclick="openModal('createWebhook')" title="Yeni Webhook">+</button>
      </div>
      <div class="gm-body">
        ${whs.length === 0
          ? `<div class="gm-empty">
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
               <span>Henüz webhook yok</span>
               <small>Dış uygulamaları Gettic'e bağla</small>
             </div>`
          : `<div class="gm-list">
              ${whs.map(wh => `
                <div class="gm-list-item" onclick="openModal('webhookDetail',{whId:'${wh.id}'})">
                  <div class="wh-icon ${wh.active ? '' : 'off'}">🔗</div>
                  <div class="gm-item-info">
                    <span class="gm-item-name">${escapeHtml(wh.name)}</span>
                    <span class="gm-item-sub">#${escapeHtml((Store.channels||[]).find(c=>c.id===wh.channelId)?.name||wh.channelId)} · ${wh.callCount} çağrı</span>
                  </div>
                  <span class="gm-badge ${wh.active ? '' : 'red'}">${wh.active ? 'Aktif' : 'Pasif'}</span>
                </div>`).join('')}
             </div>`}
        <button class="gm-btn primary full" style="margin-top:10px" onclick="openModal('createWebhook')">
          + Yeni Webhook
        </button>
      </div>`;
  };

  MODAL_TEMPLATES.createWebhook = () => `
    <div class="gm-header">
      <h2>Webhook Oluştur</h2>
    </div>
    <div class="gm-body">
      <div class="gm-field">
        <label class="gm-label">İsim</label>
        <input class="gm-input" id="whName" placeholder="Örn: GitHub Bot" maxlength="32">
      </div>
      <div class="gm-field">
        <label class="gm-label">Kanal</label>
        <select class="gm-select" id="whChannel">
          ${(Store.channels||[]).filter(c=>c.type==='text').map(c=>`<option value="${c.id}">#${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="gm-field">
        <label class="gm-label">Açıklama <span class="gm-label-hint">(isteğe bağlı)</span></label>
        <input class="gm-input" id="whDesc" placeholder="Bu webhook ne yapıyor?" maxlength="128">
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="openModal('webhooks')">İptal</button>
        <button class="gm-btn primary" onclick="_submitCreateWebhook()">Oluştur</button>
      </div>
    </div>`;

  MODAL_TEMPLATES.webhookDetail = (data) => {
    const wh = webhookState.webhooks.find(w => w.id === data?.whId);
    if (!wh) return `<div class="gm-body"><div class="gm-empty">Webhook bulunamadı</div></div>`;
    const url = `${API}/api/webhooks/trigger/${wh.token}`;
    const chName = (Store.channels||[]).find(c=>c.id===wh.channelId)?.name || wh.channelId;
    return `
      <div class="gm-header">
        <button class="gm-header-btn" onclick="openModal('webhooks')">←</button>
        <h2>${escapeHtml(wh.name)}</h2>
        <div class="gm-toggle sm ${wh.active?'on':''}" onclick="toggleWebhook('${wh.id}')" style="cursor:pointer"><div class="gm-toggle-knob"></div></div>
      </div>
      <div class="gm-body">
        <div class="gm-info-rows">
          <div class="gm-info-row"><span>Kanal</span><code>#${escapeHtml(chName)}</code></div>
          <div class="gm-info-row"><span>Oluşturan</span><span>${escapeHtml(wh.creatorName)}</span></div>
          <div class="gm-info-row"><span>Toplam Çağrı</span><code>${wh.callCount}</code></div>
          <div class="gm-info-row"><span>Son Çağrı</span><span>${wh.lastCall ? new Date(wh.lastCall).toLocaleString('tr-TR') : 'Hiç'}</span></div>
        </div>
        <div class="gm-divider"></div>
        <div class="gm-section-label">Webhook URL</div>
        <div class="wh-url-box">
          <code class="wh-url" id="whUrlCode">${wh.token.slice(0,20)}•••</code>
          <div class="wh-url-btns">
            <button class="gm-btn ghost sm" onclick="copyWebhookUrl('${wh.token}')">Kopyala</button>
            <button class="gm-btn ghost sm" onclick="regenerateWebhookToken('${wh.id}')">Yenile</button>
          </div>
        </div>
        <div class="gm-divider"></div>
        <div class="gm-section-label">Payload Örneği</div>
        <pre class="wh-code"><code>POST ${url.replace(wh.token, '&lt;TOKEN&gt;')}
Content-Type: application/json

{
  "username": "Bot Adı",
  "content": "Mesaj metni",
  "embeds": [{
    "title": "Başlık",
    "description": "İçerik",
    "color": 6579441
  }]
}</code></pre>
        <div class="gm-actions">
          <button class="gm-btn danger" onclick="deleteWebhook('${wh.id}')">Sil</button>
          <button class="gm-btn ghost" onclick="testWebhook('${wh.id}')">Test Et</button>
        </div>
      </div>`;
  };
}

// ============ FORM ============
function _submitCreateWebhook() {
  const name    = document.getElementById('whName')?.value?.trim();
  const channel = document.getElementById('whChannel')?.value;
  const desc    = document.getElementById('whDesc')?.value?.trim() || '';
  if (!name) return toast('İsim gerekli', 'e');
  const wh = createWebhook(name, channel, desc);
  if (wh) openModal('webhooks');
}

// ============ SERVER-SIDE ENDPOINT (Server.js'e eklenecek kod) ============
// app.post('/api/webhooks/trigger/:token', async (req, res) => {
//   const wh = await Webhook.findOne({ token: req.params.token, active: true });
//   if (!wh) return res.status(404).json({ error: 'Webhook bulunamadı' });
//   const { username, content, embeds } = req.body;
//   const msg = new Message({
//     channelId: wh.channelId, content: content?.slice(0,2000) || '',
//     senderName: username?.slice(0,32) || wh.name, senderId: 'webhook_' + wh._id,
//     isBot: true, createdAt: new Date()
//   });
//   await msg.save();
//   wh.callCount++; wh.lastCall = new Date(); await wh.save();
//   io.to(wh.channelId).emit('new_message', msg);
//   res.json({ success: true });
// });

// ============ CSS ============
(function injectWhStyles() {
  const id = 'gt-wh-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.wh-icon{font-size:20px;flex-shrink:0;opacity:1}
.wh-icon.off{opacity:.4;filter:grayscale(1)}
.wh-url-box{
  background:var(--bg2,#241535);border:1.5px solid rgba(255,255,255,.08);
  border-radius:10px;padding:10px 12px;
}
.wh-url{display:block;font-size:11px;word-break:break-all;color:var(--ac,#6366f1);font-family:monospace;margin-bottom:8px}
.wh-url-btns{display:flex;gap:6px}
.wh-code{
  background:var(--bg2,#241535);border-radius:10px;padding:12px;
  font-size:11px;overflow-x:auto;color:var(--t2,#ccc);
  border:1.5px solid rgba(255,255,255,.06);line-height:1.6;
}
.wh-code code{font-family:monospace;white-space:pre}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initWebhooks() {
  _loadWebhooks();
  _whLog('v2.0 yüklendi ✓');
})();
