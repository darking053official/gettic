// ============ GETTIC DM.JS - FULL GÜNCEL ============

const dmState = {
  friends: JSON.parse(localStorage.getItem('gt_dm_friends') || '[]'),
  activeDM: null,
  messages: JSON.parse(localStorage.getItem('gt_dm_messages') || '{}'),
  unread: JSON.parse(localStorage.getItem('gt_dm_unread') || '{}'),
  typing: {},
  onlineUsers: {}
};

// DM Başlat
function startDM(username) {
  if (!username || !username.trim()) return toast('Kullanıcı adı gerekli', 'e');
  if (username === Store.user?.username) return toast('Kendine DM atamazsın', 'e');
  if (Store.blockedUsers?.includes(username)) return toast('Bu kullanıcı engelli', 'e');
  
  if (!dmState.friends.find(f => f.username === username)) {
    dmState.friends.unshift({
      id: genId(), username, lastMessage: '', lastTime: 'Şimdi', unread: 0, online: false, createdAt: new Date().toISOString()
    });
  }
  
  dmState.activeDM = username;
  dmState.unread[username] = 0;
  if (!dmState.messages[username]) dmState.messages[username] = [];
  
  if (typeof MongoSync !== 'undefined' && MongoSync.loadDMMessages) {
    MongoSync.loadDMMessages(username).then(msgs => { if (msgs?.length > 0) dmState.messages[username] = msgs; renderDMChat(username); });
  } else {
    renderDMChat(username);
  }
  
  saveDMState();
  toast('💬 ' + username + ' ile DM');
  closeModal();
}

// DM Mesaj Gönder
function sendDMMessage(username, text) {
  if (!text?.trim() || !username) return;
  if (!dmState.messages[username]) dmState.messages[username] = [];
  
  const msg = { id: genId(), sender: Store.user.username, senderId: Store.user._id, text: text.trim(), time: new Date().toISOString(), reactions: {}, read: false };
  dmState.messages[username].push(msg);
  
  const friend = dmState.friends.find(f => f.username === username);
  if (friend) { friend.lastMessage = text.trim(); friend.lastTime = 'Az önce'; }
  
  saveDMState();
  renderDMChat(username);
  
  if (typeof MongoSync !== 'undefined' && MongoSync.saveDMMessage) MongoSync.saveDMMessage(Store.user.username, username, text);
  if (socket) socket.emit('dm_message', { to: username, text: text.trim(), sender: Store.user.username, senderId: Store.user._id });
  
  const input = document.getElementById('dmInput');
  if (input) { input.value = ''; input.focus(); }
}

// DM Chat Render
function renderDMChat(username) {
  const messagesEl = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  if (channelName) channelName.textContent = '@' + username;
  if (!messagesEl) return;
  
  const msgs = dmState.messages[username] || [];
  if (msgs.length === 0) {
    messagesEl.innerHTML = `<div class="empty-ch"><div class="dm-av-big" style="width:60px;height:60px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;margin:0 auto 12px">${username.charAt(0).toUpperCase()}</div><h4>@${username}</h4><p>DM başlatıldı. İlk mesajı sen gönder!</p></div>`;
    return;
  }
  
  messagesEl.innerHTML = msgs.map(msg => {
    const isOwn = msg.sender === Store.user?.username;
    return `<div class="msg" id="dm-msg-${msg.id}">
      <div class="msg-av">${(msg.sender||'?').charAt(0).toUpperCase()}</div>
      <div class="msg-body"><div class="msg-head"><span>${msg.sender||'?'}</span><span class="msg-time">${formatTime(msg.time)}</span>${msg.read?'<span style="font-size:9px;color:var(--gr)">✓✓</span>':''}</div><div class="msg-text">${formatMsg(msg.text)}</div>${msg.reactions&&Object.keys(msg.reactions).length>0?renderDMReactions(username,msg):''}</div>
      <div class="ma">
        <button onclick="reactToDM('${username}','${msg.id}','👍')">👍</button>
        <button onclick="reactToDM('${username}','${msg.id}','❤️')">❤️</button>
        <button onclick="copyDMText('${username}','${msg.id}')">📋</button>
        ${isOwn?`<button onclick="deleteDMMessage('${username}','${msg.id}')" style="color:var(--re)">🗑️</button>`:''}
      </div></div>`;
  }).join('');
  
  messagesEl.scrollTop = messagesEl.scrollHeight;
  showDMInput(username);
}

// DM Input
function showDMInput(username) {
  const inputArea = document.querySelector('.input-area');
  if (!inputArea) return;
  inputArea.innerHTML = `<textarea class="msg-inp" id="dmInput" placeholder="@${username} mesaj yaz..." rows="1"></textarea><button class="ib" style="background:var(--gr)" id="dmSendBtn">➤</button><button class="ib" id="dmCloseBtn" title="Kapat">×</button>`;
  
  const dmInput = document.getElementById('dmInput');
  const dmSendBtn = document.getElementById('dmSendBtn');
  const dmCloseBtn = document.getElementById('dmCloseBtn');
  
  if (dmInput) { dmInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDMMessage(username, dmInput.value); } }); dmInput.focus(); }
  if (dmSendBtn) dmSendBtn.onclick = () => sendDMMessage(username, dmInput?.value || '');
  if (dmCloseBtn) dmCloseBtn.onclick = closeDM;
}

