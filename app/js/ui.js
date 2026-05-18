// ============ GETTIC UI.JS - FULL GÜNCEL ============

// ============ TOAST SİSTEMİ ============
let toastTimer = null;
let toastQueue = [];

function toast(msg, type = 's') {
  toastQueue.push({ msg, type });
  if (toastQueue.length === 1) showNextToast();
}

function showNextToast() {
  if (toastQueue.length === 0) return;
  const { msg, type } = toastQueue[0];
  const el = document.getElementById('toast');
  if (!el) { toastQueue.shift(); return; }
  
  const icons = { s: '✅', e: '❌', w: '⚠️', i: 'ℹ️', dm: '💬', poll: '📊', image: '🖼️', role: '🛡️', channel: '#', voice: '🔊' };
  el.innerHTML = `<span class="toast-icon">${icons[type] || '📢'}</span><span class="toast-msg">${msg}</span>`;
  el.className = `toast toast-${type}`;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'toastIn 0.3s ease';
  
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => {
      el.classList.add('hidden');
      toastQueue.shift();
      showNextToast();
    }, 300);
  }, 2500);
}

// ============ MODAL SİSTEMİ ============
const MODAL_TEMPLATES = {
  addChannel: () => `
    <h2>🔊 Kanal Oluştur</h2>
    <div class="modal-form">
      <label class="ml">Kanal Adı</label>
      <input class="mi" id="modalChName" placeholder="örnek: genel-sohbet" maxlength="50">
      <label class="ml">Kanal Türü</label>
      <select class="ms" id="modalChType">
        <option value="text">📝 Metin Kanalı</option>
        <option value="voice">🔊 Ses Kanalı</option>
        <option value="forum">📋 Forum Kanalı</option>
        <option value="stage">🎙️ Stage Kanalı</option>
      </select>
      <label class="ml">Kategori</label>
      <select class="ms" id="modalChCat">
        ${(Store.categories || ['METİN', 'SES']).map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <button class="mb" onclick="submitChannelForm()">Oluştur</button>
    </div>
  `,

  addCategory: () => `
    <h2>📁 Kategori Ekle</h2>
    <input class="mi" id="modalCatName" placeholder="Kategori adı">
    <button class="mb" onclick="createCategory(document.getElementById('modalCatName').value)">Ekle</button>
  `,

  addFriend: () => `
    <h2>👤 Arkadaş Ekle</h2>
    <input class="mi" id="modalFrName" placeholder="Kullanıcı adı" autocomplete="off">
    <button class="mb" onclick="addFriend(document.getElementById('modalFrName').value)">Ekle</button>
  `,

  addServer: () => `
    <h2>🖥️ Sunucu Oluştur</h2>
    <input class="mi" id="modalSvName" placeholder="Sunucu adı">
    <button class="mb" onclick="createServer(document.getElementById('modalSvName').value)">Oluştur</button>
  `,

  theme: () => `
    <h2>🎨 Tema</h2>
    <div class="theme-section">
      <h4>Hazır Renkler</h4>
      <div class="color-row">
        ${['#ec4899','#6366f1','#22c55e','#f59e0b','#ec4899','#3b82f6','#14b8a6','#f97316','#8b5cf6','#ef4444'].map(c => `
          <div class="color-swatch ${Store.theme===c?'act':''}" style="background:${c}" onclick="setTheme('${c}')" title="${c}"></div>
        `).join('')}
      </div>
      <h4 style="margin-top:12px">Özel Renk</h4>
      <input type="color" class="mi" id="customColor" value="${Store.theme}" onchange="setTheme(this.value)" style="height:45px;padding:4px;cursor:pointer">
    </div>
    <div class="msep"></div>
    <h4>Görünüm</h4>
    <div class="settings-row">
      <div><div class="settings-row-label">Kompakt Mod</div><div class="settings-row-sub">Daha küçük aralıklar</div></div>
      <div class="toggle ${Store.compactMode?'on':''}" onclick="toggleCompactMode()"></div>
    </div>
    <div class="settings-row">
      <div><div class="settings-row-label">Glass Efekti</div><div class="settings-row-sub">Modern bulanık arkaplan</div></div>
      <div class="toggle ${localStorage.getItem('gt_glass')==='1'?'on':''}" onclick="toggleGlassEffect()"></div>
    </div>
    <div class="settings-row">
      <div><div class="settings-row-label">Partikül Arkaplan</div><div class="settings-row-sub">Hareketli parçacıklar</div></div>
      <div class="toggle ${typeof ParticleBG !== 'undefined' && ParticleBG.isRunning?'on':''}" onclick="toggleParticles()"></div>
    </div>
  `,

  poll: () => `
    <h2>📊 Anket Oluştur</h2>
    <div class="poll-form">
      <input class="mi" id="modalPollQ" placeholder="Soru sor..." maxlength="200">
      <div id="pollOptionsContainer">
        <div class="poll-option-row"><input class="mi" placeholder="Seçenek 1"><button class="poll-remove-opt" style="display:none">×</button></div>
        <div class="poll-option-row"><input class="mi" placeholder="Seçenek 2"><button class="poll-remove-opt" style="display:none">×</button></div>
      </div>
      <button class="mb sec" onclick="addPollOptionUI()">+ Seçenek Ekle (max 10)</button>
      <div class="poll-settings">
        <label class="poll-setting"><input type="checkbox" id="pollMultiple"> Çoklu seçim</label>
        <label class="poll-setting"><input type="checkbox" id="pollAnonymous" checked> Gizli oylama</label>
        <input class="mi" type="number" id="pollDuration" placeholder="Süre (dk, 0=sınırsız)" value="0" min="0">
      </div>
      <button class="mb" onclick="submitPollForm()">📊 Anketi Başlat</button>
    </div>
  `,

  imageGen: () => `
    <h2>🖼️ Görsel Oluştur</h2>
    <div class="image-gen-form">
      <input class="mi" id="modalImgPrompt" placeholder="Görsel açıklaması yazın..." maxlength="500" onkeydown="if(event.key==='Enter')generateImageUI()">
      <select class="ms" id="imgSize">
        <option value="1024x1024">1024×1024 (Kare)</option>
        <option value="1024x768">1024×768 (Yatay)</option>
        <option value="768x1024">768×1024 (Dikey)</option>
        <option value="512x512">512×512 (Küçük)</option>
      </select>
      <button class="mb" onclick="generateImageUI()">🎨 Oluştur</button>
      <div id="imgLoading" style="display:none;text-align:center;padding:20px">
        <div class="spin" style="margin:0 auto"></div>
        <p style="color:var(--t3);font-size:12px;margin-top:8px">Oluşturuluyor...</p>
      </div>
      <img id="modalImgResult" style="display:none;width:100%;border-radius:12px;margin-top:12px;cursor:pointer" onclick="viewFullImage(this.src)">
      <div id="imgActions" style="display:none;margin-top:8px;gap:8px">
        <button class="mb sec" onclick="sendImageToChat()">📨 Sohbete Gönder</button>
        <button class="mb sec" onclick="downloadImage()">⬇️ İndir</button>
      </div>
    </div>
  `,

  dm: () => `
    <h2>💬 Direkt Mesajlar</h2>
    <input class="mi" id="dmSearch" placeholder="DM ara..." oninput="filterDMList(this.value)">
    <div id="dmListContainer" style="max-height:400px;overflow-y:auto;margin-top:8px">
      ${(typeof dmState !== 'undefined' ? dmState.friends : []).length === 0 ? 
        '<p style="color:var(--t3);text-align:center;padding:20px">Henüz DM yok</p>' : 
        (typeof dmState !== 'undefined' ? dmState.friends : []).map(f => `
          <div class="mitem dm-mitem" onclick="startDM('${f.username}')">
            <div class="mav">${f.username.charAt(0).toUpperCase()}</div>
            <div class="minfo">
              <div class="mname">${f.username}</div>
              <div class="msub">${f.lastMessage || 'DM başlat'}</div>
            </div>
            ${f.unread > 0 ? `<span class="ub">${f.unread}</span>` : ''}
            <button class="ib" onclick="event.stopPropagation();removeFriend('${f.username}')" title="Çıkar" style="width:22px;height:22px">×</button>
          </div>
        `).join('')
      }
    </div>
  `,

  profile: () => `
    <h2>👤 Profil</h2>
    <div style="text-align:center">
      <div class="avatar-big">${Store.user?.username?.charAt(0)?.toUpperCase() || '?'}</div>
      <h3 style="margin-top:12px">${Store.user?.username || 'Kullanıcı'}</h3>
      <p style="color:var(--t3);font-size:12px">${typeof getHighestRole === 'function' ? getHighestRole(Store.user?._id)?.name || 'Üye' : 'Üye'}</p>
    </div>
    <div class="msep"></div>
    <button class="mb sec" onclick="changeNickname(Store.user?._id, prompt('Yeni takma ad:'))">✏️ Takma Ad Değiştir</button>
    <button class="mb sec" onclick="changePasswordUI()">🔒 Şifre Değiştir</button>
    <button class="mb sec" onclick="updateProfile({avatar: prompt('Avatar URL:')})">🖼️ Avatar Değiştir</button>
    <button class="mb danger" onclick="if(confirm('Hesabınızı silmek istediğinize emin misiniz?'))deleteAccount(prompt('Şifrenizi girin:'))">🗑️ Hesabı Sil</button>
  `,

  search: () => `
    <h2>🔍 Arama</h2>
    <input class="mi" id="searchInput" placeholder="Mesajlarda ara..." autofocus oninput="performSearch(this.value)">
    <div id="searchResults" style="max-height:400px;overflow-y:auto"></div>
  `,

  serverSettings: () => `
    <h2>⚙️ Sunucu Ayarları</h2>
    <label class="ml">Sunucu Adı</label>
    <input class="mi" id="svName" value="${Store.serverSettings?.name || 'Gettic'}" placeholder="Sunucu adı">
    <label class="ml">Açıklama</label>
    <input class="mi" id="svDesc" value="${Store.serverSettings?.description || ''}" placeholder="Açıklama">
    <button class="mb" onclick="updateServerSettings()">💾 Kaydet</button>
  `,

  roles: () => `
    <h2>🛡️ Roller</h2>
    <div id="roleList">
      ${(Store.roles || []).map(r => `
        <div class="mitem" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:12px;height:12px;border-radius:50%;background:${r.color}"></div>
            <span>${r.name}</span>
            <span style="font-size:9px;color:var(--t3)">(${Object.values(r.permissions||{}).filter(Boolean).length} yetki)</span>
          </div>
          ${r.editable ? `<button class="ib" onclick="editRoleUI('${r.id}')" style="width:24px;height:24px">✏️</button>` : ''}
        </div>
      `).join('')}
    </div>
    <button class="mb sec" onclick="createRoleUI()">+ Rol Ekle</button>
  `,

  notifications: () => `
    <h2>🔔 Bildirimler</h2>
    <div class="settings-group">
      <div class="settings-item" onclick="toggleNotifDesktop()">
        <div class="settings-item-left">🖥️ Masaüstü Bildirimi</div>
        <div class="settings-item-right"><div class="toggle ${localStorage.getItem('gt_notif_desktop')!=='0'?'on':''}"></div></div>
      </div>
      <div class="settings-item" onclick="toggleNotifSound()">
        <div class="settings-item-left">🔊 Bildirim Sesi</div>
        <div class="settings-item-right"><div class="toggle ${localStorage.getItem('gt_notif_sound')!=='0'?'on':''}"></div></div>
      </div>
    </div>
    <div class="msep"></div>
    <div style="max-height:300px;overflow-y:auto" id="notifList">
      ${(Store.notifications || []).slice(0, 20).map(n => `
        <div class="mitem" style="opacity:${n.read?'0.5':'1'}">
          <span style="font-size:20px">🔔</span>
          <div class="minfo">
            <div class="mname">${n.text}</div>
            <div style="font-size:9px;color:var(--t3)">${formatTime(n.time)}</div>
          </div>
        </div>
      `).join('') || '<p style="color:var(--t3);text-align:center;padding:20px">Henüz bildirim yok</p>'}
    </div>
  `,

  imageView: () => `<div style="text-align:center"><img src="${window._viewImage}" style="max-width:100%;max-height:80vh;border-radius:12px"></div>`,

  discover: () => `
    <h2>🔍 Keşfet</h2>
    <p style="color:var(--t3)">Popüler sunucular ve topluluklar</p>
  `,

  members: () => `
    <h2>👥 Üyeler</h2>
    <p style="color:var(--t3)">Üye listesi yakında...</p>
  `,

  default: (type) => `<h2>📋 ${type}</h2><p style="color:var(--t3)">Bu bölüm yapım aşamasında...</p>`
};

