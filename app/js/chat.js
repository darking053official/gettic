// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC CHAT.JS v2.0 - Realtime + MongoDB + localStorage        ║
// ╚══════════════════════════════════════════════════════════════════╝

const MAX_MSGS       = 200;
const MAX_FILE_MB    = 8;
const MAX_MSG_LENGTH = 2000;
const TYPING_TIMEOUT = 3000;

// ============ YARDIMCI ============
function msgIcon(name, size = 16) {
  if (!window.Icons?.[name]) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">${Icons[name]}</svg>`;
}

function formatTime(d) {
  try { return new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function formatDate(d) {
  try {
    const dt = new Date(d), today = new Date();
    if (dt.toDateString() === today.toDateString()) return 'Bugün ' + formatTime(d);
    const y = new Date(today); y.setDate(y.getDate() - 1);
    if (dt.toDateString() === y.toDateString()) return 'Dün ' + formatTime(d);
    return dt.toLocaleDateString('tr-TR') + ' ' + formatTime(d);
  } catch { return ''; }
}

function formatRelativeTime(d) {
  const date = new Date(d), now = new Date(), diff = now - date;
  const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (s < 60)  return 'Az önce';
  if (m < 60)  return m + ' dk önce';
  if (h < 24)  return h + ' sa önce';
  if (h < 48)  return 'Dün ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatMsg(t) {
  if (!t) return '';
  // XSS koruması: önce escape, sonra format
  const esc = escapeHtml(t);
  return esc
    .replace(/\*\*\*(.+?)\*\*\*/g,      '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,          '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,              '<em>$1</em>')
    .replace(/~~(.+?)~~/g,             '<del>$1</del>')
    .replace(/__(.+?)__/g,             '<u>$1</u>')
    .replace(/```([\s\S]+?)```/g,      '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g,             '<code>$1</code>')
    .replace(/(https?:\/\/[^\s<>\[\]"]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>');
}

function formatFileSize(b) {
  if (!b) return '0 B';
  if (b < 1024)    return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  };
}

function _chatLog(msg, level = 'log') {
  console[level](`%c[Chat] ${msg}`, 'color:#ec4899;font-weight:bold');
}

// ============ MESAJ RENDER ============
let _renderScheduled = false;
function renderMessages(opts = {}) {
  if (_renderScheduled && !opts.force) return;
  _renderScheduled = true;
  requestAnimationFrame(() => {
    _renderScheduled = false;
    _doRenderMessages(opts);
  });
}

function _doRenderMessages({ scrollToEnd = true, highlight = null } = {}) {
  const el = document.getElementById('messages');
  if (!el) return;

  if (!Store.messages || Store.messages.length === 0) {
    el.innerHTML = _renderWelcome();
    return;
  }

  const fragment  = document.createDocumentFragment();
  let lastDate    = '';
  let lastSenderId = '';
  let lastTime    = 0;

  Store.messages.forEach((msg, idx) => {
    // Engellenen kullanıcı
    if (Store.blockedUsers?.includes(msg.senderId)) {
      const blockedEl = document.createElement('div');
      blockedEl.className = 'msg-blocked';
      blockedEl.setAttribute('data-id', msg._id);
      blockedEl.textContent = 'Engellenen kullanıcının mesajı — görüntülemek için tıkla';
      blockedEl.onclick = () => unblockMessage(msg._id);
      fragment.appendChild(blockedEl);
      return;
    }

    // Tarih ayırıcı
    const dateStr = formatDate(msg.createdAt);
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      const sep = document.createElement('div');
      sep.className = 'msg-date-sep';
      sep.innerHTML = `<span>${dateStr}</span>`;
      fragment.appendChild(sep);
    }

    // Aynı kişinin ardışık mesajları → kompakt
    const msgTime    = new Date(msg.createdAt).getTime();
    const isGrouped  = msg.senderId === lastSenderId && (msgTime - lastTime) < 5 * 60 * 1000;
    lastSenderId = msg.senderId;
    lastTime     = msgTime;

    const msgEl = document.createElement('div');
    msgEl.innerHTML = _renderMessageHTML(msg, isGrouped);
    const node = msgEl.firstElementChild;
    if (highlight === msg._id) node?.classList.add('highlight');
    fragment.appendChild(node || msgEl);
  });

  // Typing göstergeleri
  const typingUsers = Object.entries(_typingMap)
    .filter(([uid, ts]) => uid !== Store.user?._id && Date.now() - ts < TYPING_TIMEOUT)
    .map(([uid]) => uid);

  if (typingUsers.length > 0) {
    const typEl = document.createElement('div');
    typEl.className = 'msg-typing';
    typEl.id = 'typingIndicator';
    typEl.innerHTML = `
      <div class="msg-av" style="opacity:.5">…</div>
      <div class="msg-body">
        <div class="typing-dots"><span></span><span></span><span></span></div>
        <span class="typing-label">${escapeHtml(typingUsers.join(', '))} yazıyor...</span>
      </div>`;
    fragment.appendChild(typEl);
  }

  // DOM güncelle
  const prevScroll   = el.scrollTop;
  const prevHeight   = el.scrollHeight;
  const wasAtBottom  = prevHeight - prevScroll - el.clientHeight < 80;

  el.innerHTML = '';
  el.appendChild(fragment);

  if (scrollToEnd || wasAtBottom) {
    el.scrollTop = el.scrollHeight;
  } else {
    el.scrollTop = prevScroll + (el.scrollHeight - prevHeight);
  }

  // Okundu işaretle
  _markVisible();
}

function _renderWelcome() {
  const chName = Store.activeChannel || 'genel-sohbet';
  return `
    <div class="welcome-screen">
      <div class="welcome-icon">#</div>
      <h2>${escapeHtml(chName)}'e hoş geldin!</h2>
      <p>Bu kanalın başlangıcı. Sohbeti sen başlat!</p>
      <div class="welcome-tips">
        ${[
          ['message-square', 'Alttaki kutuya yazarak mesaj gönder'],
          ['paperclip',      'Dosya paylaşmak için 📎 butonuna tıkla'],
          ['smile',          'Emoji için 😊 butonuna tıkla'],
          ['mic',            'Ses kanalına tıklayarak sesli sohbet et'],
          ['search',         'Ctrl+K ile hızlı arama yap'],
        ].map(([ic, txt]) => `<div class="welcome-tip">${msgIcon(ic, 18)} ${txt}</div>`).join('')}
      </div>
    </div>`;
}

function _renderMessageHTML(msg, grouped = false) {
  const isOwn  = msg.senderId === Store.user?._id;
  const isBot  = msg.isBot || false;
  const role   = typeof getHighestRole === 'function' ? getHighestRole(msg.senderId) : null;
  const badge  = role && role.id !== 'r4'
    ? `<span class="rbadge" style="background:${role.color}20;color:${role.color}">${escapeHtml(role.name)}</span>` : '';
  const poll   = Store.polls?.[msg._id];
  const readOk = msg.readBy?.length > 1;

  const classes = [
    'msg',
    grouped     ? 'grouped' : '',
    msg.pinned  ? 'pinned'  : '',
    isBot       ? 'bot-msg' : '',
    isOwn       ? 'own-msg' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" id="msg-${msg._id}" oncontextmenu="showMsgContext(event,'${msg._id}')">
      ${grouped
        ? `<div class="msg-ts-small">${formatTime(msg.createdAt)}</div>`
        : `<div class="msg-av ${isBot ? 'bot' : ''}" onclick="showUserProfile('${msg.senderId}')"
              title="${escapeHtml(msg.senderName)} profili">
              ${(msg.senderName || '?').charAt(0).toUpperCase()}
            </div>`}
      <div class="msg-body">
        ${!grouped ? `
          <div class="msg-head">
            <span class="msg-un ${isBot ? 'bot' : ''}" onclick="showUserProfile('${msg.senderId}')">${escapeHtml(msg.senderName || '?')}</span>
            ${badge}
            ${isBot ? '<span class="bot-badge">BOT</span>' : ''}
            <span class="msg-time" title="${new Date(msg.createdAt).toLocaleString('tr-TR')}">${formatRelativeTime(msg.createdAt)}</span>
            ${msg.edited ? '<span class="msg-edited">(düzenlendi)</span>' : ''}
            ${msg.pinned ? `<span class="msg-pin-badge">${msgIcon('pin', 11)}</span>` : ''}
            ${isOwn ? `<span class="msg-read-status" title="${readOk ? 'Okundu' : 'Gönderildi'}">${readOk ? '✓✓' : '✓'}</span>` : ''}
          </div>` : ''}

        ${msg.replyTo ? `
          <div class="msg-reply" onclick="scrollToMessage('${msg.replyTo._id}')">
            ${msgIcon('corner-up-left', 12)}
            <strong>${escapeHtml(msg.replyTo.senderName)}</strong>
            <span>${escapeHtml((msg.replyTo.content || '').substring(0, 60))}</span>
          </div>` : ''}

        ${msg.image   ? `<img src="${escapeHtml(msg.image)}" class="msg-image" loading="lazy" onclick="viewImage('${escapeHtml(msg.image)}')" alt="görsel">` : ''}
        ${msg.voiceUrl? `<div class="msg-voice"><audio src="${escapeHtml(msg.voiceUrl)}" controls preload="none"></audio></div>` : ''}
        ${msg.file    ? _renderFile(msg) : ''}

        ${msg.content ? `<div class="msg-text">${formatMsg(msg.content)}</div>` : ''}

        ${msg.linkPreview ? `
          <a href="${escapeHtml(msg.linkPreview.url)}" target="_blank" rel="noopener noreferrer" class="link-preview">
            <div class="lp-title">${escapeHtml(msg.linkPreview.title || msg.linkPreview.url)}</div>
            ${msg.linkPreview.description ? `<div class="lp-desc">${escapeHtml(msg.linkPreview.description)}</div>` : ''}
            <div class="lp-url">${escapeHtml(msg.linkPreview.url)}</div>
          </a>` : ''}

        ${poll ? _renderPoll(msg._id, poll) : ''}
        ${msg.reactions && Object.keys(msg.reactions).length ? _renderReactions(msg) : ''}
      </div>

      <div class="msg-actions" role="toolbar">
        ${_renderMsgActions(msg, isOwn)}
      </div>
    </div>`;
}

function _renderMsgActions(msg, isOwn) {
  const canDelete = isOwn || (typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'deleteMsg'));
  const canPin    = typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'manageMessages');
  return `
    <button onclick="openQuickReact('${msg._id}',event)" title="Tepki">${msgIcon('smile', 15)}</button>
    <button onclick="replyToMessage('${msg._id}')" title="Yanıtla">${msgIcon('corner-up-left', 15)}</button>
    ${isOwn  ? `<button onclick="editMessage('${msg._id}')" title="Düzenle">${msgIcon('edit', 15)}</button>` : ''}
    <button onclick="copyMessage('${msg._id}')" title="Kopyala">${msgIcon('copy', 15)}</button>
    ${canPin ? `<button onclick="pinMessage('${msg._id}')" title="${msg.pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}">${msgIcon('pin', 15)}</button>` : ''}
    ${canDelete ? `<button onclick="deleteMessage('${msg._id}')" class="danger" title="Sil">${msgIcon('trash', 15)}</button>` : ''}`;
}

// ============ QUICK REACT PICKER ============
const REACT_EMOJI = { like:'👍', heart:'❤️', laugh:'😂', fire:'🔥', sad:'😢', wow:'😮', clap:'👏', eyes:'👀' };

function openQuickReact(msgId, e) {
  document.querySelectorAll('.quick-react-picker').forEach(p => p.remove());
  const picker = document.createElement('div');
  picker.className = 'quick-react-picker';
  picker.innerHTML = Object.entries(REACT_EMOJI).map(([k, v]) =>
    `<button onclick="reactToMessage('${msgId}','${k}');this.parentElement.remove()">${v}</button>`
  ).join('');
  const rect = e.currentTarget.getBoundingClientRect();
  picker.style.cssText = `position:fixed;top:${rect.top - 50}px;left:${rect.left}px;z-index:9998`;
  document.body.appendChild(picker);
  setTimeout(() => document.addEventListener('click', () => picker.remove(), { once: true }), 50);
}

function _renderReactions(msg) {
  return `<div class="reacts">
    ${Object.entries(msg.reactions)
      .filter(([, users]) => users.length > 0)
      .map(([reaction, users]) => {
        const emoji = REACT_EMOJI[reaction] || '👍';
        const mine  = users.includes(Store.user?._id);
        return `<button class="react ${mine ? 'me' : ''}" onclick="reactToMessage('${msg._id}','${reaction}')" title="${users.length} kişi">
          ${emoji} <span>${users.length}</span>
        </button>`;
      }).join('')}
  </div>`;
}

// ============ DOSYA RENDER ============
function _renderFile(msg) {
  const f = msg.file; if (!f) return '';
  const safeData = escapeHtml(f.data || '');
  const safeName = escapeHtml(f.name || 'dosya');
  switch (f.category) {
    case 'image': return `<img src="${safeData}" class="msg-image" loading="lazy" onclick="viewImage('${safeData}')" alt="${safeName}">`;
    case 'video': return `<video src="${safeData}" controls class="msg-video" preload="metadata"></video>`;
    case 'audio': return `<div class="msg-voice"><audio src="${safeData}" controls preload="none"></audio></div>`;
    default: return `
      <div class="msg-file" onclick="downloadFile('${msg._id}')">
        ${msgIcon('paperclip', 22)}
        <div class="msg-file-info">
          <span class="msg-file-name">${safeName}</span>
          <span class="msg-file-size">${formatFileSize(f.size)}</span>
        </div>
        <div class="msg-file-dl">${msgIcon('download', 16)}</div>
      </div>`;
  }
}

// ============ ANKET RENDER ============
function _renderPoll(mid, poll) {
  if (!poll) return '';
  const total    = (poll.votes || []).reduce((a, b) => a + b, 0) || 0;
  const myVote   = poll.voters?.[Store.user?._id];
  const hasVoted = myVote !== undefined;
  const expired  = poll.endsAt && Date.now() > poll.endsAt;

  return `
    <div class="poll-box" id="poll-${mid}">
      <div class="poll-header">
        ${msgIcon('bar-chart', 15)}
        <span class="poll-q">${escapeHtml(poll.question || 'Anket')}</span>
        ${expired ? '<span class="poll-ended">Sona erdi</span>' : ''}
      </div>
      <div class="poll-opts">
        ${(poll.options || []).map((o, i) => {
          const votes = poll.votes?.[i] || 0;
          const pct   = total > 0 ? Math.round((votes / total) * 100) : 0;
          const won   = hasVoted && votes === Math.max(...(poll.votes || [0]));
          return `
            <div class="poll-opt ${myVote === i ? 'voted' : ''} ${won && hasVoted ? 'winner' : ''}"
              onclick="${!hasVoted && !expired ? `votePoll('${mid}',${i})` : ''}">
              <div class="poll-bar" style="width:${pct}%"></div>
              <span class="poll-opt-text">${escapeHtml(o.text || o)}</span>
              ${hasVoted ? `<span class="poll-pct">${pct}%</span>` : ''}
              ${myVote === i ? msgIcon('check', 12) : ''}
            </div>`;
        }).join('')}
      </div>
      <div class="poll-footer">
        ${msgIcon('users', 11)} ${total} oy
        ${poll.endsAt && !expired ? ` · <span id="pollTimer_${mid}"></span> kaldı` : ''}
      </div>
    </div>`;
}

// ============ MESAJ GÖNDER ============
let _slowModeTimer = null;

async function sendMessage() {
  const input   = document.getElementById('messageInput');
  if (!input) return;
  const content = input.value.trim();
  if (!content || !Store.user) return;

  // Uzunluk kontrolü
  if (content.length > MAX_MSG_LENGTH) return toast(`Mesaj çok uzun (max ${MAX_MSG_LENGTH})`, 'w');

  // Yetki
  if (typeof hasPermission === 'function' && !hasPermission(Store.user._id, 'sendMsg')) {
    return toast('Mesaj gönderme yetkiniz yok', 'e');
  }

  // Slow mode
  const ch = (Store.channels || []).find(c => c.id === Store.activeChannel);
  if (ch?.slowMode > 0) {
    const lastSent = _slowModeTimers.get(Store.user._id) || 0;
    const remaining = ch.slowMode * 1000 - (Date.now() - lastSent);
    if (remaining > 0) {
      return toast(`Yavaş mod: ${Math.ceil(remaining / 1000)}s bekle`, 'w');
    }
    _slowModeTimers.set(Store.user._id, Date.now());
  }

  // Bot komutu?
  if (content.startsWith('!') && typeof checkBotCommand === 'function') {
    if (checkBotCommand(content)) {
      input.value = '';
      input.style.height = 'auto';
      input.focus();
      return;
    }
  }

  // Link önizleme
  const linkMatch = content.match(/(https?:\/\/[^\s<>\[\]"]+)/);

  const msg = {
    _id:         genId(),
    content,
    senderName:  Store.user.username,
    senderId:    Store.user._id,
    channelId:   Store.activeChannel,
    createdAt:   new Date().toISOString(),
    reactions:   {},
    replyTo:     window._replyingTo || null,
    readBy:      [Store.user._id],
    linkPreview: linkMatch ? {
      url:   linkMatch[0],
      title: linkMatch[0].replace(/^https?:\/\//, '').split('/')[0],
      description: ''
    } : null
  };

  // Yerel ekle
  _addMessageLocal(msg);

  // UI temizle
  window._replyingTo = null;
  updateReplyUI();
  input.value       = '';
  input.style.height = 'auto';
  input.focus();
  stopTyping();

  // localStorage
  _saveMessagesLocal();

  // MongoDB
  if (typeof MongoSync !== 'undefined' && MongoSync.saveMessage) {
    MongoSync.saveMessage(msg);
  } else if (typeof API !== 'undefined' && Store.token) {
    _syncMessage('POST', msg);
  }

  // Realtime
  if (socket?.connected) {
    socket.emit('send_message', msg);
  }

  // Offline queue
  if (!navigator.onLine) {
    _offlineQueue.push(msg);
    _saveOfflineQueue();
    toast('Çevrimdışı — mesaj kuyruğa alındı', 'w');
  }

  if (typeof incrementStats === 'function') incrementStats();
  if (typeof saveStore     === 'function') saveStore();
}

const _slowModeTimers = new Map();

function _addMessageLocal(msg) {
  if (!Store.messages) Store.messages = [];
  // Duplicate kontrolü
  if (Store.messages.find(m => m._id === msg._id)) return;
  Store.messages.push(msg);
  if (Store.messages.length > MAX_MSGS) Store.messages.shift();
  renderMessages();
}

// ============ SİL / DÜZENLE / KOPYALA / SABİTLE / YANIT ============
function deleteMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;

  const isOwn  = msg.senderId === Store.user?._id;
  const canDel = isOwn || (typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'deleteMsg'));
  if (!canDel) return toast('Yetkiniz yok', 'e');

  Store.messages = Store.messages.filter(m => m._id !== mid);
  if (Store.polls?.[mid]) delete Store.polls[mid];

  _saveMessagesLocal();
  renderMessages({ force: true });
  toast('Mesaj silindi');

  // MongoDB
  if (typeof MongoSync !== 'undefined' && MongoSync.deleteMessage) {
    MongoSync.deleteMessage(mid, Store.activeChannel);
  } else {
    _syncMessage('DELETE', { _id: mid, channelId: Store.activeChannel });
  }

  // Realtime
  if (socket?.connected) {
    socket.emit('delete_message', { id: mid, channelId: Store.activeChannel });
  }

  if (typeof saveStore === 'function') saveStore();
}

function editMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg || msg.senderId !== Store.user?._id) return;

  // Inline edit
  const el = document.querySelector(`#msg-${mid} .msg-text`);
  if (!el) return;

  const original = msg.content;
  el.contentEditable = 'true';
  el.focus();

  // Cursor sona
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  el.classList.add('editing');

  function finish(save) {
    el.contentEditable = 'false';
    el.classList.remove('editing');
    el.removeEventListener('keydown', onKey);
    el.removeEventListener('blur', onBlur);

    if (save) {
      const newContent = el.textContent.trim();
      if (!newContent) return toast('Mesaj boş olamaz', 'e');
      if (newContent === original) return;
      if (newContent.length > MAX_MSG_LENGTH) return toast('Mesaj çok uzun', 'w');

      msg.content = newContent;
      msg.edited  = true;
      el.innerHTML = formatMsg(newContent);

      _saveMessagesLocal();

      if (typeof MongoSync !== 'undefined' && MongoSync.editMessage) {
        MongoSync.editMessage(mid, Store.activeChannel, newContent);
      } else {
        _syncMessage('PATCH', { _id: mid, content: newContent, channelId: Store.activeChannel });
      }

      if (socket?.connected) {
        socket.emit('edit_message', { id: mid, content: newContent, channelId: Store.activeChannel });
      }

      if (typeof saveStore === 'function') saveStore();
    } else {
      el.innerHTML = formatMsg(original);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(true);  }
    if (e.key === 'Escape')               { finish(false); }
  }
  function onBlur() { setTimeout(() => finish(true), 200); }

  el.addEventListener('keydown', onKey);
  el.addEventListener('blur',    onBlur, { once: true });
}

function copyMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  navigator.clipboard.writeText(msg.content)
    .then(() => toast('Kopyalandı'))
    .catch(() => toast('Kopyalanamadı', 'e'));
}

function pinMessage(mid) {
  if (typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'manageMessages')) {
    return toast('Sabitleme yetkiniz yok', 'e');
  }
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  msg.pinned = !msg.pinned;
  if (msg.pinned) {
    Store.messages = [msg, ...Store.messages.filter(m => m._id !== mid)];
  }
  _saveMessagesLocal();
  renderMessages({ force: true });
  toast(msg.pinned ? '📌 Sabitlendi' : 'Sabitleme kaldırıldı');

  if (socket?.connected) {
    socket.emit('pin_message', { id: mid, pinned: msg.pinned, channelId: Store.activeChannel });
  }
  if (typeof saveStore === 'function') saveStore();
}

function replyToMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  window._replyingTo = msg;
  updateReplyUI();
  document.getElementById('messageInput')?.focus();
}

function updateReplyUI() {
  const bar = document.getElementById('replyBar');
  if (!bar) return;
  if (window._replyingTo) {
    bar.innerHTML = `
      <span class="reply-bar-icon">${msgIcon('corner-up-left', 14)}</span>
      <div class="reply-bar-body">
        <strong>${escapeHtml(window._replyingTo.senderName)}</strong>
        <span>${escapeHtml((window._replyingTo.content || '').substring(0, 60))}</span>
      </div>
      <button class="reply-bar-close" onclick="cancelReply()">${msgIcon('x', 14)}</button>`;
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }
}

function cancelReply() {
  window._replyingTo = null;
  updateReplyUI();
  document.getElementById('messageInput')?.focus();
}

function scrollToMessage(mid) {
  const el = document.getElementById('msg-' + mid);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 2200);
}

// ============ TEPKİLER ============
function reactToMessage(mid, reaction) {
  const msg = Store.messages.find(m => m._id === mid);
  if (!msg) return;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[reaction]) msg.reactions[reaction] = [];

  const idx = msg.reactions[reaction].indexOf(Store.user._id);
  if (idx === -1) msg.reactions[reaction].push(Store.user._id);
  else            msg.reactions[reaction].splice(idx, 1);

  if (msg.reactions[reaction].length === 0) delete msg.reactions[reaction];

  _saveMessagesLocal();
  renderMessages({ scrollToEnd: false });

  if (socket?.connected) {
    socket.emit('react_message', { id: mid, reaction, userId: Store.user._id, channelId: Store.activeChannel });
  }
  if (typeof saveStore === 'function') saveStore();
}

