const API_URL = 'https://gettic.onrender.com';

let socket = null;
let currentUser = null;
let currentRoom = 'genel';
let currentToken = null;
let replyMessage = null;
let currentStatus = 'online';
let rooms = [];

// Socket bağlantısı - hata yönetimli
function connectSocket() {
    try {
        socket = io(API_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 3000
        });

        socket.on('connect', () => {
            console.log('✅ Socket bağlandı');
        });

        socket.on('connect_error', (err) => {
            console.log('⚠️ Socket bağlantı hatası:', err.message);
        });

        socket.on('receive-message', (message) => {
            displayMessage(message);
        });

        socket.on('user-typing', (data) => {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                indicator.textContent = (data.isTyping && data.userId !== currentUser?._id) ? data.userName + ' yazıyor...' : '';
            }
        });

        socket.on('room-user-count', (count) => {
            const el = document.getElementById('online-count');
            if (el) el.textContent = count + ' çevrimiçi';
        });

        socket.on('message-error', (error) => {
            showToast(error || 'Mesaj gönderilemedi', 'error');
        });

    } catch(e) {
        console.log('Socket başlatılamadı:', e);
    }
}

// ================ YÜKLEME ================
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.remove('active');

        const token = localStorage.getItem('gettic_token');
        const user = localStorage.getItem('gettic_user');

        if (token && user) {
            try {
                currentToken = token;
                currentUser = JSON.parse(user);
                showMainScreen();
            } catch(e) {
                localStorage.removeItem('gettic_token');
                localStorage.removeItem('gettic_user');
                showAuthScreen();
            }
        } else {
            showAuthScreen();
        }
    }, 1200);
});

function showAuthScreen() {
    document.getElementById('main-screen')?.classList.remove('active');
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.add('active');
}

// ================ AUTH ================
function switchTab(tab) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');

    tabBtns.forEach(b => b.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        if (tabBtns[0]) tabBtns[0].classList.add('active');
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.classList.add('active');
    } else {
        if (tabBtns[1]) tabBtns[1].classList.add('active');
        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.classList.add('active');
    }
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

async function login(e) {
    e.preventDefault();
    const usernameEl = document.getElementById('login-username');
    const passwordEl = document.getElementById('login-password');
    const rememberEl = document.getElementById('remember-me');

    if (!usernameEl || !passwordEl) return;

    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    const rememberMe = rememberEl ? rememberEl.checked : false;

    if (!username || !password) {
        showToast('Lütfen tüm alanları doldurun', 'error');
        return;
    }

    try {
        const res = await fetch(API_URL + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Giriş başarısız', 'error');
            return;
        }

        currentUser = data.user;
        currentToken = data.token;

        if (rememberMe) {
            localStorage.setItem('gettic_token', data.token);
            localStorage.setItem('gettic_user', JSON.stringify(data.user));
        } else {
            sessionStorage.setItem('gettic_token', data.token);
            sessionStorage.setItem('gettic_user', JSON.stringify(data.user));
        }

        showMainScreen();
    } catch (error) {
        console.error('Login error:', error);
        showToast('Sunucuya bağlanılamadı! İnternetini kontrol et.', 'error');
    }
}

async function register(e) {
    e.preventDefault();
    const usernameEl = document.getElementById('register-username');
    const passwordEl = document.getElementById('register-password');

    if (!usernameEl || !passwordEl) return;

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    if (!username || !password) {
        showToast('Lütfen tüm alanları doldurun', 'error');
        return;
    }

    if (username.length < 3) {
        showToast('Kullanıcı adı en az 3 karakter olmalı', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Şifre en az 6 karakter olmalı', 'error');
        return;
    }

    try {
        const res = await fetch(API_URL + '/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Kayıt başarısız', 'error');
            return;
        }

        currentUser = data.user;
        currentToken = data.token;
        localStorage.setItem('gettic_token', data.token);
        localStorage.setItem('gettic_user', JSON.stringify(data.user));

        showMainScreen();
        showToast('Hoş geldin ' + data.user.username + '! 🎉', 'success');
    } catch (error) {
        console.error('Register error:', error);
        showToast('Sunucuya bağlanılamadı!', 'error');
    }
}