function openModal(type) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  const template = MODAL_TEMPLATES[type] || MODAL_TEMPLATES.default;
  content.innerHTML = typeof template === 'function' ? template(type) : template;
  
  modal.classList.remove('hidden');
  modal.classList.add('show');
  
  setTimeout(() => {
    const firstInput = content.querySelector('input:not([type="hidden"]):not([type="color"])');
    if (firstInput) firstInput.focus();
  }, 100);
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) { 
    modal.classList.add('hidden'); 
    modal.classList.remove('show'); 
  }
  window._viewImage = null;
}

// ============ TEMA ============
function setTheme(color) {
  Store.theme = color;
  localStorage.setItem('gt_ac', color);
  document.querySelector('.app')?.style.setProperty('--ac', color);
  document.querySelector('.app')?.style.setProperty('--ac2', color);
  if (typeof saveStore === 'function') saveStore();
  toast('🎨 Tema değiştirildi');
  closeModal();
}

function toggleCompactMode() {
  Store.compactMode = !Store.compactMode;
  localStorage.setItem('gt_compact', Store.compactMode ? '1' : '0');
  document.body.classList.toggle('compact-mode', Store.compactMode);
  if (typeof saveStore === 'function') saveStore();
}

function toggleGlassEffect() {
  const isGlass = localStorage.getItem('gt_glass') !== '1';
  localStorage.setItem('gt_glass', isGlass ? '1' : '0');
  if (typeof GlassEffect !== 'undefined') {
    if (isGlass) GlassEffect.enable('.modal .mbox, .auth-box, .voice-panel');
    else GlassEffect.disable('.modal .mbox, .auth-box, .voice-panel');
  }
  toast(isGlass ? '✨ Glass efekt açıldı' : 'Glass efekt kapandı');
}