// ============ OKUNDU BİLDİRİMİ ============
function _markVisible() {
  const el = document.getElementById('messages');
  if (!el) return;

  const unread = Store.messages.filter(m =>
    m.senderId !== Store.user?._id && !m.readBy?.includes(Store.user?._id)
  );

  unread.forEach(msg => {
    const el2 = document.getElementById('msg-' + msg._id);
    if (!el2) return;
    const rect = el2.getBoundingClientRect();
    const parentRect = el.getBoundingClientRect();
    if (rect.top >= parentRect.top && rect.bottom <= parentRect.bottom) {
      if (!msg.readBy) msg.readBy = [];
      msg.readBy.push(Store.user._id);
      if (socket?.connected) {
        socket.emit('mark_read', { messageId: msg._id, channelId: Store.activeChannel });
      }
    }
  });
}

// ============ YAZMA GÖSTERGESİ ============
const _typingMap = {};
let _typingTimeout = null;
let _isTyping = false;

function onTyping() {
  if (!_isTyping) {
    _isTyping = true;
    if (socket?.connected) {
      socket.emit('typing_start', { channelId: Store.activeChannel, username: Store.user?.username });
    }
  }
  clearTimeout(_typingTimeout);
  _typingTimeout = setTimeout(stopTyping, TYPING_TIMEOUT);
}

