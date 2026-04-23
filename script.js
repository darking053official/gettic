const API_URL = 'https://gettic.onrender.com';
const socket = io(API_URL);

let currentUser = null;
let currentRoom = 'genel';
let currentToken = null;
let replyMessage = null;
let currentStatus = 'online';
let rooms = [];
let activeMembers = [];

// ================ LOADING ================
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.remove('active');
        const token = localStorage.getItem('gettic_token');
        const user = localStorage.getItem('gettic_user');
        if (token && user) {
            currentToken = token;
            currentUser = JSON.parse(user);
            showMainScreen();
        } else {
            document.getElementById('auth-screen').classList.add('active');
        }
    }, 1500);
});

// ================ AUTH ================
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function login(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) return showToast(data.error || 'Giriş başarısız', 'error');

        currentUser = data.user;
        currentToken = data.token;
        if (rememberMe) {
            localStorage.setItem('gettic_token', data.token);
            localStorage.setItem('gettic_user', JSON.stringify(data.user));
        }
        showMainScreen();
    } catch (error) {
        showToast('Sunucuya bağlanılamadı', 'error');
    }
}

async function register(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;

    try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) return showToast(data.error || 'Kayıt başarısız', 'error');

        currentUser = data.user;
        currentToken = data.token;
        localStorage.setItem('gettic_token', data.token);
        localStorage.setItem('gettic_user', JSON.stringify(data.user));
        showMainScreen();
    } catch (error) {
        showToast('Sunucuya bağlanılamadı', 'error');
    }
}

function logout() {
    if (confirm('Çıkış yapmak istediğine emin misin?')) {
        localStorage.removeItem('gettic_token');
        localStorage.removeItem('gettic_user');
        currentUser = null;
        currentToken = null;
        socket.disconnect();
        document.getElementById('main-screen').classList.remove('active');
        document.getElementById('auth-screen').classList.add('active');
    }
}

// ================ MAIN SCREEN ================
function showMainScreen() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    
    document.getElementById('user-name').textContent = currentUser.username;
    document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
    
    socket.connect();
    socket.emit('user-online', currentUser._id);
    
    loadRooms();
    updateStatusUI();
}

// ================ ROOMS ================
async function loadRooms() {
    try {
        const res = await fetch(`${API_URL}/api/rooms`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        rooms = await res.json();
        renderRoomList();
    } catch (error) {
        console.error('Odalar yüklenemedi');
    }
}

function renderRoomList(filter = '') {
    const roomList = document.getElementById('room-list');
    roomList.innerHTML = '';
    
    const filtered = rooms.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()));
    
    filtered.forEach(room => {
        const div = document.createElement('div');
        div.className = 'room-item';
        div.setAttribute('data-room-id', room._id);
        div.innerHTML = `
            <span class="room-icon">#</span>
            <span class="room-name">${escapeHtml(room.name)}</span>
            <span class="room-badge" title="Aktif">●</span>
        `;
        div.onclick = () => joinRoom(room._id, room.name, room.description);
        roomList.appendChild(div);
    });
}

