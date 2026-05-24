// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC UI.JS v2.0 - Tam Geliştirilmiş                          ║
// ╚══════════════════════════════════════════════════════════════════╝

// ============ SVG İKON YARDIMCISı ============
function uiIcon(name, size = 18, color = 'currentColor') {
  if (!window.Icons?.[name]) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0;display:inline-block">${Icons[name]}</svg>`;
}

// ============ HTML KAÇIŞ ============
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ============ ID ÜRETİCİ ============
function genId() {
  return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// ============ TOAST SİSTEMİ ============
const Toast = (() => {
  let queue = [];
  let active = false;
  let timer = null;

  const ICONS = {
    s: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    e: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    w: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    i: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  function show() {
    if (active || queue.length === 0) return;
    active = true;

    const { msg, type, duration } = queue[0];
    let el = document.getElementById('toast');

    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }

    el.className = `gt-toast gt-toast-${type}`;
    el.innerHTML = `
      <span class="gt-toast-icon">${ICONS[type] || ICONS.i}</span>
      <span class="gt-toast-msg">${escapeHtml(msg)}</span>
      <button class="gt-toast-close" onclick="Toast.dismiss()">${ICONS.e}</button>
    `;
    el.style.cssText = 'opacity:0;transform:translateY(12px) scale(0.97)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
    });

    clearTimeout(timer);
    timer = setTimeout(() => dismiss(), duration || 2800);
  }

  function dismiss() {
    const el = document.getElementById('toast');
    if (!el) { next(); return; }
    el.style.transition = 'opacity .2s ease, transform .2s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px) scale(0.97)';
    setTimeout(() => { queue.shift(); active = false; show(); }, 220);
  }

  function next() { queue.shift(); active = false; show(); }

  function push(msg, type = 's', duration) {
    // Aynı mesaj varsa tekrar ekleme
    if (queue.some(q => q.msg === msg)) return;
    queue.push({ msg, type, duration });
    show();
  }

  return { push, dismiss };
})();

// Global kısayol
function toast(msg, type = 's', duration) { Toast.push(msg, type, duration); }

// ============ MODAL SİSTEMİ ============
const Modal = (() => {
  let currentType = null;
  let history = [];

  function open(type, data = {}) {
    const overlay = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    if (!overlay || !content) return;

    const tpl = MODAL_TEMPLATES[type];
    if (!tpl) return;

    currentType = type;
    content.style.transition = 'none';
    content.style.opacity = '0';
    content.style.transform = 'translateY(16px) scale(0.98)';

    content.innerHTML = tpl(data);
    overlay.classList.remove('hidden');
    overlay.classList.add('show');

    requestAnimationFrame(() => {
      content.style.transition = 'opacity .28s ease, transform .28s cubic-bezier(.34,1.3,.64,1)';
      content.style.opacity = '1';
      content.style.transform = 'translateY(0) scale(1)';
    });

    setTimeout(() => {
      const fi = content.querySelector('input:not([type="hidden"]), textarea');
      if (fi) fi.focus();
    }, 120);

    // ESC ile kapat
    document.addEventListener('keydown', _escHandler);
  }

  function close() {
    const overlay = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    if (!overlay) return;

    if (content) {
      content.style.transition = 'opacity .18s ease, transform .18s ease';
      content.style.opacity = '0';
      content.style.transform = 'translateY(10px) scale(0.98)';
    }

    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('show');
      if (content) content.innerHTML = '';
      currentType = null;
      window._viewImage = null;
    }, 180);

    document.removeEventListener('keydown', _escHandler);
  }

  function _escHandler(e) {
    if (e.key === 'Escape') close();
  }

  function refresh(type) {
    if (currentType === type) open(type);
  }

  return { open, close, refresh, get current() { return currentType; } };
})();

// Global kısayollar
function openModal(type, data) { Modal.open(type, data); }
function closeModal() { Modal.close(); }

