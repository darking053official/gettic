// Sabitler
const EMOJIS = ['😀','😂','❤️','👍','🔥','🎉','🥳','😎','💯','✅','👋','🙏','🎮','✨','😢','😡','🤔','💻','📱','🌍','🎵','⭐','💎','🍕','🚀','💀','👻','🎃','🤖','👽'];
const REACTION_EMOJIS = ['👍','❤️','😂','🔥','🎉','😮','😢','😡','👎','💯'];

// Zaman formatlama
function formatTime(d) {
  try { return new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
  catch(e) { return ''; }
}

function formatDate(d) {
  try {
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Bugün ' + formatTime(d);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
    if (date.toDateString() === yesterday.toDateString()) return 'Dün ' + formatTime(d);
    return date.toLocaleDateString('tr-TR') + ' ' + formatTime(d);
  } catch(e) { return ''; }
}

// Mesaj formatlama
function formatMsg(t) {
  if (!t) return '';
  return t
    .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    // Linkleri tıkla
    .replace(/(https?:\/\/[^\s<>\[\]]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    // Satır sonları
    .replace(/\n/g, '<br>');
}

// Mesaj render
function renderMessages() {
  const el = document.getElementById('messages');
  if (!el) return;
  
  if (!Store.messages || Store.messages.length === 0) {
    el.innerHTML = `<div class="empty-ch">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
      <h4># ${Store.activeChannel}</h4>
      <p>Henüz mesaj yok. Sohbeti başlat!</p>
    </div>`;
    return;
  }
  
  // Tarih ayırıcıları için gruplama
  let lastDate = '';
  
  el.innerHTML = Store.messages.map((msg, idx) => {
    const role = getHighestRole(msg.senderId);
    const badge = role && role.id !== 'r4' ? `<span class="rbadge" style="background:${role.color}20;color:${role.color}">${role.name}</span>` : '';
    const poll = Store.polls[msg._id];
    const isOwn = msg.senderId === Store.user?._id;
    const dateStr = formatDate(msg.createdAt);
    const showDate = dateStr !== lastDate;
    lastDate = dateStr;
    
    // Engellenen kullanıcı
    if (Store.blockedUsers.includes(msg.senderId)) {
      return `<div class="msg blocked" onclick="unblockMessage('${msg._id}')">
        <div class="msg-body" style="text-align:center;color:var(--t3);font-size:11px;cursor:pointer">
          Engellenmiş mesaj - görmek için tıkla
        </div>
      </div>`;
    }
    
    return `
      ${showDate ? `<div class="msg-date-separator"><span>${dateStr}</span></div>` : ''}
      <div class="msg ${msg.pinned ? 'pinned' : ''}" id="msg-${msg._id}" data-sender="${msg.senderId}">
        <div class="msg-av" onclick="openModal('profile');showUserInfo('${msg.senderId}')" title="${msg.senderName} profili">${(msg.senderName||'?').charAt(0).toUpperCase()}</div>
        <div class="msg-body">
          <div class="msg-head">
            <span class="msg-un" onclick="openModal('profile');showUserInfo('${msg.senderId}')">${msg.senderName||'?'}</span>${badge}
            <span class="msg-time">${formatTime(msg.createdAt)}${msg.edited?' <span class="msg-edited">(düzenlendi)</span>':''}</span>
            ${msg.pinned ? '<span class="msg-pin-badge">📌 Sabitlendi</span>' : ''}
          </div>
          ${msg.replyTo ? `<div class="msg-reply" onclick="scrollToMessage('${msg.replyTo._id}')">
            <div class="reply-line"></div>
            <div class="reply-content">
              <span class="reply-name">${msg.replyTo.senderName}</span>
              <span class="reply-text">${msg.replyTo.content.substring(0, 80)}</span>
            </div>
          </div>` : ''}
          ${msg.image ? `<img src="${msg.image}" alt="${msg.content}" class="msg-image" loading="lazy" onclick="viewImage('${msg.image}')">` : ''}
          <div class="msg-text">${formatMsg(msg.content)}</div>
          ${poll ? renderPoll(msg._id, poll) : ''}
          ${msg.reactions ? renderReactions(msg) : ''}
        </div>
        <div class="ma">
          ${REACTION_EMOJIS.slice(0,6).map(e => 
            `<button onclick="reactToMessage('${msg._id}','${e}')" title="${e}">${e}</button>`
          ).join('')}
          <button onclick="replyToMessage('${msg._id}')" title="Yanıtla">↩️</button>
          ${isOwn ? `<button onclick="editMessage('${msg._id}')" title="Düzenle">✏️</button>` : ''}
          <button onclick="copyMessage('${msg._id}')" title="Kopyala">📋</button>
          <button onclick="pinMessage('${msg._id}')" title="${msg.pinned?'Sabitlemeyi Kaldır':'Sabitle'}">📌</button>
          ${hasPermission(Store.user?._id,'deleteMsg')||isOwn ? `<button onclick="deleteMessage('${msg._id}')" style="color:var(--re)" title="Sil">🗑️</button>` : ''}
          ${!isOwn ? `<button onclick="blockUser('${msg.senderId}')" style="color:var(--re)" title="Engelle">🚫</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  el.scrollTop = el.scrollHeight;
  saveStore();
}

// Mesaj gönderme
function sendMessage() {
  const input = document.getElementById('messageInput');
  if (!input) return;
  const content = input.value.trim();
  if (!content || !Store.user) return;
  if (!hasPermission(Store.user._id, 'sendMsg')) return toast('Yetkiniz yok', 'e');
  
  const msg = {
    _id: genId(),
    content,
    senderName: Store.user.username,
    senderId: Store.user._id,
    channelId: Store.activeChannel,
    createdAt: new Date().toISOString(),
    reactions: {},
    replyTo: window._replyingTo || null
  };
  
  Store.messages.push(msg);
  if (Store.messages.length > MAX_MSGS) Store.messages.shift();
  window._replyingTo = null;
  updateReplyUI();
  renderMessages();
  saveStore();
  incrementStats();
  input.value = '';
  input.style.height = 'auto';
  input.focus();
  
  if (window._socket) window._socket.emit('send_message', msg);
}

// Yanıtlama
function replyToMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  window._replyingTo = msg;
  updateReplyUI();
  document.getElementById('messageInput')?.focus();
}

function updateReplyUI() {
  const replyBar = document.getElementById('replyBar');
  if (!replyBar) return;
  if (window._replyingTo) {
    replyBar.innerHTML = `
      <div class="reply-preview">
        <span>↩️ ${window._replyingTo.senderName}: ${window._replyingTo.content.substring(0, 50)}</span>
        <button onclick="window._replyingTo=null;updateReplyUI();document.getElementById('messageInput').focus()">×</button>
      </div>`;
    replyBar.style.display = 'flex';
  } else {
    replyBar.style.display = 'none';
  }
}

function scrollToMessage(mid) {
  const el = document.getElementById('msg-' + mid);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.background = 'var(--acd)';
    setTimeout(() => el.style.background = '', 2000);
  }
}

// Mesaj silme
function deleteMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  if (msg.senderId !== Store.user?._id && !hasPermission(Store.user?._id, 'deleteMsg')) return toast('Yetkiniz yok', 'e');
  
  Store.messages = Store.messages.filter(m => m._id !== mid);
  delete Store.polls[mid];
  renderMessages();
  saveStore();
  toast('🗑️ Mesaj silindi');
  
  if (window._socket) window._socket.emit('delete_message', { id: mid, channelId: Store.activeChannel });
}

// Mesaj düzenleme
function editMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg || msg.senderId !== Store.user?._id) return;
  
  const newContent = prompt('Mesajı düzenle:', msg.content);
  if (newContent && newContent.trim() && newContent.trim() !== msg.content) {
    msg.content = newContent.trim();
    msg.edited = true;
    msg.editedAt = new Date().toISOString();
    renderMessages();
    saveStore();
    if (window._socket) window._socket.emit('edit_message', { id: mid, content: msg.content, channelId: Store.activeChannel });
  }
}

