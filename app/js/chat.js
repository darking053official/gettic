// ============ GETTIC CHAT.JS - FULL GÜNCEL ============

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
    .replace(/(https?:\/\/[^\s<>\[\]]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');
}

// ============ MESAJ RENDER ============
function renderMessages() {
  const el = document.getElementById('messages');
  if (!el) return;

  if (!Store.messages || Store.messages.length === 0) {
    el.innerHTML = `<div class="empty-ch">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
      <h4># ${Store.activeChannel || 'genel-sohbet'}</h4>
      <p>Sohbete hoş geldin! İlk mesajı sen gönder.</p>
    </div>`;
    return;
  }

  let lastDate = '';

  el.innerHTML = Store.messages.map((msg, idx) => {
    if (Store.blockedUsers?.includes(msg.senderId)) {
      return `<div class="msg blocked" onclick="unblockMessage('${msg._id}')" style="cursor:pointer;text-align:center;color:var(--t3);font-size:11px;padding:8px">
        Engellenmiş mesaj - görmek için tıkla
      </div>`;
    }

    const role = typeof getHighestRole === 'function' ? getHighestRole(msg.senderId) : null;
    const badge = role && role.id !== 'r4' ? `<span class="rbadge" style="background:${role.color}20;color:${role.color}">${role.name}</span>` : '';
    const poll = Store.polls?.[msg._id];
    const isOwn = msg.senderId === Store.user?._id;
    const dateStr = formatDate(msg.createdAt);
    const showDate = dateStr !== lastDate;
    lastDate = dateStr;

    return `
      ${showDate ? `<div class="msg-date-separator"><span>${dateStr}</span></div>` : ''}
      <div class="msg ${msg.pinned ? 'pinned' : ''}" id="msg-${msg._id}" data-sender="${msg.senderId}">
        <div class="msg-av" onclick="showUserInfo('${msg.senderId}')" title="${msg.senderName} profili">${(msg.senderName||'?').charAt(0).toUpperCase()}</div>
        <div class="msg-body">
          <div class="msg-head">
            <span class="msg-un" onclick="showUserInfo('${msg.senderId}')">${msg.senderName||'?'}</span>${badge}
            <span class="msg-time">${formatTime(msg.createdAt)}${msg.edited?' <span class="msg-edited">(düzenlendi)</span>':''}</span>
            ${msg.pinned ? '<span class="msg-pin-badge">📌 Sabitlendi</span>' : ''}
          </div>
          ${msg.replyTo ? renderReplyPreview(msg.replyTo) : ''}
          ${msg.image ? `<img src="${msg.image}" alt="${msg.content}" class="msg-image" loading="lazy" onclick="viewImage('${msg.image}')" style="max-width:300px;max-height:300px;border-radius:12px;margin:8px 0;cursor:pointer">` : ''}
          ${msg.file ? renderFileMessage(msg) : ''}
          <div class="msg-text">${formatMsg(msg.content)}</div>
          ${poll ? renderPoll(msg._id, poll) : ''}
          ${msg.reactions ? renderReactions(msg) : ''}
          ${typeof renderThreadButton === 'function' ? renderThreadButton(msg._id) : ''}
        </div>
        <div class="ma">
          <button onclick="reactToMessage('${msg._id}','👍')" title="Beğen">👍</button>
          <button onclick="reactToMessage('${msg._id}','❤️')" title="Kalp">❤️</button>
          <button onclick="reactToMessage('${msg._id}','😂')" title="Gül">😂</button>
          <button onclick="reactToMessage('${msg._id}','🔥')" title="Ateş">🔥</button>
          <button onclick="replyToMessage('${msg._id}')" title="Yanıtla">↩️</button>
          ${isOwn ? `<button onclick="editMessage('${msg._id}')" title="Düzenle">✏️</button>` : ''}
          <button onclick="copyMessage('${msg._id}')" title="Kopyala">📋</button>
          <button onclick="pinMessage('${msg._id}')" title="${msg.pinned?'Sabitlemeyi Kaldır':'Sabitle'}">📌</button>
          ${(isOwn || (typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'deleteMsg'))) ? 
            `<button onclick="deleteMessage('${msg._id}')" style="color:var(--re)" title="Sil">🗑️</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  el.scrollTop = el.scrollHeight;
  if (typeof saveStore === 'function') saveStore();
}

// ============ MESAJ GÖNDER ============
function sendMessage() {
  const input = document.getElementById('messageInput');
  if (!input) return;
  const content = input.value.trim();
  if (!content || !Store.user) return;
  if (typeof hasPermission === 'function' && !hasPermission(Store.user._id, 'sendMsg')) {
    return toast('❌ Mesaj gönderme yetkiniz yok', 'e');
  }

  // Bot komutu kontrolü
  if (content.startsWith('!') && typeof checkBotCommand === 'function') {
    if (checkBotCommand(content)) {
      input.value = '';
      input.focus();
      return;
    }
  }

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
  input.value = '';
  input.style.height = 'auto';
  input.focus();

  // MongoDB'ye kaydet
  if (typeof MongoSync !== 'undefined' && MongoSync.saveMessage) {
    MongoSync.saveMessage(msg);
  }

  // Socket ile gönder
  if (window._socket) {
    window._socket.emit('send_message', msg);
  }

  // Offline kuyruğu
  if (typeof OfflineMode !== 'undefined' && !navigator.onLine) {
    OfflineMode.addPending(msg);
  }

  if (typeof incrementStats === 'function') incrementStats();
}

// ============ MESAJ SİL ============
function deleteMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  if (msg.senderId !== Store.user?._id && typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'deleteMsg')) {
    return toast('❌ Yetkiniz yok', 'e');
  }

  Store.messages = Store.messages.filter(m => m._id !== mid);
  delete Store.polls?.[mid];

  renderMessages();

  // MongoDB'den sil
  if (typeof MongoSync !== 'undefined' && MongoSync.deleteMessage) {
    MongoSync.deleteMessage(mid, Store.activeChannel);
  }

  toast('🗑️ Mesaj silindi');

  if (window._socket) {
    window._socket.emit('delete_message', { id: mid, channelId: Store.activeChannel });
  }
}

// ============ MESAJ DÜZENLE ============
function editMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg || msg.senderId !== Store.user?._id) return;

  const newContent = prompt('Mesajı düzenle:', msg.content);
  if (newContent && newContent.trim() && newContent.trim() !== msg.content) {
    msg.content = newContent.trim();
    msg.edited = true;
    msg.editedAt = new Date().toISOString();

    renderMessages();

    if (typeof MongoSync !== 'undefined' && MongoSync.editMessage) {
      MongoSync.editMessage(mid, Store.activeChannel, msg.content);
    }

    if (window._socket) {
      window._socket.emit('edit_message', { id: mid, content: msg.content, channelId: Store.activeChannel });
    }
  }
}

