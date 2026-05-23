// ╔══════════════════════════════════════════════════════════════════╗
// ║              GETTIC DM.JS - SVG İKONLU FINAL                     ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function dmIcon(name, size = 16) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

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
  if (!username?.trim()) return toast('Kullanici adi gerekli', 'e');
  if (username === Store.user?.username) return toast('Kendine DM atamazsin', 'e');
  if (Store.blockedUsers?.includes(username)) return toast('Bu kullanici engelli', 'e');
  
  if (!dmState.friends.find(f => f.username === username)) {
    dmState.friends.unshift({
      id: genId(), username, lastMessage: '', lastTime: 'Simdi', unread: 0, online: false, createdAt: new Date().toISOString()
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
  toast(dmIcon('mail') + username + ' ile DM');
  closeModal();
}

// DM Mesaj Gönder
function sendDMMessage(username, text) {
  if (!text?.trim() || !username) return;
  if (!dmState.messages[username]) dmState.messages[username] = [];
  
  const msg = { id: genId(), sender: Store.user.username, senderId: Store.user._id, text: text.trim(), time: new Date().toISOString(), reactions: {}, read: false };
  dmState.messages[username].push(msg);
  
  const friend = dmState.friends.find(f => f.username === username);
  if (friend) { friend.lastMessage = text.trim(); friend.lastTime = 'Az once'; }
  
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
    messagesEl.innerHTML = `<div class="empty-ch"><div class="dm-av-big" style="width:60px;height:60px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;margin:0 auto 12px">${username.charAt(0).toUpperCase()}</div><h4>@${escapeHtml(username)}</h4><p>DM baslatildi. Ilk mesaji sen gonder!</p></div>`;
    return;
  }
  
  messagesEl.innerHTML = msgs.map(msg => {
    const isOwn = msg.sender === Store.user?.username;
    return `<div class="msg" id="dm-msg-${msg.id}">
      <div class="msg-av">${(msg.sender||'?').charAt(0).toUpperCase()}</div>
      <div class="msg-body">
        <div class="msg-head">
          <span>${escapeHtml(msg.sender||'?')}</span>
          <span class="msg-time">${formatTime(msg.time)}</span>
          ${msg.read?`<span style="font-size:9px;color:var(--gr)">${dmIcon('check',12)}${dmIcon('check',12)}</span>`:''}
        </div>
        <div class="msg-text">${formatMsg(msg.text)}</div>
        ${msg.reactions&&Object.keys(msg.reactions).length>0?renderDMReactions(username,msg):''}
      </div>
      <div class="ma">
        <button onclick="reactToDM('${username}','${msg.id}','like')" title="Begen">${dmIcon('thumbs-up')}</button>
        <button onclick="reactToDM('${username}','${msg.id}','heart')" title="Kalp">${dmIcon('heart')}</button>
        <button onclick="copyDMText('${username}','${msg.id}')" title="Kopyala">${dmIcon('copy')}</button>
        ${isOwn?`<button onclick="deleteDMMessage('${username}','${msg.id}')" style="color:var(--re)" title="Sil">${dmIcon('trash')}</button>`:''}
      </div></div>`;
  }).join('');
  
  messagesEl.scrollTop = messagesEl.scrollHeight;
  showDMInput(username);
}

// DM Input
function showDMInput(username) {
  const inputArea = document.querySelector('.input-area');
  if (!inputArea) return;
  inputArea.innerHTML = `
    <textarea class="msg-inp" id="dmInput" placeholder="@${escapeHtml(username)} mesaj yaz..." rows="1"></textarea>
    <button class="ib" style="background:var(--gr)" id="dmSendBtn">${dmIcon('send',18)}</button>
    <button class="ib" id="dmCloseBtn" title="Kapat">${dmIcon('x',18)}</button>
  `;
  
  const dmInput = document.getElementById('dmInput');
  const dmSendBtn = document.getElementById('dmSendBtn');
  const dmCloseBtn = document.getElementById('dmCloseBtn');
  
  if (dmInput) { 
    dmInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDMMessage(username, dmInput.value); } }); 
    dmInput.focus(); 
  }
  if (dmSendBtn) dmSendBtn.onclick = () => sendDMMessage(username, dmInput?.value || '');
  if (dmCloseBtn) dmCloseBtn.onclick = closeDM;
}

// DM Kapat
function closeDM() {
  dmState.activeDM = null;
  saveDMState();
  if (typeof renderMessages === 'function') renderMessages();
  // Input'u eski haline döndür
  const inputArea = document.querySelector('.input-area');
  if (inputArea) {
    inputArea.innerHTML = `
      <button class="ib" id="emojiBtn">${dmIcon('smile')}</button>
      <div id="emojiPanel" class="epop hidden" style="bottom:60px;left:10px"></div>
      <button class="ib" id="gifBtn">${dmIcon('gif')}</button>
      <button class="ib" id="imageBtn">${dmIcon('image')}</button>
      <button class="ib" id="pollBtn">${dmIcon('bar-chart')}</button>
      <button class="ib" id="fileBtn">${dmIcon('paperclip')}</button>
      <button class="ib" id="voiceMsgBtn">${dmIcon('mic')}</button>
      <textarea class="msg-inp" id="messageInput" placeholder="Mesaj yaz..." rows="1"></textarea>
      <button class="ib send-btn-main" id="sendBtn">${dmIcon('send',18)}</button>
    `;
  }
}

