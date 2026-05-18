// ============ GETTIC DM.JS - FULL GÜNCEL ============

// DM State
const dmState = {
  friends: JSON.parse(localStorage.getItem('gt_dm_friends') || '[]'),
  activeDM: null,
  messages: JSON.parse(localStorage.getItem('gt_dm_messages') || '{}'),
  unread: JSON.parse(localStorage.getItem('gt_dm_unread') || '{}'),
  typing: {},
  onlineUsers: {}
};

// ============ DM BAŞLAT ============
function startDM(username) {
  if (!username || !username.trim()) return toast('Kullanıcı adı gerekli', 'e');
  if (username === Store.user?.username) return toast('Kendine DM atamazsın', 'e');
  if (Store.blockedUsers?.includes(username)) return toast('Bu kullanıcı engelli', 'e');
  
  // Arkadaş listesine ekle
  if (!dmState.friends.find(f => f.username === username)) {
    dmState.friends.unshift({
      id: genId(),
      username,
      lastMessage: '',
      lastTime: 'Şimdi',
      unread: 0,
      online: false,
      createdAt: new Date().toISOString()
    });
  }
  
  dmState.activeDM = username;
  dmState.unread[username] = 0;
  
  // Mesaj geçmişini yükle
  if (!dmState.messages[username]) {
    dmState.messages[username] = [];
  }
  
  // MongoDB'den DM mesajlarını yükle
  if (typeof MongoSync !== 'undefined' && MongoSync.loadDMMessages) {
    MongoSync.loadDMMessages(username).then(msgs => {
      if (msgs && msgs.length > 0) {
        dmState.messages[username] = msgs;
      }
      renderDMChat(username);
    });
  } else {
    renderDMChat(username);
  }
  
  saveDMState();
  
  // DM ekranına geç
  if (typeof navigateTo === 'function') {
    navigateTo('/dm/' + username);
  }
  
  toast('💬 ' + username + ' ile DM');
  closeModal();
}

// ============ DM MESAJ GÖNDER ============
function sendDMMessage(username, text) {
  if (!text || !text.trim() || !username) return;
  if (!dmState.messages[username]) dmState.messages[username] = [];
  
  const msg = {
    id: genId(),
    sender: Store.user.username,
    senderId: Store.user._id,
    text: text.trim(),
    time: new Date().toISOString(),
    reactions: {},
    read: false
  };
  
  dmState.messages[username].push(msg);
  
  // Arkadaş bilgisini güncelle
  const friend = dmState.friends.find(f => f.username === username);
  if (friend) {
    friend.lastMessage = text.trim();
    friend.lastTime = 'Az önce';
  }
  
  saveDMState();
  renderDMChat(username);
  
  // MongoDB'ye kaydet
  if (typeof MongoSync !== 'undefined' && MongoSync.saveDMMessage) {
    MongoSync.saveDMMessage(Store.user.username, username, text);
  }
  
  // Socket ile gönder
  if (window._socket) {
    window._socket.emit('dm_message', {
      to: username,
      text: text.trim(),
      sender: Store.user.username,
      senderId: Store.user._id
    });
  }
  
  // Input'u temizle
  const input = document.getElementById('dmInput');
  if (input) { input.value = ''; input.focus(); }
}

