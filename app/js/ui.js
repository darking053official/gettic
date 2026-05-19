// ============ GETTIC UI.JS - FULL DETAYLI ============

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
  
  const icons = { s: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>', 
                  e: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', 
                  w: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
                  i: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' };
  
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

// ============ MODAL SİSTEMİ ============
const MODAL_TEMPLATES = {
  addChannel: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Kanal Oluştur</h2>
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
  `,

  addCategory: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Kategori Ekle</h2>
    <input class="mi" id="modalCatName" placeholder="Kategori adı">
    <button class="mb" onclick="createCategory(document.getElementById('modalCatName').value)">Ekle</button>
  `,

  addFriend: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Arkadaş Ekle</h2>
    <input class="mi" id="modalFrName" placeholder="Kullanıcı adı" autocomplete="off">
    <button class="mb" onclick="addFriend(document.getElementById('modalFrName').value)">Ekle</button>
  `,

  addServer: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1"/><circle cx="6" cy="18" r="1"/></svg> Sunucu Oluştur</h2>
    <input class="mi" id="modalSvName" placeholder="Sunucu adı">
    <button class="mb" onclick="createServer(document.getElementById('modalSvName').value)">Oluştur</button>
  `,

  theme: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg> Tema</h2>
    <h4 style="font-size:11px;color:var(--t3);margin-bottom:8px">Hazır Renkler</h4>
    <div class="color-row">
      ${['#ec4899','#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#14b8a6','#f97316','#8b5cf6','#ec4899'].map(c => `
        <div class="color-swatch ${Store.theme===c?'act':''}" style="background:${c}" onclick="setTheme('${c}')" title="${c}">
          ${Store.theme===c ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
      `).join('')}
    </div>
    <h4 style="font-size:11px;color:var(--t3);margin:12px 0 8px">Özel Renk</h4>
    <input type="color" class="mi" id="customColor" value="${Store.theme}" onchange="setTheme(this.value)" style="height:45px;padding:4px;cursor:pointer">
    <div class="msep"></div>
    <h4 style="font-size:11px;color:var(--t3);margin-bottom:8px">Görünüm</h4>
    <div class="settings-row" onclick="toggleCompactMode()">
      <div><div class="settings-row-label">Kompakt Mod</div><div class="settings-row-sub">Daha küçük aralıklar</div></div>
      <div class="toggle ${Store.compactMode?'on':''}"></div>
    </div>
    <div class="settings-row" onclick="toggleGlassEffect()">
      <div><div class="settings-row-label">Glass Efekti</div><div class="settings-row-sub">Bulanık arkaplan</div></div>
      <div class="toggle ${localStorage.getItem('gt_glass')==='1'?'on':''}"></div>
    </div>
  `,

  poll: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> Anket Oluştur</h2>
    <input class="mi" id="modalPollQ" placeholder="Soru sor..." maxlength="200">
    <div id="pollOptionsContainer">
      <div class="poll-option-row"><input class="mi" placeholder="Seçenek 1"><button class="poll-remove-opt" style="display:none">×</button></div>
      <div class="poll-option-row"><input class="mi" placeholder="Seçenek 2"><button class="poll-remove-opt" style="display:none">×</button></div>
    </div>
    <button class="mb sec" onclick="addPollOptionUI()">+ Seçenek Ekle</button>
    <div class="poll-settings">
      <label class="poll-setting"><input type="checkbox" id="pollMultiple"> Çoklu seçim</label>
      <label class="poll-setting"><input type="checkbox" id="pollAnonymous" checked> Gizli oylama</label>
      <input class="mi" type="number" id="pollDuration" placeholder="Süre (dk, 0=sınırsız)" value="0" min="0">
    </div>
    <button class="mb" onclick="submitPollForm()">Anketi Başlat</button>
  `,

  imageGen: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Görsel Oluştur</h2>
    <input class="mi" id="modalImgPrompt" placeholder="Görsel açıklaması yazın..." maxlength="500" onkeydown="if(event.key==='Enter')generateImageUI()">
    <select class="ms" id="imgSize">
      <option value="1024x1024">1024×1024 (Kare)</option>
      <option value="1024x768">1024×768 (Yatay)</option>
      <option value="768x1024">768×1024 (Dikey)</option>
      <option value="512x512">512×512 (Küçük)</option>
    </select>
    <button class="mb" onclick="generateImageUI()">Oluştur</button>
    <div id="imgLoading" style="display:none;text-align:center;padding:20px"><div class="spin" style="margin:0 auto"></div><p style="color:var(--t3);font-size:12px;margin-top:8px">Oluşturuluyor...</p></div>
    <img id="modalImgResult" style="display:none;width:100%;border-radius:12px;margin-top:12px;cursor:pointer" onclick="viewFullImage(this.src)">
    <div id="imgActions" style="display:none;margin-top:8px;gap:8px">
      <button class="mb sec" onclick="sendImageToChat()">📨 Sohbete Gönder</button>
      <button class="mb sec" onclick="downloadImage()">⬇️ İndir</button>
    </div>
  `,

  dm: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Direkt Mesajlar</h2>
    <input class="mi" id="dmSearch" placeholder="DM ara..." oninput="filterDMList(this.value)">
    <div id="dmListContainer" style="max-height:400px;overflow-y:auto;margin-top:8px">
      ${(typeof dmState !== 'undefined' ? dmState.friends : []).length === 0 ? 
        '<p style="color:var(--t3);text-align:center;padding:20px">Henüz DM yok</p>' : 
        (typeof dmState !== 'undefined' ? dmState.friends : []).map(f => `
          <div class="mitem dm-mitem" onclick="startDM('${f.username}')" style="cursor:pointer">
            <div class="mav">${f.username.charAt(0).toUpperCase()}</div>
            <div class="minfo">
              <div class="mname">${f.username}</div>
              <div class="msub">${f.lastMessage || 'DM başlat'}</div>
            </div>
            ${f.unread > 0 ? `<span class="ub">${f.unread}</span>` : ''}
            <button class="ib" onclick="event.stopPropagation();removeFriend('${f.username}')" title="Çıkar" style="width:22px;height:22px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        `).join('')
      }
    </div>
  `,

  profile: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Profil</h2>
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
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Arama</h2>
    <input class="mi" id="searchInput" placeholder="Mesajlarda ara..." autofocus oninput="performSearch(this.value)">
    <div id="searchResults" style="max-height:400px;overflow-y:auto"></div>
  `,

  serverSettings: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg> Sunucu Ayarları</h2>
    <label class="ml">Sunucu Adı</label>
    <input class="mi" id="svName" value="${Store.serverSettings?.name || 'Gettic'}" placeholder="Sunucu adı">
    <label class="ml">Açıklama</label>
    <input class="mi" id="svDesc" value="${Store.serverSettings?.description || ''}" placeholder="Açıklama">
    <button class="mb" onclick="updateServerSettings()">💾 Kaydet</button>
  `,

  roles: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Roller</h2>
    <div id="roleList">
      ${(Store.roles || []).map(r => `
        <div class="mitem" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:12px;height:12px;border-radius:50%;background:${r.color}"></div>
            <span>${r.name}</span>
            <span style="font-size:9px;color:var(--t3)">(${Object.values(r.permissions||{}).filter(Boolean).length} yetki)</span>
          </div>
          ${r.editable ? `<button class="ib" onclick="editRoleUI('${r.id}')" style="width:24px;height:24px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>` : ''}
        </div>
      `).join('')}
    </div>
    <button class="mb sec" onclick="createRoleUI()">+ Rol Ekle</button>
  `,

  notifications: () => `
    <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Bildirimler</h2>
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
            <div style="font-size:9px;color:var(--t3)">${typeof formatTime === 'function' ? formatTime(n.time) : ''}</div>
          </div>
        </div>
      `).join('') || '<p style="color:var(--t3);text-align:center;padding:20px">Henüz bildirim yok</p>'}
    </div>
  `
};

function openModal(type) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  const template = MODAL_TEMPLATES[type];
  if (template) {
    content.innerHTML = template();
  } else {
    content.innerHTML = `<h2>📋 ${type}</h2><p style="color:var(--t3)">Bu bölüm yapım aşamasında...</p>`;
  }
  
  modal.classList.remove('hidden');
  modal.classList.add('show');
  
  setTimeout(() => {
    const firstInput = content.querySelector('input:not([type="hidden"]):not([type="color"])');
    if (firstInput) firstInput.focus();
  }, 100);
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('show'); }
}

// ============ TEMA ============
function setTheme(color) {
  Store.theme = color;
  localStorage.setItem('gt_ac', color);
  document.querySelector('.app')?.style.setProperty('--ac', color);
  if (typeof saveStore === 'function') saveStore();
  toast('Tema değiştirildi');
  closeModal();
}

function toggleCompactMode() {
  Store.compactMode = !Store.compactMode;
  localStorage.setItem('gt_compact', Store.compactMode ? '1' : '0');
  document.body.classList.toggle('compact-mode', Store.compactMode);
  if (typeof saveStore === 'function') saveStore();
  openModal('theme');
}

function toggleGlassEffect() {
  const isGlass = localStorage.getItem('gt_glass') !== '1';
  localStorage.setItem('gt_glass', isGlass ? '1' : '0');
  if (typeof GlassEffect !== 'undefined') {
    if (isGlass) GlassEffect.enable('.modal .mbox, .auth-box, .voice-panel');
    else GlassEffect.disable('.modal .mbox, .auth-box, .voice-panel');
  }
  openModal('theme');
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
  
  document.getElementById('imgLoading').style.display = 'block';
  document.getElementById('modalImgResult').style.display = 'none';
  document.getElementById('imgActions').style.display = 'none';
  
  try {
    const res = await fetch(API + '/api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    document.getElementById('imgLoading').style.display = 'none';
    
    if (data.image) {
      document.getElementById('modalImgResult').src = data.image;
      document.getElementById('modalImgResult').style.display = 'block';
      document.getElementById('imgActions').style.display = 'flex';
      window._generatedImage = data.image;
      toast('Görsel oluşturuldu');
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
    channelId: Store.activeChannel, createdAt: new Date().toISOString(), image: window._generatedImage
  });
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
  closeModal();
  toast('Görsel sohbete gönderildi');
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
    container.innerHTML = '<p style="color:var(--t3);text-align:center;padding:20px">En az 2 karakter yazın</p>';
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
      <div class="minfo"><div class="mname">${m.senderName}</div><div class="msub">${m.content.substring(0, 80)}</div></div>
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
    toast('Sunucu güncellendi');
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
  if (!question || question.trim().length < 3) return toast('Soru en az 3 karakter', 'e');
  if (options.length < 2) return toast('En az 2 seçenek gerekli', 'e');
  if (typeof createPoll === 'function') createPoll(question, options);
  closeModal();
}

function submitChannelForm() {
  const name = document.getElementById('modalChName')?.value;
  const type = document.getElementById('modalChType')?.value;
  const cat = document.getElementById('modalChCat')?.value;
  if (typeof createChannel === 'function') createChannel(name, type, cat);
}

function changePasswordUI() {
  const oldP = prompt('Mevcut şifreniz:');
  if (!oldP) return;
  const newP = prompt('Yeni şifreniz:');
  if (!newP || newP.length < 4) return toast('Şifre en az 4 karakter', 'e');
  if (typeof changePassword === 'function') changePassword(oldP, newP).then(() => toast('Şifre değiştirildi')).catch(e => toast(e.message, 'e'));
}

function toggleNotifDesktop() {
  const current = localStorage.getItem('gt_notif_desktop') !== '0';
  localStorage.setItem('gt_notif_desktop', current ? '0' : '1');
  if (!current && 'Notification' in window) Notification.requestPermission();
  openModal('notifications');
}

function toggleNotifSound() {
  const current = localStorage.getItem('gt_notif_sound') !== '0';
  localStorage.setItem('gt_notif_sound', current ? '0' : '1');
  openModal('notifications');
}

// ============ CSS ============
const uiStyle = document.createElement('style');
uiStyle.textContent = `
  @keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes toastOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(10px)} }
  .toast-s { border-color:#10b981;color:#10b981 }
  .toast-e { border-color:#ef4444;color:#ef4444 }
  .toast-w { border-color:#f59e0b;color:#f59e0b }
  .toast-i { border-color:#8b5cf6;color:#8b5cf6 }
  .toast-icon { display:flex;align-items:center;margin-right:8px }
  .toast-msg { flex:1 }
  .compact-mode .msg { padding:2px 4px }
  .compact-mode .msg-av { width:24px;height:24px;font-size:10px }
  .compact-mode .ch-item { padding:4px 10px }
  .color-swatch { display:flex;align-items:center;justify-content:center }
  .poll-option-row { display:flex;gap:6px;align-items:center }
  .poll-option-row input { flex:1;margin-bottom:0 }
  .poll-remove-opt { background:none;border:none;color:var(--re);cursor:pointer;font-size:18px;padding:0 4px }
  .poll-settings { margin:8px 0 }
  .poll-setting { display:flex;align-items:center;gap:8px;font-size:12px;color:var(--t2);cursor:pointer;padding:4px 0 }
  .poll-setting input[type="checkbox"] { width:16px;height:16px;cursor:pointer }
`;
document.head.appendChild(uiStyle);

console.log('✅ UI.js yüklendi');