// DM Mesaj Sil / Kopyala / Reaksiyon
function deleteDMMessage(username, msgId) {
  if (!dmState.messages[username]) return;
  dmState.messages[username] = dmState.messages[username].filter(m => m.id !== msgId);
  const friend = dmState.friends.find(f => f.username === username);
  if (friend) { const remaining = dmState.messages[username]; friend.lastMessage = remaining.length > 0 ? remaining[remaining.length - 1].text : ''; }
  saveDMState(); renderDMChat(username);
  toast('Mesaj silindi');
}

function copyDMText(username, msgId) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (msg) navigator.clipboard.writeText(msg.text).then(() => toast('Kopyalandi'));
}

function reactToDM(username, msgId, reaction) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (!msg) return;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[reaction]) msg.reactions[reaction] = [];
  const idx = msg.reactions[reaction].indexOf(Store.user._id);
  if (idx === -1) msg.reactions[reaction].push(Store.user._id);
  else msg.reactions[reaction].splice(idx, 1);
  if (msg.reactions[reaction].length === 0) delete msg.reactions[reaction];
  saveDMState(); renderDMChat(username);
}

function renderDMReactions(username, msg) {
  const icons = { like: 'thumbs-up', heart: 'heart', laugh: 'smile', fire: 'flame' };
  return `<div class="reacts">${Object.entries(msg.reactions).map(([reaction, users]) => `<span class="react ${users.includes(Store.user?._id)?'me':''}" onclick="reactToDM('${username}','${msg.id}','${reaction}')">${dmIcon(icons[reaction]||'thumbs-up',14)} <span>${users.length}</span></span>`).join('')}</div>`;
}

// DM Listesi
function renderDMList() {
  const el = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  if (channelName) channelName.textContent = 'Direkt Mesajlar';
  if (!el) return;
  
  const sorted = [...dmState.friends].sort((a, b) => new Date(dmState.messages[b.username]?.slice(-1)[0]?.time || b.createdAt) - new Date(dmState.messages[a.username]?.slice(-1)[0]?.time || a.createdAt));
  
  if (sorted.length === 0) { 
    el.innerHTML = `<div class="empty-ch"><h4>${dmIcon('mail',24)} DM</h4><p>Henuz DM yok. Arkadas ekleyerek basla!</p></div>`; 
    closeDM();
    return; 
  }
  
  el.innerHTML = sorted.map(f => `
    <div class="friend-suggestion" onclick="startDM('${f.username}')" style="cursor:pointer">
      <div class="friend-suggestion-av" style="position:relative">
        ${f.username.charAt(0).toUpperCase()}
        <span style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:${f.online?'var(--gr)':'var(--t3)'};border:2px solid var(--bg1)}"></span>
      </div>
      <div class="friend-suggestion-info">
        <div class="friend-suggestion-name">${escapeHtml(f.username)}</div>
        <div class="friend-suggestion-mutual">${f.lastMessage?f.lastMessage.substring(0,30):'DM baslat'}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span style="font-size:9px;color:var(--t3)">${f.lastTime}</span>
        ${f.unread>0?`<span class="ub" style="background:var(--re)">${f.unread}</span>`:''}
      </div>
    </div>`).join('');
  closeDM();
}

// Arkadaş Ekle / Sil
function addFriend(username) {
  if (!username?.trim()) return;
  if (username === Store.user?.username) return toast('Kendini ekleyemezsin', 'e');
  if (dmState.friends.find(f => f.username === username)) return toast('Zaten arkadas', 'e');
  dmState.friends.unshift({ id: genId(), username: username.trim(), lastMessage: '', lastTime: 'Simdi', unread: 0, online: false, createdAt: new Date().toISOString() });
  saveDMState(); 
  toast(dmIcon('user-plus') + username + ' arkadas eklendi'); 
  closeModal();
}

function removeFriend(username) {
  if (!confirm(username + ' arkadasliktan cikarilsin mi?')) return;
  dmState.friends = dmState.friends.filter(f => f.username !== username);
  delete dmState.messages[username]; delete dmState.unread[username];
  if (dmState.activeDM === username) { dmState.activeDM = null; if (typeof renderMessages === 'function') renderMessages(); }
  saveDMState(); 
  toast(username + ' arkadasliktan cikarildi');
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
    if (!friend) { 
      friend = { id: genId(), username: data.sender, lastMessage: '', lastTime: 'Simdi', unread: 0, online: true, createdAt: new Date().toISOString() }; 
      dmState.friends.unshift(friend); 
    }
    if (!dmState.messages[data.sender]) dmState.messages[data.sender] = [];
    dmState.messages[data.sender].push({ id: genId(), sender: data.sender, senderId: data.senderId, text: data.text, time: new Date().toISOString(), reactions: {}, read: false });
    friend.lastMessage = data.text; friend.lastTime = 'Az once';
    if (dmState.activeDM !== data.sender) friend.unread = (friend.unread || 0) + 1;
    saveDMState();
    if (dmState.activeDM === data.sender) { renderDMChat(data.sender); } else { renderDMList(); }
  });
}

// HTML escape
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initDMSocket, 1500);
  const dmBtn = document.getElementById('dmBtn');
  if (dmBtn) dmBtn.onclick = () => renderDMList();
});

console.log('DM.js yuklendi (SVG ikonlu)');
