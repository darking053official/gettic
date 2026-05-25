// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC CHANNELS.JS v2.0 - Realtime + MongoDB + localStorage    ║
// ╚══════════════════════════════════════════════════════════════════╝

// ============ KANAL STATE ============
const ChannelState = (() => {
  const STORAGE_KEY_CHANNELS   = 'gt_channels';
  const STORAGE_KEY_CATEGORIES = 'gt_categories';
  const STORAGE_KEY_ACTIVE     = 'gt_activeChannel';
  const STORAGE_KEY_COLLAPSED  = 'gt_collapsed_cats';

  // Yerel kaydedilmiş collapsed kategoriler
  let _collapsed = new Set();
  try { _collapsed = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_COLLAPSED) || '[]')); } catch {}

  // Kanal okunmamış sayaçları  { chId → count }
  const _unread = new Map();

  // Aktif ses kanalı kullanıcıları { chId → [userId, ...] }
  const _voiceUsers = {};

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_CHANNELS,   JSON.stringify(Store.channels   || []));
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(Store.categories || []));
      localStorage.setItem(STORAGE_KEY_ACTIVE,     Store.activeChannel || '');
    } catch (e) {
      _chLog('localStorage kayıt hatası: ' + e.message, 'warn');
    }
  }

  function loadLocal() {
    try {
      const chs  = localStorage.getItem(STORAGE_KEY_CHANNELS);
      const cats = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      const act  = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (chs  && !Store.channels?.length)   Store.channels   = JSON.parse(chs);
      if (cats && !Store.categories?.length) Store.categories = JSON.parse(cats);
      if (act  && !Store.activeChannel)      Store.activeChannel = act;
    } catch {}
  }

  function toggleCollapse(cat) {
    if (_collapsed.has(cat)) _collapsed.delete(cat);
    else                     _collapsed.add(cat);
    try { localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify([..._collapsed])); } catch {}
  }

  function isCollapsed(cat) { return _collapsed.has(cat); }

  function addUnread(chId, count = 1) {
    if (chId === Store.activeChannel) return;
    _unread.set(chId, (_unread.get(chId) || 0) + count);
  }

  function clearUnread(chId) { _unread.delete(chId); }
  function getUnread(chId)   { return _unread.get(chId) || 0; }

  function setVoiceUsers(chId, users) { _voiceUsers[chId] = users; }
  function getVoiceUsers(chId)        { return _voiceUsers[chId] || []; }

  return { saveLocal, loadLocal, toggleCollapse, isCollapsed, addUnread, clearUnread, getUnread, setVoiceUsers, getVoiceUsers };
})();

// ============ LOG ============
function _chLog(msg, level = 'log') {
  console[level](`%c[Channels] ${msg}`, 'color:#10b981;font-weight:bold');
}

