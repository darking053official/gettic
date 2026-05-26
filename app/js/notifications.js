// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC NOTIFICATIONS.JS v2.0 - Realtime + MongoDB + localStorage║
// ╚══════════════════════════════════════════════════════════════════╝

function _notLog(msg, level = 'log') {
  console[level](`%c[Notif] ${msg}`, 'color:#fb923c;font-weight:bold');
}

// ============ STATE ============
const notifState = (() => {
  let list = [];
  try { list = JSON.parse(localStorage.getItem('gt_notifications') || '[]'); } catch {}

  return {
    list,
    unread:       parseInt(localStorage.getItem('gt_notif_unread') || '0'),
    sound:        localStorage.getItem('gt_notif_sound')    !== '0',
    desktop:      localStorage.getItem('gt_notif_desktop')  !== '0',
    mentionsOnly: localStorage.getItem('gt_notif_mentions') === '1',
    dndMode:      localStorage.getItem('gt_notif_dnd')      === '1',
    dndUntil:     parseInt(localStorage.getItem('gt_notif_dnd_until') || '0'),
    maxList:      100,
    permission:   typeof Notification !== 'undefined' ? Notification.permission : 'default',
    // Kanal bazlı mute { channelId: true }
    mutedChannels: (() => { try { return JSON.parse(localStorage.getItem('gt_muted_chs') || '{}'); } catch { return {}; } })(),
  };
})();

// ============ LOCALSTORAGE ============
function _saveNotifState() {
  try {
    localStorage.setItem('gt_notifications',  JSON.stringify(notifState.list.slice(0, notifState.maxList)));
    localStorage.setItem('gt_notif_unread',   String(notifState.unread));
    localStorage.setItem('gt_notif_sound',    notifState.sound    ? '1' : '0');
    localStorage.setItem('gt_notif_desktop',  notifState.desktop  ? '1' : '0');
    localStorage.setItem('gt_notif_mentions', notifState.mentionsOnly ? '1' : '0');
    localStorage.setItem('gt_notif_dnd',      notifState.dndMode  ? '1' : '0');
    localStorage.setItem('gt_muted_chs',      JSON.stringify(notifState.mutedChannels));
  } catch (e) {
    _notLog('localStorage kayıt hatası: ' + e.message, 'warn');
  }
}

// Eski alias
function saveNotifState() { _saveNotifState(); }

// ============ BİLDİRİM OLUŞTUR ============
function sendNotification(title, body, type = 'general', opts = {}) {
  // DND kontrolü
  if (notifState.dndMode && Date.now() < notifState.dndUntil) return;

  // Kanal mute kontrolü
  if (opts.channelId && notifState.mutedChannels[opts.channelId]) return;

  // Sadece mention filtresi
  if (notifState.mentionsOnly && type !== 'mention' && type !== 'dm') return;

  const entry = {
    id:        genId(),
    title:     (title  || 'Bildirim').slice(0, 100),
    body:      (body   || '').slice(0, 300),
    type,
    icon:      _typeIcon(type),
    read:      false,
    ts:        Date.now(),
    channelId: opts.channelId || null,
    sender:    opts.sender    || null,
    msgId:     opts.msgId     || null,
    link:      opts.link      || null,
  };

  // Duplicate engelle (aynı mesajdan iki kez bildirim gelmesin)
  if (opts.msgId && notifState.list.find(n => n.msgId === opts.msgId)) return;

  notifState.list.unshift(entry);
  if (notifState.list.length > notifState.maxList) notifState.list.pop();
  notifState.unread = Math.min(notifState.unread + 1, 999);

  _saveNotifState();
  _updateBadge();

  // Toast (uygulama içi — sayfa görünürse)
  if (!document.hidden && opts.showToast !== false) {
    _showInAppNotif(entry);
  }

  // Masaüstü bildirimi (sayfa arka plandaysa)
  if (document.hidden && notifState.desktop && notifState.permission === 'granted') {
    _sendDesktop(entry);
  }

  // Ses
  if (notifState.sound) _playSound(type);

  // MongoDB'ye kaydet
  _syncNotif(entry);

  return entry;
}