// ============ MODAL TEMPLATES ============
const MODAL_TEMPLATES = {

  addChannel: () => `
    <div class="gm-header">
      ${uiIcon('hash', 20)}
      <h2>Kanal Oluştur</h2>
    </div>
    <div class="gm-body">
      <div class="gm-field">
        <label class="gm-label">Kanal Adı</label>
        <div class="gm-input-wrap">
          ${uiIcon('hash', 14)}
          <input class="gm-input" id="modalChName" placeholder="genel-sohbet" maxlength="50"
            oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9ğüşıöç\\-]/g,'').replace(/ /g,'-')"
            onkeydown="if(event.key==='Enter')submitChannelForm()">
        </div>
      </div>
      <div class="gm-field">
        <label class="gm-label">Kanal Türü</label>
        <div class="gm-type-grid">
          ${[
            { v:'text',    icon:'hash',           label:'Metin',   desc:'Mesaj & dosya paylaş' },
            { v:'voice',   icon:'mic',            label:'Ses',     desc:'Sesli sohbet kanalı' },
            { v:'forum',   icon:'message-square', label:'Forum',   desc:'Konulu tartışma' },
            { v:'stage',   icon:'radio',          label:'Stage',   desc:'Büyük konuşmalar' },
          ].map(t => `
            <label class="gm-type-card">
              <input type="radio" name="chType" value="${t.v}" ${t.v==='text'?'checked':''}>
              <div class="gm-type-inner">
                ${uiIcon(t.icon, 20)}
                <span class="gm-type-label">${t.label}</span>
                <span class="gm-type-desc">${t.desc}</span>
              </div>
            </label>`).join('')}
        </div>
      </div>
      <div class="gm-field">
        <label class="gm-label">Kategori</label>
        <select class="gm-select" id="modalChCat">
          ${(Store.categories||['METİN','SES']).map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
        <button class="gm-btn primary" onclick="submitChannelForm()">${uiIcon('plus',15)} Oluştur</button>
      </div>
    </div>`,

  addCategory: () => `
    <div class="gm-header">
      ${uiIcon('folder', 20)}
      <h2>Kategori Ekle</h2>
    </div>
    <div class="gm-body">
      <div class="gm-field">
        <label class="gm-label">Kategori Adı</label>
        <input class="gm-input" id="modalCatName" placeholder="Örn: OYUN KANALLARIM" maxlength="32"
          oninput="this.value=this.value.toUpperCase()"
          onkeydown="if(event.key==='Enter')createCategory(this.value)">
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
        <button class="gm-btn primary" onclick="createCategory(document.getElementById('modalCatName').value)">${uiIcon('folder',15)} Ekle</button>
      </div>
    </div>`,

  addFriend: () => `
    <div class="gm-header">
      ${uiIcon('user-plus', 20)}
      <h2>Arkadaş Ekle</h2>
    </div>
    <div class="gm-body">
      <p class="gm-hint">Gettic kullanıcı adını gir. Büyük/küçük harf fark etmez.</p>
      <div class="gm-field">
        <label class="gm-label">Kullanıcı Adı</label>
        <div class="gm-input-wrap">
          ${uiIcon('at-sign', 14)}
          <input class="gm-input" id="modalFrName" placeholder="kullaniciadi"
            onkeydown="if(event.key==='Enter')addFriend(this.value)">
        </div>
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
        <button class="gm-btn primary" onclick="addFriend(document.getElementById('modalFrName').value)">${uiIcon('user-plus',15)} Ekle</button>
      </div>
    </div>`,

  addServer: () => `
    <div class="gm-header">
      ${uiIcon('server', 20)}
      <h2>Sunucu Oluştur</h2>
    </div>
    <div class="gm-body">
      <div class="gm-avatar-pick" id="svAvatarPick">
        <div class="gm-avatar-preview" id="svAvatarPreview" onclick="document.getElementById('svAvatarFile').click()">
          <span id="svAvatarLetter">?</span>
          ${uiIcon('camera', 18)}
        </div>
        <input type="file" id="svAvatarFile" accept="image/*" style="display:none" onchange="handleSvAvatar(this)">
      </div>
      <div class="gm-field">
        <label class="gm-label">Sunucu Adı</label>
        <input class="gm-input" id="modalSvName" placeholder="Harika Sunucum" maxlength="50"
          oninput="document.getElementById('svAvatarLetter').textContent=this.value.charAt(0).toUpperCase()||'?'"
          onkeydown="if(event.key==='Enter')createServer(this.value)">
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
        <button class="gm-btn primary" onclick="createServer(document.getElementById('modalSvName').value)">${uiIcon('plus',15)} Oluştur</button>
      </div>
    </div>`,

  theme: () => `
    <div class="gm-header">
      ${uiIcon('palette', 20)}
      <h2>Görünüm & Tema</h2>
    </div>
    <div class="gm-body">
      <label class="gm-label">Vurgu Rengi</label>
      <div class="gm-color-grid">
        ${[
          { c:'#ec4899', name:'Pembe' },
          { c:'#6366f1', name:'İndigo' },
          { c:'#10b981', name:'Yeşil' },
          { c:'#f59e0b', name:'Amber' },
          { c:'#ef4444', name:'Kırmızı' },
          { c:'#3b82f6', name:'Mavi' },
          { c:'#8b5cf6', name:'Mor' },
          { c:'#f97316', name:'Turuncu' },
          { c:'#14b8a6', name:'Teal' },
          { c:'#e11d48', name:'Gül' },
        ].map(({c, name}) => `
          <button class="gm-color-btn ${Store.theme===c?'act':''}" style="--clr:${c}" onclick="setTheme('${c}')" title="${name}">
            <span class="gm-color-dot" style="background:${c}"></span>
            ${Store.theme===c ? `<span class="gm-color-check">${uiIcon('check',12,'#fff')}</span>` : ''}
          </button>`).join('')}
        <label class="gm-color-btn gm-color-custom" title="Özel Renk">
          <input type="color" value="${Store.theme||'#6366f1'}" oninput="setTheme(this.value,true)" onchange="setTheme(this.value)">
          ${uiIcon('pipette',14)}
        </label>
      </div>

      <div class="gm-divider"></div>
      <label class="gm-label">Mod</label>

      <div class="gm-toggle-row" onclick="toggleLightMode()">
        <div class="gm-toggle-info">
          ${uiIcon('sun', 16)}
          <span>Aydınlık Mod</span>
        </div>
        <div class="gm-toggle ${Store.lightMode?'on':''}"><div class="gm-toggle-knob"></div></div>
      </div>

      <div class="gm-toggle-row" onclick="toggleCompactMode()">
        <div class="gm-toggle-info">
          ${uiIcon('minimize', 16)}
          <span>Kompakt Mod</span>
        </div>
        <div class="gm-toggle ${Store.compactMode?'on':''}"><div class="gm-toggle-knob"></div></div>
      </div>

      <div class="gm-toggle-row" onclick="toggleAnimations()">
        <div class="gm-toggle-info">
          ${uiIcon('zap', 16)}
          <span>Animasyonlar</span>
        </div>
        <div class="gm-toggle ${Store.animations!==false?'on':''}"><div class="gm-toggle-knob"></div></div>
      </div>
    </div>`,

  poll: () => `
    <div class="gm-header">
      ${uiIcon('bar-chart', 20)}
      <h2>Anket Oluştur</h2>
    </div>
    <div class="gm-body">
      <div class="gm-field">
        <label class="gm-label">Soru</label>
        <input class="gm-input" id="modalPollQ" placeholder="Kullanıcılara ne sormak istiyorsun?" maxlength="200">
      </div>
      <div class="gm-field">
        <label class="gm-label">Seçenekler <span class="gm-label-hint">(en az 2, en fazla 10)</span></label>
        <div id="pollOptionsContainer" class="gm-poll-opts">
          <div class="gm-poll-opt-row">
            ${uiIcon('circle',14)}
            <input class="gm-input" placeholder="Seçenek 1" maxlength="80">
          </div>
          <div class="gm-poll-opt-row">
            ${uiIcon('circle',14)}
            <input class="gm-input" placeholder="Seçenek 2" maxlength="80">
          </div>
        </div>
        <button class="gm-btn ghost sm" onclick="addPollOptionUI()" style="margin-top:8px">
          ${uiIcon('plus',13)} Seçenek Ekle
        </button>
      </div>
      <div class="gm-field">
        <label class="gm-label">Süre</label>
        <select class="gm-select" id="modalPollDuration">
          <option value="0">Süresiz</option>
          <option value="3600">1 Saat</option>
          <option value="86400" selected>1 Gün</option>
          <option value="604800">1 Hafta</option>
        </select>
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
        <button class="gm-btn primary" onclick="submitPollForm()">${uiIcon('bar-chart',15)} Anketi Başlat</button>
      </div>
    </div>`,

  imageGen: () => `
    <div class="gm-header">
      ${uiIcon('image', 20)}
      <h2>Görsel Oluştur</h2>
      <span class="gm-badge">AI</span>
    </div>
    <div class="gm-body">
      <div class="gm-field">
        <label class="gm-label">Açıklama</label>
        <textarea class="gm-textarea" id="modalImgPrompt" placeholder="Görmek istediğin görseli detaylıca anlat..." rows="3" onkeydown="if(event.key==='Enter'&&(event.ctrlKey||event.metaKey))generateImageUI()"></textarea>
        <span class="gm-label-hint" style="margin-top:4px">Ctrl+Enter ile oluştur</span>
      </div>
      <div class="gm-field">
        <label class="gm-label">Stil</label>
        <div class="gm-style-chips">
          ${['Gerçekçi','Anime','Dijital Sanat','Yağlı Boya','Pixel Art','Minimalist'].map(s=>`
            <button class="gm-chip" onclick="this.classList.toggle('on');updateImgStyle()">${s}</button>
          `).join('')}
        </div>
      </div>
      <button class="gm-btn primary full" onclick="generateImageUI()" id="imgGenBtn">
        ${uiIcon('wand', 15)} Oluştur
      </button>
      <div id="imgLoading" style="display:none" class="gm-img-loading">
        <div class="gm-spinner"></div>
        <span>Görsel oluşturuluyor...</span>
      </div>
      <div id="imgResultWrap" style="display:none">
        <img id="modalImgResult" class="gm-img-result" onclick="viewFullImage(this.src)">
        <div class="gm-actions" style="margin-top:8px">
          <button class="gm-btn ghost" onclick="downloadImage()">${uiIcon('download',14)} İndir</button>
          <button class="gm-btn primary" onclick="sendImageToChat()">${uiIcon('send',14)} Gönder</button>
        </div>
      </div>
    </div>`,

  dm: () => {
    const friends = typeof dmState !== 'undefined' ? dmState.friends : [];
    return `
      <div class="gm-header">
        ${uiIcon('mail', 20)}
        <h2>Direkt Mesajlar</h2>
        <button class="gm-header-btn" onclick="openModal('addFriend')" title="Arkadaş Ekle">${uiIcon('user-plus',16)}</button>
      </div>
      <div class="gm-body">
        <div class="gm-input-wrap">
          ${uiIcon('search', 14)}
          <input class="gm-input" id="dmSearch" placeholder="Kullanıcı ara..." oninput="filterDMList(this.value)">
        </div>
        <div id="dmListContainer" class="gm-list" style="margin-top:10px">
          ${friends.length === 0
            ? `<div class="gm-empty">${uiIcon('inbox',28)}<span>Henüz DM yok</span><small>Arkadaş ekleyerek başla</small></div>`
            : friends.map(f => `
              <div class="gm-list-item" onclick="startDM('${escapeHtml(f.username)}')">
                <div class="gm-av ${f.online?'online':''}">${f.username.charAt(0).toUpperCase()}</div>
                <div class="gm-item-info">
                  <span class="gm-item-name">${escapeHtml(f.username)}</span>
                  <span class="gm-item-sub">${escapeHtml(f.lastMessage?.substring(0,40)||'DM başlat')}</span>
                </div>
                ${f.unread > 0 ? `<span class="gm-badge red">${f.unread > 99 ? '99+' : f.unread}</span>` : ''}
              </div>`).join('')}
        </div>
      </div>`;
  },

  profile: () => {
    const u = Store.user || {};
    const role = typeof getHighestRole === 'function' ? getHighestRole(u._id)?.name || 'Üye' : 'Üye';
    const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '—';
    return `
      <div class="gm-header">
        ${uiIcon('user', 20)}
        <h2>Profil</h2>
      </div>
      <div class="gm-body">
        <div class="gm-profile-hero">
          <div class="gm-profile-av" onclick="openModal('avatarChange')">${(u.username||'?').charAt(0).toUpperCase()}
            <div class="gm-av-overlay">${uiIcon('camera',16)}</div>
          </div>
          <div class="gm-profile-info">
            <h3>${escapeHtml(u.username||'Kullanıcı')}</h3>
            <span class="gm-role-badge">${escapeHtml(role)}</span>
          </div>
        </div>
        <div class="gm-profile-stats">
          <div class="gm-stat"><span class="gm-stat-val">${Store.messages?.filter(m=>m.senderId===u._id).length||0}</span><span class="gm-stat-lbl">Mesaj</span></div>
          <div class="gm-stat"><span class="gm-stat-val">${joined}</span><span class="gm-stat-lbl">Katıldı</span></div>
          <div class="gm-stat"><span class="gm-stat-val">${u.level||1}</span><span class="gm-stat-lbl">Seviye</span></div>
        </div>
        <div class="gm-divider"></div>
        <div class="gm-section-label">Durum</div>
        <div class="gm-status-grid">
          ${[
            { v:'online', label:'Çevrimiçi', color:'#10b981' },
            { v:'idle',   label:'Boşta',     color:'#f59e0b' },
            { v:'dnd',    label:'Rahatsız Etme', color:'#ef4444' },
            { v:'invisible', label:'Görünmez', color:'#6b7280' },
          ].map(s => `
            <button class="gm-status-btn ${u.status===s.v?'act':''}" onclick="setStatus('${s.v}')">
              <span style="background:${s.color}" class="gm-status-dot"></span>
              ${s.label}
            </button>`).join('')}
        </div>
        <div class="gm-divider"></div>
        <div class="gm-section-label">Hesap</div>
        <div class="gm-action-list">
          <button class="gm-action-btn" onclick="changeNicknameUI()">${uiIcon('edit',15)} Takma Ad</button>
          <button class="gm-action-btn" onclick="changePasswordUI()">${uiIcon('lock',15)} Şifre Değiştir</button>
          <button class="gm-action-btn" onclick="openModal('avatarChange')">${uiIcon('image',15)} Avatar Güncelle</button>
        </div>
        <button class="gm-btn danger full" style="margin-top:12px" onclick="confirmDeleteAccount()">
          ${uiIcon('trash',14)} Hesabı Sil
        </button>
      </div>`;
  },

  serverSettings: () => `
    <div class="gm-header">
      ${uiIcon('settings', 20)}
      <h2>Sunucu Ayarları</h2>
    </div>
    <div class="gm-body">
      <div class="gm-field">
        <label class="gm-label">Sunucu Adı</label>
        <input class="gm-input" id="svName" value="${escapeHtml(Store.serverSettings?.name||'Gettic')}" maxlength="50">
      </div>
      <div class="gm-field">
        <label class="gm-label">Açıklama</label>
        <textarea class="gm-textarea" id="svDesc" rows="2" placeholder="Sunucuyu tanıt...">${escapeHtml(Store.serverSettings?.description||'')}</textarea>
      </div>
      <div class="gm-field">
        <label class="gm-label">Sunucu Bölgesi</label>
        <select class="gm-select" id="svRegion">
          ${['Otomatik','Avrupa','Amerika','Asya'].map(r=>`<option value="${r.toLowerCase()}" ${(Store.serverSettings?.region||'otomatik')===r.toLowerCase()?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="gm-divider"></div>
      <div class="gm-toggle-row" onclick="toggleServerNSFW()">
        <div class="gm-toggle-info">${uiIcon('shield',16)}<span>Yetişkin Kanallarına İzin Ver</span></div>
        <div class="gm-toggle ${Store.serverSettings?.nsfw?'on':''}"><div class="gm-toggle-knob"></div></div>
      </div>
      <div class="gm-toggle-row" onclick="toggleServerVerification()">
        <div class="gm-toggle-info">${uiIcon('check-circle',16)}<span>Doğrulama Gerekli</span></div>
        <div class="gm-toggle ${Store.serverSettings?.verification?'on':''}"><div class="gm-toggle-knob"></div></div>
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
        <button class="gm-btn primary" onclick="updateServerSettings()">${uiIcon('save',14)} Kaydet</button>
      </div>
    </div>`,

  roles: () => `
    <div class="gm-header">
      ${uiIcon('shield', 20)}
      <h2>Roller</h2>
    </div>
    <div class="gm-body">
      <div class="gm-list" id="roleList">
        ${(Store.roles||[]).length === 0
          ? `<div class="gm-empty">${uiIcon('shield',24)}<span>Henüz rol yok</span></div>`
          : (Store.roles||[]).map(r => `
            <div class="gm-list-item gm-role-item">
              <div class="gm-role-dot" style="background:${r.color||'#6366f1'}"></div>
              <span class="gm-item-name" style="color:${r.color||'inherit'}">${escapeHtml(r.name)}</span>
              <span class="gm-item-sub">${r.members||0} üye</span>
              ${r.editable !== false ? `
                <div class="gm-item-actions">
                  <button class="gm-icon-btn" onclick="editRoleUI('${r.id}')">${uiIcon('edit',13)}</button>
                  <button class="gm-icon-btn danger" onclick="deleteRoleUI('${r.id}')">${uiIcon('trash',13)}</button>
                </div>` : '<span class="gm-badge">Varsayılan</span>'}
            </div>`).join('')}
      </div>
      <button class="gm-btn primary full" style="margin-top:10px" onclick="createRoleUI()">
        ${uiIcon('plus',14)} Yeni Rol
      </button>
    </div>`,

  notifications: () => {
    const notifs = Store.notifications || [];
    const unread = notifs.filter(n => !n.read).length;
    return `
      <div class="gm-header">
        ${uiIcon('bell', 20)}
        <h2>Bildirimler</h2>
        ${unread > 0 ? `<span class="gm-badge red">${unread}</span>` : ''}
        ${notifs.length > 0 ? `<button class="gm-header-btn" onclick="markAllRead()" title="Tümünü Okundu İşaretle">${uiIcon('check',15)}</button>` : ''}
      </div>
      <div class="gm-body">
        <div class="gm-toggle-row" onclick="toggleNotifDesktop()">
          <div class="gm-toggle-info">${uiIcon('monitor',16)}<span>Masaüstü Bildirimleri</span></div>
          <div class="gm-toggle ${localStorage.getItem('gt_notif_desktop')!=='0'?'on':''}"><div class="gm-toggle-knob"></div></div>
        </div>
        <div class="gm-toggle-row" onclick="toggleNotifSound()">
          <div class="gm-toggle-info">${uiIcon('volume',16)}<span>Bildirim Sesi</span></div>
          <div class="gm-toggle ${localStorage.getItem('gt_notif_sound')!=='0'?'on':''}"><div class="gm-toggle-knob"></div></div>
        </div>
        <div class="gm-divider"></div>
        <div class="gm-list" style="max-height:280px;overflow-y:auto">
          ${notifs.length === 0
            ? `<div class="gm-empty">${uiIcon('inbox',28)}<span>Bildirim yok</span></div>`
            : notifs.slice(0,30).map(n => `
              <div class="gm-list-item ${n.read?'read':''}" onclick="readNotif('${n._id||n.id}')">
                <div class="gm-notif-icon ${n.type||'info'}">${uiIcon(n.type==='mention'?'at-sign':n.type==='reaction'?'heart':'bell', 14)}</div>
                <div class="gm-item-info">
                  <span class="gm-item-name">${escapeHtml(n.text||n.title||'')}</span>
                  <span class="gm-item-sub">${typeof formatTime==='function'?formatTime(n.time):''}</span>
                </div>
                ${!n.read ? '<div class="gm-unread-dot"></div>' : ''}
              </div>`).join('')}
        </div>
      </div>`;
  },

  search: () => `
    <div class="gm-header">
      ${uiIcon('search', 20)}
      <h2>Mesaj Ara</h2>
    </div>
    <div class="gm-body">
      <div class="gm-input-wrap">
        ${uiIcon('search', 14)}
        <input class="gm-input" id="searchInput" placeholder="Mesajlarda ara..." autofocus oninput="performSearch(this.value)">
        <button class="gm-input-clear" id="searchClear" style="display:none" onclick="document.getElementById('searchInput').value='';performSearch('');this.style.display='none'">${uiIcon('x',12)}</button>
      </div>
      <div class="gm-search-filters">
        <button class="gm-chip on" onclick="toggleSearchFilter(this,'all')">Tümü</button>
        <button class="gm-chip" onclick="toggleSearchFilter(this,'mine')">Benim</button>
        <button class="gm-chip" onclick="toggleSearchFilter(this,'media')">Medya</button>
      </div>
      <div id="searchResults" class="gm-list" style="margin-top:8px;max-height:380px;overflow-y:auto">
        <div class="gm-empty">${uiIcon('search',24)}<span>Aramak için yaz</span></div>
      </div>
    </div>`,

  imageView: (data) => `
    <div class="gm-img-view">
      <img src="${escapeHtml(data?.src||window._viewImage||'')}" onclick="closeModal()" style="max-width:100%;max-height:80vh;border-radius:12px;cursor:zoom-out;display:block">
      <div class="gm-actions" style="margin-top:10px">
        <button class="gm-btn ghost" onclick="closeModal()">Kapat</button>
        <a class="gm-btn primary" href="${escapeHtml(data?.src||window._viewImage||'')}" download="gettic-gorsel.png">${uiIcon('download',14)} İndir</a>
      </div>
    </div>`,

  inviteLink: () => {
    const link = `https://gettic.js.org/invite/${Store.activeGuild||'server'}`;
    return `
      <div class="gm-header">
        ${uiIcon('link', 20)}
        <h2>Davet Linki</h2>
      </div>
      <div class="gm-body">
        <p class="gm-hint">Bu linki paylaşarak arkadaşlarını sunucuna davet et.</p>
        <div class="gm-copy-box">
          <input class="gm-input" id="inviteLinkInput" value="${link}" readonly onclick="this.select()">
          <button class="gm-btn primary" onclick="copyInviteLink()">${uiIcon('copy',14)} Kopyala</button>
        </div>
        <div class="gm-field" style="margin-top:12px">
          <label class="gm-label">Süre</label>
          <select class="gm-select" id="inviteExpiry">
            <option value="0">Süresiz</option>
            <option value="3600">1 Saat</option>
            <option value="86400" selected>24 Saat</option>
            <option value="604800">7 Gün</option>
          </select>
        </div>
        <div class="gm-field">
          <label class="gm-label">Maks. Kullanım</label>
          <select class="gm-select" id="inviteMaxUses">
            <option value="0">Sınırsız</option>
            <option value="1">1</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
        <button class="gm-btn ghost full" onclick="generateNewInvite()">${uiIcon('refresh-cw',14)} Yeni Link Üret</button>
      </div>`;
  },

  _default: (type) => `
    <div class="gm-header">
      ${uiIcon('file-text', 20)}
      <h2>${escapeHtml(type)}</h2>
    </div>
    <div class="gm-body">
      <div class="gm-empty">${uiIcon('tool',28)}<span>Yapım aşamasında</span><small>Bu özellik yakında gelecek</small></div>
    </div>`
};