// ============ KANAL LİSTESİ RENDER ============
function renderChannels() {
  const el = document.getElementById('channelList');
  if (!el) return;

  const channels   = Store.channels   || [];
  const categories = Store.categories || ['METİN', 'SES'];
  const isAdmin    = typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'manageChannels');

  // Kanal başlığını güncelle
  const activeCh = channels.find(c => c.id === Store.activeChannel);
  _updateChannelHeader(activeCh);

  // Admin butonları
  const addCatBtn = document.getElementById('addCategoryBtn');
  const addChBtn  = document.getElementById('addChannelSidebarBtn');
  if (addCatBtn) addCatBtn.style.display = isAdmin ? '' : 'none';
  if (addChBtn)  addChBtn.style.display  = isAdmin ? '' : 'none';

  // Render
  el.innerHTML = categories.map(cat => {
    const catChannels = channels.filter(ch => ch.category === cat);
    if (catChannels.length === 0 && !isAdmin) return '';
    const collapsed = ChannelState.isCollapsed(cat);

    return `
      <div class="ch-category-wrap">
        <div class="ch-cat" onclick="toggleCategoryCollapse('${escapeHtml(cat)}')">
          <svg class="ch-cat-arrow ${collapsed ? 'collapsed' : ''}" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          <span class="ch-cat-name">${escapeHtml(cat)}</span>
          ${isAdmin ? `<button class="ch-cat-add" onclick="event.stopPropagation();openModal('addChannel')" title="Kanal Ekle">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>` : ''}
        </div>
        <div class="ch-list ${collapsed ? 'collapsed' : ''}">
          ${catChannels.map(ch => _renderChannelItem(ch, isAdmin)).join('')}
          ${catChannels.length === 0 && isAdmin ? `<div class="ch-empty-cat">Kanal yok — ekle!</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function _renderChannelItem(ch, isAdmin) {
  const isActive  = ch.id === Store.activeChannel;
  const unread    = ChannelState.getUnread(ch.id);
  const voiceUsers = ChannelState.getVoiceUsers(ch.id);
  const isProtected = ch.id === 'genel-sohbet';

  const ICONS = {
    text:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="14" y2="14"/></svg>`,
    voice:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
    forum:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    stage:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>`,
    announce:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    locked:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  };

  const icon    = ICONS[ch.type] || ICONS.text;
  const lockIcon = ch.private ? `<span class="ch-lock">${ICONS.locked}</span>` : '';

  return `
    <div class="ch-item ${isActive ? 'act' : ''} ${unread ? 'unread' : ''}"
      id="ch_${ch.id}"
      onclick="switchChannel('${ch.id}')"
      title="${escapeHtml(ch.topic || ch.name)}"
      draggable="${isAdmin ? 'true' : 'false'}"
      ondragstart="chDragStart(event,'${ch.id}')"
      ondragover="event.preventDefault()"
      ondrop="chDrop(event,'${ch.id}')">

      <span class="ch-icon">${icon}</span>
      <span class="ch-name">${escapeHtml(ch.name)}</span>
      ${lockIcon}
      ${unread ? `<span class="ch-unread">${unread > 99 ? '99+' : unread}</span>` : ''}

      <span class="ch-acts">
        ${ch.type === 'voice' ? `
          <button class="ch-act-btn" onclick="event.stopPropagation();joinVoice('${ch.id}')" title="Katıl">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>` : ''}
        ${isAdmin ? `
          <button class="ch-act-btn" onclick="event.stopPropagation();openChannelSettings('${ch.id}')" title="Ayarlar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          ${!isProtected ? `
          <button class="ch-act-btn danger" onclick="event.stopPropagation();deleteChannel('${ch.id}')" title="Sil">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>` : ''}` : ''}
      </span>
    </div>
    ${ch.type === 'voice' && voiceUsers.length > 0 ? `
      <div class="ch-voice-users">
        ${voiceUsers.slice(0,5).map(u => `
          <div class="ch-voice-user">
            <div class="ch-voice-av">${(u.name||'?').charAt(0).toUpperCase()}</div>
            <span>${escapeHtml(u.name)}</span>
          </div>`).join('')}
        ${voiceUsers.length > 5 ? `<span class="ch-voice-more">+${voiceUsers.length - 5}</span>` : ''}
      </div>` : ''}`;
}

function _updateChannelHeader(ch) {
  const nameEl  = document.getElementById('channelName');
  const topicEl = document.getElementById('channelTopic');
  if (nameEl)  nameEl.textContent  = ch?.name  || Store.activeChannel || 'Kanal';
  if (topicEl) topicEl.textContent = ch?.topic || '';
}

// ============ KATEGORİ TOGGLE ============
function toggleCategoryCollapse(cat) {
  ChannelState.toggleCollapse(cat);
  renderChannels();
}

// ============ KANAL GEÇİŞİ ============
function switchChannel(chId) {
  if (!chId || chId === Store.activeChannel) return;

  // Eski kanaldan ayrıl
  if (Store.activeChannel && socket?.connected) {
    socket.emit('leave_channel', Store.activeChannel);
  }

  // State temizle
  if (typeof saveStore === 'function') saveStore();
  ChannelState.clearUnread(chId);

  Store.activeChannel = chId;
  Store.messages      = [];
  Store.polls         = {};

  ChannelState.saveLocal();

  // Realtime: yeni kanala katıl
  if (socket?.connected) {
    socket.emit('join_channel', chId);
  }

  // MongoDB sync
  if (typeof MongoSync !== 'undefined' && MongoSync.syncCurrentChannel) {
    MongoSync.syncCurrentChannel(chId);
  }

  if (typeof renderMessages  === 'function') renderMessages();
  if (typeof closeMobileSidebar === 'function') closeMobileSidebar();

  renderChannels();
  _chLog('Kanala geçildi: ' + chId);
}

// ============ KANAL OLUŞTUR ============
function createChannel(name, type = 'text', category = 'METİN', options = {}) {
  name = name?.trim();
  if (!name)          return toast('Kanal adı gerekli', 'e');
  if (name.length < 1) return toast('Kanal adı çok kısa', 'e');
  if (name.length > 50) return toast('Kanal adı çok uzun (max 50)', 'e');
  if (typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'manageChannels')) {
    return toast('Yetkiniz yok', 'e');
  }
  if ((Store.channels || []).length >= 100) {
    return toast('Maksimum 100 kanal oluşturulabilir', 'w');
  }

  const id = _slugify(name);
  if (!id) return toast('Geçerli bir kanal adı girin', 'e');
  if ((Store.channels || []).find(c => c.id === id)) return toast('Bu kanal zaten var', 'e');

  const newChannel = {
    id,
    name: name.trim(),
    type:      type      || 'text',
    category:  category  || 'METİN',
    topic:     options.topic     || '',
    private:   options.private   || false,
    slowMode:  options.slowMode  || 0,   // saniye
    nsfw:      options.nsfw      || false,
    position:  (Store.channels || []).filter(c => c.category === category).length,
    serverId:  Store.serverSettings?.id || 'gettic',
    createdBy: Store.user?._id,
    createdAt: new Date().toISOString()
  };

  if (!Store.channels)   Store.channels   = [];
  if (!Store.categories) Store.categories = [];
  Store.channels.push(newChannel);
  if (!Store.categories.includes(category)) Store.categories.push(category);

  // localStorage
  ChannelState.saveLocal();

  // MongoDB
  _syncChannel('POST', newChannel);

  // Realtime
  if (socket?.connected) {
    socket.emit('channel_created', newChannel);
  }

  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast(`# ${name} oluşturuldu`);
  closeModal();
  switchChannel(id);
  _chLog('Kanal oluşturuldu: ' + name);
}

// ============ KANAL SİL ============
function deleteChannel(chId) {
  if (typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'manageChannels')) {
    return toast('Yetkiniz yok', 'e');
  }
  if (chId === 'genel-sohbet') return toast('Genel sohbet silinemez', 'e');

  const ch = (Store.channels || []).find(c => c.id === chId);
  if (!ch) return toast('Kanal bulunamadı', 'e');
  if (!confirm(`"${ch.name}" kanalını silmek istediğinizden emin misiniz?\nBu kanalın tüm mesajları silinecek.`)) return;

  Store.channels = Store.channels.filter(c => c.id !== chId);

  // localStorage
  ChannelState.saveLocal();

  // MongoDB
  _syncChannel('DELETE', ch);

  // Realtime
  if (socket?.connected) {
    socket.emit('channel_deleted', { id: chId });
  }

  if (Store.activeChannel === chId) switchChannel('genel-sohbet');

  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('Kanal silindi');
  _chLog('Kanal silindi: ' + chId);
}