function _typeIcon(type) {
  const MAP = {
    mention:  'at-sign',
    dm:       'mail',
    reaction: 'heart',
    pin:      'pin',
    join:     'user-plus',
    leave:    'user-minus',
    ban:      'user-x',
    role:     'shield',
    channel:  'hash',
    event:    'calendar',
    system:   'settings',
    general:  'bell',
  };
  return MAP[type] || 'bell';
}

// ============ UYGULAMA İÇİ BİLDİRİM (toast tarzı ama farklı) ============
function _showInAppNotif(entry) {
  // Aynı gönderenden son 2sn içinde bildirim varsa atla
  const recent = document.querySelectorAll('.in-app-notif');
  if (recent.length >= 3) return; // max 3 aynı anda

  const el = document.createElement('div');
  el.className = `in-app-notif notif-${entry.type}`;
  el.innerHTML = `
    <div class="ian-icon">${_svgIcon(_typeIcon(entry.type), 16)}</div>
    <div class="ian-body">
      <div class="ian-title">${escapeHtml(entry.title)}</div>
      <div class="ian-body-text">${escapeHtml(entry.body.substring(0, 60))}</div>
    </div>
    <button class="ian-close" onclick="this.parentElement.remove()">✕</button>`;

  // Tıklayınca git
  el.onclick = (e) => {
    if (e.target.classList.contains('ian-close')) return;
    _handleNotifClick(entry);
    el.remove();
  };

  document.body.appendChild(el);

  // Otomatik kapat
  const timer = setTimeout(() => {
    el.classList.add('hiding');
    setTimeout(() => el.remove(), 350);
  }, 4500);

  el.addEventListener('mouseenter', () => clearTimeout(timer));

  _notLog(`In-app bildirim: ${entry.title}`);
}

// ============ MASAÜSTÜ BİLDİRİM ============
function _sendDesktop(entry) {
  try {
    const notif = new Notification(entry.title, {
      body:      entry.body.substring(0, 100),
      icon:      'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
      badge:     'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
      tag:       `gettic-${entry.type}`,
      renotify:  true,
      silent:    !notifState.sound,
      timestamp: entry.ts,
    });

    notif.onclick = () => {
      window.focus();
      _handleNotifClick(entry);
      notif.close();
    };

    setTimeout(() => notif.close(), 6000);
    _notLog(`Masaüstü bildirimi: ${entry.title}`);
  } catch (e) {
    _notLog('Masaüstü bildirim hatası: ' + e.message, 'warn');
  }
}

// ============ BİLDİRİME TIKLA ============
function _handleNotifClick(entry) {
  if (entry.type === 'dm' && entry.sender) {
    if (typeof startDM === 'function') startDM(entry.sender);
  } else if (entry.channelId) {
    if (typeof switchChannel === 'function') switchChannel(entry.channelId);
    if (entry.msgId) {
      setTimeout(() => {
        if (typeof scrollToMessage === 'function') scrollToMessage(entry.msgId);
      }, 500);
    }
  }
  // Okundu işaretle
  const n = notifState.list.find(n => n.id === entry.id);
  if (n) { n.read = true; _saveNotifState(); _updateBadge(); }
}

// ============ BİLDİRİM SESİ ============
let _audioCtx = null;

function _playSound(type = 'general') {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const ctx = _audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Tip bazlı ses
    if (type === 'mention') {
      // İki nota — dikkat çekici
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880,  ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880,  ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'dm') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800,  ctx.currentTime);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {}
}

function playNotifSound() { _playSound('general'); }

