// ================ CONFIG ================
const API_URL = 'https://gettic.onrender.com';
const socket = io(API_URL);

let currentUser = null;
let currentRoom = null;
let currentToken = null;
let replyMessage = null;

// ================ AUTH ================

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelector('.tab-btn:first-child').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelector('.tab-btn:last-child').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

async function login(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error);

        currentUser = data.user;
        currentToken = data.token;
        localStorage.setItem('gettic_token', data.token);
        localStorage.setItem('gettic_user', JSON.stringify(data.user));
        
        showMainScreen();
    } catch (error) {
        alert('Bağlantı hatası!');
    }
}

async function register(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error);

        currentUser = data.user;
        currentToken = data.token;
        localStorage.setItem('gettic_token', data.token);
        localStorage.setItem('gettic_user', JSON.stringify(data.user));
        
        showMainScreen();
    } catch (error) {
        alert('Bağlantı hatası!');
    }
}

function logout() {
    localStorage.removeItem('gettic_token');
    localStorage.removeItem('gettic_user');
    currentUser = null;
    currentToken = null;
    socket.disconnect();
    
    document.getElementById('main-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');
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
    joinRoom('genel');
}

// ================ ROOMS ================

async function loadRooms() {
    try {
        const res = await fetch(`${API_URL}/api/rooms`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const rooms = await res.json();
        
        const roomList = document.getElementById('room-list');
        roomList.innerHTML = '';
        
        rooms.forEach(room => {
            const div = document.createElement('div');
            div.className = 'room-item';
            div.innerHTML = `<span class="room-icon">#</span><span>${room.name}</span>`;
            div.onclick = () => joinRoom(room._id, room.name, room.description);
            roomList.appendChild(div);
        });
    } catch (error) {
        console.error('Odalar yüklenemedi');
    }
}

function joinRoom(roomId, roomName, description) {
    if (currentRoom) {
        socket.emit('leave-room', currentRoom);
    }
    
    currentRoom = roomId;
    socket.emit('join-room', roomId);
    
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent.trim() === roomName || (roomId === 'genel' && item.textContent.includes('genel'))) {
            item.classList.add('active');
        }
    });
    
    document.getElementById('current-room-name').textContent = roomName || roomId;
    document.getElementById('room-description').textContent = description || '';
    document.getElementById('messages').innerHTML = '';
    document.getElementById('typing-indicator').textContent = '';
    
    if (roomId !== 'genel') {
        document.getElementById('messages').innerHTML = `
            <div class="welcome-message">
                <h2>#${roomName || roomId}</h2>
                <p>Sohbete başla!</p>
            </div>`;
    } else {
        document.getElementById('messages').innerHTML = `
            <div class="welcome-message">
                <h2>🎧 Gettic'e Hoş Geldin!</h2>
                <p>Burası #genel odasının başlangıcı. Sohbete başla!</p>
            </div>`;
    }
    
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
    } catch (error) {
        console.error('Mesajlar yüklenemedi');
    }
}

function showCreateRoom() {
    document.getElementById('create-room-modal').classList.add('active');
}

function closeCreateRoom() {
    document.getElementById('create-room-modal').classList.remove('active');
}

