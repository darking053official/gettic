// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC DM.JS v2.0 - Realtime + MongoDB + localStorage          ║
// ╚══════════════════════════════════════════════════════════════════╝

const MAX_DM_MSGS    = 200;
const MAX_DM_FRIENDS = 100;
const DM_TYPING_MS   = 3000;

// ============ STATE ============
const dmState = (() => {
  let friends  = [], messages = {}, unread = {};
  try { friends  = JSON.parse(localStorage.getItem('gt_dm_friends')   || '[]'); } catch {}
  try { messages = JSON.parse(localStorage.getItem('gt_dm_messages')  || '{}'); } catch {}
  try { unread   = JSON.parse(localStorage.getItem('gt_dm_unread')    || '{}'); } catch {}

  return {
    friends,
    messages,
    unread,
    activeDM:   null,
    typing:     {},
    online:     {},
    _requests:  [],
    e2eeEnabled: localStorage.getItem('gt_e2ee_enabled') === 'true'
  };
})();

// ============ LOG ============
function _dmLog(msg, level = 'log') {
  console[level](`%c[DM] ${msg}`, 'color:#f59e0b;font-weight:bold');
}

// ============ LOCALSTORAGE ============
function saveDMState() {
  try {
    localStorage.setItem('gt_dm_friends',  JSON.stringify(dmState.friends));
    localStorage.setItem('gt_dm_messages', JSON.stringify(dmState.messages));
    localStorage.setItem('gt_dm_unread',   JSON.stringify(dmState.unread));
  } catch (e) {
    _dmLog('localStorage kayıt hatası: ' + e.message, 'warn');
  }
}

function _saveDMChannel(username) {
  try {
    const msgs = (dmState.messages[username] || []).slice(-100);
    localStorage.setItem(`gt_dm_ch_${username}`, JSON.stringify(msgs));
  } catch {}
}

