// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC UI.JS - SVG İKONLU + TÜM BUTONLAR                      ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function uiIcon(name, size = 18) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">${Icons[name]}</svg>` : '';
}

// ============ TOAST ============
let toastTimer = null, toastQueue = [];
function toast(msg, type = 's') {
  toastQueue.push({ msg, type });
  if (toastQueue.length === 1) showNextToast();
}

function showNextToast() {
  if (toastQueue.length === 0) return;
  const { msg, type } = toastQueue[0];
  const el = document.getElementById('toast');
  if (!el) { toastQueue.shift(); return; }
  
  const icons = {
    s: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    e: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    w: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    i: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
  
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons['i']}</span><span class="toast-msg">${msg}</span>`;
  el.className = `toast toast-${type}`;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'toastIn 0.3s ease';
  
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => { el.classList.add('hidden'); toastQueue.shift(); showNextToast(); }, 300);
  }, 2500);
}

// ============ MODAL ============
const MODAL_TEMPLATES = {
  addChannel: () => `
    <h2>${uiIcon('hash',20)} Kanal Oluştur</h2>
    <label class="ml">Kanal Adı</label>
    <input class="mi" id="modalChName" placeholder="örnek: genel-sohbet" maxlength="50">
    <label class="ml">Kanal Türü</label>
    <select class="ms" id="modalChType">
      <option value="text">${uiIcon('hash',14)} Metin</option>
      <option value="voice">${uiIcon('mic',14)} Ses</option>
      <option value="forum">${uiIcon('message-square',14)} Forum</option>
      <option value="stage">${uiIcon('radio',14)} Stage</option>
    </select>
    <label class="ml">Kategori</label>
    <select class="ms" id="modalChCat">${(Store.categories||['METİN','SES']).map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
    <button class="mb" onclick="submitChannelForm()">${uiIcon('plus',16)} Oluştur</button>`,

  addCategory: () => `
    <h2>${uiIcon('folder',20)} Kategori Ekle</h2>
    <input class="mi" id="modalCatName" placeholder="Kategori adı">
    <button class="mb" onclick="createCategory(document.getElementById('modalCatName').value)">${uiIcon('plus',16)} Ekle</button>`,

  addFriend: () => `
    <h2>${uiIcon('user-plus',20)} Arkadaş Ekle</h2>
    <input class="mi" id="modalFrName" placeholder="Kullanıcı adı">
    <button class="mb" onclick="addFriend(document.getElementById('modalFrName').value)">${uiIcon('user-plus',16)} Ekle</button>`,

  addServer: () => `
    <h2>${uiIcon('server',20)} Sunucu Oluştur</h2>
    <input class="mi" id="modalSvName" placeholder="Sunucu adı">
    <button class="mb" onclick="createServer(document.getElementById('modalSvName').value)">${uiIcon('plus',16)} Oluştur</button>`,

  theme: () => `
    <h2>${uiIcon('palette',20)} Tema</h2>
    <h4 style="font-size:11px;color:var(--t3);margin-bottom:8px">Hazır Renkler</h4>
    <div class="color-row">${['#ec4899','#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#f97316'].map(c=>`<div class="color-swatch ${Store.theme===c?'act':''}" style="background:${c}" onclick="setTheme('${c}')">${Store.theme===c?'✓':''}</div>`).join('')}</div>
    <h4 style="font-size:11px;color:var(--t3);margin:12px 0 8px">Görünüm</h4>
    <div class="settings-row" onclick="toggleLightMode()"><div><div class="settings-row-label">${uiIcon('sun',16)} Aydınlık Mod</div></div><div class="toggle ${Store.lightMode?'on':''}"></div></div>
    <div class="settings-row" onclick="toggleCompactMode()"><div><div class="settings-row-label">${uiIcon('minimize',16)} Kompakt Mod</div></div><div class="toggle ${Store.compactMode?'on':''}"></div></div>`,

  poll: () => `
    <h2>${uiIcon('bar-chart',20)} Anket</h2>
    <input class="mi" id="modalPollQ" placeholder="Soru">
    <div id="pollOptionsContainer">
      <div class="poll-option-row"><input class="mi" placeholder="Seçenek 1"><button class="poll-remove-opt" style="display:none">${uiIcon('x',16)}</button></div>
      <div class="poll-option-row"><input class="mi" placeholder="Seçenek 2"><button class="poll-remove-opt" style="display:none">${uiIcon('x',16)}</button></div>
    </div>
    <button class="mb sec" onclick="addPollOptionUI()">+ Seçenek</button>
    <button class="mb" onclick="submitPollForm()">${uiIcon('bar-chart',16)} Başlat</button>`,

  imageGen: () => `
    <h2>${uiIcon('image',20)} Görsel Oluştur</h2>
    <input class="mi" id="modalImgPrompt" placeholder="Açıklama..." onkeydown="if(event.key==='Enter')generateImageUI()">
    <button class="mb" onclick="generateImageUI()">${uiIcon('wand',16)} Oluştur</button>
    <div id="imgLoading" style="display:none;text-align:center;padding:20px"><div class="spin" style="margin:0 auto"></div></div>
    <img id="modalImgResult" style="display:none;width:100%;border-radius:12px;margin-top:12px;cursor:pointer" onclick="viewFullImage(this.src)">
    <div id="imgActions" style="display:none;margin-top:8px;gap:8px">
      <button class="mb sec" onclick="sendImageToChat()">${uiIcon('send',14)} Sohbete Gönder</button>
      <button class="mb sec" onclick="downloadImage()">${uiIcon('download',14)} İndir</button>
    </div>`,

  dm: () => {
    const friends = typeof dmState !== 'undefined' ? dmState.friends : [];
    return `
      <h2>${uiIcon('mail',20)} Direkt Mesajlar</h2>
      <input class="mi" id="dmSearch" placeholder="DM ara..." oninput="filterDMList(this.value)">
      <div id="dmListContainer" style="max-height:400px;overflow-y:auto;margin-top:8px">
        ${friends.length === 0 ? `<p style="color:var(--t3);text-align:center;padding:20px">${uiIcon('inbox',20)}<br>Henüz DM yok</p>` : friends.map(f => `
          <div class="mitem dm-mitem" onclick="startDM('${f.username}')" style="cursor:pointer">
            <div class="mav">${f.username.charAt(0).toUpperCase()}</div>
            <div class="minfo"><div class="mname">${escapeHtml(f.username)}</div><div class="msub">${escapeHtml(f.lastMessage?.substring(0,40) || 'DM başlat')}</div></div>
            ${f.unread > 0 ? `<span class="ub">${f.unread}</span>` : ''}
          </div>`).join('')}
      </div>`;
  },

  profile: () => `
    <h2>${uiIcon('user',20)} Profil</h2>
    <div style="text-align:center">
      <div class="avatar-big">${(Store.user?.username||'?').charAt(0).toUpperCase()}</div>
      <h3>${escapeHtml(Store.user?.username||'Kullanıcı')}</h3>
      <p style="color:var(--t3)">${typeof getHighestRole==='function'?getHighestRole(Store.user?._id)?.name||'Üye':'Üye'}</p>
    </div>
    <div class="msep"></div>
    <button class="mb sec" onclick="changeNickname(Store.user?._id,prompt('Yeni takma ad:'))">${uiIcon('edit',14)} Takma Ad</button>
    <button class="mb sec" onclick="changePasswordUI()">${uiIcon('lock',14)} Şifre Değiştir</button>
    <button class="mb sec" onclick="updateProfile({avatar:prompt('Avatar URL:')})">${uiIcon('image',14)} Avatar</button>
    <div class="msep"></div>
    <h4 style="font-size:11px;color:var(--t3);margin-bottom:8px">Durum</h4>
    <div class="settings-row" onclick="setStatus('online')"><div>${uiIcon('circle',14,'#10b981')} Çevrimiçi</div><div class="toggle ${Store.user?.status==='online'?'on':''}"></div></div>
    <div class="settings-row" onclick="setStatus('idle')"><div>${uiIcon('moon',14,'#f59e0b')} Boşta</div><div class="toggle ${Store.user?.status==='idle'?'on':''}"></div></div>
    <div class="settings-row" onclick="setStatus('dnd')"><div>${uiIcon('minus-circle',14,'#ef4444')} Rahatsız Etme</div><div class="toggle ${Store.user?.status==='dnd'?'on':''}"></div></div>
    <button class="mb danger" onclick="if(confirm('Hesabınızı silmek istediğinize emin misiniz?'))deleteAccount(prompt('Şifrenizi girin:'))">${uiIcon('trash',14)} Hesabı Sil</button>`,

  serverSettings: () => `
    <h2>${uiIcon('settings',20)} Sunucu Ayarları</h2>
    <label class="ml">Sunucu Adı</label>
    <input class="mi" id="svName" value="${escapeHtml(Store.serverSettings?.name||'Gettic')}" placeholder="Sunucu adı">
    <label class="ml">Açıklama</label>
    <input class="mi" id="svDesc" value="${escapeHtml(Store.serverSettings?.description||'')}" placeholder="Açıklama">
    <button class="mb" onclick="updateServerSettings()">${uiIcon('save',14)} Kaydet</button>`,

  roles: () => `
    <h2>${uiIcon('shield',20)} Roller</h2>
    <div id="roleList">${(Store.roles||[]).map(r => `
      <div class="mitem" style="justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:12px;height:12px;border-radius:50%;background:${r.color}"></div>
          <span>${escapeHtml(r.name)}</span>
        </div>
        ${r.editable ? `<button class="ib" onclick="editRoleUI('${r.id}')" style="width:24px;height:24px">${uiIcon('edit',14)}</button>` : ''}
      </div>`).join('')}</div>
    <button class="mb sec" onclick="createRoleUI()">+ Rol Ekle</button>`,

  notifications: () => {
    const notifs = Store.notifications || [];
    return `
      <h2>${uiIcon('bell',20)} Bildirimler</h2>
      <div class="settings-row" onclick="toggleNotifDesktop()"><div>${uiIcon('monitor',16)} Masaüstü</div><div class="toggle ${localStorage.getItem('gt_notif_desktop')!=='0'?'on':''}"></div></div>
      <div class="settings-row" onclick="toggleNotifSound()"><div>${uiIcon('volume',16)} Ses</div><div class="toggle ${localStorage.getItem('gt_notif_sound')!=='0'?'on':''}"></div></div>
      <div class="msep"></div>
      <div style="max-height:300px;overflow-y:auto">
        ${notifs.slice(0,20).map(n => `
          <div class="mitem" style="opacity:${n.read?'0.5':'1'}">
            ${uiIcon('bell',16)}<div class="minfo"><div class="mname">${escapeHtml(n.text||n.title||'')}</div><div style="font-size:9px;color:var(--t3)">${typeof formatTime==='function'?formatTime(n.time):''}</div></div>
          </div>`).join('') || `<p style="color:var(--t3);text-align:center;padding:20px">${uiIcon('inbox',20)}<br>Henüz bildirim yok</p>`}
      </div>`;
  },

  search: () => `
    <h2>${uiIcon('search',20)} Arama</h2>
    <input class="mi" id="searchInput" placeholder="Mesajlarda ara..." autofocus oninput="performSearch(this.value)">
    <div id="searchResults" style="max-height:400px;overflow-y:auto"></div>`,

  default: (t) => `<h2>${uiIcon('file-text',20)} ${escapeHtml(t)}</h2><p style="color:var(--t3)">Bu bölüm yapım aşamasında...</p>`
};

function openModal(type) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  const t = MODAL_TEMPLATES[type];
  content.innerHTML = t ? t(type) : MODAL_TEMPLATES.default(type);
  modal.classList.remove('hidden');
  modal.classList.add('show');
  
  setTimeout(() => {
    const fi = content.querySelector('input:not([type="hidden"])');
    if (fi) fi.focus();
  }, 100);
}

function closeModal() {
  const m = document.getElementById('modal');
  if (m) { m.classList.add('hidden'); m.classList.remove('show'); }
  window._viewImage = null;
}

// ============ TEMA ============
function setTheme(c) {
  Store.theme = c;
  localStorage.setItem('gt_ac', c);
  document.querySelector('.app')?.style.setProperty('--ac', c);
  if (typeof saveStore === 'function') saveStore();
  toast('Tema değiştirildi');
  closeModal();
}

function toggleLightMode() {
  Store.lightMode = !Store.lightMode;
  localStorage.setItem('gt_light', Store.lightMode ? '1' : '0');
  document.body.classList.toggle('light-mode', Store.lightMode);
  if (Store.lightMode) {
    document.documentElement.style.setProperty('--bg', '#faf6f0');
    document.documentElement.style.setProperty('--bg1', '#f5efe5');
    document.documentElement.style.setProperty('--bg2', '#efe7da');
    document.documentElement.style.setProperty('--t1', '#2c2416');
    document.documentElement.style.setProperty('--t2', '#6b5e4a');
    document.documentElement.style.setProperty('--t3', '#9e9078');
  } else {
    document.documentElement.style.setProperty('--bg', '#0f0a14');
    document.documentElement.style.setProperty('--bg1', '#1a0f24');
    document.documentElement.style.setProperty('--bg2', '#241535');
    document.documentElement.style.setProperty('--t1', '#fdf2f8');
    document.documentElement.style.setProperty('--t2', '#fce7f3');
    document.documentElement.style.setProperty('--t3', '#d8b4d0');
  }
  if (typeof saveStore === 'function') saveStore();
  openModal('theme');
}

function toggleCompactMode() {
  Store.compactMode = !Store.compactMode;
  localStorage.setItem('gt_compact', Store.compactMode ? '1' : '0');
  document.body.classList.toggle('compact-mode', Store.compactMode);
  if (typeof saveStore === 'function') saveStore();
  openModal('theme');
}

function setStatus(s) {
  if (Store.user) Store.user.status = s;
  toast('Durum güncellendi');
  closeModal();
}

// ============ SIDEBAR & PANEL ============
function toggleSidebar() {
  const s = document.getElementById('sidebar');
  if (s) {
    s.classList.toggle('open');
    Store.sidebarOpen = s.classList.contains('open');
    if (typeof saveStore === 'function') saveStore();
  }
}

function togglePanel() {
  const p = document.getElementById('userPanel');
  if (p) {
    p.style.display = (p.style.display === 'none' || p.style.display === '') ? 'block' : 'none';
  }
}

// ============ GÖRSEL ============
async function generateImageUI() {
  const prompt = document.getElementById('modalImgPrompt')?.value?.trim();
  if (!prompt) return toast('Açıklama gerekli', 'e');
  
  const loading = document.getElementById('imgLoading');
  const result = document.getElementById('modalImgResult');
  const actions = document.getElementById('imgActions');
  
  if (loading) loading.style.display = 'block';
  if (result) result.style.display = 'none';
  if (actions) actions.style.display = 'none';
  
  try {
    const res = await fetch(API + '/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (loading) loading.style.display = 'none';
    
    if (data.image) {
      if (result) { result.src = data.image; result.style.display = 'block'; }
      if (actions) actions.style.display = 'flex';
      window._generatedImage = data.image;
      toast('Görsel oluşturuldu');
    } else {
      toast('Oluşturulamadı', 'e');
    }
  } catch (e) {
    if (loading) loading.style.display = 'none';
    toast('Bağlantı hatası', 'e');
  }
}

function sendImageToChat() {
  if (!window._generatedImage) return;
  Store.messages.push({
    _id: genId(), content: '', senderName: Store.user.username,
    senderId: Store.user._id, channelId: Store.activeChannel,
    createdAt: new Date().toISOString(), image: window._generatedImage
  });
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
  closeModal();
  toast('Sohbete gönderildi');
}

function downloadImage() {
  if (!window._generatedImage) return;
  const a = document.createElement('a');
  a.href = window._generatedImage;
  a.download = 'gettic-gorsel-' + Date.now() + '.png';
  a.click();
}

function viewFullImage(src) {
  window._viewImage = src;
  openModal('imageView');
  MODAL_TEMPLATES.imageView = () => `<img src="${src}" style="max-width:100%;max-height:80vh;border-radius:12px;cursor:pointer" onclick="closeModal()">`;
}

// ============ ARAMA ============
function performSearch(query) {
  const c = document.getElementById('searchResults');
  if (!c) return;
  
  if (!query || query.trim().length < 2) {
    c.innerHTML = `<p style="color:var(--t3);text-align:center;padding:20px">${uiIcon('search',20)}<br>En az 2 karakter yazın</p>`;
    return;
  }
  
  const q = query.toLowerCase();
  const results = (Store.messages || []).filter(m => (m.content || '').toLowerCase().includes(q)).slice(-30).reverse();
  
  if (results.length === 0) {
    c.innerHTML = `<p style="color:var(--t3);text-align:center;padding:20px">${uiIcon('search',20)}<br>Sonuç bulunamadı</p>`;
    return;
  }
  
  c.innerHTML = results.map(m => `
    <div class="mitem" onclick="jumpToMessage('${m._id}')">
      <div class="mav">${(m.senderName||'?').charAt(0).toUpperCase()}</div>
      <div class="minfo"><div class="mname">${escapeHtml(m.senderName)}</div><div class="msub">${escapeHtml(m.content?.substring(0,80))}</div></div>
    </div>`).join('');
}

function jumpToMessage(mid) {
  closeModal();
  setTimeout(() => {
    const el = document.getElementById('msg-' + mid);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.background = 'var(--acd)';
      setTimeout(() => el.style.background = '', 2000);
    }
  }, 300);
}

// ============ SUNUCU AYARLARI ============
function updateServerSettings() {
  const name = document.getElementById('svName')?.value?.trim();
  const desc = document.getElementById('svDesc')?.value?.trim();
  if (name) {
    Store.serverSettings.name = name;
    Store.serverSettings.description = desc || '';
    const serverNameEl = document.getElementById('serverName');
    if (serverNameEl) serverNameEl.textContent = name;
    if (typeof saveStore === 'function') saveStore();
    toast('Sunucu güncellendi');
    closeModal();
  }
}

// ============ ANKET ============
function addPollOptionUI() {
  const c = document.getElementById('pollOptionsContainer');
  if (!c || c.children.length >= 10) return;
  const d = document.createElement('div');
  d.className = 'poll-option-row';
  d.innerHTML = `<input class="mi" placeholder="Seçenek ${c.children.length+1}"><button class="poll-remove-opt" onclick="this.parentElement.remove()">${uiIcon('x',16)}</button>`;
  c.appendChild(d);
}

function submitPollForm() {
  const q = document.getElementById('modalPollQ')?.value;
  const opts = [...document.querySelectorAll('#pollOptionsContainer input')].map(i => i.value).filter(v => v.trim());
  if (!q || q.trim().length < 3) return toast('Soru en az 3 karakter', 'e');
  if (opts.length < 2) return toast('En az 2 seçenek', 'e');
  if (typeof createPoll === 'function') createPoll(q, opts);
  closeModal();
}

function submitChannelForm() {
  const n = document.getElementById('modalChName')?.value;
  const t = document.getElementById('modalChType')?.value;
  const c = document.getElementById('modalChCat')?.value;
  if (typeof createChannel === 'function') createChannel(n, t, c);
}

function changePasswordUI() {
  const o = prompt('Mevcut şifre:');
  if (!o) return;
  const n = prompt('Yeni şifre:');
  if (!n || n.length < 4) return toast('Şifre en az 4 karakter', 'e');
  if (typeof changePassword === 'function') {
    changePassword(o, n).then(() => toast('Şifre değiştirildi')).catch(e => toast(e.message, 'e'));
  }
}

function toggleNotifDesktop() {
  const c = localStorage.getItem('gt_notif_desktop') !== '0';
  localStorage.setItem('gt_notif_desktop', c ? '0' : '1');
  if (!c && 'Notification' in window) Notification.requestPermission();
  openModal('notifications');
}

function toggleNotifSound() {
  const c = localStorage.getItem('gt_notif_sound') !== '0';
  localStorage.setItem('gt_notif_sound', c ? '0' : '1');
  openModal('notifications');
}

// ============ HTML KAÇIŞ ============
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ============ CSS ============
const uiStyle = document.createElement('style');
uiStyle.textContent = `
  @keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes toastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(10px)}}
  .toast-s{border-color:#10b981;color:#10b981}
  .toast-e{border-color:#ef4444;color:#ef4444}
  .toast-w{border-color:#f59e0b;color:#f59e0b}
  .toast-i{border-color:#8b5cf6;color:#8b5cf6}
  .compact-mode .msg{padding:2px 4px}
  .compact-mode .msg-av{width:24px;height:24px;font-size:10px}
  .color-row{display:flex;gap:8px;flex-wrap:wrap}
  .color-swatch{width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;border:2px solid transparent;transition:transform .15s}
  .color-swatch.act{border-color:#fff;transform:scale(1.15)}
  .color-swatch:hover{transform:scale(1.1)}
  .poll-option-row{display:flex;gap:6px;align-items:center}
  .poll-option-row input{flex:1;margin-bottom:0}
  .poll-remove-opt{background:none;border:none;color:var(--re);cursor:pointer;font-size:18px}
`;
document.head.appendChild(uiStyle);

console.log('UI.js yüklendi (SVG ikonlu + tam butonlar)');