// ============ İZİN İSTE ============
async function requestNotifPermission() {
  if (!('Notification' in window)) return toast('Tarayıcın bildirim desteklemiyor', 'e');

  try {
    const perm = await Notification.requestPermission();
    notifState.permission = perm;
    if (perm === 'granted') {
      toast('Masaüstü bildirimleri açıldı', 's');
      // Test bildirimi
      setTimeout(() => new Notification('Gettic', { body: 'Bildirimler aktif! 🎉', icon: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png' }), 500);
    } else {
      toast('Bildirim izni reddedildi', 'e');
    }
    _refreshNotifModal();
  } catch (e) {
    _notLog('İzin hatası: ' + e.message, 'warn');
  }
}

// ============ MODAL TEMPLATES ============
if (typeof MODAL_TEMPLATES !== 'undefined') {
  MODAL_TEMPLATES.notifications = () => {
    const list   = notifState.list;
    const unread = list.filter(n => !n.read).length;
    const isDnd  = notifState.dndMode && Date.now() < notifState.dndUntil;

    // Okundu işaretle
    list.forEach(n => n.read = true);
    notifState.unread = 0;
    _saveNotifState();
    _updateBadge();

    return `
      <div class="gm-header">
        ${_svgIcon('bell', 20)}
        <h2>Bildirimler</h2>
        ${unread > 0 ? `<span class="gm-badge red">${unread}</span>` : ''}
        ${list.length > 0 ? `<button class="gm-header-btn" onclick="_clearAllNotifs()" title="Tümünü Temizle">${_svgIcon('trash', 15)}</button>` : ''}
      </div>
      <div class="gm-body">

        <div class="gm-section-label">Ayarlar</div>

        <div class="gm-toggle-row" onclick="_toggleDesktop()">
          <div class="gm-toggle-info">${_svgIcon('monitor', 15)}<span>Masaüstü Bildirimleri</span></div>
          <div class="gm-toggle ${notifState.desktop ? 'on' : ''}"><div class="gm-toggle-knob"></div></div>
        </div>

        <div class="gm-toggle-row" onclick="_toggleSound()">
          <div class="gm-toggle-info">${_svgIcon('volume', 15)}<span>Bildirim Sesi</span></div>
          <div class="gm-toggle ${notifState.sound ? 'on' : ''}"><div class="gm-toggle-knob"></div></div>
        </div>

        <div class="gm-toggle-row" onclick="_toggleMentionsOnly()">
          <div class="gm-toggle-info">${_svgIcon('at-sign', 15)}<span>Sadece @bahsetmeler</span></div>
          <div class="gm-toggle ${notifState.mentionsOnly ? 'on' : ''}"><div class="gm-toggle-knob"></div></div>
        </div>

        <div class="gm-toggle-row" onclick="_toggleDND()">
          <div class="gm-toggle-info">${_svgIcon('moon', 15)}<span>Rahatsız Etme${isDnd ? ' <span style="font-size:10px;color:var(--ac)">(aktif)</span>' : ''}</span></div>
          <div class="gm-toggle ${isDnd ? 'on' : ''}"><div class="gm-toggle-knob"></div></div>
        </div>

        ${notifState.permission !== 'granted' ? `
          <button class="gm-btn primary full" style="margin-top:8px" onclick="requestNotifPermission()">
            ${_svgIcon('bell', 14)} Masaüstü Bildirimine İzin Ver
          </button>` : ''}

        <div class="gm-divider"></div>
        <div class="gm-section-label">Kanal Sesleri</div>
        <div class="gm-list" style="max-height:120px;overflow-y:auto">
          ${(Store.channels || []).slice(0, 10).map(ch => `
            <div class="gm-list-item">
              <span style="opacity:.6">#</span>
              <span class="gm-item-name">${escapeHtml(ch.name)}</span>
              <button class="gm-btn ghost sm" onclick="_toggleMuteChannel('${ch.id}',this)">
                ${notifState.mutedChannels[ch.id] ? '🔇 Sessiz' : '🔔 Açık'}
              </button>
            </div>`).join('') || '<p style="color:var(--t3);text-align:center;font-size:12px">Kanal yok</p>'}
        </div>

        <div class="gm-divider"></div>
        <div class="notif-list-header">
          <span class="gm-section-label" style="margin:0">Geçmiş (${list.length})</span>
          ${list.some(n => !n.read) ? `<button class="gm-btn ghost sm" onclick="_markAllRead()">Tümünü Okundu</button>` : ''}
        </div>

        <div class="notif-list">
          ${list.length === 0
            ? `<div class="gm-empty">${_svgIcon('inbox', 28)}<span>Bildirim yok</span></div>`
            : list.slice(0, 40).map(n => `
              <div class="notif-item ${n.read ? 'read' : ''}" onclick="_onNotifClick('${n.id}')">
                <div class="notif-icon notif-type-${n.type}">${_svgIcon(_typeIcon(n.type), 14)}</div>
                <div class="gm-item-info">
                  <span class="gm-item-name">${escapeHtml(n.title)}</span>
                  <span class="gm-item-sub">${escapeHtml(n.body.substring(0, 60))}</span>
                  <span class="gm-item-sub" style="font-size:9px">${typeof formatRelativeTime === 'function' ? formatRelativeTime(n.ts) : ''}</span>
                </div>
                ${!n.read ? '<div class="gm-unread-dot"></div>' : ''}
                <button class="gm-icon-btn" onclick="event.stopPropagation();_removeNotif('${n.id}')" title="Sil">${_svgIcon('x', 11)}</button>
              </div>`).join('')}
        </div>
      </div>`;
  };
}

// ============ MODAL ACTIONS ============
function showNotifications() {
  if (typeof openModal === 'function') openModal('notifications');
}

function _refreshNotifModal() {
  if (typeof Modal !== 'undefined' && Modal.current === 'notifications') {
    openModal('notifications');
  }
}

function _toggleDesktop() {
  notifState.desktop = !notifState.desktop;
  if (notifState.desktop && notifState.permission !== 'granted') {
    requestNotifPermission();
    return;
  }
  _saveNotifState();
  _refreshNotifModal();
  toast(notifState.desktop ? 'Masaüstü bildirimleri açıldı' : 'Masaüstü bildirimleri kapatıldı');
}

function _toggleSound() {
  notifState.sound = !notifState.sound;
  _saveNotifState();
  if (notifState.sound) _playSound('general');
  _refreshNotifModal();
  toast(notifState.sound ? 'Bildirim sesi açıldı' : 'Bildirim sesi kapatıldı');
}

function _toggleMentionsOnly() {
  notifState.mentionsOnly = !notifState.mentionsOnly;
  _saveNotifState();
  _refreshNotifModal();
  toast(notifState.mentionsOnly ? 'Sadece @bahsetmeler' : 'Tüm bildirimler');
}

function _toggleDND() {
  if (notifState.dndMode && Date.now() < notifState.dndUntil) {
    // Kapat
    notifState.dndMode  = false;
    notifState.dndUntil = 0;
    localStorage.removeItem('gt_notif_dnd_until');
    toast('Rahatsız etme modu kapatıldı');
  } else {
    // Aç — 1 saat
    notifState.dndMode  = true;
    notifState.dndUntil = Date.now() + 60 * 60 * 1000;
    localStorage.setItem('gt_notif_dnd_until', String(notifState.dndUntil));
    toast('Rahatsız etme modu açıldı (1 saat)', 'i');
  }
  _saveNotifState();
  _refreshNotifModal();
}

function _toggleMuteChannel(chId, btn) {
  notifState.mutedChannels[chId] = !notifState.mutedChannels[chId];
  if (!notifState.mutedChannels[chId]) delete notifState.mutedChannels[chId];
  _saveNotifState();
  if (btn) btn.textContent = notifState.mutedChannels[chId] ? '🔇 Sessiz' : '🔔 Açık';
  toast(notifState.mutedChannels[chId] ? 'Kanal sessizleştirildi' : 'Kanal bildirimleri açıldı');
}

function _onNotifClick(notifId) {
  const n = notifState.list.find(n => n.id === notifId);
  if (!n) return;
  n.read = true;
  _saveNotifState();
  _updateBadge();
  _handleNotifClick(n);
  _refreshNotifModal();
}

function _removeNotif(notifId) {
  notifState.list = notifState.list.filter(n => n.id !== notifId);
  notifState.unread = notifState.list.filter(n => !n.read).length;
  _saveNotifState();
  _updateBadge();
  _refreshNotifModal();
}

function _clearAllNotifs() {
  if (!confirm('Tüm bildirimler silinsin mi?')) return;
  notifState.list   = [];
  notifState.unread = 0;
  _saveNotifState();
  _updateBadge();
  _refreshNotifModal();
  toast('Bildirimler temizlendi');
}

function _markAllRead() {
  notifState.list.forEach(n => n.read = true);
  notifState.unread = 0;
  _saveNotifState();
  _updateBadge();
  _refreshNotifModal();
}

function clearNotifications() { _clearAllNotifs(); }

// ============ ROZET GÜNCELLE ============
function _updateBadge() {
  const badge = document.getElementById('notifBadge');
  const btn   = document.getElementById('homeNotificationsBtn');
  const count = notifState.unread;

  if (badge) {
    badge.textContent    = count > 99 ? '99+' : count;
    badge.style.display  = count > 0 ? 'flex' : 'none';
  }

  if (btn) {
    btn.innerHTML = count > 0
      ? _svgIcon('bell', 20)
      : _svgIcon('bell', 20);
    btn.classList.toggle('notif-btn-active', count > 0);
  }

  // Sayfa başlığı
  document.title = count > 0 ? `(${count}) Gettic` : 'Gettic';

  // Favicon badge (basit — opsiyonel)
  _updateFaviconBadge(count);
}

function updateNotifBadge() { _updateBadge(); }

// Favicon badge
function _updateFaviconBadge(count) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = '/favicon.ico';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32);
      if (count > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(24, 8, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count > 9 ? '9+' : count, 24, 8);
      }
      let link = document.querySelector("link[rel*='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = canvas.toDataURL();
    };
    img.onerror = () => {};
  } catch {}
}