// ============ KATEGORİ OLUŞTUR ============
function createCategory(name) {
  name = name?.trim();
  if (!name) return toast('Kategori adı gerekli', 'e');
  if (typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'manageChannels')) {
    return toast('Yetkiniz yok', 'e');
  }

  const cat = name.toUpperCase().replace(/[^A-ZĞÜŞİÖÇ0-9 \-_]/g, '').trim();
  if (!cat) return toast('Geçersiz kategori adı', 'e');
  if (cat.length > 32) return toast('Kategori adı çok uzun', 'e');
  if ((Store.categories || []).includes(cat)) return toast('Bu kategori zaten var', 'e');
  if ((Store.categories || []).length >= 25) return toast('Maksimum 25 kategori', 'w');

  if (!Store.categories) Store.categories = [];
  Store.categories.push(cat);

  ChannelState.saveLocal();

  if (socket?.connected) {
    socket.emit('category_created', { name: cat });
  }

  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast(`${cat} kategorisi eklendi`);
  closeModal();
}

// ============ KATEGORİ SİL ============
function deleteCategory(catName) {
  if (typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'manageChannels')) {
    return toast('Yetkiniz yok', 'e');
  }
  const catChannels = (Store.channels || []).filter(c => c.category === catName);
  if (catChannels.length > 0) return toast('Önce kategorideki kanalları silin', 'w');
  if (!confirm(`"${catName}" kategorisini silmek istediğinizden emin misiniz?`)) return;

  Store.categories = (Store.categories || []).filter(c => c !== catName);
  ChannelState.saveLocal();

  if (socket?.connected) {
    socket.emit('category_deleted', { name: catName });
  }

  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('Kategori silindi');
}