function _loadDMChannel(username) {
  try {
    const raw = localStorage.getItem(`gt_dm_ch_${username}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ============ MONGODB SYNC ============
async function _syncDM(method, payload) {
  if (typeof API === 'undefined' || !Store.token) return null;
  try {
    const res = await fetch(`${API}/api/dm`, {
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + Store.token
      },
      body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(payload) : undefined
    });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    _dmLog(`Sync FAIL [${method}]: ${e.message}`, 'warn');
    return null;
  }
}

async function _loadDMFromMongo(username) {
  if (typeof API === 'undefined' || !Store.token) return null;
  try {
    const res = await fetch(`${API}/api/dm/${username}`, {
      headers: { 'Authorization': 'Bearer ' + Store.token }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ============ DM BAŞLAT ============
async function startDM(username) {
  username = username?.trim();
  if (!username)                              return toast('Kullanıcı adı gerekli', 'e');
  if (username === Store.user?.username)      return toast('Kendine DM atamazsın', 'e');
  if (Store.blockedUsers?.includes(username)) return toast('Bu kullanıcı engelli', 'e');

  // 🔐 E2EE + PQ Key Pair oluştur (yoksa)
  if (typeof GetticE2EE !== 'undefined' && WasmLoader?.loaded) {
    if (!GetticE2EE._keyPairs[Store.user._id]) {
      GetticE2EE.generateKeyPair(Store.user._id);
      GetticE2EE.generatePQKeyPair(Store.user._id);
    }
  }

  // Arkadaş listesine ekle (yoksa)
  if (!dmState.friends.find(f => f.username === username)) {
    if (dmState.friends.length >= MAX_DM_FRIENDS) {
      dmState.friends.pop();
    }
    dmState.friends.unshift({
      id:          genId(),
      username,
      lastMessage: '',
      lastTime:    Date.now(),
      unread:      0,
      online:      dmState.online[username] || false,
      createdAt:   new Date().toISOString()
    });
  }

  dmState.activeDM           = username;
  dmState.unread[username]   = 0;
  if (!dmState.messages[username]) dmState.messages[username] = [];

  saveDMState();
  closeModal();

  const chNameEl = document.getElementById('channelName');
  if (chNameEl) chNameEl.textContent = '@' + username;

  const cached = _loadDMChannel(username);
  if (cached?.length) {
    dmState.messages[username] = cached;
    renderDMChat(username);
  }

  const remote = await _loadDMFromMongo(username);
  if (remote?.length) {
    dmState.messages[username] = remote;
    _saveDMChannel(username);
    saveDMState();
    renderDMChat(username);
  } else if (!cached?.length) {
    renderDMChat(username);
  }

  if (socket?.connected) {
    socket.emit('dm_open', { with: username });
  }

  _showDMInput(username);
  _dmLog('DM açıldı: ' + username);
}

// ============ MESAJ GÖNDER ============
function sendDMMessage(username, text) {
  text = text?.trim();
  if (!text || !username || !Store.user) return;
  if (text.length > 2000) return toast('Mesaj çok uzun (max 2000)', 'w');
  if (Store.blockedUsers?.includes(username)) return toast('Bu kullanıcı engelli', 'e');

  let finalText = text;
  let encrypted = false;

  // 🔐 E2EE Şifreleme
  if (dmState.e2eeEnabled && typeof GetticE2EE !== 'undefined' && WasmLoader?.loaded) {
    const theirPubKey = GetticE2EE.getPublicKey(username);
    if (theirPubKey) {
      const secret = GetticE2EE.deriveSharedSecret(Store.user._id, theirPubKey);
      if (secret) {
        finalText = GetticE2EE.encryptMessage(text, secret);
        encrypted = true;
      }
    }
  }

  const msg = {
    id:         genId(),
    sender:     Store.user.username,
    senderId:   Store.user._id,
    to:         username,
    text:       finalText,
    time:       new Date().toISOString(),
    reactions:  {},
    read:       false,
    edited:     false,
    replyTo:    window._dmReplyingTo || null,
    encrypted:  encrypted
  };

  // Yerel ekle
  if (!dmState.messages[username]) dmState.messages[username] = [];
  dmState.messages[username].push(msg);
  if (dmState.messages[username].length > MAX_DM_MSGS) {
    dmState.messages[username].shift();
  }

  // Arkadaş son mesaj güncelle
  const friend = dmState.friends.find(f => f.username === username);
  if (friend) { friend.lastMessage = text; friend.lastTime = Date.now(); }

  window._dmReplyingTo = null;
  _updateDMReplyUI(null);

  saveDMState();
  _saveDMChannel(username);
  renderDMChat(username);

  // MongoDB
  _syncDM('POST', { to: username, message: msg });

  // Realtime
  if (socket?.connected) {
    socket.emit('dm_message', {
      to:       username,
      sender:   Store.user.username,
      senderId: Store.user._id,
      message:  msg
    });
    stopDMTyping(username);
  }

  // Input temizle
  const input = document.getElementById('dmInput');
  if (input) { input.value = ''; input.style.height = 'auto'; input.focus(); }
      }

// ============ MESAJ SİL ============
function deleteDMMessage(username, msgId) {
  const msgs = dmState.messages[username];
  if (!msgs) return;

  const msg = msgs.find(m => m.id === msgId);
  if (!msg) return;
  if (msg.senderId !== Store.user?._id) return toast('Sadece kendi mesajını silebilirsin', 'e');

  dmState.messages[username] = msgs.filter(m => m.id !== msgId);

  const friend = dmState.friends.find(f => f.username === username);
  if (friend) {
    const rem = dmState.messages[username];
    friend.lastMessage = rem.length ? rem[rem.length - 1].text : '';
  }

  saveDMState();
  _saveDMChannel(username);
  renderDMChat(username);
  toast('Mesaj silindi');

  _syncDM('DELETE', { to: username, messageId: msgId });

  if (socket?.connected) {
    socket.emit('dm_delete', { to: username, messageId: msgId, sender: Store.user.username });
  }
}

// ============ MESAJ DÜZENLE ============
function editDMMessage(username, msgId) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (!msg || msg.senderId !== Store.user?._id) return;

  const el = document.querySelector(`#dm-msg-${msgId} .dm-msg-text`);
  if (!el) return;

  const original = msg.text;
  el.contentEditable = 'true';
  el.classList.add('editing');
  el.focus();

  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  function finish(save) {
    el.contentEditable = 'false';
    el.classList.remove('editing');
    el.removeEventListener('keydown', onKey);
    if (save) {
      const newText = el.textContent.trim();
      if (!newText || newText === original) { el.textContent = original; return; }
      msg.text   = newText;
      msg.edited = true;
      el.innerHTML = _formatDMText(newText);
      saveDMState();
      _saveDMChannel(username);
      _syncDM('PATCH', { to: username, messageId: msgId, text: newText });
      if (socket?.connected) {
        socket.emit('dm_edit', { to: username, messageId: msgId, text: newText, sender: Store.user.username });
      }
    } else {
      el.innerHTML = _formatDMText(original);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') finish(false);
  }
  el.addEventListener('keydown', onKey);
  el.addEventListener('blur', () => setTimeout(() => finish(true), 150), { once: true });
}

// ============ TEPKİ ============
function reactToDM(username, msgId, reaction) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (!msg) return;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[reaction]) msg.reactions[reaction] = [];

  const idx = msg.reactions[reaction].indexOf(Store.user._id);
  if (idx === -1) msg.reactions[reaction].push(Store.user._id);
  else            msg.reactions[reaction].splice(idx, 1);
  if (msg.reactions[reaction].length === 0) delete msg.reactions[reaction];

  saveDMState();
  renderDMChat(username);

  if (socket?.connected) {
    socket.emit('dm_react', {
      to: username, messageId: msgId,
      reaction, userId: Store.user._id, sender: Store.user.username
    });
  }
}

// ============ KOPYALA ============
function copyDMText(username, msgId) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (!msg) return;
  navigator.clipboard.writeText(msg.text)
    .then(() => toast('Kopyalandı'))
    .catch(() => toast('Kopyalanamadı', 'e'));
}