function toggleParticles() {
  if (typeof ParticleBG !== 'undefined') {
    if (ParticleBG.isRunning) {
      ParticleBG.isRunning = false;
      ParticleBG.canvas.style.display = 'none';
      toast('🔮 Partiküller durduruldu');
    } else {
      ParticleBG.isRunning = true;
      ParticleBG.canvas.style.display = '';
      ParticleBG.animate();
      toast('🔮 Partiküller başladı');
    }
  }
}

// ============ SIDEBAR & PANEL ============
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
    Store.sidebarOpen = sidebar.classList.contains('open');
    if (typeof saveStore === 'function') saveStore();
  }
}

function togglePanel() {
  document.getElementById('userPanel')?.classList.toggle('hidden');
}

// ============ GÖRSEL OLUŞTURMA ============
async function generateImageUI() {
  const prompt = document.getElementById('modalImgPrompt')?.value?.trim();
  if (!prompt) return toast('Açıklama gerekli', 'e');
  
  const sizeEl = document.getElementById('imgSize');
  const size = sizeEl?.value || '1024x1024';
  const [width, height] = size.split('x');
  
  document.getElementById('imgLoading').style.display = 'block';
  document.getElementById('modalImgResult').style.display = 'none';
  document.getElementById('imgActions').style.display = 'none';
  
  try {
    const res = await fetch(API + '/api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width, height })
    });
    const data = await res.json();
    
    document.getElementById('imgLoading').style.display = 'none';
    
    if (data.image) {
      const img = document.getElementById('modalImgResult');
      img.src = data.image;
      img.style.display = 'block';
      document.getElementById('imgActions').style.display = 'flex';
      window._generatedImage = data.image;
      toast('✅ Görsel oluşturuldu');
    } else {
      toast('Görsel oluşturulamadı', 'e');
    }
  } catch(e) { 
    document.getElementById('imgLoading').style.display = 'none';
    toast('Bağlantı hatası', 'e'); 
  }
}