// ============ KANAL AYARLARI ============
function openChannelSettings(chId) {
  const ch = (Store.channels || []).find(c => c.id === chId);
  if (!ch) return;

  if (typeof MODAL_TEMPLATES !== 'undefined') {
    MODAL_TEMPLATES.channelSettings = () => `
      <div class="gm-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <h2># ${escapeHtml(ch.name)}</h2>
      </div>
      <div class="gm-body">
        <div class="gm-field">
          <label class="gm-label">Kanal Adı</label>
          <input class="gm-input" id="chSettingName" value="${escapeHtml(ch.name)}" maxlength="50">
        </div>
        <div class="gm-field">
          <label class="gm-label">Konu</label>
          <input class="gm-input" id="chSettingTopic" value="${escapeHtml(ch.topic||'')}" placeholder="Bu kanalın konusu nedir?" maxlength="120">
        </div>
        <div class="gm-field">
          <label class="gm-label">Yavaş Mod <span class="gm-label-hint">(saniye, 0=kapalı)</span></label>
          <input class="gm-input" id="chSettingSlowMode" type="number" value="${ch.slowMode||0}" min="0" max="3600">
        </div>
        <div class="gm-toggle-row" onclick="document.getElementById('chSettingPrivate').checked=!document.getElementById('chSettingPrivate').checked">
          <div class="gm-toggle-info">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Özel Kanal</span>
          </div>
          <input type="checkbox" id="chSettingPrivate" ${ch.private?'checked':''} style="display:none">
          <div class="gm-toggle ${ch.private?'on':''}" id="chPrivateToggle"><div class="gm-toggle-knob"></div></div>
        </div>
        <div class="gm-toggle-row" onclick="document.getElementById('chSettingNSFW').checked=!document.getElementById('chSettingNSFW').checked">
          <div class="gm-toggle-info">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>NSFW</span>
          </div>
          <input type="checkbox" id="chSettingNSFW" ${ch.nsfw?'checked':''} style="display:none">
          <div class="gm-toggle ${ch.nsfw?'on':''}" id="chNSFWToggle"><div class="gm-toggle-knob"></div></div>
        </div>
        <div class="gm-divider"></div>
        <div class="gm-actions">
          <button class="gm-btn danger" onclick="deleteChannel('${ch.id}');closeModal()">Sil</button>
          <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
          <button class="gm-btn primary" onclick="saveChannelSettings('${ch.id}')">Kaydet</button>
        </div>
      </div>`;
    openModal('channelSettings');
  }
}

function saveChannelSettings(chId) {
  const ch = (Store.channels || []).find(c => c.id === chId);
  if (!ch) return;

  const name     = document.getElementById('chSettingName')?.value?.trim();
  const topic    = document.getElementById('chSettingTopic')?.value?.trim();
  const slowMode = parseInt(document.getElementById('chSettingSlowMode')?.value) || 0;
  const priv     = document.getElementById('chSettingPrivate')?.checked || false;
  const nsfw     = document.getElementById('chSettingNSFW')?.checked    || false;

  if (!name) return toast('Kanal adı gerekli', 'e');

  ch.name     = name;
  ch.topic    = topic    || '';
  ch.slowMode = Math.min(Math.max(slowMode, 0), 3600);
  ch.private  = priv;
  ch.nsfw     = nsfw;

  ChannelState.saveLocal();
  _syncChannel('PATCH', ch);

  if (socket?.connected) {
    socket.emit('channel_updated', ch);
  }

  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('Kanal ayarları kaydedildi');
  closeModal();
}

// ============ SÜRÜKLE & BIRAK (Kanal Sıralama) ============
let _dragCh = null;

function chDragStart(e, chId) {
  _dragCh = chId;
  e.dataTransfer.effectAllowed = 'move';
  const el = document.getElementById('ch_' + chId);
  if (el) el.style.opacity = '0.5';
}

function chDrop(e, targetId) {
  e.preventDefault();
  if (!_dragCh || _dragCh === targetId) { _dragCh = null; return; }

  const from = Store.channels.findIndex(c => c.id === _dragCh);
  const to   = Store.channels.findIndex(c => c.id === targetId);
  if (from < 0 || to < 0) { _dragCh = null; return; }

  // Aynı kategoride mi?
  if (Store.channels[from].category !== Store.channels[to].category) {
    toast('Farklı kategoriler arasında taşıma yapılamaz', 'w');
    _dragCh = null;
    return;
  }

  // Dizide yer değiştir
  const [moved] = Store.channels.splice(from, 1);
  Store.channels.splice(to, 0, moved);

  ChannelState.saveLocal();
  if (socket?.connected) {
    socket.emit('channels_reordered', Store.channels.map(c => ({ id: c.id, position: Store.channels.indexOf(c) })));
  }

  renderChannels();
  _dragCh = null;

  const el = document.getElementById('ch_' + moved.id);
  if (el) el.style.opacity = '';
}