// ============ TEMA ============
function setTheme(c, preview = false) {
  Store.theme = c;
  localStorage.setItem('gt_ac', c);
  document.querySelector('.app')?.style.setProperty('--ac', c);
  // Türev renkler
  document.documentElement.style.setProperty('--ac', c);
  document.documentElement.style.setProperty('--acd', c + '33');
  if (!preview) {
    if (typeof saveStore === 'function') saveStore();
    toast('Tema değiştirildi');
  }
}

function toggleLightMode() {
  Store.lightMode = !Store.lightMode;
  localStorage.setItem('gt_light', Store.lightMode ? '1' : '0');
  document.body.classList.toggle('light-mode', Store.lightMode);
  const vars = Store.lightMode ? {
    '--bg':'#f5f5f0','--bg1':'#eeede8','--bg2':'#e5e3dc',
    '--t1':'#1a1916','--t2':'#4a4840','--t3':'#7a7870'
  } : {
    '--bg':'#0f0a14','--bg1':'#1a0f24','--bg2':'#241535',
    '--t1':'#fdf2f8','--t2':'#fce7f3','--t3':'#d8b4d0'
  };
  Object.entries(vars).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
  if (typeof saveStore === 'function') saveStore();
  Modal.refresh('theme');
}

function toggleCompactMode() {
  Store.compactMode = !Store.compactMode;
  localStorage.setItem('gt_compact', Store.compactMode ? '1' : '0');
  document.body.classList.toggle('compact-mode', Store.compactMode);
  if (typeof saveStore === 'function') saveStore();
  Modal.refresh('theme');
}