// Mesaj kopyalama
function copyMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (msg) { 
    navigator.clipboard.writeText(msg.content)
      .then(() => toast('📋 Kopyalandı'))
      .catch(() => toast('Kopyalanamadı', 'e')); 
  }
}

// Sabitleme
function pinMessage(mid) {
  if (!hasPermission(Store.user?._id, 'pin')) return toast('Yetkiniz yok', 'e');
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  msg.pinned = !msg.pinned;
  Store.pinnedMessages = Store.messages.filter(m => m.pinned).slice(-10);
  renderMessages();
  saveStore();
  toast(msg.pinned ? '📌 Sabitlendi' : '📌 Sabitleme kaldırıldı');
}

// Reaksiyonlar
function reactToMessage(mid, emoji) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg || !hasPermission(Store.user?._id, 'addReactions')) return;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const idx = msg.reactions[emoji].indexOf(Store.user._id);
  if (idx === -1) {
    msg.reactions[emoji].push(Store.user._id);
  } else {
    msg.reactions[emoji].splice(idx, 1);
    if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  }
  renderMessages();
  saveStore();
}

function renderReactions(msg) {
  if (!msg.reactions || Object.keys(msg.reactions).length === 0) return '';
  return `<div class="reacts">${Object.entries(msg.reactions).map(([emoji, users]) => 
    `<span class="react ${users.includes(Store.user?._id)?'me':''}" onclick="reactToMessage('${msg._id}','${emoji}')">${emoji} <span>${users.length}</span></span>`
  ).join('')}</div>`;
}