// ============ MONGODB SYNC ============
function _syncNotif(entry) {
  if (typeof API === 'undefined' || !Store.token) return;
  fetch(`${API}/api/notifications`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + Store.token
    },
    body: JSON.stringify(entry)
  }).catch(() => {});
}

async function _loadNotifsFromMongo() {
  if (typeof API === 'undefined' || !Store.token) return;
  try {
    const res = await fetch(`${API}/api/notifications`, {
      headers: { 'Authorization': 'Bearer ' + Store.token }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      // Merge — yeni olanları ekle
      const existing = new Set(notifState.list.map(n => n.id));
      const newOnes  = data.filter(n => !existing.has(n.id));
      notifState.list = [...newOnes, ...notifState.list].slice(0, notifState.maxList);
      notifState.unread = notifState.list.filter(n => !n.read).length;
      _saveNotifState();
      _updateBadge();
    }
  } catch {}
}

// ============ SOCKET EVENTS ============
function initNotifSocket() {
  if (typeof socket === 'undefined' || !socket) return;

  socket.on('new_message', msg => {
    if (msg.senderId === Store.user?._id) return;
    if (msg.channelId === Store.activeChannel && !document.hidden) return;

    const isMention = msg.content?.includes('@' + Store.user?.username);
    if (notifState.mentionsOnly && !isMention) return;

    sendNotification(
      msg.senderName,
      msg.content?.substring(0, 80) || '',
      isMention ? 'mention' : 'general',
      { channelId: msg.channelId, sender: msg.senderName, msgId: msg._id }
    );
  });

  socket.on('dm_message', data => {
    if (data.senderId === Store.user?._id) return;
    if (typeof dmState !== 'undefined' && dmState.activeDM === data.sender && !document.hidden) return;

    sendNotification(
      data.sender,
      data.message?.text?.substring(0, 80) || '',
      'dm',
      { sender: data.sender, msgId: data.message?.id, showToast: true }
    );
  });

  socket.on('reaction_added', ({ senderName, emoji, messageId, channelId }) => {
    if (senderName === Store.user?.username) return;
    sendNotification(
      senderName,
      `Mesajına ${emoji} tepkisi ekledi`,
      'reaction',
      { channelId, msgId: messageId, showToast: false }
    );
  });

  socket.on('user_mention', ({ senderName, channelId, messageId, content }) => {
    sendNotification(
      senderName,
      content?.substring(0, 80) || '',
      'mention',
      { channelId, sender: senderName, msgId: messageId }
    );
  });

  socket.on('event_reminder', ev => {
    sendNotification(ev.title || 'Etkinlik', 'Etkinlik başlıyor!', 'event', { showToast: true });
  });

  socket.on('system_notification', ({ title, body, type }) => {
    sendNotification(title, body, type || 'system', { showToast: true });
  });

  socket.on('role_assigned', ({ role }) => {
    sendNotification('Rol Güncellendi', `"${role}" rolü atandı`, 'role', { showToast: true });
  });

  _notLog('Socket event dinleyicileri hazır');
}

// ============ SVG YARDIMCI ============
function _svgIcon(name, size = 16) {
  if (!window.Icons?.[name]) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">${Icons[name]}</svg>`;
}

if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = s => { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; };
}

