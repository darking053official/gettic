// ============ GETTIC DM.JS - FULL GERÇEK DM SİSTEMİ ============

// DM State
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
  
  saveDMState();
  renderDMChat(username);
  
  // DM ekranına geç
  if (typeof navigateTo === 'function') {
    navigateTo('/dm/' + username);
  }
  
  toast('💬 ' + username + ' ile DM');
}

// DM Mesaj Gönder
function sendDMMessage(username, text) {
  if (!text || !text.trim() || !username) return;
  if (!dmState.messages[username]) dmState.messages[username] = [];
  
  const msg = {
    id: genId(),
    sender: Store.user.username,
    senderId: Store.user._id,
    text: text.trim(),
    time: new Date().toISOString(),
    reactions: {}
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

// DM Sohbet Render
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
      <div class="msg-av">${msg.sender.charAt(0).toUpperCase()}</div>
      <div class="msg-body">
        <div class="msg-head">
          <span>${msg.sender}</span>
          <span class="msg-time">${formatTime(msg.time)}</span>
        </div>
        <div class="msg-text">${formatMsg(msg.text)}</div>
        ${msg.reactions && Object.keys(msg.reactions).length > 0 ? renderDMReactions(username, msg) : ''}
      </div>
      <div class="ma">
        <button onclick="reactToDM('${username}','${msg.id}','👍')">👍</button>
        <button onclick="reactToDM('${username}','${msg.id}','❤️')">❤️</button>
        <button onclick="copyDMText('${username}','${msg.id}')">📋</button>
        ${isOwn ? `<button onclick="deleteDMMessage('${username}','${msg.id}')" style="color:var(--re)">🗑️</button>` : ''}
      </div>
    </div>`;
  }).join('');
  
  messagesEl.scrollTop = messagesEl.scrollHeight;
  
  // DM input alanını göster
  showDMInput(username);
}

// DM Input Göster
function showDMInput(username) {
  const inputArea = document.querySelector('.input-area');
  if (!inputArea) return;
  
  inputArea.innerHTML = `
    <textarea class="msg-inp" id="dmInput" placeholder="@${username} mesaj yaz..." rows="1"></textarea>
    <button class="ib" style="background:var(--gr)" id="dmSendBtn">➤</button>
  `;
  
  const dmInput = document.getElementById('dmInput');
  const dmSendBtn = document.getElementById('dmSendBtn');
  
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
}

// DM Mesaj Sil
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

// DM Metin Kopyala
function copyDMText(username, msgId) {
  const msg = dmState.messages[username]?.find(m => m.id === msgId);
  if (msg) {
    navigator.clipboard.writeText(msg.text).then(() => toast('📋 Kopyalandı'));
  }
}

// DM Reaksiyon
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

// DM Kapat
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

// DM Listesi
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
      <div class="friend-suggestion-av">${f.username.charAt(0).toUpperCase()}
        <span class="dm-dot ${f.online ? 'online' : ''}" style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:${f.online?'var(--gr)':'var(--t3)'};border:2px solid var(--bg1)"></span>
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
  
  closeDM(); // Input'u normal hale getir
}

// Arkadaş Ekle
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

// Arkadaş Sil
function removeFriend(username) {
  dmState.friends = dmState.friends.filter(f => f.username !== username);
  delete dmState.messages[username];
  delete dmState.unread[username];
  if (dmState.activeDM === username) {
    dmState.activeDM = null;
  }
  saveDMState();
  toast(username + ' arkadaşlıktan çıkarıldı');
}

// DM Ara
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

// DM Durumu Kaydet
function saveDMState() {
  localStorage.setItem('gt_dm_friends', JSON.stringify(dmState.friends));
  localStorage.setItem('gt_dm_messages', JSON.stringify(dmState.messages));
  localStorage.setItem('gt_dm_unread', JSON.stringify(dmState.unread));
}

// Socket DM Dinleyici
function initDMSocket() {
  if (!window._socket) return;
  
  window._socket.on('dm_message', (data) => {
    if (data.senderId === Store.user?._id) return;
    
    // Yeni arkadaş ekle
    if (!dmState.friends.find(f => f.username === data.sender)) {
      dmState.friends.unshift({
        id: genId(),
        username: data.sender,
        lastMessage: '',
        lastTime: 'Şimdi',
        unread: 0,
        online: true,
        createdAt: new Date().toISOString()
      });
    }
    
    // Mesajı kaydet
    if (!dmState.messages[data.sender]) dmState.messages[data.sender] = [];
    dmState.messages[data.sender].push({
      id: genId(),
      sender: data.sender,
      senderId: data.senderId,
      text: data.text,
      time: new Date().toISOString(),
      reactions: {}
    });
    
    // Arkadaş bilgisini güncelle
    const friend = dmState.friends.find(f => f.username === data.sender);
    if (friend) {
      friend.lastMessage = data.text;
      friend.lastTime = 'Az önce';
      if (dmState.activeDM !== data.sender) {
        friend.unread = (friend.unread || 0) + 1;
      }
    }
    
    saveDMState();
    
    // Aktif DM ise render et
    if (dmState.activeDM === data.sender) {
      renderDMChat(data.sender);
      dmState.unread[data.sender] = 0;
      friend.unread = 0;
      saveDMState();
    }
    
    // Bildirim
    if (dmState.activeDM !== data.sender) {
      toast('💬 ' + data.sender + ': ' + data.text.substring(0, 30), 'dm');
    }
  });
  
  // Kullanıcı çevrimiçi durumu
  window._socket.on('user_online', (data) => {
    const friend = dmState.friends.find(f => f.username === data.username);
    if (friend) friend.online = true;
  });
  
  window._socket.on('user_offline', (data) => {
    const friend = dmState.friends.find(f => f.username === data.username);
    if (friend) friend.online = false;
  });
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initDMSocket, 1000);
});