// ============ SES KANALI ============
function joinVoice(chId) {
  const ch = (Store.channels || []).find(c => c.id === chId);
  if (!ch || ch.type !== 'voice') return;

  if (socket?.connected) {
    socket.emit('join_voice', { channelId: chId, userId: Store.user?._id, username: Store.user?.username });
    toast(`🎤 ${ch.name} sesli kanalına katıldınız`);
  } else {
    toast('Ses kanalına bağlanılamadı', 'e');
  }
}

function leaveVoice(chId) {
  if (socket?.connected) {
    socket.emit('leave_voice', { channelId: chId, userId: Store.user?._id });
    toast('Ses kanalından ayrıldınız');
  }
}

// ============ REALTIME SOCKET EVENTS ============
function initChannelSocketEvents() {
  if (typeof socket === 'undefined' || !socket) return;

  // Başka kullanıcı kanal oluşturdu
  socket.on('channel_created', ch => {
    if (!(Store.channels || []).find(c => c.id === ch.id)) {
      if (!Store.channels) Store.channels = [];
      Store.channels.push(ch);
      if (!Store.categories.includes(ch.category)) Store.categories.push(ch.category);
      ChannelState.saveLocal();
      renderChannels();
      _chLog('Uzak kanal oluşturuldu: ' + ch.name);
    }
  });

  // Başka kullanıcı kanal sildi
  socket.on('channel_deleted', ({ id }) => {
    Store.channels = (Store.channels || []).filter(c => c.id !== id);
    ChannelState.saveLocal();
    if (Store.activeChannel === id) switchChannel('genel-sohbet');
    renderChannels();
    _chLog('Uzak kanal silindi: ' + id);
  });

  // Kanal güncellendi
  socket.on('channel_updated', updatedCh => {
    const idx = (Store.channels || []).findIndex(c => c.id === updatedCh.id);
    if (idx > -1) {
      Store.channels[idx] = { ...Store.channels[idx], ...updatedCh };
      ChannelState.saveLocal();
      renderChannels();
    }
  });

  // Kanallar yeniden sıralandı
  socket.on('channels_reordered', order => {
    const map = {};
    order.forEach(({ id, position }) => map[id] = position);
    Store.channels?.sort((a, b) => (map[a.id] ?? 99) - (map[b.id] ?? 99));
    ChannelState.saveLocal();
    renderChannels();
  });

  // Kategori oluşturuldu
  socket.on('category_created', ({ name }) => {
    if (!(Store.categories || []).includes(name)) {
      if (!Store.categories) Store.categories = [];
      Store.categories.push(name);
      ChannelState.saveLocal();
      renderChannels();
    }
  });

  // Kategori silindi
  socket.on('category_deleted', ({ name }) => {
    Store.categories = (Store.categories || []).filter(c => c !== name);
    ChannelState.saveLocal();
    renderChannels();
  });

  // Okunmamış mesaj bildirimi
  socket.on('new_message', msg => {
    if (msg.channelId && msg.channelId !== Store.activeChannel) {
      ChannelState.addUnread(msg.channelId);
      renderChannels();
    }
  });

  // Ses kanalı kullanıcıları güncellendi
  socket.on('voice_users_updated', ({ channelId, users }) => {
    ChannelState.setVoiceUsers(channelId, users);
    renderChannels();
  });

  _chLog('Socket event dinleyicileri hazır');
}

// ============ MONGODB SYNC ============
function _syncChannel(method, ch) {
  if (typeof API === 'undefined' || !Store.token) return;

  const url = method === 'DELETE' || method === 'PATCH'
    ? `${API}/api/channels/${ch.id}`
    : `${API}/api/channels`;

  fetch(url, {
    method: method === 'PATCH' ? 'PUT' : method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + Store.token
    },
    body: method !== 'DELETE' ? JSON.stringify(ch) : undefined
  })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(() => _chLog(`MongoDB sync OK [${method}] ${ch.id}`))
    .catch(e => _chLog(`MongoDB sync FAIL [${method}] ${ch.id}: ${e}`, 'warn'));
}

// ============ YARDIMCI ============
function _slugify(str) {
  return str.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').replace(/--+/g, '-')
    .replace(/^-|-$/g, '').substring(0, 50);
}