function logout() {
    if (confirm('Çıkış yapmak istediğine emin misin?')) {
        localStorage.removeItem('gettic_token');
        localStorage.removeItem('gettic_user');
        sessionStorage.removeItem('gettic_token');
        sessionStorage.removeItem('gettic_user');
        currentUser = null;
        currentToken = null;

        if (socket) {
            socket.disconnect();
        }

        const mainScreen = document.getElementById('main-screen');
        if (mainScreen) mainScreen.classList.remove('active');

        showAuthScreen();
        showToast('Çıkış yapıldı', 'info');
    }
}

// ================ MAIN SCREEN ================
function showMainScreen() {
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');

    if (authScreen) authScreen.classList.remove('active');
    if (mainScreen) mainScreen.classList.add('active');

    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl && currentUser) userNameEl.textContent = currentUser.username;
    if (userAvatarEl && currentUser) userAvatarEl.textContent = currentUser.username.charAt(0).toUpperCase();

    if (!socket || !socket.connected) {
        connectSocket();
    }

    if (socket && currentUser) {
        socket.emit('user-online', currentUser._id);
    }

    loadRooms();
    updateStatusUI();
    joinRoom('genel', 'genel', 'Genel sohbet odası');
}

// ================ ROOMS ================
async function loadRooms() {
    if (!currentToken) return;

    try {
        const res = await fetch(API_URL + '/api/rooms', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        if (!res.ok) return;

        rooms = await res.json();
        renderRoomList();
    } catch (error) {
        console.error('Odalar yüklenemedi:', error);
    }
}

function renderRoomList(filter) {
    filter = filter || '';
    const roomList = document.getElementById('room-list');
    if (!roomList) return;

    roomList.innerHTML = '';

    const filtered = rooms.filter(function(r) {
        return r.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    });

    filtered.forEach(function(room) {
        var div = document.createElement('div');
        div.className = 'room-item';
        div.setAttribute('data-room-id', room._id);
        div.innerHTML = '<span class="room-icon">#</span><span class="room-name">' + escapeHtml(room.name) + '</span>';
        div.onclick = function() {
            joinRoom(room._id, room.name, room.description || '');
        };
        roomList.appendChild(div);
    });
}

function joinRoom(roomId, roomName, description) {
    if (currentRoom && socket) {
        socket.emit('leave-room', currentRoom);
    }

    currentRoom = roomId;

    if (socket) {
        socket.emit('join-room', roomId);
    }

    var items = document.querySelectorAll('.room-item');
    items.forEach(function(item) {
        item.classList.remove('active');
        if (item.getAttribute('data-room-id') === roomId) {
            item.classList.add('active');
        }
    });

    var nameEl = document.getElementById('current-room-name');
    var descEl = document.getElementById('room-description');
    var msgsEl = document.getElementById('messages');
    var inputEl = document.getElementById('message-input');

    if (nameEl) nameEl.textContent = roomName || 'genel';
    if (descEl) descEl.textContent = description || '';

    if (msgsEl) {
        msgsEl.innerHTML = '<div class="welcome-message"><div class="welcome-icon">' + (roomId === 'genel' ? '🎧' : '#') + '</div><h2>' + (roomId === 'genel' ? "Gettic'e Hoş Geldin!" : '#' + (roomName || roomId)) + '</h2><p>Sohbete başlamak için bir mesaj yaz!</p></div>';
    }

    var typingEl = document.getElementById('typing-indicator');
    if (typingEl) typingEl.textContent = '';

    if (inputEl) inputEl.placeholder = '#' + (roomName || roomId) + ' odasına mesaj yaz...';

    loadMessages(roomId);
}

async function loadMessages(roomId) {
    if (roomId === 'genel' || !currentToken) return;

    try {
        var res = await fetch(API_URL + '/api/rooms/' + roomId + '/messages', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        if (!res.ok) return;

        var messages = await res.json();
        var msgsEl = document.getElementById('messages');
        if (msgsEl) {
            msgsEl.innerHTML = '';
            messages.forEach(function(msg) {
                displayMessage(msg);
            });
            scrollToBottom();
        }
    } catch (error) {
        console.error('Mesajlar yüklenemedi:', error);
    }
}

function loadPublicRooms() {
    loadRooms();
    showToast('Odalar güncellendi ✓', 'success');
}

// ================ CREATE ROOM ================
function showCreateRoom() {
    var modal = document.getElementById('create-room-modal');
    if (modal) modal.classList.add('active');
}

function closeCreateRoom() {
    var modal = document.getElementById('create-room-modal');
    if (modal) modal.classList.remove('active');
}

function toggleRoomPassword() {
    var checked = document.getElementById('room-private');
    var group = document.getElementById('room-password-group');
    if (group && checked) {
        group.style.display = checked.checked ? 'flex' : 'none';
    }
}

async function createRoom(e) {
    e.preventDefault();

    var nameEl = document.getElementById('room-name');
    var descEl = document.getElementById('room-description');
    var privateEl = document.getElementById('room-private');
    var passEl = document.getElementById('room-password');

    if (!nameEl) return;

    var name = nameEl.value.trim();
    var description = descEl ? descEl.value.trim() : '';
    var isPrivate = privateEl ? privateEl.checked : false;
    var password = passEl ? passEl.value : '';

    if (!name) {
        showToast('Oda adı gerekli', 'error');
        return;
    }

    try {
        var res = await fetch(API_URL + '/api/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify({
                name: name,
                description: description,
                isPrivate: isPrivate,
                password: password
            })
        });

        var data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Oda oluşturulamadı', 'error');
            return;
        }

        closeCreateRoom();
        loadRooms();
        showToast('Oda oluşturuldu! 🎉', 'success');
    } catch (error) {
        showToast('Oda oluşturulamadı', 'error');
    }
}