// ============ DM SOHBET RENDER ============
function renderDMChat(username) {
  const messagesEl = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  
  if (channelName) channelName.textContent = '@' + username;
  
  if (!messagesEl) return;
  
  const msgs = dmState.messages[username] || [];
  
  if (msgs.length === 0) {
    messagesEl.innerHTML = `
      <div class="empty-ch">
        <div class="dm-av-big" style="width:60px;height:60px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;margin:0 auto 12px">${username.charAt(0).toUpperCase()}</div>
        <h4>@${username}</h4>
        <p>DM başlatıldı. İlk mesajı sen gönder!</p>
      </div>`;
    return;
  }
  
  messagesEl.innerHTML = msgs.map(msg => {
    const isOwn = msg.sender === Store.user?.username;
    return `
    <div class="msg" id="dm-msg-${msg.id}">
      <div class="msg-av">${(msg.sender||'?').charAt(0).toUpperCase()}</div>
      <div class="msg-body">
        <div class="msg-head">
          <span>${msg.sender||'?'}</span>
          <span class="msg-time">${formatTime(msg.time)}</span>
          ${msg.read ? '<span style="font-size:9px;color:var(--gr)">✓✓</span>' : ''}
        </div>
        <div class="msg-text">${formatMsg(msg.text)}</div>
        ${msg.reactions && Object.keys(msg.reactions).length > 0 ? renderDMReactions(username, msg) : ''}
      </div>
      <div class="ma">
        <button onclick="reactToDM('${username}','${msg.id}','👍')" title="Beğen">👍</button>
        <button onclick="reactToDM('${username}','${msg.id}','❤️')" title="Kalp">❤️</button>
        <button onclick="copyDMText('${username}','${msg.id}')" title="Kopyala">📋</button>
        ${isOwn ? `<button onclick="deleteDMMessage('${username}','${msg.id}')" style="color:var(--re)" title="Sil">🗑️</button>` : ''}
      </div>
    </div>`;
  }).join('');
  
  messagesEl.scrollTop = messagesEl.scrollHeight;
  
  // DM input alanını göster
  showDMInput(username);
}

// ============ DM INPUT ============
function showDMInput(username) {
  const inputArea = document.querySelector('.input-area');
  if (!inputArea) return;
  
  inputArea.innerHTML = `
    <textarea class="msg-inp" id="dmInput" placeholder="@${username} mesaj yaz..." rows="1"></textarea>
    <button class="ib" style="background:var(--gr)" id="dmSendBtn">➤</button>
    <button class="ib" id="dmCloseBtn" title="Kapat">×</button>
  `;
  
  const dmInput = document.getElementById('dmInput');
  const dmSendBtn = document.getElementById('dmSendBtn');
  const dmCloseBtn = document.getElementById('dmCloseBtn');
  
  if (dmInput) {
    dmInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendDMMessage(username, dmInput.value);
      }
    });
    dmInput.focus();
  }
  
  if (dmSendBtn) {
    dmSendBtn.onclick = () => sendDMMessage(username, dmInput?.value || '');
  }
  
  if (dmCloseBtn) {
    dmCloseBtn.onclick = closeDM;
  }
}

// ============ DM KAPAT ============
function closeDM() {
  dmState.activeDM = null;
  saveDMState();
  
  const inputArea = document.querySelector('.input-area');
  if (inputArea) {
    inputArea.innerHTML = `
      <button class="ib" id="emojiBtn">😊</button>
      <div id="emojiPanel" class="epop hidden" style="bottom:60px;left:10px"></div>
      <button class="ib" id="gifBtn">🎬</button>
      <button class="ib" id="imageBtn">🖼️</button>
      <button class="ib" id="pollBtn">📊</button>
      <textarea class="msg-inp" id="messageInput" placeholder="Mesaj yaz..." rows="1"></textarea>
      <button class="ib" style="background:var(--gr)" id="sendBtn">➤</button>
    `;
  }
  
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof navigateTo === 'function') navigateTo('/dm');
}

// ============ DM MESAJ SİL ============
function deleteDMMessage(username, msgId) {
  if (!dmState.messages[username]) return;
  dmState.messages[username] = dmState.messages[username].filter(m => m.id !== msgId);
  
  const friend = dmState.friends.find(f => f.username === username);
  if (friend) {
    const remaining = dmState.messages[username];
    friend.lastMessage = remaining.length > 0 ? remaining[remaining.length - 1].text : '';
  }
  
  saveDMState();
  renderDMChat(username);
  toast('🗑️ Mesaj silindi');
}

// ============ DM METİN KOPYALA ============
function copyDMText(username, msgId) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (msg) {
    navigator.clipboard.writeText(msg.text).then(() => toast('📋 Kopyalandı'));
  }
}