function stopTyping() {
  if (!_isTyping) return;
  _isTyping = false;
  clearTimeout(_typingTimeout);
  if (socket?.connected) {
    socket.emit('typing_stop', { channelId: Store.activeChannel });
  }
}

// ============ CONTEXT MENU ============
function showMsgContext(e, msgId) {
  e.preventDefault();
  document.querySelectorAll('.ctx-menu').forEach(m => m.remove());

  const msg    = Store.messages.find(m => m._id === msgId);
  if (!msg) return;

  const isOwn  = msg.senderId === Store.user?._id;
  const canDel = isOwn || (typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'deleteMsg'));
  const canPin = typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'manageMessages');

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  const items = [
    { icon:'smile',         label:'Tepki Ekle',                  action: () => openQuickReact(msgId, e) },
    { icon:'corner-up-left',label:'Yanıtla',                     action: () => replyToMessage(msgId) },
    { sep: true },
    { icon:'copy',          label:'Kopyala',                     action: () => copyMessage(msgId) },
    canPin ? { icon:'pin', label: msg.pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle', action: () => pinMessage(msgId) } : null,
    isOwn   ? { icon:'edit', label:'Düzenle',                    action: () => editMessage(msgId) } : null,
    { sep: true },
    { icon:'link',          label:'Mesaja Git',                  action: () => scrollToMessage(msgId) },
    !isOwn  ? { icon:'flag', label:'Şikayet Et',                 action: () => reportMessage(msgId) } : null,
    canDel  ? { icon:'trash', label:'Sil', danger: true,         action: () => deleteMessage(msgId) } : null,
  ].filter(Boolean);

  items.forEach(item => {
    if (item.sep) {
      const sep = document.createElement('div');
      sep.className = 'ctx-sep';
      menu.appendChild(sep);
      return;
    }
    const btn = document.createElement('button');
    btn.className = item.danger ? 'danger' : '';
    btn.innerHTML = `${msgIcon(item.icon, 14)} ${item.label}`;
    btn.onclick = () => { item.action(); menu.remove(); };
    menu.appendChild(btn);
  });

  // Ekrana sığdır
  document.body.appendChild(menu);
  const mRect = menu.getBoundingClientRect();
  let x = e.clientX, y = e.clientY;
  if (x + mRect.width  > window.innerWidth)  x = window.innerWidth  - mRect.width  - 8;
  if (y + mRect.height > window.innerHeight) y = window.innerHeight - mRect.height - 8;
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9990`;

  setTimeout(() => {
    document.addEventListener('click',      () => menu.remove(), { once: true });
    document.addEventListener('touchstart', () => menu.remove(), { once: true });
    document.addEventListener('keydown',    (ev) => { if (ev.key === 'Escape') menu.remove(); }, { once: true });
  }, 50);
}

// ============ DOSYA YÜKLEME ============
function handleFileUpload(file) {
  if (!file) return;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return toast(`Dosya ${MAX_FILE_MB}MB'den küçük olmalı`, 'e');

  const reader = new FileReader();
  reader.onload = e => {
    const data     = e.target.result;
    const category = file.type.startsWith('image/') ? 'image'
                   : file.type.startsWith('video/') ? 'video'
                   : file.type.startsWith('audio/') ? 'audio'
                   : 'file';

    const msg = {
      _id:        genId(),
      content:    '',
      senderName: Store.user.username,
      senderId:   Store.user._id,
      channelId:  Store.activeChannel,
      createdAt:  new Date().toISOString(),
      reactions:  {},
      readBy:     [Store.user._id],
      file:       { name: file.name, size: file.size, type: file.type, category, data }
    };

    _addMessageLocal(msg);
    _saveMessagesLocal();

    if (typeof MongoSync !== 'undefined' && MongoSync.saveMessage) MongoSync.saveMessage(msg);
    if (socket?.connected) socket.emit('send_message', msg);
    if (typeof saveStore === 'function') saveStore();
    toast(`${file.name} gönderildi`);
  };
  reader.onerror = () => toast('Dosya okunamadı', 'e');
  reader.readAsDataURL(file);
}