// ============ MESAJ KOPYALA ============
function copyMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (msg) {
    navigator.clipboard.writeText(msg.content)
      .then(() => toast('📋 Kopyalandı'))
      .catch(() => toast('Kopyalanamadı', 'e'));
  }
}

// ============ MESAJ SABİTLE ============
function pinMessage(mid) {
  if (typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'pin')) {
    return toast('❌ Yetkiniz yok', 'e');
  }
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  msg.pinned = !msg.pinned;
  if (msg.pinned) {
    Store.messages = [msg, ...Store.messages.filter(m => m._id !== mid)];
  }
  renderMessages();
  toast(msg.pinned ? '📌 Sabitlendi' : '📌 Sabitleme kaldırıldı');
}

// ============ YANITLAMA ============
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
      <span style="color:var(--t3)">↩️ ${window._replyingTo.senderName}: ${window._replyingTo.content.substring(0, 50)}</span>
      <button onclick="window._replyingTo=null;updateReplyUI();document.getElementById('messageInput').focus()" style="background:none;border:none;color:var(--re);cursor:pointer;font-weight:700">×</button>
    `;
    replyBar.style.display = 'flex';
  } else {
    replyBar.style.display = 'none';
  }
}

function renderReplyPreview(replyTo) {
  return `
    <div class="msg-reply" onclick="scrollToMessage('${replyTo._id}')" style="cursor:pointer;padding:4px 8px;border-left:2px solid var(--ac);margin-bottom:4px;font-size:11px;color:var(--t3)">
      <span style="font-weight:600">${replyTo.senderName}</span> ${replyTo.content.substring(0, 60)}
    </div>`;
}

function scrollToMessage(mid) {
  const el = document.getElementById('msg-' + mid);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.background = 'var(--acd)';
    setTimeout(() => el.style.background = '', 2000);
  }
}

// ============ REAKSİYONLAR ============
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
}

function renderReactions(msg) {
  if (!msg.reactions || Object.keys(msg.reactions).length === 0) return '';
  return `<div class="reacts">${Object.entries(msg.reactions).map(([emoji, users]) =>
    `<span class="react ${users.includes(Store.user?._id)?'me':''}" onclick="reactToMessage('${msg._id}','${emoji}')">${emoji} <span>${users.length}</span></span>`
  ).join('')}</div>`;
}

// ============ TOPLU TEMİZLİK ============
function clearMessages() {
  if (typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'deleteMsg')) {
    return toast('❌ Yetkiniz yok', 'e');
  }
  if (confirm('Bu kanaldaki tüm mesajlar silinsin mi? Bu işlem geri alınamaz.')) {
    Store.messages = [];
    Store.polls = {};
    Store.pinnedMessages = [];
    renderMessages();
    if (typeof saveStore === 'function') saveStore();
    toast('🗑️ Tüm mesajlar silindi');
  }
}

// ============ GÖRSEL GÖRÜNTÜLEME ============
function viewImage(src) {
  if (typeof openModal === 'function') {
    openModal('imageView');
    const content = document.getElementById('modalContent');
    if (content) {
      content.innerHTML = `<img src="${src}" style="max-width:100%;max-height:80vh;border-radius:12px;cursor:pointer" onclick="closeModal()">`;
    }
  }
}

// ============ KULLANICI BİLGİSİ ============
function showUserInfo(uid) {
  if (typeof openModal === 'function') {
    openModal('profile');
    const content = document.getElementById('modalContent');
    if (content) {
      content.innerHTML = `
        <div style="text-align:center">
          <div class="avatar-big">${uid.charAt(0)?.toUpperCase() || '?'}</div>
          <h3>${uid}</h3>
          <button class="mb" onclick="startDM('${uid}')">💬 DM Gönder</button>
          ${typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'kick') ? 
            `<button class="mb sec" onclick="kickUser('${uid}')">👢 At</button>` : ''}
        </div>`;
    }
  }
}

// ============ DOSYA RENDER ============
function renderFileMessage(msg) {
  const file = msg.file;
  if (!file) return '';
  switch (file.category) {
    case 'image':
      return `<img src="${file.data}" alt="${file.name}" class="msg-image" loading="lazy" onclick="viewImage('${file.data}')" style="max-width:300px;max-height:300px;border-radius:12px;margin:8px 0;cursor:pointer">`;
    case 'video':
      return `<video src="${file.data}" controls style="max-width:300px;max-height:300px;border-radius:12px" preload="metadata"></video>`;
    case 'audio':
      return `<audio src="${file.data}" controls style="width:250px"></audio>`;
    default:
      return `<div class="file-attachment" onclick="downloadFile('${msg._id}')" style="background:var(--bg2);padding:10px 14px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:24px">📎</span>
        <div><div style="font-weight:600;font-size:12px">${file.name}</div>
        <div style="font-size:10px;color:var(--t3)">${formatFileSize(file.size)}</div></div>
      </div>`;
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function downloadFile(msgId) {
  const msg = Store.messages.find(m => m._id === msgId);
  if (!msg?.file?.data) return;
  const a = document.createElement('a');
  a.href = msg.file.data;
  a.download = msg.file.name;
  a.click();
}

// ============ ENGELLEME ============
function unblockMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (msg && Store.blockedUsers) {
    Store.blockedUsers = Store.blockedUsers.filter(u => u !== msg.senderId);
    if (typeof saveStore === 'function') saveStore();
    renderMessages();
  }
}

// ============ ANKET RENDER ============
function renderPoll(mid, poll) {
  if (!poll || typeof poll !== 'object') return '';
  const total = (poll.votes || []).reduce((a, b) => a + b, 0) || 1;
  return `<div class="poll-box" id="poll-${mid}">
    <div class="poll-q">📊 ${poll.question || 'Anket'}</div>
    <div class="poll-opts">
      ${(poll.options || []).map((o, i) => {
        const pct = Math.round(((poll.votes?.[i] || 0) / total) * 100);
        return `<div class="poll-opt ${poll.voters?.[Store.user?._id]===i?'voted':''}" onclick="votePoll('${mid}',${i})">
          <div class="poll-bar" style="width:${pct}%"></div>
          <span>${o.text || o}</span><span class="poll-pct">${pct}%</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function votePoll(mid, opt) {
  if (typeof window.votePoll === 'function') {
    window.votePoll(mid, opt);
  } else {
    const poll = Store.polls?.[mid];
    if (!poll) return;
    if (poll.voters?.[Store.user?._id] !== undefined) return toast('Zaten oy verdiniz', 'e');
    if (!poll.voters) poll.voters = {};
    poll.voters[Store.user._id] = opt;
    if (!poll.votes) poll.votes = new Array(poll.options.length).fill(0);
    poll.votes[opt]++;
    renderMessages();
  }
}

console.log('✅ Chat.js yüklendi');