// ============ DM REAKSİYON ============
function reactToDM(username, msgId, emoji) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (!msg) return;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  
  const idx = msg.reactions[emoji].indexOf(Store.user._id);
  if (idx === -1) msg.reactions[emoji].push(Store.user._id);
  else msg.reactions[emoji].splice(idx, 1);
  if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  
  saveDMState();
  renderDMChat(username);
}

function renderDMReactions(username, msg) {
  return `<div class="reacts">${Object.entries(msg.reactions).map(([emoji, users]) => 
    `<span class="react ${users.includes(Store.user?._id)?'me':''}" onclick="reactToDM('${username}','${msg.id}','${emoji}')">${emoji} ${users.length}</span>`
  ).join('')}</div>`;
}

// ============ DM LİSTESİ ============
function renderDMList() {
  const el = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  if (channelName) channelName.textContent = '💬 Direkt Mesajlar';
  if (!el) return;
  
  const sorted = [...dmState.friends].sort((a, b) => {
    const aTime = dmState.messages[a.username]?.slice(-1)[0]?.time || a.createdAt;
    const bTime = dmState.messages[b.username]?.slice(-1)[0]?.time || b.createdAt;
    return new Date(bTime) - new Date(aTime);
  });
  
  if (sorted.length === 0) {
    el.innerHTML = `<div class="empty-ch"><h4>💬 DM</h4><p>Henüz DM yok. Arkadaş ekleyerek başla!</p></div>`;
    return;
  }
  
  el.innerHTML = sorted.map(f => `
    <div class="friend-suggestion" onclick="startDM('${f.username}')" style="cursor:pointer">
      <div class="friend-suggestion-av" style="position:relative">
        ${f.username.charAt(0).toUpperCase()}
        <span style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:${f.online?'var(--gr)':'var(--t3)'};border:2px solid var(--bg1)"></span>
      </div>
      <div class="friend-suggestion-info">
        <div class="friend-suggestion-name">${f.username}</div>
        <div class="friend-suggestion-mutual">${f.lastMessage ? f.lastMessage.substring(0, 30) : 'DM başlat'}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span style="font-size:9px;color:var(--t3)">${f.lastTime}</span>
        ${f.unread > 0 ? `<span class="ub" style="background:var(--re)">${f.unread}</span>` : ''}
      </div>
    </div>
  `).join('');
  
  closeDM();
}

// ============ DM ARAMA ============
function searchDM(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  const results = [];
  Object.entries(dmState.messages).forEach(([username, msgs]) => {
    msgs.forEach(msg => {
      if (msg.text.toLowerCase().includes(q)) {
        results.push({ ...msg, friend: username });
      }
    });
  });
  return results.slice(-20);
}

// ============ DM FİLTRELEME ============
function filterDMList(query) {
  const container = document.getElementById('dmListContainer');
  if (!container) return;
  
  const q = query.toLowerCase();
  const filtered = query ? dmState.friends.filter(f => f.username.toLowerCase().includes(q)) : dmState.friends;
  
  container.innerHTML = filtered.length === 0 
    ? '<p style="color:var(--t3);text-align:center;padding:20px">Sonuç bulunamadı</p>'
    : filtered.map(f => `
      <div class="mitem dm-mitem" onclick="startDM('${f.username}')">
        <div class="mav">${f.username.charAt(0).toUpperCase()}</div>
        <div class="minfo">
          <div class="mname">${f.username}</div>
          <div class="msub">${f.lastMessage || 'DM başlat'}</div>
        </div>
        ${f.unread > 0 ? `<span class="ub">${f.unread}</span>` : ''}
      </div>
    `).join('');
}

// ============ ARKADAŞ EKLE ============
function addFriend(username) {
  if (!username || !username.trim()) return;
  if (username === Store.user?.username) return toast('Kendini ekleyemezsin', 'e');
  if (dmState.friends.find(f => f.username === username)) return toast('Zaten arkadaş', 'e');
  
  dmState.friends.unshift({
    id: genId(),
    username: username.trim(),
    lastMessage: '',
    lastTime: 'Şimdi',
    unread: 0,
    online: false,
    createdAt: new Date().toISOString()
  });
  
  saveDMState();
  toast('👤 ' + username + ' arkadaş eklendi');
  closeModal();
}