// escapeHtml burada da tanımla (ui.js yüklü değilse)
if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  };
}

// ============ CSS ============
(function injectChannelStyles() {
  const id = 'gt-ch-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
/* ─── Kategori ─── */
.ch-category-wrap{margin-bottom:2px}
.ch-cat{
  display:flex;align-items:center;gap:5px;
  padding:14px 8px 4px;cursor:pointer;
  user-select:none;
}
.ch-cat-name{
  flex:1;font-size:11px;font-weight:700;letter-spacing:.05em;
  text-transform:uppercase;color:var(--t3,#888);
}
.ch-cat-arrow{
  color:var(--t3,#888);transition:transform .2s cubic-bezier(.34,1.56,.64,1);flex-shrink:0;
}
.ch-cat-arrow.collapsed{transform:rotate(-90deg)}
.ch-cat-add{
  background:none;border:none;cursor:pointer;padding:2px;border-radius:5px;
  color:var(--t3,#888);line-height:1;opacity:0;transition:opacity .15s;
}
.ch-cat:hover .ch-cat-add{opacity:1}
.ch-cat-add:hover{color:var(--t1,#fff);background:rgba(255,255,255,.08)}

/* ─── Kanal listesi ─── */
.ch-list{overflow:hidden;transition:max-height .25s ease,opacity .2s ease;max-height:1000px;opacity:1}
.ch-list.collapsed{max-height:0;opacity:0;pointer-events:none}

/* ─── Kanal item ─── */
.ch-item{
  display:flex;align-items:center;gap:7px;
  padding:5px 8px;border-radius:8px;cursor:pointer;
  margin:1px 4px;position:relative;transition:background .12s;
  color:var(--t3,#888);
}
.ch-item:hover{background:rgba(255,255,255,.06);color:var(--t2,#ccc)}
.ch-item.act{background:rgba(255,255,255,.1);color:var(--t1,#fff)}
.ch-item.unread .ch-name{font-weight:700;color:var(--t1,#fff)}
.ch-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:.7}
.ch-item.act .ch-icon{opacity:1}
.ch-name{flex:1;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ch-lock{opacity:.5;flex-shrink:0}

/* ─── Okunmamış ─── */
.ch-unread{
  font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;
  background:var(--ac,#6366f1);color:#fff;flex-shrink:0;
}

/* ─── Eylem butonları ─── */
.ch-acts{display:flex;gap:2px;align-items:center;opacity:0;transition:opacity .12s;margin-left:auto}
.ch-item:hover .ch-acts{opacity:1}
.ch-act-btn{
  background:none;border:none;cursor:pointer;padding:3px;border-radius:5px;
  color:var(--t3,#888);line-height:1;display:flex;
}
.ch-act-btn:hover{color:var(--t1,#fff);background:rgba(255,255,255,.1)}
.ch-act-btn.danger:hover{color:#ef4444}

/* ─── Boş kategori ─── */
.ch-empty-cat{
  font-size:11px;color:var(--t3,#888);padding:4px 12px 8px;
  border:1.5px dashed rgba(255,255,255,.1);border-radius:8px;
  margin:3px 4px;text-align:center;cursor:pointer;
}
.ch-empty-cat:hover{border-color:rgba(255,255,255,.2);color:var(--t2,#ccc)}

/* ─── Ses kanalı kullanıcıları ─── */
.ch-voice-users{
  display:flex;flex-wrap:wrap;gap:4px;padding:3px 8px 5px 32px;
}
.ch-voice-user{
  display:flex;align-items:center;gap:4px;
  font-size:11px;color:var(--t3,#888);
}
.ch-voice-av{
  width:18px;height:18px;border-radius:50%;
  background:var(--ac,#6366f1);color:#fff;
  font-size:8px;font-weight:700;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.ch-voice-more{font-size:10px;color:var(--t3,#888)}

/* ─── Compact mod ─── */
.compact-mode .ch-item{padding:3px 8px}

/* ─── Drag over ─── */
.ch-item[draggable=true]{cursor:grab}
.ch-item[draggable=true]:active{cursor:grabbing}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initChannels() {
  ChannelState.loadLocal();

  // Socket hazır olduktan sonra event'leri bağla
  if (typeof socket !== 'undefined' && socket) {
    initChannelSocketEvents();
  } else {
    // Socket henüz hazır değilse bekle
    document.addEventListener('socket_ready', initChannelSocketEvents, { once: true });
  }

  _chLog('v2.0 yüklendi ✓');
})();