function toggleAnimations() {
  Store.animations = Store.animations === false ? true : false;
  localStorage.setItem('gt_anim', Store.animations ? '1' : '0');
  document.body.classList.toggle('no-animations', !Store.animations);
  if (typeof saveStore === 'function') saveStore();
  Modal.refresh('theme');
}

function setStatus(s) {
  if (Store.user) Store.user.status = s;
  // Sunucuya bildir
  if (typeof socket !== 'undefined' && socket?.emit) {
    socket.emit('statusChange', { status: s });
  }
  if (typeof saveStore === 'function') saveStore();
  toast(`Durum: ${{'online':'Çevrimiçi','idle':'Boşta','dnd':'Rahatsız Etme','invisible':'Görünmez'}[s]||s}`);
  Modal.refresh('profile');
}

// ============ SIDEBAR & PANEL ============
function toggleSidebar() {
  const s = document.getElementById('sidebar');
  if (!s) return;
  const isOpen = s.classList.toggle('open');
  Store.sidebarOpen = isOpen;
  if (typeof saveStore === 'function') saveStore();
}

function togglePanel() {
  const p = document.getElementById('userPanel');
  if (!p) return;
  const visible = p.style.display === 'block';
  p.style.opacity = visible ? '0' : '1';
  p.style.transform = visible ? 'translateY(8px)' : 'translateY(0)';
  p.style.display = visible ? 'none' : 'block';
  if (!visible) {
    p.style.opacity = '0';
    p.style.transform = 'translateY(8px)';
    requestAnimationFrame(() => {
      p.style.transition = 'opacity .2s ease, transform .2s ease';
      p.style.opacity = '1';
      p.style.transform = 'translateY(0)';
    });
  }
}

