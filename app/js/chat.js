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
  
  if (Store.messages.length === 0) {
    el.innerHTML = `<div class="empty-ch"><h4># ${Store.activeChannel}</h4><p>Henüz mesaj yok</p></div>`;
    return;
  }
  
  el.innerHTML = Store.messages.map(msg => {
    const role = getHighestRole(msg.senderId);
    const badge = role && role.id !== 'r4' ? `<span class="rbadge" style="background:${role.color}20;color:${role.color}">${role.name}</span>` : '';
    const poll = Store.polls[msg._id];
    
    return `<div class="msg">
      <div class="msg-av">${(msg.senderName||'?').charAt(0).toUpperCase()}</div>
      <div class="msg-body">
        <div class="msg-head">
          <span>${msg.senderName||'?'}</span>${badge}
          <span class="msg-time">${formatTime(msg.createdAt)}${msg.edited?' <span class="msg-edited">(düzenlendi)</span>':''}</span>
        </div>
        ${msg.image ? `<img src="${msg.image}" style="max-width:100%;border-radius:12px;margin:8px 0">` : ''}
        <div class="msg-text">${formatMsg(msg.content)}</div>
        ${poll ? renderPoll(msg._id, poll) : ''}
        ${msg.reactions ? renderReactions(msg) : ''}
      </div>
      <div class="ma">
        <button onclick="reactToMessage('${msg._id}','👍')">👍</button>
        <button onclick="reactToMessage('${msg._id}','❤️')">❤️</button>
        ${msg.senderId===Store.user?._id ? `<button onclick="editMessage('${msg._id}')">✏️</button>` : ''}
        <button onclick="copyMessage('${msg._id}')">📋</button>
        ${hasPermission(Store.user?._id,'deleteMsg')||msg.senderId===Store.user?._id ? `<button onclick="deleteMessage('${msg._id}')" style="color:var(--re)">🗑️</button>` : ''}
      </div>
    </div>`;
  }).join('');
  
  el.scrollTop = el.scrollHeight;
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
  renderMessages();
  input.value = '';
  input.focus();
  
  if (window._socket) window._socket.emit('send_message', msg);
}

function deleteMessage(mid) {
  Store.messages = Store.messages.filter(m => m._id !== mid);
  delete Store.polls[mid];
  renderMessages();
  toast('Silindi');
}

function copyMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (msg) { navigator.clipboard.writeText(msg.content); toast('Kopyalandı'); }
}

function editMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  const newContent = prompt('Mesajı düzenle:', msg.content);
  if (newContent && newContent.trim()) {
    msg.content = newContent.trim();
    msg.edited = true;
    renderMessages();
  }
}

function reactToMessage(mid, emoji) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const idx = msg.reactions[emoji].indexOf(Store.user._id);
  if (idx === -1) msg.reactions[emoji].push(Store.user._id);
  else msg.reactions[emoji].splice(idx, 1);
  if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  renderMessages();
}

function renderReactions(msg) {
  return `<div class="reacts">${Object.entries(msg.reactions||{}).map(([emoji,users]) => 
    `<span class="react ${users.includes(Store.user?._id)?'me':''}" onclick="reactToMessage('${msg._id}','${emoji}')">${emoji} ${users.length}</span>`
  ).join('')}</div>`;
                             }