// ============ CSS ============
(function injectNotifStyles() {
  const id = 'gt-notif-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
/* ─── In-app bildirim ─── */
.in-app-notif{
  position:fixed;top:14px;right:14px;z-index:9990;
  display:flex;align-items:flex-start;gap:10px;
  background:var(--bg1,#1a0f24);
  border:1px solid rgba(255,255,255,.1);
  border-radius:14px;padding:12px 14px;
  max-width:320px;min-width:240px;
  box-shadow:0 8px 32px rgba(0,0,0,.5);
  cursor:pointer;
  animation:ianIn .3s cubic-bezier(.34,1.56,.64,1);
  transition:transform .15s,opacity .15s;
}
.in-app-notif:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,.6)}
.in-app-notif.hiding{opacity:0;transform:translateX(20px)}
/* Birden fazla varsa offset */
.in-app-notif:nth-child(2){top:90px}
.in-app-notif:nth-child(3){top:166px}
@keyframes ianIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}

.ian-icon{
  width:30px;height:30px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  background:var(--ac,#6366f1)22;color:var(--ac,#6366f1);
}
.ian-body{flex:1;min-width:0}
.ian-title{font-size:13px;font-weight:700;color:var(--t1,#fff);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ian-body-text{font-size:11px;color:var(--t3,#888);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ian-close{
  background:none;border:none;cursor:pointer;
  color:var(--t3,#888);font-size:14px;padding:0 2px;
  line-height:1;flex-shrink:0;margin-top:1px;
}
.ian-close:hover{color:var(--t1,#fff)}

/* Tip bazlı border rengi */
.notif-mention  .ian-icon{background:#ec489922;color:#ec4899}
.notif-dm       .ian-icon{background:#3b82f622;color:#3b82f6}
.notif-reaction .ian-icon{background:#ef444422;color:#ef4444}
.notif-system   .ian-icon{background:#8b5cf622;color:#8b5cf6}
.notif-event    .ian-icon{background:#f59e0b22;color:#f59e0b}

/* ─── Bildirim listesi ─── */
.notif-list-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.notif-list{display:flex;flex-direction:column;gap:2px;max-height:300px;overflow-y:auto}
.notif-list::-webkit-scrollbar{width:3px}
.notif-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}

.notif-item{
  display:flex;align-items:center;gap:10px;
  padding:9px 10px;border-radius:10px;cursor:pointer;
  transition:background .12s;
}
.notif-item:hover{background:rgba(255,255,255,.06)}
.notif-item.read{opacity:.55}

.notif-icon{
  width:30px;height:30px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  background:var(--ac,#6366f1)18;color:var(--ac,#6366f1);
}
.notif-type-mention  .notif-icon,.notif-item .notif-type-mention{background:#ec489918;color:#ec4899}
.notif-type-dm       .notif-icon{background:#3b82f618;color:#3b82f6}
.notif-type-reaction .notif-icon{background:#ef444418;color:#ef4444}
.notif-type-system   .notif-icon{background:#8b5cf618;color:#8b5cf6}
.notif-type-event    .notif-icon{background:#f59e0b18;color:#f59e0b}

/* ─── Buton aktif ─── */
.notif-btn-active{
  animation:bellShake .5s ease;
}
@keyframes bellShake{
  0%,100%{transform:rotate(0)}
  20%{transform:rotate(-15deg)}
  40%{transform:rotate(15deg)}
  60%{transform:rotate(-10deg)}
  80%{transform:rotate(10deg)}
}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initNotifications() {
  notifState.permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

  _updateBadge();
  _loadNotifsFromMongo();

  // Socket bağlantısı
  if (typeof socket !== 'undefined' && socket) {
    initNotifSocket();
  } else {
    document.addEventListener('socket_ready', initNotifSocket, { once: true });
  }

  // DND otomatik kapat
  if (notifState.dndMode && Date.now() > notifState.dndUntil) {
    notifState.dndMode = false;
    _saveNotifState();
  }

  // Bildirim butonuna tıklama
  document.addEventListener('click', e => {
    const btn = e.target.closest('#homeNotificationsBtn, #notifBtn');
    if (btn) showNotifications();
  });

  _notLog('v2.0 yüklendi ✓');
})();