// ============ YANIT ============
function replyToDM(username, msgId) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (!msg) return;
  window._dmReplyingTo = msg;
  _updateDMReplyUI(msg);
  document.getElementById('dmInput')?.focus();
}

function _updateDMReplyUI(msg) {
  const bar = document.getElementById('dmReplyBar');
  if (!bar) return;
  if (msg) {
    bar.innerHTML = `
      <span class="reply-bar-icon">↩</span>
      <div class="reply-bar-body">
        <strong>${escapeHtml(msg.sender)}</strong>
        <span>${escapeHtml(msg.text.substring(0, 60))}</span>
      </div>
      <button class="reply-bar-close" onclick="window._dmReplyingTo=null;_updateDMReplyUI(null)">✕</button>`;
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }
}

// ============ DM CHAT RENDER ============
function renderDMChat(username) {
  const el = document.getElementById('messages');
  if (!el) return;

  const msgs = dmState.messages[username] || [];

  if (msgs.length === 0) {
    el.innerHTML = `
      <div class="welcome-screen">
        <div class="dm-welcome-av">${username.charAt(0).toUpperCase()}</div>
        <h2>@${escapeHtml(username)}</h2>
        <p>DM başlatıldı. İlk mesajı sen gönder!</p>
      </div>`;
    return;
  }

  const fragment   = document.createDocumentFragment();
  let lastSender   = '';
  let lastTime     = 0;

  msgs.forEach(msg => {
    const isOwn     = msg.senderId === Store.user?._id;
    const msgTime   = new Date(msg.time).getTime();
    const grouped   = msg.sender === lastSender && (msgTime - lastTime) < 5 * 60 * 1000;
    lastSender = msg.sender;
    lastTime   = msgTime;

    const el2 = document.createElement('div');
    el2.innerHTML = _renderDMMessageHTML(username, msg, isOwn, grouped);
    fragment.appendChild(el2.firstElementChild);
  });

  // Yazma göstergesi
  if (dmState.typing[username] && Date.now() - dmState.typing[username] < DM_TYPING_MS) {
    const typEl = document.createElement('div');
    typEl.className = 'msg-typing';
    typEl.innerHTML = `
      <div class="msg-av" style="opacity:.5">${username.charAt(0).toUpperCase()}</div>
      <div class="msg-body">
        <div class="typing-dots"><span></span><span></span><span></span></div>
        <span class="typing-label">${escapeHtml(username)} yazıyor...</span>
      </div>`;
    fragment.appendChild(typEl);
  }

  const prevScroll   = el.scrollTop;
  const prevHeight   = el.scrollHeight;
  const wasAtBottom  = prevHeight - prevScroll - el.clientHeight < 80;

  el.innerHTML = '';
  el.appendChild(fragment);

  if (wasAtBottom) el.scrollTop = el.scrollHeight;
  else             el.scrollTop = prevScroll + (el.scrollHeight - prevHeight);

  // Okundu işaretle
  _markDMRead(username);
}

