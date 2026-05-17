function formatTime(d) {
  try { return new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
  catch(e) { return ''; }
}

function formatMsg(t) {
  if (!t) return '';
  return t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`([^`]+?)`/g, '<code>$1</code>');
}

function renderMessages() {
  const el = document.getElementById('messages');
  if (!el) return;
  
  if (!Store.messages || Store.messages.length === 0) {
    el.innerHTML = `<div class="empty-ch"><h4># ${Store.activeChannel}</h4><p>Henüz mesaj yok</p></div>`;
    return;
  }
  
  el.innerHTML = Store.messages.map(msg => {
    const role = getHighestRole(msg.senderId);
    const badge = role && role.id !== 'r4' ? `<span class="rbadge" style="background:${role.color}20;color:${role.color}">${role.name}</span>` : '';
    const poll = Store.polls[msg._id];
    
    return `<div class="msg" id="msg-${msg._id}">
      <div class="msg-av">${(msg.senderName||'?').charAt(0).toUpperCase()}</div>
      <div class="msg-body">
        <div class="msg-head">
          <span>${msg.senderName||'?'}</span>${badge}
          <span class="msg-time">${formatTime(msg.createdAt)}${msg.edited?' <span class="msg-edited">(düzenlendi)</span>':''}</span>
        </div>
        ${msg.image ? `<img src="${msg.image}" alt="${msg.content}" style="max-width:100%;border-radius:12px;margin:8px 0" loading="lazy">` : ''}
        <div class="msg-text">${formatMsg(msg.content)}</div>
        ${poll ? renderPoll(msg._id, poll) : ''}
        ${msg.reactions ? renderReactions(msg) : ''}
      </div>
      <div class="ma">
        <button onclick="reactToMessage('${msg._id}','👍')" title="Beğen">👍</button>
        <button onclick="reactToMessage('${msg._id}','❤️')" title="Kalp">❤️</button>
        <button onclick="reactToMessage('${msg._id}','😂')" title="Gül">😂</button>
        <button onclick="reactToMessage('${msg._id}','🔥')" title="Ateş">🔥</button>
        ${msg.senderId===Store.user?._id ? `<button onclick="editMessage('${msg._id}')" title="Düzenle">✏️</button>` : ''}
        <button onclick="copyMessage('${msg._id}')" title="Kopyala">📋</button>
        ${hasPermission(Store.user?._id,'deleteMsg')||msg.senderId===Store.user?._id ? `<button onclick="deleteMessage('${msg._id}')" style="color:var(--re)" title="Sil">🗑️</button>` : ''}
      </div>
    </div>`;
  }).join('');
  
  el.scrollTop = el.scrollHeight;
  saveStore();
}

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
    reactions: {}
  };
  
  Store.messages.push(msg);
  if (Store.messages.length > MAX_MSGS) Store.messages.shift();
  renderMessages();
  saveStore();
  input.value = '';
  input.focus();
  
  if (window._socket) window._socket.emit('send_message', msg);
}

function deleteMessage(mid) {
  Store.messages = Store.messages.filter(m => m._id !== mid);
  delete Store.polls[mid];
  renderMessages();
  saveStore();
  toast('Silindi');
}

function copyMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (msg) { 
    navigator.clipboard.writeText(msg.content).then(() => toast('Kopyalandı')).catch(() => toast('Kopyalanamadı', 'e')); 
  }
}

function editMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  const newContent = prompt('Mesajı düzenle:', msg.content);
  if (newContent && newContent.trim() && newContent.trim() !== msg.content) {
    msg.content = newContent.trim();
    msg.edited = true;
    renderMessages();
    saveStore();
  }
}

function pinMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  msg.pinned = !msg.pinned;
  if (msg.pinned) {
    Store.messages = [msg, ...Store.messages.filter(m => m._id !== mid)];
  }
  renderMessages();
  saveStore();
  toast(msg.pinned ? '📌 Sabitlendi' : '📌 Sabitleme kaldırıldı');
}

function reactToMessage(mid, emoji) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
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
    `<span class="react ${users.includes(Store.user?._id)?'me':''}" onclick="reactToMessage('${msg._id}','${emoji}')">${emoji} ${users.length}</span>`
  ).join('')}</div>`;
}

function clearMessages() {
  if (!hasPermission(Store.user?._id, 'deleteMsg')) return toast('Yetkiniz yok', 'e');
  if (confirm('Tüm mesajlar silinsin mi?')) {
    Store.messages = [];
    Store.polls = {};
    renderMessages();
    saveStore();
    toast('Tüm mesajlar silindi');
  }
          }