function sendImageToChat() {
  if (!window._generatedImage) return;
  Store.messages.push({
    _id: genId(), content: '🖼️ Görsel',
    senderName: Store.user.username, senderId: Store.user._id,
    channelId: Store.activeChannel, createdAt: new Date().toISOString(),
    image: window._generatedImage
  });
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
  closeModal();
  toast('📨 Görsel sohbete gönderildi');
}

function downloadImage() {
  if (!window._generatedImage) return;
  const a = document.createElement('a');
  a.href = window._generatedImage;
  a.download = 'gettic-image-' + Date.now() + '.png';
  a.click();
}

function viewFullImage(src) {
  window._viewImage = src;
  openModal('imageView');
}

// ============ ARAMA ============
function performSearch(query) {
  const container = document.getElementById('searchResults');
  if (!container) return;
  
  if (!query || query.trim().length < 2) {
    container.innerHTML = '<p style="color:var(--t3);text-align:center;padding:20px">Aramak için en az 2 karakter yazın</p>';
    return;
  }
  
  const q = query.toLowerCase();
  const results = (Store.messages || []).filter(m => (m.content||'').toLowerCase().includes(q)).slice(-30).reverse();
  
  if (results.length === 0) {
    container.innerHTML = '<p style="color:var(--t3);text-align:center;padding:20px">Sonuç bulunamadı</p>';
    return;
  }
  
  container.innerHTML = results.map(m => `
    <div class="mitem" onclick="jumpToMessage('${m._id}')">
      <div class="mav">${(m.senderName||'?').charAt(0).toUpperCase()}</div>
      <div class="minfo">
        <div class="mname">${m.senderName}</div>
        <div class="msub">${m.content.substring(0, 80)}</div>
      </div>
    </div>
  `).join('');
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
    document.getElementById('serverName').textContent = name;
    if (typeof saveStore === 'function') saveStore();
    toast('✅ Sunucu güncellendi');
    closeModal();
  }
}