function _renderDMMessageHTML(username, msg, isOwn, grouped) {
  const hasReacts = msg.reactions && Object.keys(msg.reactions).length > 0;
  const REACT_EMOJI = { like:'👍', heart:'❤️', laugh:'😂', fire:'🔥', sad:'😢', wow:'😮' };

  return `
    <div class="msg ${grouped ? 'grouped' : ''} ${isOwn ? 'own-msg' : ''}" id="dm-msg-${msg.id}"
      oncontextmenu="_showDMContext(event,'${escapeHtml(username)}','${msg.id}')">
      ${grouped
        ? `<div class="msg-ts-small">${typeof formatTime === 'function' ? formatTime(msg.time) : ''}</div>`
        : `<div class="msg-av" title="${escapeHtml(msg.sender)}">${(msg.sender || '?').charAt(0).toUpperCase()}</div>`}
      <div class="msg-body">
        ${!grouped ? `
          <div class="msg-head">
            <span class="msg-un">${escapeHtml(msg.sender || '?')}</span>
            <span class="msg-time">${typeof formatRelativeTime === 'function' ? formatRelativeTime(msg.time) : ''}</span>
            ${msg.edited ? '<span class="msg-edited">(düzenlendi)</span>' : ''}
            ${isOwn ? `<span class="msg-read-status">${msg.read ? '✓✓' : '✓'}</span>` : ''}
          </div>` : ''}

        ${msg.replyTo ? `
          <div class="msg-reply" onclick="scrollToDMMessage('${msg.replyTo.id}')">
            ↩ <strong>${escapeHtml(msg.replyTo.sender)}</strong>
            <span>${escapeHtml((msg.replyTo.text || '').substring(0, 60))}</span>
          </div>` : ''}

        <div class="msg-text dm-msg-text">${_formatDMText(msg.text)}</div>

        ${hasReacts ? `
          <div class="reacts">
            ${Object.entries(msg.reactions)
              .filter(([, u]) => u.length > 0)
              .map(([r, u]) => `
                <button class="react ${u.includes(Store.user?._id) ? 'me' : ''}"
                  onclick="reactToDM('${escapeHtml(username)}','${msg.id}','${r}')">
                  ${REACT_EMOJI[r] || '👍'} <span>${u.length}</span>
                </button>`).join('')}
          </div>` : ''}
      </div>

      <div class="msg-actions">
        <button onclick="_openDMQuickReact('${escapeHtml(username)}','${msg.id}',event)" title="Tepki">😊</button>
        <button onclick="replyToDM('${escapeHtml(username)}','${msg.id}')" title="Yanıtla">↩</button>
        <button onclick="copyDMText('${escapeHtml(username)}','${msg.id}')" title="Kopyala">📋</button>
        ${isOwn ? `
          <button onclick="editDMMessage('${escapeHtml(username)}','${msg.id}')" title="Düzenle">✏️</button>
          <button onclick="deleteDMMessage('${escapeHtml(username)}','${msg.id}')" class="danger" title="Sil">🗑️</button>` : ''}
      </div>
    </div>`;
}

function _formatDMText(t) {
  if (!t) return '';
  if (typeof escapeHtml !== 'undefined') t = escapeHtml(t);
  return t
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    .replace(/~~(.+?)~~/g,         '<del>$1</del>')
    .replace(/`([^`]+)`/g,         '<code>$1</code>')
    .replace(/(https?:\/\/[^\s<>]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');
}

// ============ QUICK REACT ============
const DM_REACT_EMOJI = { like:'👍', heart:'❤️', laugh:'😂', fire:'🔥', sad:'😢', wow:'😮' };

function _openDMQuickReact(username, msgId, e) {
  document.querySelectorAll('.quick-react-picker').forEach(p => p.remove());
  const picker = document.createElement('div');
  picker.className = 'quick-react-picker';
  picker.innerHTML = Object.entries(DM_REACT_EMOJI)
    .map(([k, v]) => `<button onclick="reactToDM('${username}','${msgId}','${k}');this.parentElement.remove()">${v}</button>`)
    .join('');
  const rect = e.currentTarget.getBoundingClientRect();
  picker.style.cssText = `position:fixed;top:${rect.top - 50}px;left:${rect.left}px;z-index:9998`;
  document.body.appendChild(picker);
  setTimeout(() => document.addEventListener('click', () => picker.remove(), { once: true }), 50);
}

// ============ CONTEXT MENU ============
function _showDMContext(e, username, msgId) {
  e.preventDefault();
  document.querySelectorAll('.ctx-menu').forEach(m => m.remove());

  const msg   = dmState.messages[username]?.find(m => m.id === msgId);
  if (!msg) return;
  const isOwn = msg.senderId === Store.user?._id;

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  const items = [
    { label:'😊 Tepki Ekle',    action: () => _openDMQuickReact(username, msgId, e) },
    { label:'↩ Yanıtla',        action: () => replyToDM(username, msgId) },
    { sep: true },
    { label:'📋 Kopyala',       action: () => copyDMText(username, msgId) },
    isOwn ? { label:'✏️ Düzenle', action: () => editDMMessage(username, msgId) } : null,
    isOwn ? { label:'🗑️ Sil', danger: true, action: () => deleteDMMessage(username, msgId) } : null,
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
    btn.textContent = item.label;
    btn.onclick = () => { item.action(); menu.remove(); };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  let x = e.clientX, y = e.clientY;
  const r = menu.getBoundingClientRect();
  if (x + r.width  > window.innerWidth)  x = window.innerWidth  - r.width  - 8;
  if (y + r.height > window.innerHeight) y = window.innerHeight - r.height - 8;
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9990`;

  setTimeout(() => {
    document.addEventListener('click',      () => menu.remove(), { once: true });
    document.addEventListener('keydown',    e => { if (e.key === 'Escape') menu.remove(); }, { once: true });
  }, 50);
}