async function createRoom(e) {
    e.preventDefault();
    const name = document.getElementById('room-name').value;
    const description = document.getElementById('room-description').value;
    const isPrivate = document.getElementById('room-private').checked;
    const password = document.getElementById('room-password').value;

    try {
        const res = await fetch(`${API_URL}/api/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, description, isPrivate, password })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error);

        closeCreateRoom();
        loadRooms();
    } catch (error) {
        alert('Oda oluşturulamadı');
    }
}

function toggleRoomPassword() {
    const checkbox = document.getElementById('room-private');
    const passwordInput = document.getElementById('room-password');
    passwordInput.style.display = checkbox.checked ? 'block' : 'none';
}

// ================ MESSAGES ================

function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content || !currentRoom) return;
    
    const messageData = {
        content,
        senderId: currentUser._id,
        senderName: currentUser.username,
        roomId: currentRoom,
        type: 'text',
        replyTo: replyMessage ? replyMessage._id : null
    };
    
    socket.emit('send-message', messageData);
    
    input.value = '';
    input.style.height = 'auto';
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
        replyHtml = `<div style="font-size:12px;color:#888;margin-bottom:3px;">
            ↪ Yanıtlandı: ${message.replyTo.content.substring(0, 50)}
        </div>`;
    }
    
    div.innerHTML = `
        <div class="message-header">
            <div class="message-avatar" style="background:${senderColor}">${avatarLetter}</div>
            <span class="message-user" style="color:${senderColor}">${message.senderName}</span>
            <span class="message-time">${time}</span>
            ${message.edited ? '<span class="message-content edited">(düzenlendi)</span>' : ''}
        </div>
        ${replyHtml}
        <div class="message-content">${escapeHtml(message.content)}</div>
        <div class="message-actions">
            <button onclick="replyToMessage('${message._id}')">↩ Yanıtla</button>
            ${(message.sender?._id === currentUser._id || message.sender === currentUser._id) ? 
                `<button onclick="editMessage('${message._id}')">✏ Düzenle</button>
                 <button onclick="deleteMessage('${message._id}')">🗑 Sil</button>` : ''}
        </div>
    `;
    
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function replyToMessage(msgId) {
    const message = document.getElementById(`msg-${msgId}`);
    if (!message) return;
    
    replyMessage = {
        _id: msgId,
        content: message.querySelector('.message-content').textContent
    };
    
    document.getElementById('reply-preview').style.display = 'flex';
    document.getElementById('reply-text').textContent = replyMessage.content.substring(0, 50);
    document.getElementById('message-input').focus();
}

function cancelReply() {
    replyMessage = null;
    document.getElementById('reply-preview').style.display = 'none';
}

async function editMessage(msgId) {
    const newContent = prompt('Mesajı düzenle:');
    if (!newContent) return;
    
    try {
        await fetch(`${API_URL}/api/messages/${msgId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ content: newContent })
        });
        
        const msgDiv = document.getElementById(`msg-${msgId}`);
        if (msgDiv) {
            msgDiv.querySelector('.message-content').textContent = newContent;
            if (!msgDiv.querySelector('.edited')) {
                msgDiv.querySelector('.message-header').innerHTML += '<span class="message-content edited">(düzenlendi)</span>';
            }
        }
    } catch (error) {
        alert('Düzenlenemedi');
    }
}

async function deleteMessage(msgId) {
    if (!confirm('Bu mesajı silmek istediğine emin misin?')) return;
    
    try {
        await fetch(`${API_URL}/api/messages/${msgId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        document.getElementById(`msg-${msgId}`)?.remove();
    } catch (error) {
        alert('Silinemedi');
    }
}

// ================ SOCKET EVENTS ================

socket.on('receive-message', (message) => {
    displayMessage(message);
});

socket.on('user-typing', (data) => {
    const indicator = document.getElementById('typing-indicator');
    if (data.isTyping && data.userId !== currentUser._id) {
        indicator.textContent = `${data.userName} yazıyor...`;
    } else {
        indicator.textContent = '';
    }
});

socket.on('room-user-count', (count) => {
    document.getElementById('online-count').textContent = `${count} çevrimiçi`;
});

socket.on('message-error', (error) => {
    alert(error);
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
    e.target.style.height = e.target.scrollHeight + 'px';
}

function toggleMemberSidebar() {
    document.getElementById('member-sidebar').classList.toggle('active');
}

function toggleSettings() {
    document.getElementById('settings-modal').classList.toggle('active');
}

function updateStatus() {
    const status = document.getElementById('status-select').value;
    document.getElementById('user-status').textContent = 
        status === 'online' ? '🟢 Çevrimiçi' :
        status === 'idle' ? '🌙 Boşta' :
        status === 'dnd' ? '⛔ Rahatsız Etme' : '⚫ Görünmez';
}

function updateCustomStatus() {
    const status = document.getElementById('custom-status').value;
    alert('Özel durum güncellendi: ' + status);
}

function filterRooms() {
    const query = document.getElementById('room-search').value.toLowerCase();
    document.querySelectorAll('.room-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? 'flex' : 'none';
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < (str || '?').length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#e94560', '#4ecca3', '#ff6b6b', '#ffd93d', '#6c5ce7', '#a29bfe', '#fd79a8'];
    return colors[Math.abs(hash) % colors.length];
}

// ================ AUTO LOGIN ================

window.onload = () => {
    const token = localStorage.getItem('gettic_token');
    const user = localStorage.getItem('gettic_user');
    
    if (token && user) {
        currentToken = token;
        currentUser = JSON.parse(user);
        showMainScreen();
    }
};