// ============ GÖRSEL ============
let _imgStyleTags = [];
function updateImgStyle() {
  _imgStyleTags = [...document.querySelectorAll('.gm-style-chips .gm-chip.on')].map(b => b.textContent.trim());
}

async function generateImageUI() {
  const promptEl = document.getElementById('modalImgPrompt');
  const prompt = promptEl?.value?.trim();
  if (!prompt) return toast('Açıklama gerekli', 'e');

  const fullPrompt = _imgStyleTags.length ? `${prompt}, ${_imgStyleTags.join(', ')} style` : prompt;

  const loading  = document.getElementById('imgLoading');
  const result   = document.getElementById('imgResultWrap');
  const btn      = document.getElementById('imgGenBtn');

  if (loading)  loading.style.display  = 'flex';
  if (result)   result.style.display   = 'none';
  if (btn)      btn.disabled = true;

  try {
    const res = await fetch(API + '/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt })
    });
    const data = await res.json();

    if (loading) loading.style.display = 'none';
    if (btn)     btn.disabled = false;

    if (data.image) {
      const img = document.getElementById('modalImgResult');
      if (img) { img.src = data.image; }
      if (result) result.style.display = 'block';
      window._generatedImage = data.image;
      toast('Görsel oluşturuldu');
    } else {
      toast(data.error || 'Görsel oluşturulamadı', 'e');
    }
  } catch (e) {
    if (loading) loading.style.display = 'none';
    if (btn)     btn.disabled = false;
    toast('Bağlantı hatası', 'e');
  }
}

function sendImageToChat() {
  if (!window._generatedImage) return;
  if (typeof Store === 'undefined' || !Store.user) return toast('Giriş yapılı değil', 'e');
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
  const src = window._generatedImage || window._viewImage;
  if (!src) return;
  const a = document.createElement('a');
  a.href = src;
  a.download = `gettic-gorsel-${Date.now()}.png`;
  a.click();
}

function viewFullImage(src) {
  window._viewImage = src;
  Modal.open('imageView', { src });
}

// ============ ARAMA ============
let _searchFilter = 'all';

function toggleSearchFilter(btn, filter) {
  document.querySelectorAll('.gm-search-filters .gm-chip').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  _searchFilter = filter;
  const q = document.getElementById('searchInput')?.value;
  if (q) performSearch(q);
}

function performSearch(query) {
  const c = document.getElementById('searchResults');
  const clr = document.getElementById('searchClear');
  if (!c) return;
  if (clr) clr.style.display = query ? 'flex' : 'none';

  if (!query || query.trim().length < 2) {
    c.innerHTML = `<div class="gm-empty">${uiIcon('search',24)}<span>En az 2 karakter yaz</span></div>`;
    return;
  }

  const q = query.toLowerCase();
  const uid = Store.user?._id;
  let msgs = (Store.messages || []).filter(m => {
    if (_searchFilter === 'mine' && m.senderId !== uid) return false;
    if (_searchFilter === 'media' && !m.image && !m.file) return false;
    return (m.content || '').toLowerCase().includes(q);
  }).slice(-50).reverse();

  if (msgs.length === 0) {
    c.innerHTML = `<div class="gm-empty">${uiIcon('search',24)}<span>Sonuç bulunamadı</span></div>`;
    return;
  }

  // Highlight
  const hl = (text) => {
    const idx = text.toLowerCase().indexOf(q);
    if (idx < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0,idx)) + `<mark class="gm-hl">${escapeHtml(text.slice(idx,idx+q.length))}</mark>` + escapeHtml(text.slice(idx+q.length));
  };

  c.innerHTML = msgs.map(m => `
    <div class="gm-list-item" onclick="jumpToMessage('${m._id}')">
      <div class="gm-av">${(m.senderName||'?').charAt(0).toUpperCase()}</div>
      <div class="gm-item-info">
        <span class="gm-item-name">${escapeHtml(m.senderName||'?')}</span>
        <span class="gm-item-sub">${hl(m.content?.substring(0,80)||'')}</span>
      </div>
      <span class="gm-item-time">${typeof formatTime==='function'?formatTime(m.createdAt):''}</span>
    </div>`).join('');
}