// ============ DM INPUT ============
function _showDMInput(username) {
  const inputArea = document.querySelector('.input-area');
  if (!inputArea) return;

  inputArea.innerHTML = `
    <div id="dmReplyBar" class="reply-bar" style="display:none"></div>
    <div class="dm-input-row">
      <button class="ib" onclick="_openDMFileUpload('${escapeHtml(username)}')" title="Dosya">📎</button>
      <textarea class="msg-inp" id="dmInput"
        placeholder="@${escapeHtml(username)} mesaj yaz..."
        rows="1"
        onkeydown="_handleDMInputKey(event,'${escapeHtml(username)}')"
        oninput="_onDMTyping('${escapeHtml(username)}',this)"></textarea>
      <button class="ib" onclick="sendDMMessage('${escapeHtml(username)}',document.getElementById('dmInput').value)" title="Gönder" style="background:var(--ac,#6366f1)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
      <button class="ib" onclick="closeDM()" title="Kapat">✕</button>
    </div>`;

  document.getElementById('dmInput')?.focus();
}

function _handleDMInputKey(e, username) {
  const input = e.target;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendDMMessage(username, input.value);
    return;
  }
  // Auto-resize
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  // Escape → reply iptal
  if (e.key === 'Escape' && window._dmReplyingTo) {
    window._dmReplyingTo = null;
    _updateDMReplyUI(null);
  }
}

function _onDMTyping(username, input) {
  // Auto-resize
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  startDMTyping(username);
}

// ============ DM LİSTESİ RENDER ============
function renderDMList() {
  const el = document.getElementById('messages');
  const chNameEl = document.getElementById('channelName');
  if (chNameEl) chNameEl.textContent = 'Direkt Mesajlar';
  if (!el) return;

  closeDM(true); // input'u eski haline getir, silent mod

  const sorted = [...dmState.friends].sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));

  if (sorted.length === 0) {
    el.innerHTML = `
      <div class="welcome-screen">
        <div style="font-size:40px;margin-bottom:12px">💬</div>
        <h2>Direkt Mesajlar</h2>
        <p>Henüz DM yok. Bir kullanıcıya mesaj at!</p>
        <button class="gm-btn primary" onclick="openModal('addFriend')" style="margin-top:8px">
          + Arkadaş Ekle
        </button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="dm-list-header">
      <span>DM'ler (${sorted.length})</span>
      <button class="gm-icon-btn" onclick="openModal('addFriend')" title="Arkadaş Ekle">+</button>
    </div>
    <div class="dm-list">
      ${sorted.map(f => {
        const unread  = dmState.unread[f.username] || 0;
        const isOnline = dmState.online[f.username] || f.online;
        const lastMsg  = (dmState.messages[f.username] || []).slice(-1)[0];
        const lastText = lastMsg?.text?.substring(0, 40) || f.lastMessage || 'DM başlat';
        const lastTime = lastMsg ? (typeof formatRelativeTime === 'function' ? formatRelativeTime(lastMsg.time) : '') : '';
        return `
          <div class="dm-list-item" onclick="startDM('${escapeHtml(f.username)}')">
            <div class="dm-av-wrap">
              <div class="dm-av">${f.username.charAt(0).toUpperCase()}</div>
              <span class="dm-online-dot ${isOnline ? 'on' : 'off'}"></span>
            </div>
            <div class="dm-item-info">
              <span class="dm-item-name">${escapeHtml(f.username)}</span>
              <span class="dm-item-last">${escapeHtml(lastText)}</span>
            </div>
            <div class="dm-item-meta">
              <span class="dm-item-time">${lastTime}</span>
              ${unread > 0 ? `<span class="dm-unread">${unread > 99 ? '99+' : unread}</span>` : ''}
            </div>
            <button class="gm-icon-btn danger" onclick="event.stopPropagation();removeFriend('${escapeHtml(f.username)}')" title="Kaldır" style="opacity:0" class="dm-remove-btn">✕</button>
          </div>`;
      }).join('')}
    </div>`;
}

