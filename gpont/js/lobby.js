// ═══════════════════════════════════════════════════════════════════
// G-POINT ARENA - LOBBY v1.0
// ═══════════════════════════════════════════════════════════════════

const socket = io();

const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('roomInput');
const createBtn = document.getElementById('createBtn');
const roomList = document.getElementById('roomList');

// Kullanıcı adını localStorage'dan al
const savedUser = localStorage.getItem('gpoint_username');
if (savedUser) usernameInput.value = savedUser;

// Kullanıcı adı değişince kaydet
usernameInput.addEventListener('change', () => {
  localStorage.setItem('gpoint_username', usernameInput.value.trim() || 'Guest');
});

// Oda oluştur
createBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim() || 'Guest';
  const room = roomInput.value.trim() || 'arena-' + Date.now().toString(36);
  localStorage.setItem('gpoint_username', username);
  window.location.href = `/gpoint/game?room=${room}&user=${encodeURIComponent(username)}`;
});

// Oda listesini al
socket.emit('get_rooms');

// Oda listesi güncellemesi
socket.on('room_list', (rooms) => {
  if (!rooms || rooms.length === 0) {
    roomList.innerHTML = '<li style="color:#666;list-style:none;">Hiç oda yok</li>';
    return;
  }
  roomList.innerHTML = rooms.map(r =>
    `<li>
      <span>${r.roomId} (${r.players?.length || 0}/4)</span>
      <button onclick="joinRoom('${r.roomId}')">Katıl</button>
    </li>`
  ).join('');
});

// Odaya katılma fonksiyonu (global)
window.joinRoom = function(room) {
  const username = usernameInput.value.trim() || 'Guest';
  localStorage.setItem('gpoint_username', username);
  window.location.href = `/gpoint/game?room=${room}&user=${encodeURIComponent(username)}`;
};

// Oda listesi otomatik yenile (her 5 saniye)
setInterval(() => {
  socket.emit('get_rooms');
}, 5000);