function jumpToMessage(mid) {
  closeModal();
  setTimeout(() => {
    const el = document.getElementById('msg-' + mid);
    if (!el) return toast('Mesaj bulunamadı', 'w');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('gm-msg-highlight');
    setTimeout(() => el.classList.remove('gm-msg-highlight'), 2200);
  }, 300);
}

// ============ ANKET ============
function addPollOptionUI() {
  const c = document.getElementById('pollOptionsContainer');
  if (!c) return;
  if (c.children.length >= 10) return toast('En fazla 10 seçenek', 'w');
  const d = document.createElement('div');
  d.className = 'gm-poll-opt-row';
  d.innerHTML = `
    ${uiIcon('circle',14)}
    <input class="gm-input" placeholder="Seçenek ${c.children.length+1}" maxlength="80">
    <button class="gm-icon-btn danger" onclick="this.parentElement.remove()">${uiIcon('x',13)}</button>`;
  c.appendChild(d);
  d.querySelector('input').focus();
}

function submitPollForm() {
  const q    = document.getElementById('modalPollQ')?.value?.trim();
  const opts = [...document.querySelectorAll('#pollOptionsContainer input')].map(i=>i.value.trim()).filter(Boolean);
  const dur  = parseInt(document.getElementById('modalPollDuration')?.value || '0');

  if (!q || q.length < 3)   return toast('Soru en az 3 karakter olmalı', 'e');
  if (opts.length < 2)       return toast('En az 2 seçenek ekle', 'e');
  if (new Set(opts).size !== opts.length) return toast('Seçenekler tekrar etmemeli', 'w');

  if (typeof createPoll === 'function') createPoll(q, opts, dur);
  closeModal();
}

function submitChannelForm() {
  const n = document.getElementById('modalChName')?.value?.trim();
  const t = document.querySelector('[name="chType"]:checked')?.value || 'text';
  const c = document.getElementById('modalChCat')?.value;

  if (!n || n.length < 1) return toast('Kanal adı gerekli', 'e');
  if (typeof createChannel === 'function') createChannel(n, t, c);
  closeModal();
}

// ============ SUNUCU ============
function updateServerSettings() {
  const name   = document.getElementById('svName')?.value?.trim();
  const desc   = document.getElementById('svDesc')?.value?.trim();
  const region = document.getElementById('svRegion')?.value;
  if (!name) return toast('Sunucu adı boş olamaz', 'e');
  if (name.length < 2) return toast('Sunucu adı çok kısa', 'e');

  Store.serverSettings = { ...Store.serverSettings, name, description: desc||'', region };
  const el = document.getElementById('serverName');
  if (el) el.textContent = name;
  if (typeof saveStore === 'function') saveStore();
  if (typeof socket !== 'undefined' && socket?.emit) {
    socket.emit('updateServer', { name, description: desc, region });
  }
  toast('Sunucu ayarları kaydedildi');
  closeModal();
}

function copyInviteLink() {
  const val = document.getElementById('inviteLinkInput')?.value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => toast('Link kopyalandı')).catch(() => {
    document.getElementById('inviteLinkInput')?.select();
    document.execCommand('copy');
    toast('Link kopyalandı');
  });
}

// ============ PROFİL ============
function changeNicknameUI() {
  const nick = prompt('Yeni takma adınız (boş bırakırsanız kaldırılır):');
  if (nick === null) return;
  if (typeof changeNickname === 'function') {
    changeNickname(Store.user?._id, nick)
      .then(() => { toast('Takma ad güncellendi'); Modal.refresh('profile'); })
      .catch(e => toast(e.message || 'Hata', 'e'));
  }
}

function changePasswordUI() {
  const o = prompt('Mevcut şifre:');
  if (!o) return;
  const n = prompt('Yeni şifre (min. 6 karakter):');
  if (!n) return;
  if (n.length < 6) return toast('Şifre en az 6 karakter olmalı', 'e');
  const n2 = prompt('Şifreyi tekrar gir:');
  if (n !== n2) return toast('Şifreler eşleşmiyor', 'e');
  if (typeof changePassword === 'function') {
    changePassword(o, n)
      .then(() => toast('Şifre başarıyla değiştirildi'))
      .catch(e => toast(e.message || 'Hata', 'e'));
  }
}

function confirmDeleteAccount() {
  if (!confirm('Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) return;
  const pw = prompt('Onaylamak için şifrenizi girin:');
  if (!pw) return;
  if (typeof deleteAccount === 'function') {
    deleteAccount(pw)
      .then(() => { toast('Hesap silindi'); closeModal(); })
      .catch(e => toast(e.message || 'Hata', 'e'));
  }
}

// ============ BİLDİRİMLER ============
function toggleNotifDesktop() {
  const cur = localStorage.getItem('gt_notif_desktop') !== '0';
  localStorage.setItem('gt_notif_desktop', cur ? '0' : '1');
  if (!cur && 'Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission().then(p => {
      if (p !== 'granted') {
        localStorage.setItem('gt_notif_desktop', '0');
        toast('Bildirim izni verilmedi', 'w');
      }
    });
  }
  Modal.refresh('notifications');
}

function toggleNotifSound() {
  const cur = localStorage.getItem('gt_notif_sound') !== '0';
  localStorage.setItem('gt_notif_sound', cur ? '0' : '1');
  Modal.refresh('notifications');
}

function markAllRead() {
  if (Store.notifications) Store.notifications.forEach(n => n.read = true);
  if (typeof saveStore === 'function') saveStore();
  Modal.refresh('notifications');
  toast('Tümü okundu işaretlendi');
}

function readNotif(id) {
  const n = Store.notifications?.find(n => (n._id||n.id) === id);
  if (n) {
    n.read = true;
    if (typeof saveStore === 'function') saveStore();
    Modal.refresh('notifications');
    if (n.link) window.location.href = n.link;
  }
}