// ================ MESSAGES ================
function sendMessage() {
    var inputEl = document.getElementById('message-input');
    if (!inputEl) return;

    var content = inputEl.value.trim();
    if (!content || !currentRoom || !socket || !currentUser) return;

    socket.emit('send-message', {
        content: content,
        senderId: currentUser._id,
        senderName: currentUser.username,
        roomId: currentRoom,
        type: 'text',
        replyTo: replyMessage ? replyMessage._id : null
    });

    inputEl.value = '';
    inputEl.style.height = 'auto';
    updateCharCount();
    cancelReply();
}

function displayMessage(message) {
    var messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    var div = document.createElement('div');
    div.className = 'message';
    div.id = 'msg-' + message._id;

    var time = new Date(message.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    var avatarLetter = (message.senderName || '?').charAt(0).toUpperCase();
    var senderColor = stringToColor(message.senderName || '?');

    var replyHtml = '';
    if (message.replyTo && message.replyTo.content) {
        replyHtml = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;padding-left:8px;border-left:2px solid var(--accent);">↪ ' + escapeHtml(message.replyTo.content.substring(0, 60)) + '</div>';
    }

    var isOwner = (message.sender && message.sender._id === currentUser._id) || (message.sender === currentUser._id);

    div.innerHTML = '<div class="message-header">' +
        '<div class="message-avatar" style="background:' + senderColor + '">' + avatarLetter + '</div>' +
        '<span class="message-user" style="color:' + senderColor + '">' + escapeHtml(message.senderName) + '</span>' +
        '<span class="message-time">' + time + '</span>' +
        (message.edited ? '<span class="message-edited">(düzenlendi)</span>' : '') +
        '</div>' +
        replyHtml +
        '<div class="message-content">' + formatMessage(escapeHtml(message.content)) + '</div>' +
        '<div class="message-actions">' +
        '<button onclick="replyToMessage(\'' + message._id + '\')">↩ Yanıtla</button>' +
        (isOwner ? '<button onclick="editMessage(\'' + message._id + '\')">✏ Düzenle</button><button onclick="deleteMessage(\'' + message._id + '\')">🗑 Sil</button>' : '') +
        '</div>';

    messagesDiv.appendChild(div);
    scrollToBottom();
}

function replyToMessage(msgId) {
    var message = document.getElementById('msg-' + msgId);
    if (!message) return;

    var contentEl = message.querySelector('.message-content');
    if (!contentEl) return;

    replyMessage = { _id: msgId, content: contentEl.textContent };

    var preview = document.getElementById('reply-preview');
    var textEl = document.getElementById('reply-text');
    var inputEl = document.getElementById('message-input');

    if (preview) preview.style.display = 'flex';
    if (textEl) textEl.textContent = replyMessage.content.substring(0, 60);
    if (inputEl) inputEl.focus();
}

function cancelReply() {
    replyMessage = null;
    var preview = document.getElementById('reply-preview');
    if (preview) preview.style.display = 'none';
}

async function editMessage(msgId) {
    var newContent = prompt('Mesajı düzenle:');
    if (!newContent || !newContent.trim()) return;

    try {
        await fetch(API_URL + '/api/messages/' + msgId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify({ content: newContent.trim() })
        });

        var msgDiv = document.getElementById('msg-' + msgId);
        if (msgDiv) {
            var contentEl = msgDiv.querySelector('.message-content');
            if (contentEl) contentEl.innerHTML = formatMessage(escapeHtml(newContent.trim()));

            if (!msgDiv.querySelector('.message-edited')) {
                var headerEl = msgDiv.querySelector('.message-header');
                if (headerEl) headerEl.insertAdjacentHTML('beforeend', '<span class="message-edited">(düzenlendi)</span>');
            }
        }
    } catch (error) {
        showToast('Düzenlenemedi', 'error');
    }
}

