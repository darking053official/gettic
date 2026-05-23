// ╔══════════════════════════════════════════════════════════════════╗
// ║      GETTIC NOTIFICATIONS.JS - SVG İKONLU + GELİŞMİŞ            ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function notIcon(name, size = 18) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

const notifState = {
  permission: 'default',
  list: JSON.parse(localStorage.getItem('gt_notifications') || '[]'),
  unread: parseInt(localStorage.getItem('gt_notif_unread') || '0'),
  sound: localStorage.getItem('gt_notif_sound') !== '0',
  desktop: localStorage.getItem('gt_notif_desktop') !== '0',
  mentionsOnly: localStorage.getItem('gt_notif_mentions') === '1',
  maxList: 50
};

// Bildirim izni iste
function requestNotifPermission() {
  if (!('Notification' in window)) {
    toast('Tarayicin bildirim desteklemiyor', 'e');
    return;
  }
  
  Notification.requestPermission().then(perm => {
    notifState.permission = perm;
    if (perm === 'granted') toast(notIcon('bell') + ' Bildirimler acildi');
    else toast(notIcon('bell-off') + ' Bildirimler reddedildi', 'e');
    showNotifications();
  });
}

// Bildirim gönder
function sendNotification(title, body, iconType = 'bell') {
  // Mention filtresi
  if (notifState.mentionsOnly && !body?.includes('@' + Store.user?.username)) return;
  
  // Listeye ekle
  notifState.list.unshift({
    id: genId(),
    title: title?.slice(0, 100) || 'Bildirim',
    body: body?.slice(0, 200) || '',
    icon: iconType,
    read: false,
    time: new Date().toISOString(),
    type: iconType === 'at-sign' ? 'mention' : iconType === 'mail' ? 'dm' : 'general'
  });
  
  if (notifState.list.length > notifState.maxList) notifState.list.pop();
  notifState.unread = Math.min(notifState.unread + 1, 99);
  
  saveNotifState();
  updateNotifBadge();
  
  // Masaüstü bildirimi (sayfa arka plandaysa)
  if (notifState.permission === 'granted' && notifState.desktop && document.hidden) {
    try {
      const notif = new Notification(title?.slice(0, 50), {
        body: body?.slice(0, 100),
        icon: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
        tag: 'gettic',
        renotify: true
      });
      
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      
      setTimeout(() => notif.close(), 5000);
    } catch(e) {}
  }
  
  // Ses
  if (notifState.sound) {
    playNotifSound();
  }
}

// Bildirim sesi
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch(e) {}
}

