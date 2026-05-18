// ============ GETTIC NOTIFICATIONS.JS ============

const notifState = {
  permission: 'default',
  list: JSON.parse(localStorage.getItem('gt_notifications') || '[]'),
  unread: parseInt(localStorage.getItem('gt_notif_unread') || '0'),
  sound: localStorage.getItem('gt_notif_sound') !== '0',
  desktop: localStorage.getItem('gt_notif_desktop') !== '0',
  mentionsOnly: localStorage.getItem('gt_notif_mentions') === '1'
};

// Bildirim izni iste
function requestNotifPermission() {
  if (!('Notification' in window)) {
    toast('Tarayıcın bildirim desteklemiyor', 'e');
    return;
  }
  
  Notification.requestPermission().then(perm => {
    notifState.permission = perm;
    if (perm === 'granted') toast('✅ Bildirimler açıldı');
    else toast('❌ Bildirimler reddedildi', 'e');
  });
}

// Bildirim gönder
function sendNotification(title, body, icon) {
  // Listeye ekle
  notifState.list.unshift({
    id: genId(),
    title,
    body,
    icon: icon || '💬',
    read: false,
    time: new Date().toISOString()
  });
  
  if (notifState.list.length > 50) notifState.list.pop();
  notifState.unread++;
  
  saveNotifState();
  updateNotifBadge();
  
  // Masaüstü bildirimi
  if (notifState.permission === 'granted' && notifState.desktop && document.hidden) {
    try {
      new Notification(title, {
        body: body?.substring(0, 100),
        icon: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
        tag: 'gettic-notif'
      });
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
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gA==');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch(e) {}
}

// Bildirimleri göster
function showNotifications() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>🔔 Bildirimler</h2>
    
    <div class="settings-group">
      <div class="settings-item" onclick="toggleNotifDesktop()">
        <div class="settings-item-left">🖥️ Masaüstü Bildirimi</div>
        <div class="settings-item-right">
          <div class="toggle ${notifState.desktop ? 'on' : ''}"></div>
        </div>
      </div>
      <div class="settings-item" onclick="toggleNotifSound()">
        <div class="settings-item-left">🔊 Bildirim Sesi</div>
        <div class="settings-item-right">
          <div class="toggle ${notifState.sound ? 'on' : ''}"></div>
        </div>
      </div>
      <div class="settings-item" onclick="toggleMentionsOnly()">
        <div class="settings-item-left">📢 Sadece @mention</div>
        <div class="settings-item-right">
          <div class="toggle ${notifState.mentionsOnly ? 'on' : ''}"></div>
        </div>
      </div>
      ${notifState.permission !== 'granted' ? `
        <div class="settings-item" onclick="requestNotifPermission()">
          <div class="settings-item-left" style="color:var(--ac)">🔔 Bildirim İzni Ver</div>
          <div class="settings-item-right">→</div>
        </div>
      ` : ''}
    </div>
    
    <div class="msep"></div>
    
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-weight:600;font-size:13px">Bildirim Geçmişi</span>
      <button class="ib" onclick="clearNotifications()" title="Tümünü Temizle" style="width:24px;height:24px">🗑️</button>
    </div>
    
    <div style="max-height:300px;overflow-y:auto">
      ${notifState.list.length === 0 ? 
        '<p style="color:var(--t3);text-align:center;padding:20px">Henüz bildirim yok</p>' :
        notifState.list.map(n => `
          <div class="mitem" style="opacity:${n.read ? '0.5' : '1'}">
            <span style="font-size:20px">${n.icon}</span>
            <div class="minfo">
              <div class="mname">${n.title}</div>
              <div class="msub">${n.body?.substring(0, 50) || ''}</div>
              <div style="font-size:9px;color:var(--t3)">${formatTime(n.time)}</div>
            </div>
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
  showNotifications();
}

function toggleMentionsOnly() {
  notifState.mentionsOnly = !notifState.mentionsOnly;
  localStorage.setItem('gt_notif_mentions', notifState.mentionsOnly ? '1' : '0');
  showNotifications();
}

function clearNotifications() {
  if (confirm('Tüm bildirimler silinsin mi?')) {
    notifState.list = [];
    notifState.unread = 0;
    saveNotifState();
    updateNotifBadge();
    showNotifications();
  }
}

// Rozet güncelle
function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  const btn = document.getElementById('homeNotificationsBtn');
  
  if (badge) {
    badge.textContent = notifState.unread;
    badge.style.display = notifState.unread > 0 ? 'flex' : 'none';
  }
  
  // Başlıkta bildirim sayısı
  if (notifState.unread > 0) {
    document.title = `(${notifState.unread}) Gettic`;
  }
}

// Kaydet
function saveNotifState() {
  localStorage.setItem('gt_notifications', JSON.stringify(notifState.list));
  localStorage.setItem('gt_notif_unread', notifState.unread.toString());
}

// Socket bildirim dinleyici
function initNotifSocket() {
  if (!window._socket) return;
  
  window._socket.on('new_message', (msg) => {
    if (msg.senderId === Store.user?._id) return;
    if (document.hidden) {
      sendNotification(
        msg.senderName,
        msg.content?.substring(0, 80),
        '💬'
      );
    }
  });
  
  window._socket.on('dm_message', (data) => {
    if (data.senderId === Store.user?._id) return;
    if (dmState?.activeDM !== data.sender || document.hidden) {
      sendNotification(
        data.sender,
        data.text?.substring(0, 80),
        '💬'
      );
    }
  });
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initNotifSocket, 1500);
  updateNotifBadge();
});

// Buton bağlama
document.addEventListener('click', (e) => {
  if (e.target.id === 'homeNotificationsBtn' || e.target.closest('#homeNotificationsBtn')) {
    showNotifications();
  }
});