// DM Kapat
function closeDM() {
  dmState.activeDM = null;
  saveDMState();
  const inputArea = document.querySelector('.input-area');
  if (inputArea) inputArea.innerHTML = `<button class="ib" id="emojiBtn">😊</button><div id="emojiPanel" class="epop hidden" style="bottom:60px;left:10px"></div><button class="ib" id="gifBtn">🎬</button><button class="ib" id="imageBtn">🖼️</button><button class="ib" id="pollBtn">📊</button><textarea class="msg-inp" id="messageInput" placeholder="Mesaj yaz..." rows="1"></textarea><button class="ib" style="background:var(--gr)" id="sendBtn">➤</button>`;
  if (typeof renderMessages === 'function') renderMessages();
}

// DM Mesaj Sil / Kopyala / Reaksiyon
function deleteDMMessage(username, msgId) {
  if (!dmState.messages[username]) return;
  dmState.messages[username] = dmState.messages[username].filter(m => m.id !== msgId);
  const friend = dmState.friends.find(f => f.username === username);
  if (friend) { const remaining = dmState.messages[username]; friend.lastMessage = remaining.length > 0 ? remaining[remaining.length - 1].text : ''; }
  saveDMState(); renderDMChat(username); toast('🗑️ Mesaj silindi');
}

function copyDMText(username, msgId) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (msg) navigator.clipboard.writeText(msg.text).then(() => toast('📋 Kopyalandı'));
}

function reactToDM(username, msgId, emoji) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (!msg) return;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const idx = msg.reactions[emoji].indexOf(Store.user._id);
  if (idx === -1) msg.reactions[emoji].push(Store.user._id);
  else msg.reactions[emoji].splice(idx, 1);
  if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  saveDMState(); renderDMChat(username);
}

function renderDMReactions(username, msg) {
  return `<div class="reacts">${Object.entries(msg.reactions).map(([emoji, users]) => `<span class="react ${users.includes(Store.user?._id)?'me':''}" onclick="reactToDM('${username}','${msg.id}','${emoji}')">${emoji} ${users.length}</span>`).join('')}</div>`;
}

// DM Listesi
function renderDMList() {
  const el = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  if (channelName) channelName.textContent = '💬 Direkt Mesajlar';
  if (!el) return;
  
  const sorted = [...dmState.friends].sort((a, b) => new Date(dmState.messages[b.username]?.slice(-1)[0]?.time || b.createdAt) - new Date(dmState.messages[a.username]?.slice(-1)[0]?.time || a.createdAt));
  
  if (sorted.length === 0) { el.innerHTML = `<div class="empty-ch"><h4>💬 DM</h4><p>Henüz DM yok. Arkadaş ekleyerek başla!</p></div>`; return; }
  
  el.innerHTML = sorted.map(f => `<div class="friend-suggestion" onclick="startDM('${f.username}')" style="cursor:pointer"><div class="friend-suggestion-av" style="position:relative">${f.username.charAt(0).toUpperCase()}<span style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:${f.online?'var(--gr)':'var(--t3)'};border:2px solid var(--bg1)"></span></div><div class="friend-suggestion-info"><div class="friend-suggestion-name">${f.username}</div><div class="friend-suggestion-mutual">${f.lastMessage?f.lastMessage.substring(0,30):'DM başlat'}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span style="font-size:9px;color:var(--t3)">${f.lastTime}</span>${f.unread>0?`<span class="ub" style="background:var(--re)">${f.unread}</span>`:''}</div></div>`).join('');
  closeDM();
}

// Arkadaş Ekle / Sil
function addFriend(username) {
  if (!username?.trim()) return;
  if (username === Store.user?.username) return toast('Kendini ekleyemezsin', 'e');
  if (dmState.friends.find(f => f.username === username)) return toast('Zaten arkadaş', 'e');
  dmState.friends.unshift({ id: genId(), username: username.trim(), lastMessage: '', lastTime: 'Şimdi', unread: 0, online: false, createdAt: new Date().toISOString() });
  saveDMState(); toast('👤 ' + username + ' arkadaş eklendi'); closeModal();
}

function removeFriend(username) {
  if (!confirm(username + ' arkadaşlıktan çıkarılsın mı?')) return;
  dmState.friends = dmState.friends.filter(f => f.username !== username);
  delete dmState.messages[username]; delete dmState.unread[username];
  if (dmState.activeDM === username) { dmState.activeDM = null; if (typeof renderMessages === 'function') renderMessages(); }
  saveDMState(); toast(username + ' arkadaşlıktan çıkarıldı');
}

// Kaydet
function saveDMState() {
  localStorage.setItem('gt_dm_friends', JSON.stringify(dmState.friends));
  localStorage.setItem('gt_dm_messages', JSON.stringify(dmState.messages));
  localStorage.setItem('gt_dm_unread', JSON.stringify(dmState.unread));
}

// Socket DM
function initDMSocket() {
  if (!socket) return;
  socket.on('dm_message', (data) => {
    if (data.senderId === Store.user?._id) return;
    let friend = dmState.friends.find(f => f.username === data.sender);
    if (!friend) { friend = { id: genId(), username: data.sender, lastMessage: '', lastTime: 'Şimdi', unread: 0, online: true, createdAt: new Date().toISOString() }; dmState.friends.unshift(friend); }
    if (!dmState.messages[data.sender]) dmState.messages[data.sender] = [];
    dmState.messages[data.sender].push({ id: genId(), sender: data.sender, senderId: data.senderId, text: data.text, time: new Date().toISOString(), reactions: {}, read: false });
    friend.lastMessage = data.text; friend.lastTime = 'Az önce';
    if (dmState.activeDM !== data.sender) friend.unread = (friend.unread || 0) + 1;
    saveDMState();
    if (dmState.activeDM === data.sender) { renderDMChat(data.sender); } else { renderDMList(); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initDMSocket, 1500);
  const dmBtn = document.getElementById('dmBtn');
  if (dmBtn) dmBtn.onclick = () => renderDMList();
});

console.log('✅ DM.js yüklendi');