function downloadFile(msgId) {
  const msg = Store.messages.find(m => m._id === msgId);
  if (!msg?.file?.data) return;
  const a = document.createElement('a');
  a.href     = msg.file.data;
  a.download = msg.file.name;
  a.click();
}

// ============ SES KAYDI ============
let _mediaRecorder = null;
let _audioChunks   = [];
let _recordingTimer = null;

async function startRecording() {
  if (_mediaRecorder?.state === 'recording') return stopRecording();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _mediaRecorder  = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    _audioChunks    = [];

    _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _audioChunks.push(e.data); };
    _mediaRecorder.onstop = () => {
      const blob = new Blob(_audioChunks, { type: 'audio/webm' });
      if (blob.size < 500) { toast('Kayıt çok kısa', 'w'); return; }
      const url = URL.createObjectURL(blob);
      _sendVoiceMessage(url);
      stream.getTracks().forEach(t => t.stop());
    };

    _mediaRecorder.start(100);
    toast('🎤 Kayıt başladı — tekrar tıkla durdur', 'i');

    // 2 dakika sınırı
    _recordingTimer = setTimeout(() => stopRecording(), 120_000);

    // Kayıt butonunu güncelle
    const btn = document.getElementById('voiceBtn');
    if (btn) btn.classList.add('recording');

  } catch (err) {
    toast('Mikrofon izni gerekli', 'e');
    _chatLog('Mikrofon hatası: ' + err.message, 'error');
  }
}