function joinRoom(roomId, roomName, description) {
    if (currentRoom) socket.emit('leave-room', currentRoom);
    currentRoom = roomId;
    socket.emit('join-room', roomId);
    
    document.querySelectorAll('.room-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector(`[data-room-id="${roomId}"]`);
    if (activeItem) activeItem.classList.add('active');
    
    document.getElementById('current-room-name').textContent = roomName || 'genel';
    document.getElementById('room-description').textContent = description || '';
    document.getElementById('messages').innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">${roomId === 'genel' ? '🎧' : '#'}</div>
            <h2>${roomId === 'genel' ? "Gettic'e Hoş Geldin!" : `#${roomName || roomId}`}</h2>
            <p>Sohbete başlamak için bir mesaj yaz!</p>
        </div>`;
    document.getElementById('typing-indicator').textContent = '';
    document.getElementById('message-input').placeholder = `#${roomName || roomId} odasına mesaj yaz...`;
    
    loadMessages(roomId);
}

async function loadMessages(roomId) {
    if (roomId === 'genel') return;
    try {
        const res = await fetch(`${API_URL}/api/rooms/${roomId}/messages`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const messages = await res.json();
        document.getElementById('messages').innerHTML = '';
        messages.forEach(msg => displayMessage(msg));
        scrollToBottom();
    } catch (error) {}
}

function loadPublicRooms() {
    loadRooms();
    showToast('Odalar güncellendi', 'success');
}

// ================ CREATE ROOM ================
function showCreateRoom() { document.getElementById('create-room-modal').classList.add('active'); }
function closeCreateRoom() { document.getElementById('create-room-modal').classList.remove('active'); }

function toggleRoomPassword() {
    const group = document.getElementById('room-password-group');
    group.style.display = document.getElementById('room-private').checked ? 'flex' : 'none';
}

async function createRoom(e) {
    e.preventDefault();
    const name = document.getElementById('room-name').value.trim();
    const description = document.getElementById('room-description').value.trim();
    const isPrivate = document.getElementById('room-private').checked;
    const password = document.getElementById('room-password').value;

    try {
        const res = await fetch(`${API_URL}/api/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ name, description, isPrivate, password })
        });
        const data = await res.json();
        if (!res.ok) return showToast(data.error, 'error');

        closeCreateRoom();
        loadRooms();
        showToast('Oda oluşturuldu! 🎉', 'success');
    } catch (error) {
        showToast('Oda oluşturulamadı', 'error');
    }
}

// ================ MESSAGES ================
function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content || !currentRoom) return;

    socket.emit('send-message', {
        content,
        senderId: currentUser._id,
        senderName: currentUser.username,
        roomId: currentRoom,
        type: 'text',
        replyTo: replyMessage ? replyMessage._id : null
    });

    input.value = '';
    input.style.height = 'auto';
    updateCharCount();
    cancelReply();
}

function displayMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message';
    div.id = `msg-${message._id}`;

    const time = new Date(message.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const avatarLetter = (message.senderName || '?').charAt(0).toUpperCase();
    const senderColor = stringToColor(message.senderName || '?');

    let replyHtml = '';
    if (message.replyTo && message.replyTo.content) {
        replyHtml = `<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;padding-left:8px;border-left:2px solid var(--accent);">↪ ${escapeHtml(message.replyTo.content.substring(0, 60))}</div>`;
    }

    div.innerHTML = `
        <div class="message-header">
            <div class="message-avatar" style="background:${senderColor}">${avatarLetter}</div>
            <span class="message-user" style="color:${senderColor}">${escapeHtml(message.senderName)}</span>
            <span class="message-time">${time}</span>
            ${message.edited ? '<span class="message-edited">(düzenlendi)</span>' : ''}
        </div>
        ${replyHtml}
        <div class="message-content">${formatMessage(escapeHtml(message.content))}</div>
        <div class="message-actions">
            <button onclick="replyToMessage('${message._id}')">↩ Yanıtla</button>
            ${(message.sender?._id === currentUser._id || message.sender === currentUser._id) ? 
                `<button onclick="editMessage('${message._id}')">✏ Düzenle</button>
                 <button onclick="deleteMessage('${message._id}')">🗑 Sil</button>` : ''}
        </div>
    `;

    messagesDiv.appendChild(div);
    scrollToBottom();
}

function replyToMessage(msgId) {
    const message = document.getElementById(`msg-${msgId}`);
    if (!message) return;
    replyMessage = { _id: msgId, content: message.querySelector('.message-content').textContent };
    document.getElementById('reply-preview').style.display = 'flex';
    document.getElementById('reply-text').textContent = replyMessage.content.substring(0, 60);
    document.getElementById('message-input').focus();
}

function cancelReply() {
    replyMessage = null;
    document.getElementById('reply-preview').style.display = 'none';
}

async function editMessage(msgId) {
    const newContent = prompt('Mesajı düzenle:');
    if (!newContent || !newContent.trim()) return;
    try {
        await fetch(`${API_URL}/api/messages/${msgId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ content: newContent.trim() })
        });
        const msgDiv = document.getElementById(`msg-${msgId}`);
        if (msgDiv) {
            msgDiv.querySelector('.message-content').innerHTML = formatMessage(escapeHtml(newContent.trim()));
            if (!msgDiv.querySelector('.message-edited')) {
                msgDiv.querySelector('.message-header').insertAdjacentHTML('beforeend', '<span class="message-edited">(düzenlendi)</span>');
            }
        }
    } catch (error) { showToast('Düzenlenemedi', 'error'); }
}

async function deleteMessage(msgId) {
    if (!confirm('Bu mesajı silmek istediğine emin misin?')) return;
    try {
        await fetch(`${API_URL}/api/messages/${msgId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        document.getElementById(`msg-${msgId}`)?.remove();
    } catch (error) { showToast('Silinemedi', 'error'); }
}

function loadPinnedMessages() {
    showToast('Henüz sabitlenmiş mesaj yok', 'info');
}

// ================ SOCKET EVENTS ================
socket.on('receive-message', (message) => {
    displayMessage(message);
});

socket.on('user-typing', (data) => {
    const indicator = document.getElementById('typing-indicator');
    indicator.textContent = (data.isTyping && data.userId !== currentUser?._id) ? `${data.userName} yazıyor...` : '';
});

socket.on('room-user-count', (count) => {
    document.getElementById('online-count').textContent = count;
});

socket.on('message-error', (error) => showToast(error, 'error'));

socket.on('user-status-changed', (data) => {
    // Update member list if visible
});

// ================ UI HELPERS ================
function handleInput(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
    if (currentRoom && currentUser) {
        socket.emit('typing', {
            roomId: currentRoom,
            userId: currentUser._id,
            userName: currentUser.username,
            isTyping: e.target.value.length > 0
        });
    }
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
    updateCharCount();
}

function updateCharCount() {
    const len = document.getElementById('message-input').value.length;
    document.getElementById('char-count').textContent = `${len}/2000`;
}

function toggleMemberSidebar() {
    document.getElementById('member-sidebar').classList.toggle('active');
}

function toggleSettings() {
    document.getElementById('settings-modal').classList.toggle('active');
}

function setStatus(status) {
    currentStatus = status;
    updateStatusUI();
    toggleSettings();
}

function updateStatusUI() {
    const statusText = document.getElementById('user-status-text');
    const texts = { online: 'Çevrimiçi', idle: 'Boşta', dnd: 'Rahatsız Etme', offline: 'Görünmez' };
    if (statusText) statusText.textContent = texts[currentStatus] || 'Çevrimiçi';
}

function updateCustomStatus() {
    const val = document.getElementById('custom-status-input').value;
    showToast('Durum güncellendi: ' + val, 'success');
}

function toggleEmojiPicker() {
    showToast('Emoji özelliği yakında! 😊', 'info');
}

function filterRooms() {
    const query = document.getElementById('room-search').value;
    renderRoomList(query);
}

function filterMembers() {
    // Member filtering
}

function toggleCategory(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function showProfile(userId) {
    document.getElementById('profile-modal').classList.add('active');
    document.getElementById('profile-content').innerHTML = `<p>Profil yükleniyor...</p>`;
}

function closeProfile() {
    document.getElementById('profile-modal').classList.remove('active');
}

function scrollToBottom() {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, '<code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:3px;">$1</code>')
        .replace(/`(.*?)`/g, '<code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:3px;">$1</code>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < (str || '?').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['#ff4d6a', '#4ade80', '#facc15', '#60a5fa', '#a78bfa', '#f472b6', '#38bdf8'];
    return colors[Math.abs(hash) % colors.length];
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 9999;
            animation: toastIn 0.3s ease;
            font-size: 14px;
        `;
        document.body.appendChild(toast);
    }
    const colors = { success: '#4ade80', error: '#ef4444', info: '#60a5fa' };
    toast.style.background = colors[type] || colors.info;
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ================ MODAL CLOSE ON BACKDROP ================
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
        e.target.parentElement.classList.remove('active');
    }
});

// ================ KEYBOARD SHORTCUTS ================
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('chat-search')?.focus();
    }
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        cancelReply();
    }
});