// ============ ARKADAŞ SİL ============
function removeFriend(username) {
  if (!confirm(username + ' arkadaşlıktan çıkarılsın mı?')) return;
  
  dmState.friends = dmState.friends.filter(f => f.username !== username);
  delete dmState.messages[username];
  delete dmState.unread[username];
  
  if (dmState.activeDM === username) {
    dmState.activeDM = null;
    if (typeof renderMessages === 'function') renderMessages();
  }
  
  saveDMState();
  toast(username + ' arkadaşlıktan çıkarıldı');
}

// ============ DM OKUNDU ============
function markDMRead(username) {
  const friend = dmState.friends.find(f => f.username === username);
  if (friend) {
    friend.unread = 0;
    dmState.unread[username] = 0;
    saveDMState();
  }
}

// ============ DM KAYDET ============
function saveDMState() {
  localStorage.setItem('gt_dm_friends', JSON.stringify(dmState.friends));
  localStorage.setItem('gt_dm_messages', JSON.stringify(dmState.messages));
  localStorage.setItem('gt_dm_unread', JSON.stringify(dmState.unread));
}

// ============ SOCKET DM DİNLEYİCİ ============
function initDMSocket() {
  if (!window._socket) return;
  
  window._socket.on('dm_message', (data) => {
    if (data.senderId === Store.user?._id) return;
    
    let friend = dmState.friends.find(f => f.username === data.sender);
    if (!friend) {
      friend = {
        id: genId(),
        username: data.sender,
        lastMessage: '',
        lastTime: 'Şimdi',
        unread: 0,
        online: true,
        createdAt: new Date().toISOString()
      };
      dmState.friends.unshift(friend);
    }
    
    if (!dmState.messages[data.sender]) dmState.messages[data.sender] = [];
    dmState.messages[data.sender].push({
      id: genId(),
      sender: data.sender,
      senderId: data.senderId,
      text: data.text,
      time: new Date().toISOString(),
      reactions: {},
      read: false
    });
    
    friend.lastMessage = data.text;
    friend.lastTime = 'Az önce';
    
    if (dmState.activeDM !== data.sender) {
      friend.unread = (friend.unread || 0) + 1;
    }
    
    saveDMState();
    
    if (dmState.activeDM === data.sender) {
      renderDMChat(data.sender);
      markDMRead(data.sender);
    } else {
      renderDMList();
    }
    
    // Bildirim
    if (typeof sendNotification === 'function') {
      sendNotification(data.sender, data.text.substring(0, 80), '💬');
    }
    
    if (typeof NotificationCenter !== 'undefined') {
      NotificationCenter.push(data.sender, data.text.substring(0, 50), '💬');
    }
  });
  
  window._socket.on('user_online', (data) => {
    const friend = dmState.friends.find(f => f.username === data.username);
    if (friend) friend.online = true;
  });
  
  window._socket.on('user_offline', (data) => {
    const friend = dmState.friends.find(f => f.username === data.username);
    if (friend) friend.online = false;
  });
}

// ============ DM CSS ============
const dmStyle = document.createElement('style');
dmStyle.textContent = `
  .dm-mitem { justify-content: space-between; }
  .dm-mitem-actions { display: flex; align-items: center; gap: 6px; }
  .dm-unread { background: var(--re); color: #fff; font-size: 9px; padding: 1px 5px; border-radius: 8px; font-weight: 700; }
  .dm-dot { display: inline-block; }
`;
document.head.appendChild(dmStyle);

// ============ BAŞLAT ============
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initDMSocket, 1500);
  
  // DM butonu
  const dmBtn = document.getElementById('dmBtn');
  if (dmBtn) dmBtn.onclick = () => {
    if (typeof navigateTo === 'function') navigateTo('/dm');
    else renderDMList();
  };
  
  const panelDmBtn = document.getElementById('panelDmBtn');
  if (panelDmBtn) panelDmBtn.onclick = () => {
    if (typeof navigateTo === 'function') navigateTo('/dm');
    else renderDMList();
  };
});

console.log('✅ DM.js yüklendi');