function stopRecording() {
  clearTimeout(_recordingTimer);
  if (_mediaRecorder?.state === 'recording') {
    _mediaRecorder.stop();
    const btn = document.getElementById('voiceBtn');
    if (btn) btn.classList.remove('recording');
    toast('Ses mesajı gönderildi');
  }
}

function _sendVoiceMessage(url) {
  const msg = {
    _id:        genId(),
    content:    '🎤 Ses Mesajı',
    senderName: Store.user.username,
    senderId:   Store.user._id,
    channelId:  Store.activeChannel,
    createdAt:  new Date().toISOString(),
    reactions:  {},
    readBy:     [Store.user._id],
    voiceUrl:   url
  };
  _addMessageLocal(msg);
  _saveMessagesLocal();
  if (typeof MongoSync !== 'undefined' && MongoSync.saveMessage) MongoSync.saveMessage(msg);
  if (socket?.connected) socket.emit('send_message', msg);
  if (typeof saveStore === 'function') saveStore();
}

// ============ GÖRSEL / KULLANICI ============
function viewImage(src) {
  if (typeof openModal === 'function') openModal('imageView', { src });
}

function showUserProfile(uid) {
  if (typeof openModal !== 'function') return;
  const u = Store.members?.find(m => m._id === uid) || { _id: uid, username: uid };
  openModal('userProfile', { user: u });

  if (typeof MODAL_TEMPLATES !== 'undefined') {
    MODAL_TEMPLATES.userProfile = (data) => {
      const user = data?.user || {};
      const msgs = Store.messages?.filter(m => m.senderId === user._id).length || 0;
      return `
        <div class="gm-header">${msgIcon('user', 18)}<h2>Kullanıcı Profili</h2></div>
        <div class="gm-body">
          <div style="text-align:center;margin-bottom:14px">
            <div class="gm-profile-av" style="margin:0 auto 8px">${(user.username || '?').charAt(0).toUpperCase()}</div>
            <h3 style="margin:0;color:var(--t1)">${escapeHtml(user.username || uid)}</h3>
            <span style="font-size:11px;color:var(--t3)">${msgs} mesaj</span>
          </div>
          <div class="gm-actions" style="justify-content:center">
            <button class="gm-btn primary" onclick="if(typeof startDM==='function')startDM('${escapeHtml(uid)}');closeModal()">${msgIcon('mail', 14)} DM Gönder</button>
            ${typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'kick')
              ? `<button class="gm-btn danger" onclick="if(typeof kickUser==='function')kickUser('${escapeHtml(uid)}');closeModal()">${msgIcon('user-x', 14)} At</button>`
              : ''}
          </div>
        </div>`;
    };
  }
}

// ============ ANKETe OY VER ============
function votePoll(mid, opt) {
  const poll = Store.polls?.[mid];
  if (!poll) return;
  if (poll.voters?.[Store.user?._id] !== undefined) return toast('Zaten oy verdiniz', 'w');
  if (poll.endsAt && Date.now() > poll.endsAt) return toast('Anket sona erdi', 'w');

  if (!poll.voters) poll.voters = {};
  poll.voters[Store.user._id] = opt;
  if (!poll.votes) poll.votes = new Array(poll.options.length).fill(0);
  poll.votes[opt]++;

  renderMessages({ scrollToEnd: false });

  if (socket?.connected) {
    socket.emit('poll_vote', { messageId: mid, option: opt, userId: Store.user._id, channelId: Store.activeChannel });
  }
  if (typeof saveStore === 'function') saveStore();
}

// ============ ŞİKAYET ============
function reportMessage(mid) {
  const reason = prompt('Şikayet sebebi:');
  if (!reason?.trim()) return;
  if (socket?.connected) {
    socket.emit('report_message', { id: mid, reason, reporterId: Store.user._id, channelId: Store.activeChannel });
  }
  toast('Şikayet gönderildi', 'i');
}