// ============ DM KAPAT ============
function closeDM(silent = false) {
  const prev = dmState.activeDM;
  dmState.activeDM = null;
  if (!silent) saveDMState();

  // Input'u eski haline getir
  const inputArea = document.querySelector('.input-area');
  if (inputArea && !inputArea.querySelector('#messageInput')) {
    inputArea.innerHTML = `
      <button class="ib" id="emojiBtn" title="Emoji">😊</button>
      <div id="emojiPanel" class="epop hidden"></div>
      <button class="ib" id="fileBtn" title="Dosya">📎</button>
      <button class="ib" id="pollBtn" title="Anket">📊</button>
      <button class="ib" id="voiceBtn" title="Ses">🎤</button>
      <div id="replyBar" style="display:none" class="reply-bar"></div>
      <textarea class="msg-inp" id="messageInput" placeholder="Mesaj yaz..." rows="1"
        onkeydown="handleInputKeydown(event)"
        oninput="onTyping()"></textarea>
      <button class="ib" id="sendBtn" onclick="sendMessage()" style="background:var(--ac,#6366f1)" title="Gönder">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>`;
  }

  if (!silent && typeof renderMessages === 'function') renderMessages();
}

// ============ ARKADAŞ EKLE / ÇIKART ============
function addFriend(username) {
  username = username?.trim();
  if (!username) return toast('Kullanıcı adı gerekli', 'e');
  if (username === Store.user?.username) return toast('Kendini ekleyemezsin', 'e');
  if (dmState.friends.find(f => f.username === username)) return toast('Zaten listende', 'w');

  dmState.friends.unshift({
    id:          genId(),
    username,
    lastMessage: '',
    lastTime:    Date.now(),
    unread:      0,
    online:      false,
    createdAt:   new Date().toISOString()
  });
  saveDMState();
  toast(`${username} eklendi`);
  closeModal();

  if (socket?.connected) {
    socket.emit('friend_request', { to: username, from: Store.user.username });
  }
}

function removeFriend(username) {
  if (!confirm(`${username} listenden çıkarılsın mı?`)) return;
  dmState.friends = dmState.friends.filter(f => f.username !== username);
  delete dmState.messages[username];
  delete dmState.unread[username];
  try { localStorage.removeItem(`gt_dm_ch_${username}`); } catch {}

  if (dmState.activeDM === username) {
    dmState.activeDM = null;
    if (typeof renderMessages === 'function') renderMessages();
  }
  saveDMState();
  renderDMList();
  toast(`${username} kaldırıldı`);
}

// ============ OKUNDU ============
function _markDMRead(username) {
  const msgs = dmState.messages[username] || [];
  let changed = false;
  msgs.forEach(msg => {
    if (!msg.read && msg.senderId !== Store.user?._id) {
      msg.read = true;
      changed  = true;
    }
  });
  if (changed) {
    dmState.unread[username] = 0;
    const friend = dmState.friends.find(f => f.username === username);
    if (friend) friend.unread = 0;
    saveDMState();
    if (socket?.connected) {
      socket.emit('dm_read', { with: username, reader: Store.user.username });
    }
  }
}

// ============ YAZMA GÖSTERGESİ ============
let _dmTypingTimer = null;
let _dmIsTyping = false;

function startDMTyping(username) {
  if (!_dmIsTyping) {
    _dmIsTyping = true;
    if (socket?.connected) {
      socket.emit('dm_typing_start', { to: username, from: Store.user.username });
    }
  }
  clearTimeout(_dmTypingTimer);
  _dmTypingTimer = setTimeout(() => stopDMTyping(username), DM_TYPING_MS);
}

function stopDMTyping(username) {
  if (!_dmIsTyping) return;
  _dmIsTyping = false;
  clearTimeout(_dmTypingTimer);
  if (socket?.connected) {
    socket.emit('dm_typing_stop', { to: username, from: Store.user.username });
  }
}

// ============ MESAJA GİT ============
function scrollToDMMessage(msgId) {
  const el = document.getElementById('dm-msg-' + msgId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 2200);
}