// ============ SUNUCU AVATAR (YENİ) ============
function handleSvAvatar(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast('Sadece resim dosyası', 'e');
  if (file.size > 5 * 1024 * 1024) return toast('Dosya 5MB\'dan küçük olmalı', 'e');
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('svAvatarPreview');
    if (prev) prev.style.backgroundImage = `url(${e.target.result})`;
    window._svAvatarData = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ============ CSS ============
(function injectStyles() {
  const id = 'gt-ui-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
/* ─── Toasts ─── */
#toast {
  position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:10px;
  padding:10px 16px;border-radius:12px;font-size:13px;font-weight:500;
  background:var(--bg1,#1a0f24);border:1px solid rgba(255,255,255,.1);
  box-shadow:0 8px 32px rgba(0,0,0,.4);z-index:9999;
  pointer-events:all;cursor:default;min-width:180px;max-width:360px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
#toast.gt-toast-s{border-color:#10b98144;color:#10b981}
#toast.gt-toast-e{border-color:#ef444444;color:#ef4444}
#toast.gt-toast-w{border-color:#f59e0b44;color:#f59e0b}
#toast.gt-toast-i{border-color:var(--ac,#6366f1)44;color:var(--ac,#6366f1)}
.gt-toast-msg{flex:1}
.gt-toast-close{background:none;border:none;cursor:pointer;opacity:.5;padding:0;line-height:1;color:inherit;margin-left:4px}
.gt-toast-close:hover{opacity:1}

/* ─── Modal Overlay ─── */
#modal{
  position:fixed;inset:0;z-index:999;
  display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.7);backdrop-filter:blur(6px);
  padding:16px;
}
#modal.hidden{display:none!important}
#modal.show{display:flex}

/* ─── Modal Content Box ─── */
#modalContent{
  background:var(--bg1,#1a0f24);
  border:1px solid rgba(255,255,255,.08);
  border-radius:20px;box-shadow:0 24px 64px rgba(0,0,0,.6);
  width:100%;max-width:480px;max-height:88vh;overflow-y:auto;
  scrollbar-width:thin;
}
#modalContent::-webkit-scrollbar{width:4px}
#modalContent::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}

/* ─── Modal Parts ─── */
.gm-header{
  display:flex;align-items:center;gap:10px;padding:20px 20px 0;
  position:sticky;top:0;z-index:2;background:var(--bg1,#1a0f24);
  border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:14px;
  margin-bottom:0;
}
.gm-header h2{flex:1;font-size:16px;font-weight:700;margin:0;color:var(--t1,#fff)}
.gm-header-btn{background:none;border:none;cursor:pointer;opacity:.6;padding:4px;border-radius:8px;color:var(--t1,#fff);line-height:1}
.gm-header-btn:hover{opacity:1;background:rgba(255,255,255,.08)}
.gm-body{padding:16px 20px 20px}
.gm-field{margin-bottom:14px}
.gm-label{display:block;font-size:11px;font-weight:600;color:var(--t3,#999);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.gm-label-hint{font-size:10px;color:var(--t3,#999);text-transform:none;font-weight:400;letter-spacing:0}
.gm-hint{font-size:12px;color:var(--t3,#999);margin:0 0 12px}
.gm-section-label{font-size:11px;font-weight:600;color:var(--t3,#999);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
.gm-divider{border:none;border-top:1px solid rgba(255,255,255,.07);margin:14px 0}

/* ─── Inputs ─── */
.gm-input{
  width:100%;box-sizing:border-box;
  background:var(--bg2,#241535);border:1.5px solid rgba(255,255,255,.08);
  border-radius:10px;padding:9px 12px;font-size:13px;color:var(--t1,#fff);
  outline:none;transition:border .2s;font-family:inherit;
}
.gm-input:focus{border-color:var(--ac,#6366f1)}
.gm-input::placeholder{color:var(--t3,#888)}
.gm-textarea{
  width:100%;box-sizing:border-box;resize:vertical;
  background:var(--bg2,#241535);border:1.5px solid rgba(255,255,255,.08);
  border-radius:10px;padding:9px 12px;font-size:13px;color:var(--t1,#fff);
  outline:none;transition:border .2s;font-family:inherit;line-height:1.5;
}
.gm-textarea:focus{border-color:var(--ac,#6366f1)}
.gm-select{
  width:100%;box-sizing:border-box;
  background:var(--bg2,#241535);border:1.5px solid rgba(255,255,255,.08);
  border-radius:10px;padding:9px 12px;font-size:13px;color:var(--t1,#fff);
  outline:none;cursor:pointer;font-family:inherit;
}
.gm-input-wrap{
  position:relative;display:flex;align-items:center;gap:0;
}
.gm-input-wrap svg{position:absolute;left:10px;opacity:.5;pointer-events:none}
.gm-input-wrap .gm-input{padding-left:32px}
.gm-input-clear{
  position:absolute;right:8px;background:none;border:none;cursor:pointer;
  opacity:.5;color:var(--t1,#fff);line-height:1;padding:2px;border-radius:4px;
}
.gm-input-clear:hover{opacity:1}

/* ─── Buttons ─── */
.gm-btn{
  display:inline-flex;align-items:center;gap:6px;
  padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;
  border:none;cursor:pointer;font-family:inherit;transition:all .15s;
}
.gm-btn.primary{background:var(--ac,#6366f1);color:#fff}
.gm-btn.primary:hover{filter:brightness(1.12)}
.gm-btn.primary:active{filter:brightness(.95)}
.gm-btn.ghost{background:rgba(255,255,255,.07);color:var(--t1,#fff);border:1.5px solid rgba(255,255,255,.1)}
.gm-btn.ghost:hover{background:rgba(255,255,255,.12)}
.gm-btn.danger{background:#ef444420;color:#ef4444;border:1.5px solid #ef444430}
.gm-btn.danger:hover{background:#ef4444;color:#fff}
.gm-btn.sm{padding:6px 12px;font-size:12px}
.gm-btn.full{width:100%;justify-content:center;box-sizing:border-box}
.gm-btn:disabled{opacity:.5;cursor:not-allowed}
.gm-icon-btn{
  background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;
  opacity:.6;color:var(--t1,#fff);line-height:1;
}
.gm-icon-btn:hover{opacity:1;background:rgba(255,255,255,.08)}
.gm-icon-btn.danger:hover{color:#ef4444}
.gm-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px}

/* ─── Channel Type Grid ─── */
.gm-type-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gm-type-card input[type=radio]{display:none}
.gm-type-inner{
  padding:10px 12px;border-radius:10px;border:1.5px solid rgba(255,255,255,.08);
  cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:3px;
}
.gm-type-card input:checked + .gm-type-inner{border-color:var(--ac,#6366f1);background:var(--ac,#6366f1)18}
.gm-type-label{font-size:13px;font-weight:600;color:var(--t1,#fff)}
.gm-type-desc{font-size:10px;color:var(--t3,#888)}

/* ─── Colors ─── */
.gm-color-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.gm-color-btn{
  position:relative;width:36px;height:36px;border-radius:50%;border:2.5px solid transparent;
  cursor:pointer;background:none;padding:0;transition:transform .15s,border-color .15s;
  display:flex;align-items:center;justify-content:center;
}
.gm-color-btn.act{border-color:rgba(255,255,255,.7);transform:scale(1.15)}
.gm-color-btn:hover:not(.act){transform:scale(1.08)}
.gm-color-dot{width:26px;height:26px;border-radius:50%;display:block}
.gm-color-check{position:absolute}
.gm-color-custom{width:36px;height:36px;background:rgba(255,255,255,.08)!important;border-color:rgba(255,255,255,.15)!important}
.gm-color-custom input{position:absolute;opacity:0;width:100%;height:100%;cursor:pointer}

/* ─── Toggles ─── */
.gm-toggle-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;
}
.gm-toggle-row:last-child{border-bottom:none}
.gm-toggle-info{display:flex;align-items:center;gap:8px;color:var(--t1,#fff);font-size:13px}
.gm-toggle{
  width:38px;height:22px;border-radius:11px;background:rgba(255,255,255,.15);
  position:relative;transition:background .2s;flex-shrink:0;
}
.gm-toggle.on{background:var(--ac,#6366f1)}
.gm-toggle-knob{
  position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;
  background:#fff;transition:transform .2s cubic-bezier(.34,1.56,.64,1);
  box-shadow:0 1px 4px rgba(0,0,0,.3);
}
.gm-toggle.on .gm-toggle-knob{transform:translateX(16px)}

/* ─── List / Items ─── */
.gm-list{display:flex;flex-direction:column;gap:2px}
.gm-list-item{
  display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;
  cursor:pointer;transition:background .15s;
}
.gm-list-item:hover{background:rgba(255,255,255,.06)}
.gm-list-item.read{opacity:.5}
.gm-item-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.gm-item-name{font-size:13px;font-weight:600;color:var(--t1,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gm-item-sub{font-size:11px;color:var(--t3,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gm-item-time{font-size:10px;color:var(--t3,#888);flex-shrink:0}
.gm-item-actions{display:flex;gap:4px;opacity:0;transition:opacity .15s}
.gm-list-item:hover .gm-item-actions{opacity:1}

/* ─── Avatar ─── */
.gm-av{
  width:34px;height:34px;border-radius:50%;background:var(--ac,#6366f1);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:700;color:#fff;flex-shrink:0;position:relative;
}
.gm-av.online::after{
  content:'';position:absolute;bottom:0;right:0;width:9px;height:9px;
  border-radius:50%;background:#10b981;border:2px solid var(--bg1,#1a0f24);
}

/* ─── Badges ─── */
.gm-badge{
  font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;
  background:var(--ac,#6366f1)22;color:var(--ac,#6366f1);
}
.gm-badge.red{background:#ef444422;color:#ef4444}

/* ─── Profile ─── */
.gm-profile-hero{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.gm-profile-av{
  width:60px;height:60px;border-radius:50%;background:var(--ac,#6366f1);
  display:flex;align-items:center;justify-content:center;
  font-size:24px;font-weight:800;color:#fff;cursor:pointer;position:relative;overflow:hidden;
}
.gm-av-overlay{
  position:absolute;inset:0;background:rgba(0,0,0,.5);
  display:flex;align-items:center;justify-content:center;
  opacity:0;transition:opacity .2s;
}
.gm-profile-av:hover .gm-av-overlay{opacity:1}
.gm-profile-info h3{font-size:16px;font-weight:700;margin:0 0 4px;color:var(--t1,#fff)}
.gm-role-badge{font-size:11px;padding:2px 8px;border-radius:20px;background:var(--ac,#6366f1)22;color:var(--ac,#6366f1);font-weight:600}
.gm-profile-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.gm-stat{background:var(--bg2,#241535);border-radius:10px;padding:10px;text-align:center}
.gm-stat-val{display:block;font-size:15px;font-weight:700;color:var(--t1,#fff)}
.gm-stat-lbl{display:block;font-size:10px;color:var(--t3,#888)}
.gm-status-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.gm-status-btn{
  display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:9px;
  background:var(--bg2,#241535);border:1.5px solid rgba(255,255,255,.06);
  cursor:pointer;font-size:12px;font-weight:600;color:var(--t1,#fff);font-family:inherit;transition:all .15s;
}
.gm-status-btn.act{border-color:var(--ac,#6366f1);background:var(--ac,#6366f1)18}
.gm-status-btn:hover{border-color:rgba(255,255,255,.15)}
.gm-status-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.gm-action-list{display:flex;flex-direction:column;gap:4px}
.gm-action-btn{
  display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:9px;
  background:var(--bg2,#241535);border:none;cursor:pointer;font-size:13px;
  color:var(--t1,#fff);font-family:inherit;transition:background .15s;text-align:left;
}
.gm-action-btn:hover{background:rgba(255,255,255,.08)}

/* ─── Roles ─── */
.gm-role-item{cursor:default}
.gm-role-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}

/* ─── Poll ─── */
.gm-poll-opts{display:flex;flex-direction:column;gap:6px}
.gm-poll-opt-row{display:flex;align-items:center;gap:8px}
.gm-poll-opt-row .gm-input{flex:1;margin-bottom:0}

/* ─── Image ─── */
.gm-img-loading{display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px;color:var(--t3,#888);font-size:12px}
.gm-spinner{width:28px;height:28px;border:2.5px solid rgba(255,255,255,.1);border-top-color:var(--ac,#6366f1);border-radius:50%;animation:gt-spin .7s linear infinite}
@keyframes gt-spin{to{transform:rotate(360deg)}}
.gm-img-result{width:100%;border-radius:12px;cursor:zoom-in;transition:transform .15s}
.gm-img-result:hover{transform:scale(1.01)}
.gm-img-view{text-align:center}

/* ─── Style chips / search filters ─── */
.gm-style-chips,.gm-search-filters{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.gm-chip{
  padding:5px 11px;border-radius:20px;font-size:11px;font-weight:600;
  background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.1);
  cursor:pointer;color:var(--t2,#ddd);transition:all .15s;
}
.gm-chip.on{background:var(--ac,#6366f1)22;border-color:var(--ac,#6366f1);color:var(--ac,#6366f1)}

/* ─── Empty states ─── */
.gm-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:32px 16px;color:var(--t3,#888)}
.gm-empty span{font-size:13px;font-weight:600;color:var(--t2,#aaa)}
.gm-empty small{font-size:11px}

/* ─── Notification dot ─── */
.gm-notif-icon{
  width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;
  background:var(--ac,#6366f1)22;color:var(--ac,#6366f1);
}
.gm-unread-dot{width:8px;height:8px;border-radius:50%;background:var(--ac,#6366f1);flex-shrink:0}

/* ─── Copy box ─── */
.gm-copy-box{display:flex;gap:8px}
.gm-copy-box .gm-input{flex:1}

/* ─── Highlight ─── */
mark.gm-hl{background:var(--ac,#6366f1)44;color:inherit;border-radius:3px;padding:0 2px}
.gm-msg-highlight{background:var(--ac,#6366f1)18!important;transition:background 2s}

/* ─── Avatar pick ─── */
.gm-avatar-pick{display:flex;justify-content:center;margin-bottom:14px}
.gm-avatar-preview{
  width:72px;height:72px;border-radius:50%;background:var(--ac,#6366f1);
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  font-size:28px;font-weight:800;color:#fff;position:relative;overflow:hidden;
  background-size:cover;background-position:center;
}
.gm-avatar-preview svg{position:absolute;bottom:4px;right:4px;opacity:.8}

/* ─── Compact mode ─── */
.compact-mode .gm-list-item{padding:5px 8px}
.compact-mode .gm-av{width:26px;height:26px;font-size:10px}

/* ─── No animations ─── */
.no-animations *{transition:none!important;animation:none!important}
  `;
  document.head.appendChild(style);
})();

console.log('%c[Gettic] UI.js v2.0 yüklendi', 'color:#6366f1;font-weight:bold');