// ============ ENGEL KALDIR ============
function unblockMessage(mid) {
  const msg = Store.messages.find(m => m._id === mid);
  if (msg && Store.blockedUsers) {
    Store.blockedUsers = Store.blockedUsers.filter(u => u !== msg.senderId);
    if (typeof saveStore === 'function') saveStore();
    renderMessages({ force: true });
  }
}

// ============ MESAJLARI SİL (kanal) ============
function clearMessages() {
  if (typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'deleteMsg')) {
    return toast('Yetkiniz yok', 'e');
  }
  if (!confirm('Bu kanaldaki tüm mesajlar silinsin mi?')) return;

  Store.messages = [];
  Store.polls    = {};
  _saveMessagesLocal();
  renderMessages({ force: true });

  if (socket?.connected) {
    socket.emit('clear_channel', { channelId: Store.activeChannel });
  }
  if (typeof saveStore === 'function') saveStore();
  toast('Tüm mesajlar silindi');
}

// ============ KAYDIRMA & SCROLL TO BOTTOM ============
function scrollToBottom() {
  const el = document.getElementById('messages');
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
}

// ============ LOCALSTORAGE ============
function _saveMessagesLocal() {
  try {
    const key = `gt_msgs_${Store.activeChannel}`;
    // Son 100 mesajı sakla
    const toSave = (Store.messages || []).slice(-100);
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch (e) {
    _chatLog('localStorage kayıt hatası: ' + e.message, 'warn');
  }
}

function loadMessagesLocal(channelId) {
  try {
    const raw = localStorage.getItem(`gt_msgs_${channelId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ============ OFFLİNE QUEUE ============
const _offlineQueue = (() => {
  let q = [];
  try { q = JSON.parse(localStorage.getItem('gt_offline_queue') || '[]'); } catch {}
  return q;
})();

function _saveOfflineQueue() {
  try { localStorage.setItem('gt_offline_queue', JSON.stringify(_offlineQueue)); } catch {}
}

async function _flushOfflineQueue() {
  if (_offlineQueue.length === 0) return;
  _chatLog(`Offline kuyruk gönderiliyor: ${_offlineQueue.length} mesaj`);
  const toSend = [..._offlineQueue];
  _offlineQueue.length = 0;
  _saveOfflineQueue();
  for (const msg of toSend) {
    if (socket?.connected) socket.emit('send_message', msg);
    await new Promise(r => setTimeout(r, 100));
  }
  toast(`${toSend.length} bekleyen mesaj gönderildi`, 'i');
}

window.addEventListener('online', () => {
  toast('Bağlantı yeniden kuruldu', 'i');
  _flushOfflineQueue();
});
window.addEventListener('offline', () => toast('Çevrimdışısınız', 'w'));

// ============ MONGODB SYNC ============
function _syncMessage(method, payload) {
  if (typeof API === 'undefined' || !Store.token) return;
  const url = method === 'DELETE' || method === 'PATCH'
    ? `${API}/api/messages/${payload._id}`
    : `${API}/api/messages`;
  fetch(url, {
    method: method === 'PATCH' ? 'PUT' : method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + Store.token
    },
    body: method !== 'DELETE' ? JSON.stringify(payload) : undefined
  }).catch(e => _chatLog(`Sync FAIL [${method}]: ${e.message}`, 'warn'));
}

// ============ REALTIME SOCKET EVENTS ============
function initChatSocketEvents() {
  if (typeof socket === 'undefined' || !socket) return;

  socket.on('new_message', msg => {
    if (msg.channelId !== Store.activeChannel) return;
    _addMessageLocal(msg);
    _saveMessagesLocal();
  });

  socket.on('delete_message', ({ id }) => {
    Store.messages = (Store.messages || []).filter(m => m._id !== id);
    if (Store.polls?.[id]) delete Store.polls[id];
    _saveMessagesLocal();
    renderMessages({ force: true, scrollToEnd: false });
  });

  socket.on('edit_message', ({ id, content }) => {
    const msg = Store.messages?.find(m => m._id === id);
    if (msg) { msg.content = content; msg.edited = true; }
    _saveMessagesLocal();
    renderMessages({ scrollToEnd: false });
  });

  socket.on('pin_message', ({ id, pinned }) => {
    const msg = Store.messages?.find(m => m._id === id);
    if (msg) {
      msg.pinned = pinned;
      if (pinned) Store.messages = [msg, ...Store.messages.filter(m => m._id !== id)];
    }
    _saveMessagesLocal();
    renderMessages({ force: true, scrollToEnd: false });
  });

  socket.on('react_message', ({ id, reaction, userId }) => {
    const msg = Store.messages?.find(m => m._id === id);
    if (!msg) return;
    if (!msg.reactions)           msg.reactions = {};
    if (!msg.reactions[reaction]) msg.reactions[reaction] = [];
    const idx = msg.reactions[reaction].indexOf(userId);
    if (idx === -1) msg.reactions[reaction].push(userId);
    else            msg.reactions[reaction].splice(idx, 1);
    if (msg.reactions[reaction].length === 0) delete msg.reactions[reaction];
    renderMessages({ scrollToEnd: false });
  });

  socket.on('typing_start', ({ channelId, username, userId }) => {
    if (channelId !== Store.activeChannel) return;
    _typingMap[userId] = Date.now();
    renderMessages({ scrollToEnd: false });
  });

  socket.on('typing_stop', ({ userId }) => {
    delete _typingMap[userId];
    renderMessages({ scrollToEnd: false });
  });

  socket.on('mark_read', ({ messageId, userId }) => {
    const msg = Store.messages?.find(m => m._id === messageId);
    if (msg && !msg.readBy?.includes(userId)) {
      if (!msg.readBy) msg.readBy = [];
      msg.readBy.push(userId);
    }
  });

  socket.on('poll_vote', ({ messageId, option, userId }) => {
    const poll = Store.polls?.[messageId];
    if (!poll || poll.voters?.[userId] !== undefined) return;
    if (!poll.voters) poll.voters = {};
    poll.voters[userId] = option;
    if (!poll.votes) poll.votes = new Array(poll.options.length).fill(0);
    poll.votes[option]++;
    renderMessages({ scrollToEnd: false });
  });

  socket.on('clear_channel', ({ channelId }) => {
    if (channelId !== Store.activeChannel) return;
    Store.messages = [];
    Store.polls    = {};
    _saveMessagesLocal();
    renderMessages({ force: true });
  });

  _chatLog('Socket event dinleyicileri hazır');
}

// ============ INPUT KBD HANDLER ============
function handleInputKeydown(e) {
  const input = e.target;

  // Enter → gönder (Shift+Enter → satır sonu)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
    return;
  }

  // Auto-resize
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';

  // Yazma göstergesi
  onTyping();

  // Ctrl+K → arama
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    if (typeof openModal === 'function') openModal('search');
  }

  // Escape → reply iptal
  if (e.key === 'Escape' && window._replyingTo) {
    cancelReply();
  }

  // Yukarı ok → son mesajı düzenle
  if (e.key === 'ArrowUp' && !input.value.trim()) {
    const myMsgs = (Store.messages || []).filter(m => m.senderId === Store.user?._id);
    const last   = myMsgs[myMsgs.length - 1];
    if (last) editMessage(last._id);
  }
}

// ============ CSS ============
(function injectChatStyles() {
  const id = 'gt-chat-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
/* ─── Mesajlar container ─── */
#messages{
  flex:1;overflow-y:auto;padding:8px 0;
  display:flex;flex-direction:column;gap:0;
  scroll-behavior:smooth;
}
#messages::-webkit-scrollbar{width:4px}
#messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}

/* ─── Tarih ayırıcı ─── */
.msg-date-sep{
  display:flex;align-items:center;gap:8px;
  padding:8px 16px;
}
.msg-date-sep::before,.msg-date-sep::after{
  content:'';flex:1;height:1px;background:rgba(255,255,255,.07);
}
.msg-date-sep span{
  font-size:10px;font-weight:600;color:var(--t3,#888);
  white-space:nowrap;padding:0 4px;
}

/* ─── Mesaj ─── */
.msg{
  display:flex;gap:10px;padding:3px 16px;
  position:relative;border-radius:0;
  transition:background .12s;
}
.msg:hover{background:rgba(255,255,255,.025)}
.msg.grouped{padding-top:1px}
.msg.pinned{background:rgba(255,215,0,.04)!important;border-left:2px solid #ffd700}
.msg.bot-msg{border-left:3px solid var(--ac,#6366f1);background:var(--ac,#6366f1)05}
.msg.own-msg{}
.msg.highlight{background:var(--ac,#6366f1)18!important;transition:background 2s ease!important}

/* ─── Avatar ─── */
.msg-av{
  width:36px;height:36px;border-radius:50%;
  background:var(--ac,#6366f1);color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:700;flex-shrink:0;
  cursor:pointer;margin-top:2px;
}
.msg-av.bot{background:linear-gradient(135deg,#6366f1,#8b5cf6)}
.msg-av:hover{filter:brightness(1.15)}

/* ─── Küçük zaman (grouped) ─── */
.msg-ts-small{
  width:36px;flex-shrink:0;
  font-size:9px;color:transparent;
  display:flex;align-items:center;justify-content:center;
  padding-top:4px;
}
.msg:hover .msg-ts-small{color:var(--t3,#888)}

/* ─── Body ─── */
.msg-body{flex:1;min-width:0}
.msg-head{
  display:flex;align-items:center;gap:6px;
  flex-wrap:wrap;margin-bottom:2px;
}
.msg-un{
  font-size:14px;font-weight:700;color:var(--t1,#fff);
  cursor:pointer;
}
.msg-un:hover{text-decoration:underline}
.msg-un.bot{color:var(--ac,#6366f1)}
.msg-time{font-size:10px;color:var(--t3,#888)}
.msg-edited{font-size:9px;color:var(--t3,#888);font-style:italic}
.msg-pin-badge{color:#ffd700;display:flex}
.msg-read-status{font-size:10px;color:var(--t3,#888);margin-left:2px}

/* ─── Metin ─── */
.msg-text{
  font-size:14px;line-height:1.5;color:var(--t1,#fff);
  word-break:break-word;white-space:pre-wrap;
}
.msg-text.editing{
  outline:2px solid var(--ac,#6366f1);border-radius:6px;
  padding:2px 6px;background:var(--bg2,#241535);
}
.msg-text a{color:var(--ac,#6366f1);word-break:break-all}
.msg-text code{
  background:rgba(0,0,0,.3);padding:1px 5px;border-radius:4px;
  font-family:monospace;font-size:12px;
}
.msg-text pre{
  background:rgba(0,0,0,.35);padding:10px 14px;border-radius:8px;
  overflow-x:auto;margin:4px 0;
}
.msg-text pre code{background:none;padding:0;font-size:12px}

/* ─── Yanıt ─── */
.msg-reply{
  display:flex;align-items:center;gap:5px;
  padding:3px 8px;border-left:2px solid var(--ac,#6366f1);
  margin-bottom:4px;border-radius:0 4px 4px 0;
  background:rgba(255,255,255,.03);cursor:pointer;
  font-size:12px;color:var(--t3,#888);
}
.msg-reply strong{color:var(--t2,#ccc);margin-right:3px}
.msg-reply:hover{background:rgba(255,255,255,.06)}

/* ─── Görsel / Video / Ses ─── */
.msg-image{
  max-width:340px;max-height:340px;border-radius:10px;
  display:block;margin:4px 0;cursor:zoom-in;
  transition:filter .15s;
}
.msg-image:hover{filter:brightness(1.05)}
.msg-video{max-width:340px;border-radius:10px;display:block;margin:4px 0}
.msg-voice{margin:4px 0}
.msg-voice audio{height:36px;border-radius:20px;width:220px}

/* ─── Dosya ─── */
.msg-file{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;background:var(--bg2,#241535);
  border-radius:10px;margin:4px 0;cursor:pointer;
  border:1.5px solid rgba(255,255,255,.07);
  max-width:300px;transition:border-color .15s;
}
.msg-file:hover{border-color:var(--ac,#6366f1)}
.msg-file-info{flex:1;min-width:0}
.msg-file-name{display:block;font-size:13px;font-weight:600;color:var(--t1,#fff);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.msg-file-size{font-size:11px;color:var(--t3,#888)}
.msg-file-dl{opacity:.5}
.msg-file:hover .msg-file-dl{opacity:1;color:var(--ac,#6366f1)}

/* ─── Link önizleme ─── */
.link-preview{
  display:block;margin:4px 0;padding:10px 12px;
  background:var(--bg2,#241535);border-radius:8px;
  border-left:3px solid var(--ac,#6366f1);
  text-decoration:none;max-width:400px;
}
.lp-title{font-size:13px;font-weight:700;color:var(--t1,#fff);margin-bottom:2px}
.lp-desc{font-size:11px;color:var(--t2,#ccc);margin-bottom:3px}
.lp-url{font-size:10px;color:var(--t3,#888)}

/* ─── Engellenmiş mesaj ─── */
.msg-blocked{
  text-align:center;font-size:11px;color:var(--t3,#888);
  padding:6px 16px;cursor:pointer;font-style:italic;
}
.msg-blocked:hover{color:var(--t2,#ccc)}

/* ─── Eylem butonları ─── */
.msg-actions{
  position:absolute;top:4px;right:10px;
  display:flex;gap:2px;background:var(--bg1,#1a0f24);
  border:1px solid rgba(255,255,255,.1);border-radius:8px;
  padding:3px 4px;opacity:0;pointer-events:none;
  transition:opacity .12s;box-shadow:0 4px 14px rgba(0,0,0,.3);
  z-index:10;
}
.msg:hover .msg-actions{opacity:1;pointer-events:all}
.msg-actions button{
  background:none;border:none;cursor:pointer;padding:4px 5px;
  border-radius:5px;color:var(--t2,#ccc);line-height:1;
  transition:background .12s,color .12s;
}
.msg-actions button:hover{background:rgba(255,255,255,.1);color:var(--t1,#fff)}
.msg-actions button.danger:hover{background:#ef444422;color:#ef4444}

/* ─── Tepkiler ─── */
.reacts{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.react{
  display:inline-flex;align-items:center;gap:4px;
  padding:2px 8px;border-radius:20px;font-size:12px;
  background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);
  cursor:pointer;transition:all .12s;font-family:inherit;
}
.react:hover{border-color:var(--ac,#6366f1)}
.react.me{background:var(--ac,#6366f1)22;border-color:var(--ac,#6366f1)}
.react span{font-size:11px;font-weight:600;color:var(--t2,#ccc)}

/* ─── Quick react picker ─── */
.quick-react-picker{
  display:flex;gap:4px;background:var(--bg1,#1a0f24);
  border:1px solid rgba(255,255,255,.12);border-radius:10px;
  padding:6px 8px;box-shadow:0 8px 24px rgba(0,0,0,.4);
}
.quick-react-picker button{
  background:none;border:none;cursor:pointer;font-size:20px;
  padding:2px 4px;border-radius:6px;transition:transform .1s;
}
.quick-react-picker button:hover{transform:scale(1.3)}

/* ─── Yazma göstergesi ─── */
.msg-typing{padding:4px 16px 8px}
.typing-dots{display:flex;gap:4px;align-items:center;margin-bottom:2px}
.typing-dots span{
  width:6px;height:6px;border-radius:50%;background:var(--t3,#888);
  animation:tdot 1.2s infinite;
}
.typing-dots span:nth-child(2){animation-delay:.2s}
.typing-dots span:nth-child(3){animation-delay:.4s}
.typing-label{font-size:11px;color:var(--t3,#888)}
@keyframes tdot{0%,80%,100%{transform:scale(0.8);opacity:.5}40%{transform:scale(1.2);opacity:1}}

/* ─── Context menu ─── */
.ctx-menu{
  background:var(--bg1,#1a0f24);
  border:1px solid rgba(255,255,255,.1);
  border-radius:10px;padding:4px;
  box-shadow:0 10px 32px rgba(0,0,0,.5);
  min-width:180px;
}
.ctx-menu button{
  display:flex;align-items:center;gap:8px;width:100%;
  padding:8px 10px;border-radius:7px;font-size:13px;
  background:none;border:none;cursor:pointer;color:var(--t1,#fff);
  font-family:inherit;transition:background .1s;text-align:left;
}
.ctx-menu button:hover{background:rgba(255,255,255,.07)}
.ctx-menu button.danger{color:#ef4444}
.ctx-menu button.danger:hover{background:#ef444418}
.ctx-sep{height:1px;background:rgba(255,255,255,.07);margin:3px 0}

/* ─── Reply bar ─── */
#replyBar{
  display:none;align-items:center;gap:8px;
  padding:6px 14px;background:var(--bg2,#241535);
  border-top:1px solid rgba(255,255,255,.06);
  font-size:12px;color:var(--t2,#ccc);
}
.reply-bar-icon{opacity:.5}
.reply-bar-body{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.reply-bar-body strong{color:var(--ac,#6366f1);margin-right:5px}
.reply-bar-close{background:none;border:none;cursor:pointer;color:var(--t3,#888);padding:2px;line-height:1;border-radius:4px}
.reply-bar-close:hover{color:#ef4444}

/* ─── Poll ─── */
.poll-box{
  margin:4px 0;padding:12px;
  background:var(--bg2,#241535);border-radius:10px;
  border:1.5px solid rgba(255,255,255,.07);max-width:380px;
}
.poll-header{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.poll-q{font-size:13px;font-weight:700;color:var(--t1,#fff);flex:1}
.poll-ended{font-size:10px;padding:2px 6px;border-radius:10px;background:#ef444422;color:#ef4444}
.poll-opts{display:flex;flex-direction:column;gap:5px}
.poll-opt{
  position:relative;padding:8px 10px;border-radius:8px;
  background:rgba(255,255,255,.04);overflow:hidden;
  cursor:pointer;border:1.5px solid rgba(255,255,255,.07);
  display:flex;align-items:center;justify-content:space-between;
  transition:border-color .15s;
}
.poll-opt:hover:not(.voted){border-color:var(--ac,#6366f1)}
.poll-opt.voted{border-color:var(--ac,#6366f1)}
.poll-opt.winner{border-color:#10b981}
.poll-bar{
  position:absolute;left:0;top:0;bottom:0;
  background:var(--ac,#6366f1)22;pointer-events:none;
  transition:width .4s ease;
}
.poll-opt-text{font-size:13px;color:var(--t1,#fff);z-index:1;position:relative}
.poll-pct{font-size:12px;font-weight:700;color:var(--ac,#6366f1);z-index:1;position:relative}
.poll-footer{font-size:10px;color:var(--t3,#888);margin-top:6px}

/* ─── Hoş geldin ─── */
.welcome-screen{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  flex:1;padding:40px 20px;text-align:center;
}
.welcome-icon{
  width:60px;height:60px;border-radius:50%;
  background:var(--ac,#6366f1);color:#fff;
  font-size:28px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
  margin-bottom:14px;
}
.welcome-screen h2{font-size:20px;font-weight:800;color:var(--t1,#fff);margin:0 0 6px}
.welcome-screen p{font-size:13px;color:var(--t3,#888);margin:0 0 16px}
.welcome-tips{display:flex;flex-direction:column;gap:6px;text-align:left}
.welcome-tip{
  display:flex;align-items:center;gap:8px;
  font-size:12px;color:var(--t3,#888);
  padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.03);
}

/* ─── Bot badge ─── */
.bot-badge{
  font-size:8px;font-weight:800;letter-spacing:.03em;
  background:var(--ac,#6366f1);color:#fff;
  padding:1px 5px;border-radius:4px;
}

/* ─── Ses kayıt ─── */
#voiceBtn.recording{color:#ef4444!important;animation:pulse .8s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}

/* ─── Compact mod ─── */
.compact-mode .msg{padding:1px 16px}
.compact-mode .msg-av{width:28px;height:28px;font-size:11px}
.compact-mode .msg-text{font-size:13px}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initChat() {
  // Offline queue flush
  if (navigator.onLine) _flushOfflineQueue();

  // Socket event'leri bağla
  if (typeof socket !== 'undefined' && socket) {
    initChatSocketEvents();
  } else {
    document.addEventListener('socket_ready', initChatSocketEvents, { once: true });
  }

  _chatLog('v2.0 yüklendi ✓');
})();