// Engelleme
function blockUser(uid) {
  if (uid === Store.user?._id) return;
  if (Store.blockedUsers.includes(uid)) {
    Store.blockedUsers = Store.blockedUsers.filter(u => u !== uid);
    toast('Engel kaldırıldı');
  } else {
    Store.blockedUsers.push(uid);
    toast('🚫 Kullanıcı engellendi');
    // Kullanıcının mesajlarını gizle
    Store.messages = Store.messages.filter(m => m.senderId !== uid);
    renderMessages();
  }
  saveStore();
}

function unblockMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (msg) {
    Store.blockedUsers = Store.blockedUsers.filter(u => u !== msg.senderId);
    saveStore();
    renderMessages();
  }
}

// Toplu temizlik
function clearMessages() {
  if (!hasPermission(Store.user?._id, 'deleteMsg')) return toast('Yetkiniz yok', 'e');
  if (confirm('Bu kanaldaki tüm mesajlar silinsin mi? Bu işlem geri alınamaz.')) {
    Store.messages = [];
    Store.polls = {};
    Store.pinnedMessages = [];
    renderMessages();
    saveStore();
    localStorage.removeItem('gt_messages_' + Store.activeChannel);
    toast('🗑️ Tüm mesajlar silindi');
  }
}

// Görsel görüntüleme
function viewImage(src) {
  openModal('imageView');
  document.getElementById('modalContent').innerHTML = `<img src="${src}" style="max-width:100%;max-height:80vh;border-radius:12px;cursor:pointer" onclick="closeModal()">`;
}

// Mesaj arama
function searchMessages(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  return Store.messages.filter(m => m.content.toLowerCase().includes(q)).slice(-20);
}

// Kullanıcı bilgisi
function showUserInfo(uid) {
  // Modal'da kullanıcı bilgisini göster
  document.getElementById('modalContent').innerHTML = `
    <div style="text-align:center">
      <div class="avatar-big">${uid.charAt(0)?.toUpperCase() || '?'}</div>
      <h3>${uid}</h3>
      <p style="color:var(--t3)">Kullanıcı bilgisi yakında...</p>
      <button class="mb" onclick="startDM('${uid}')">💬 DM Gönder</button>
      <button class="mb danger" onclick="blockUser('${uid}');closeModal()">🚫 Engelle</button>
    </div>`;
  }