// Bildirimleri göster
function showNotifications() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>${notIcon('bell', 24)} Bildirimler</h2>
    
    <div class="settings-group">
      <div class="settings-item" onclick="toggleNotifDesktop()">
        <div class="settings-item-left">${notIcon('monitor')} Masaustu Bildirimi</div>
        <div class="settings-item-right"><div class="toggle ${notifState.desktop ? 'on' : ''}"></div></div>
      </div>
      <div class="settings-item" onclick="toggleNotifSound()">
        <div class="settings-item-left">${notIcon('volume')} Bildirim Sesi</div>
        <div class="settings-item-right"><div class="toggle ${notifState.sound ? 'on' : ''}"></div></div>
      </div>
      <div class="settings-item" onclick="toggleMentionsOnly()">
        <div class="settings-item-left">${notIcon('at-sign')} Sadece @bahsetme</div>
        <div class="settings-item-right"><div class="toggle ${notifState.mentionsOnly ? 'on' : ''}"></div></div>
      </div>
      ${notifState.permission !== 'granted' ? `
        <div class="settings-item" onclick="requestNotifPermission()">
          <div class="settings-item-left" style="color:var(--ac)">${notIcon('bell-ring')} Bildirim Izni Ver</div>
          <div class="settings-item-right">${notIcon('chevron-right',16)}</div>
        </div>
      ` : ''}
    </div>
    
    <div class="msep"></div>
    
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-weight:600;font-size:13px">Bildirim Gecmisi (${notifState.list.length})</span>
      <button class="ib" onclick="clearNotifications()" title="Tumunu Temizle" style="width:28px;height:28px">${notIcon('trash',16)}</button>
    </div>
    
    <div style="max-height:300px;overflow-y:auto">
      ${notifState.list.length === 0 ? 
        `<p style="color:var(--t3);text-align:center;padding:20px">${notIcon('inbox',24)}<br>Henuz bildirim yok</p>` :
        notifState.list.map(n => `
          <div class="mitem" style="opacity:${n.read ? '0.5' : '1'};cursor:pointer" onclick="${n.type === 'dm' ? `startDM('${n.title}')` : ''}">
            <span style="font-size:20px;width:32px;text-align:center">${notIcon(n.icon || 'bell',20)}</span>
            <div class="minfo" style="flex:1">
              <div class="mname" style="${n.read ? '' : 'font-weight:700'}">${escapeHtml(n.title)}</div>
              <div class="msub">${escapeHtml(n.body?.substring(0, 80) || '')}</div>
              <div style="font-size:9px;color:var(--t3)">${formatTime(n.time)}</div>
            </div>
            ${!n.read ? `<span style="width:8px;height:8px;background:var(--ac);border-radius:50%;flex-shrink:0"></span>` : ''}
          </div>
        `).join('')
      }
    </div>
  `;
  
  // Okundu işaretle
  notifState.unread = 0;
  notifState.list.forEach(n => n.read = true);
  saveNotifState();
  updateNotifBadge();
  
  openModal('notifications');
}

// Toggle fonksiyonları
function toggleNotifDesktop() {
  notifState.desktop = !notifState.desktop;
  localStorage.setItem('gt_notif_desktop', notifState.desktop ? '1' : '0');
  showNotifications();
}

function toggleNotifSound() {
  notifState.sound = !notifState.sound;
  localStorage.setItem('gt_notif_sound', notifState.sound ? '1' : '0');
  if (notifState.sound) playNotifSound();
  showNotifications();
}

function toggleMentionsOnly() {
  notifState.mentionsOnly = !notifState.mentionsOnly;
  localStorage.setItem('gt_notif_mentions', notifState.mentionsOnly ? '1' : '0');
  showNotifications();
}

function clearNotifications() {
  if (confirm('Tum bildirimler silinsin mi?')) {
    notifState.list = [];
    notifState.unread = 0;
    saveNotifState();
    updateNotifBadge();
    showNotifications();
    toast(notIcon('check') + ' Bildirimler temizlendi');
  }
}

// Rozet güncelle
function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  const btn = document.getElementById('homeNotificationsBtn');
  
  if (badge) {
    badge.textContent = notifState.unread > 99 ? '99+' : notifState.unread;
    badge.style.display = notifState.unread > 0 ? 'flex' : 'none';
  }
  
  // Buton ikonunu güncelle
  if (btn) {
    btn.innerHTML = notifState.unread > 0 ? notIcon('bell-ring', 20) : notIcon('bell', 20);
  }
  
  // Başlık
  document.title = notifState.unread > 0 ? `(${notifState.unread}) Gettic` : 'Gettic';
}

// Kaydet
function saveNotifState() {
  localStorage.setItem('gt_notifications', JSON.stringify(notifState.list.slice(0, notifState.maxList)));
  localStorage.setItem('gt_notif_unread', notifState.unread.toString());
}

// Socket bildirim dinleyici
function initNotifSocket() {
  if (!socket) return;
  
  socket.on('new_message', (msg) => {
    if (msg.senderId === Store.user?._id) return;
    if (document.hidden || dmState?.activeDM !== msg.senderName) {
      const isMention = msg.content?.includes('@' + Store.user?.username);
      sendNotification(
        msg.senderName,
        msg.content?.substring(0, 80),
        isMention ? 'at-sign' : 'message-square'
      );
    }
  });
  
  socket.on('dm_message', (data) => {
    if (data.senderId === Store.user?._id) return;
    if (dmState?.activeDM !== data.sender || document.hidden) {
      sendNotification(
        data.sender,
        data.text?.substring(0, 80),
        'mail'
      );
    }
  });
  
  socket.on('event_reminder', (event) => {
    sendNotification(event.title, 'Etkinlik basliyor!', 'calendar');
  });
}

// HTML escape
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initNotifSocket, 1500);
  updateNotifBadge();
  if (notifState.permission === 'default') {
    setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'default') {
        // Sessizce izin iste
      }
    }, 5000);
  }
});

// Buton
document.addEventListener('click', (e) => {
  if (e.target.id === 'homeNotificationsBtn' || e.target.closest('#homeNotificationsBtn')) {
    showNotifications();
  }
});

console.log('Notifications.js yuklendi (SVG ikonlu + gelismis)');