async function deleteMessage(msgId) {
    if (!confirm('Bu mesajı silmek istediğine emin misin?')) return;

    try {
        await fetch(API_URL + '/api/messages/' + msgId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });

        var msgDiv = document.getElementById('msg-' + msgId);
        if (msgDiv) msgDiv.remove();
    } catch (error) {
        showToast('Silinemedi', 'error');
    }
}

function loadPinnedMessages() {
    showToast('Henüz sabitlenmiş mesaj yok', 'info');
}

// ================ UI HELPERS ================
function handleInput(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }

    if (currentRoom && currentUser && socket) {
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
    var inputEl = document.getElementById('message-input');
    var countEl = document.getElementById('char-count');
    if (inputEl && countEl) {
        countEl.textContent = inputEl.value.length + '/2000';
    }
}

function toggleMemberSidebar() {
    var sidebar = document.getElementById('member-sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

function toggleSettings() {
    var modal = document.getElementById('settings-modal');
    if (modal) modal.classList.toggle('active');
}

function setStatus(status) {
    currentStatus = status;
    updateStatusUI();
    toggleSettings();
    showToast('Durum güncellendi', 'success');
}

function updateStatusUI() {
    var statusEl = document.getElementById('user-status-text');
    var texts = {
        online: 'Çevrimiçi',
        idle: 'Boşta',
        dnd: 'Rahatsız Etme',
        offline: 'Görünmez'
    };
    if (statusEl) statusEl.textContent = texts[currentStatus] || 'Çevrimiçi';
}

function updateCustomStatus() {
    var inputEl = document.getElementById('custom-status-input');
    if (inputEl) {
        showToast('Durum güncellendi: ' + inputEl.value, 'success');
    }
}

function toggleEmojiPicker() {
    showToast('Emoji yakında gelecek! 😊', 'info');
}

function filterRooms() {
    var searchEl = document.getElementById('room-search');
    if (searchEl) {
        renderRoomList(searchEl.value);
    }
}

function filterMembers() {}

function toggleCategory(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function showProfile(userId) {
    var modal = document.getElementById('profile-modal');
    var content = document.getElementById('profile-content');
    if (modal) modal.classList.add('active');
    if (content) content.innerHTML = '<p style="text-align:center;padding:20px;">Profil yükleniyor...</p>';
}

function closeProfile() {
    var modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('active');
}

function scrollToBottom() {
    var messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        setTimeout(function() {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 100);
    }
}

// ================ HELPERS ================
function formatMessage(text) {
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.+?)`/g, '<code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:3px;font-family:monospace;">$1</code>');
    return text;
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function stringToColor(str) {
    var hash = 0;
    str = str || '?';
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colors = ['#ff4d6a', '#4ade80', '#facc15', '#60a5fa', '#a78bfa', '#f472b6', '#38bdf8', '#fb923c'];
    return colors[Math.abs(hash) % colors.length];
}

function showToast(message, type) {
    type = type || 'info';

    var toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 28px;border-radius:10px;color:white;font-weight:600;z-index:99999;font-size:14px;pointer-events:none;box-shadow:0 8px 30px rgba(0,0,0,0.5);';
        document.body.appendChild(toast);
    }

    var colors = { success: '#4ade80', error: '#ef4444', info: '#60a5fa' };
    toast.style.background = colors[type] || colors.info;
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    toast.style.animation = 'none';
    toast.offsetHeight;
    toast.style.animation = 'toastIn 0.3s ease';

    setTimeout(function() {
        toast.style.display = 'none';
    }, 3000);
}

// ================ MODAL BACKDROP ================
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-backdrop')) {
        var modal = e.target.parentElement;
        if (modal) modal.classList.remove('active');
    }
});

// ================ KLAVYE KISAYOLLARI ================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var modals = document.querySelectorAll('.modal.active');
        modals.forEach(function(m) { m.classList.remove('active'); });
        cancelReply();
    }
});