// ============ ANKET UI ============
function addPollOptionUI() {
  const container = document.getElementById('pollOptionsContainer');
  if (!container || container.children.length >= 10) return;
  const div = document.createElement('div');
  div.className = 'poll-option-row';
  div.innerHTML = `<input class="mi" placeholder="Seçenek ${container.children.length+1}"><button class="poll-remove-opt" onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(div);
}

function submitPollForm() {
  const question = document.getElementById('modalPollQ')?.value;
  const options = [...document.querySelectorAll('#pollOptionsContainer input')].map(i => i.value).filter(v => v.trim());
  const multiple = document.getElementById('pollMultiple')?.checked;
  const anonymous = document.getElementById('pollAnonymous')?.checked;
  const duration = parseInt(document.getElementById('pollDuration')?.value || '0');
  
  if (!question || question.trim().length < 3) return toast('Soru en az 3 karakter', 'e');
  if (options.length < 2) return toast('En az 2 seçenek gerekli', 'e');
  
  if (typeof createPoll === 'function') {
    createPoll(question, options, { multipleChoice: multiple, anonymous, duration });
  }
}

function submitChannelForm() {
  const name = document.getElementById('modalChName')?.value;
  const type = document.getElementById('modalChType')?.value;
  const cat = document.getElementById('modalChCat')?.value;
  if (typeof createChannel === 'function') createChannel(name, type, cat);
}

// ============ PROFİL İŞLEMLERİ ============
function changePasswordUI() {
  const oldP = prompt('Mevcut şifreniz:');
  if (!oldP) return;
  const newP = prompt('Yeni şifreniz:');
  if (!newP || newP.length < 4) return toast('Şifre en az 4 karakter', 'e');
  if (typeof changePassword === 'function') {
    changePassword(oldP, newP).then(() => toast('✅ Şifre değiştirildi')).catch(e => toast(e.message, 'e'));
  }
}

function changeNickname(uid, nickname) {
  if (!nickname || !nickname.trim()) return;
  if (typeof window.changeNickname === 'function') {
    window.changeNickname(uid, nickname);
  } else {
    toast('✅ Takma ad değiştirildi');
  }
}

// ============ BİLDİRİM AYARLARI ============
function toggleNotifDesktop() {
  const current = localStorage.getItem('gt_notif_desktop') !== '0';
  localStorage.setItem('gt_notif_desktop', current ? '0' : '1');
  if (!current && 'Notification' in window) {
    Notification.requestPermission();
  }
  openModal('notifications');
}

function toggleNotifSound() {
  const current = localStorage.getItem('gt_notif_sound') !== '0';
  localStorage.setItem('gt_notif_sound', current ? '0' : '1');
  openModal('notifications');
}

// ============ İKON GÜNCELLEME ============
function updateIcons() {
  const iconMap = {
    'serverIcon': I?.hash, 'addChannelBtn': I?.plus, 'themeBtn': I?.settings,
    'dmBtn': I?.dm, 'serverSettingsBtn': I?.settings, 'logoutBtn': I?.logout,
    'toggleSidebarBtn': I?.menu, 'togglePanelBtn': I?.user,
    'searchBtn': I?.search, 'sendBtn': I?.send, 'emojiBtn': I?.smile,
    'imageBtn': I?.image, 'pollBtn': I?.poll, 'retryBtn': I?.refresh,
    'notificationsBtn': I?.bell, 'pinBtn': I?.pin
  };
  
  Object.entries(iconMap).forEach(([id, icon]) => {
    const el = document.getElementById(id);
    if (el && icon) el.innerHTML = icon;
  });
}

// ============ MOBİL SİDEBAR ============
function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.add('open');
    showOverlay();
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
    hideOverlay();
  }
}

function showOverlay() {
  let overlay = document.getElementById('mobileOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobileOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:block';
    overlay.addEventListener('click', closeMobileSidebar);
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'block';
}

function hideOverlay() {
  const overlay = document.getElementById('mobileOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ============ CSS ============
const uiStyle = document.createElement('style');
uiStyle.textContent = `
  @keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes toastOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(10px)} }
  .toast-s { border-color:var(--gr);color:var(--gr) }
  .toast-e { border-color:var(--re);color:var(--re) }
  .toast-w { border-color:var(--ye);color:var(--ye) }
  .toast-i { border-color:var(--bl);color:var(--bl) }
  .compact-mode .msg { padding: 2px 4px }
  .compact-mode .msg-av { width: 24px;height:24px;font-size:10px }
  .compact-mode .ch-item { padding: 4px 10px }
`;
document.head.appendChild(uiStyle);

// ============ BAŞLAT ============
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar toggle
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  if (toggleSidebarBtn) toggleSidebarBtn.onclick = toggleSidebar;
  
  // Panel toggle
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  if (togglePanelBtn) togglePanelBtn.onclick = togglePanel;
  
  // Kompakt mod
  if (Store.compactMode) document.body.classList.add('compact-mode');
  
  // Glass efekt
  if (localStorage.getItem('gt_glass') === '1' && typeof GlassEffect !== 'undefined') {
    GlassEffect.enable('.modal .mbox, .auth-box, .voice-panel');
  }
  
  console.log('✅ UI.js yüklendi');
});