// ============ DOSYA YÜKLE ============
function _openDMFileUpload(username) {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*,video/*,audio/*,.pdf,.zip,.txt';
  input.onchange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast('Dosya 8MB\'den küçük olmalı', 'e');
    const reader = new FileReader();
    reader.onload = ev => {
      const msg = {
        id:       genId(),
        sender:   Store.user.username,
        senderId: Store.user._id,
        to:       username,
        text:     `📎 ${file.name}`,
        time:     new Date().toISOString(),
        reactions:{},
        read:     false,
        file:     { name: file.name, size: file.size, type: file.type, data: ev.target.result }
      };
      if (!dmState.messages[username]) dmState.messages[username] = [];
      dmState.messages[username].push(msg);
      saveDMState();
      _saveDMChannel(username);
      renderDMChat(username);
      if (socket?.connected) socket.emit('dm_message', { to: username, sender: Store.user.username, senderId: Store.user._id, message: msg });
      toast(`${file.name} gönderildi`);
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ============ SOCKET EVENTS ============
function initDMSocket() {
  if (typeof socket === 'undefined' || !socket) return;

  // Gelen DM mesajı
  socket.on('dm_message', data => {
    if (data.senderId === Store.user?._id) return; // kendi mesajı
    const { sender, senderId, message } = data;

    let friend = dmState.friends.find(f => f.username === sender);
    if (!friend) {
      friend = { id: genId(), username: sender, lastMessage: '', lastTime: Date.now(), unread: 0, online: true, createdAt: new Date().toISOString() };
      dmState.friends.unshift(friend);
    }

    if (!dmState.messages[sender]) dmState.messages[sender] = [];

    // Duplicate kontrolü
    if (!dmState.messages[sender].find(m => m.id === message.id)) {
      dmState.messages[sender].push(message);
      if (dmState.messages[sender].length > MAX_DM_MSGS) dmState.messages[sender].shift();
    }

    friend.lastMessage = message.text;
    friend.lastTime    = Date.now();

    if (dmState.activeDM !== sender) {
      friend.unread = (friend.unread || 0) + 1;
      dmState.unread[sender] = (dmState.unread[sender] || 0) + 1;
      // Bildirim
      _showDMNotification(sender, message.text);
    }

    saveDMState();
    _saveDMChannel(sender);

    if (dmState.activeDM === sender) renderDMChat(sender);
    else _updateDMBadge();
  });

  // Silindi
  socket.on('dm_delete', ({ sender, messageId }) => {
    if (!dmState.messages[sender]) return;
    dmState.messages[sender] = dmState.messages[sender].filter(m => m.id !== messageId);
    saveDMState();
    _saveDMChannel(sender);
    if (dmState.activeDM === sender) renderDMChat(sender);
  });

  // Düzenlendi
  socket.on('dm_edit', ({ sender, messageId, text }) => {
    const msg = dmState.messages[sender]?.find(m => m.id === messageId);
    if (msg) { msg.text = text; msg.edited = true; }
    saveDMState();
    _saveDMChannel(sender);
    if (dmState.activeDM === sender) renderDMChat(sender);
  });

  // Tepki
  socket.on('dm_react', ({ sender, messageId, reaction, userId }) => {
    const target = sender === Store.user?.username ? dmState.activeDM : sender;
    const msg    = dmState.messages[target]?.find(m => m.id === messageId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[reaction]) msg.reactions[reaction] = [];
    const idx = msg.reactions[reaction].indexOf(userId);
    if (idx === -1) msg.reactions[reaction].push(userId);
    else            msg.reactions[reaction].splice(idx, 1);
    if (msg.reactions[reaction].length === 0) delete msg.reactions[reaction];
    saveDMState();
    if (dmState.activeDM === target) renderDMChat(target);
  });

  // Yazma
  socket.on('dm_typing_start', ({ from }) => {
    if (from === Store.user?.username) return;
    dmState.typing[from] = Date.now();
    if (dmState.activeDM === from) renderDMChat(from);
  });

  socket.on('dm_typing_stop', ({ from }) => {
    delete dmState.typing[from];
    if (dmState.activeDM === from) renderDMChat(from);
  });

  // Okundu
  socket.on('dm_read', ({ with: username, reader }) => {
    if (reader === Store.user?.username) return;
    const msgs = dmState.messages[username] || [];
    msgs.filter(m => m.senderId === Store.user?._id).forEach(m => m.read = true);
    saveDMState();
    if (dmState.activeDM === username) renderDMChat(username);
  });

  // Online status
  socket.on('user_online',  ({ username }) => { dmState.online[username] = true;  _updateOnlineStatus(username, true);  });
  socket.on('user_offline', ({ username }) => { dmState.online[username] = false; _updateOnlineStatus(username, false); });

  // Arkadaşlık isteği
  socket.on('friend_request', ({ from }) => {
    toast(`${from} seni arkadaş listesine ekledi`, 'i', 5000);
    // İsterse otomatik kabul et
    if (!dmState.friends.find(f => f.username === from)) {
      dmState.friends.unshift({ id: genId(), username: from, lastMessage: '', lastTime: Date.now(), unread: 0, online: true, createdAt: new Date().toISOString() });
      saveDMState();
    }
  });

  _dmLog('Socket event dinleyicileri hazır');
}

// ============ YARDIMCI ============
function _updateOnlineStatus(username, online) {
  const friend = dmState.friends.find(f => f.username === username);
  if (friend) friend.online = online;
  // DOM güncelle (DM listesi açıksa)
  const dot = document.querySelector(`.dm-list-item [data-user="${username}"] .dm-online-dot`);
  if (dot) dot.className = `dm-online-dot ${online ? 'on' : 'off'}`;
}

function _updateDMBadge() {
  const totalUnread = Object.values(dmState.unread).reduce((a, b) => a + b, 0);
  const badge = document.getElementById('dmBadge');
  if (badge) {
    badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
    badge.style.display = totalUnread > 0 ? '' : 'none';
  }
}

function _showDMNotification(sender, text) {
  _updateDMBadge();
  if (localStorage.getItem('gt_notif_desktop') === '0') return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  new Notification(`DM: ${sender}`, { body: text.substring(0, 80), icon: '/favicon.ico' });
}

// ============ CSS ============
(function injectDMStyles() {
  const id = 'gt-dm-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
/* ─── DM Avatar ─── */
.dm-av-wrap{position:relative;flex-shrink:0}
.dm-av{
  width:36px;height:36px;border-radius:50%;
  background:var(--ac,#6366f1);color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:700;
}
.dm-online-dot{
  position:absolute;bottom:0;right:0;
  width:10px;height:10px;border-radius:50%;
  border:2px solid var(--bg1,#1a0f24);
}
.dm-online-dot.on{background:#10b981}
.dm-online-dot.off{background:#6b7280}

/* ─── DM Liste ─── */
.dm-list-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 16px 6px;font-size:11px;font-weight:700;
  color:var(--t3,#888);text-transform:uppercase;letter-spacing:.05em;
}
.dm-list{display:flex;flex-direction:column;gap:1px}
.dm-list-item{
  display:flex;align-items:center;gap:10px;
  padding:8px 14px;border-radius:10px;cursor:pointer;
  transition:background .12s;position:relative;
}
.dm-list-item:hover{background:rgba(255,255,255,.06)}
.dm-list-item:hover .dm-remove-btn{opacity:.6!important}
.dm-item-info{flex:1;min-width:0}
.dm-item-name{
  display:block;font-size:14px;font-weight:600;
  color:var(--t1,#fff);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dm-item-last{
  display:block;font-size:11px;color:var(--t3,#888);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.dm-item-meta{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0}
.dm-item-time{font-size:10px;color:var(--t3,#888)}
.dm-unread{
  font-size:10px;font-weight:700;padding:1px 6px;
  border-radius:10px;background:var(--ac,#6366f1);color:#fff;
}

/* ─── DM Welcome ─── */
.dm-welcome-av{
  width:64px;height:64px;border-radius:50%;
  background:var(--ac,#6366f1);color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-size:28px;font-weight:800;margin:0 auto 14px;
}

/* ─── DM Input Row ─── */
.dm-input-row{
  display:flex;align-items:flex-end;gap:6px;padding:8px 12px;
  background:var(--bg1,#1a0f24);border-top:1px solid rgba(255,255,255,.06);
}

/* ─── Reply bar ─── */
.reply-bar{
  display:none;align-items:center;gap:8px;
  padding:6px 14px;background:var(--bg2,#241535);
  border-top:1px solid rgba(255,255,255,.06);
  font-size:12px;color:var(--t2,#ccc);
}
.reply-bar-icon{opacity:.5;font-size:14px}
.reply-bar-body{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.reply-bar-body strong{color:var(--ac,#6366f1);margin-right:5px}
.reply-bar-close{
  background:none;border:none;cursor:pointer;
  color:var(--t3,#888);padding:2px;border-radius:4px;
}
.reply-bar-close:hover{color:#ef4444}

/* ─── Mesaj düzenleme ─── */
.dm-msg-text.editing{
  outline:2px solid var(--ac,#6366f1);border-radius:6px;
  padding:2px 6px;background:var(--bg2,#241535);
}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initDM() {
  if (typeof socket !== 'undefined' && socket) {
    initDMSocket();
  } else {
    document.addEventListener('socket_ready', initDMSocket, { once: true });
  }

  // DM butonu
  const dmBtn = document.getElementById('dmBtn');
  if (dmBtn) dmBtn.onclick = renderDMList;

  // Online badge güncelle
  _updateDMBadge();

  _dmLog('v2.0 yüklendi ✓');
})();
