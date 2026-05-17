// DM Başlat
function startDM(username) {
  if (!username || !username.trim()) return toast('Kullanıcı adı gerekli', 'e');
  if (username === Store.user?.username) return toast('Kendine DM atamazsın', 'e');
  if (Store.blockedUsers.includes(username)) return toast('Bu kullanıcıyı engelledin', 'e');
  
  // Zaten varsa direkt aç
  let friend = Store.dmFriends.find(f => f.username === username);
  if (!friend) {
    friend = {
      id: genId(),
      username,
      messages: [],
      last: '',
      time: 'Şimdi',
      unread: 0,
      online: false,
      createdAt: new Date().toISOString()
    };
    Store.dmFriends.unshift(friend);
    saveStore();
    addNotification(`${username} ile DM başlatıldı`, 'info');
  }
  
  Store.activeDM = username;
  renderDM();
  toast('💬 ' + username + ' ile DM');
  closeModal();
}

// DM Gönder
function sendDMMessage(username, text) {
  if (!text || !text.trim() || !username) return;
  const friend = Store.dmFriends.find(f => f.username === username);
  if (!friend) return;
  
  const msg = {
    id: genId(),
    sender: Store.user.username,
    senderId: Store.user._id,
    text: text.trim(),
    time: new Date().toISOString(),
    read: false
  };
  
  friend.messages.push(msg);
  if (friend.messages.length > 200) friend.messages.shift();
  friend.last = text.trim();
  friend.time = 'Az önce';
  friend.unread = 0;
  
  saveStore();
  renderDM();
  
  if (window._socket) {
    window._socket.emit('dm_message', { 
      to: username, 
      text: text.trim(), 
      sender: Store.user.username,
      senderId: Store.user._id
    });
  }
}

// DM Render
function renderDM() {
  const el = document.getElementById('messages');
  if (!el || !Store.activeDM) return;
  
  const friend = Store.dmFriends.find(f => f.username === Store.activeDM);
  if (!friend) return;
  
  document.getElementById('channelName').textContent = '@' + Store.activeDM;
  
  if (friend.messages.length === 0) {
    el.innerHTML = `<div class="empty-ch">
      <div class="dm-av-big">${Store.activeDM.charAt(0).toUpperCase()}</div>
      <h4>@${Store.activeDM}</h4>
      <p>DM başlatıldı. İlk mesajı sen gönder!</p>
    </div>`;
    return;
  }
  
  el.innerHTML = friend.messages.map(msg => {
    const isOwn = msg.sender === Store.user?.username;
    return `
    <div class="msg ${isOwn ? 'own' : ''}">
      <div class="msg-av">${msg.sender.charAt(0).toUpperCase()}</div>
      <div class="msg-body">
        <div class="msg-head">
          <span>${msg.sender}</span>
          <span class="msg-time">${formatTime(msg.time)}</span>
        </div>
        <div class="msg-text">${formatMsg(msg.text)}</div>
      </div>
      <div class="ma">
        <button onclick="reactToDM('${friend.username}','${msg.id}','👍')">👍</button>
        <button onclick="reactToDM('${friend.username}','${msg.id}','❤️')">❤️</button>
        <button onclick="copyDMText('${friend.username}','${msg.id}')">📋</button>
        ${isOwn ? `<button onclick="deleteDMMessage('${friend.username}','${msg.id}')" style="color:var(--re)">🗑️</button>` : ''}
      </div>
    </div>`;
  }).join('');
  
  el.scrollTop = el.scrollHeight;
}

// DM Mesaj Sil
function deleteDMMessage(username, msgId) {
  const friend = Store.dmFriends.find(f => f.username === username);
  if (!friend) return;
  friend.messages = friend.messages.filter(m => m.id !== msgId);
  if (friend.messages.length > 0) {
    friend.last = friend.messages[friend.messages.length-1].text;
  }
  saveStore();
  renderDM();
}

// DM Metin Kopyala
function copyDMText(username, msgId) {
  const friend = Store.dmFriends.find(f => f.username === username);
  if (!friend) return;
  const msg = friend.messages.find(m => m.id === msgId);
  if (msg) {
    navigator.clipboard.writeText(msg.text).then(() => toast('Kopyalandı'));
  }
}

// DM Reaksiyon
function reactToDM(username, msgId, emoji) {
  const friend = Store.dmFriends.find(f => f.username === username);
  if (!friend) return;
  const msg = friend.messages.find(m => m.id === msgId);
  if (!msg) return;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const idx = msg.reactions[emoji].indexOf(Store.user._id);
  if (idx === -1) msg.reactions[emoji].push(Store.user._id);
  else msg.reactions[emoji].splice(idx, 1);
  if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  saveStore();
  renderDM();
}

// DM Kapat
function closeDM() {
  Store.activeDM = null;
  document.getElementById('channelName').textContent = Store.activeChannel;
  renderMessages();
}

// DM Arama
function searchDM(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  const results = [];
  Store.dmFriends.forEach(f => {
    f.messages.forEach(m => {
      if (m.text.toLowerCase().includes(q)) {
        results.push({ ...m, friend: f.username });
      }
    });
  });
  return results.slice(-20);
}

// Arkadaş Ekle
function addFriend(username) {
  if (!username || !username.trim()) return toast('Kullanıcı adı gerekli', 'e');
  if (username === Store.user?.username) return toast('Kendini ekleyemezsin', 'e');
  if (Store.dmFriends.find(f => f.username === username)) return toast('Zaten arkadaş', 'e');
  
  Store.dmFriends.unshift({
    id: genId(),
    username: username.trim(),
    messages: [],
    last: '',
    time: 'Şimdi',
    unread: 0,
    online: false,
    createdAt: new Date().toISOString()
  });
  
  saveStore();
  toast('👤 ' + username + ' arkadaş eklendi');
  closeModal();
}

// Arkadaş Sil
function removeFriend(username) {
  if (!confirm(username + ' arkadaşlıktan çıkarılsın mı?')) return;
  Store.dmFriends = Store.dmFriends.filter(f => f.username !== username);
  if (Store.activeDM === username) {
    Store.activeDM = null;
    renderMessages();
  }
  saveStore();
  toast(username + ' arkadaşlıktan çıkarıldı');
}

// DM Okundu İşaretle
function markDMRead(username) {
  const friend = Store.dmFriends.find(f => f.username === username);
  if (friend) {
    friend.unread = 0;
    saveStore();
  }
}

// DM Listesi Render (Sidebar için)
function renderDMList() {
  const el = document.getElementById('dmList');
  if (!el) return;
  
  const sorted = [...Store.dmFriends].sort((a,b) => {
    if (a.messages.length === 0 && b.messages.length === 0) return 0;
    if (a.messages.length === 0) return 1;
    if (b.messages.length === 0) return -1;
    const aLast = a.messages[a.messages.length-1]?.time || a.createdAt;
    const bLast = b.messages[b.messages.length-1]?.time || b.createdAt;
    return new Date(bLast) - new Date(aLast);
  });
  
  el.innerHTML = sorted.map(f => `
    <div class="dm-preview ${Store.activeDM === f.username ? 'act' : ''} ${f.unread > 0 ? 'unread' : ''}" 
         onclick="startDM('${f.username}')">
      <div class="dm-av">${f.username.charAt(0).toUpperCase()}
        <span class="dm-dot ${f.online ? 'online' : ''}"></span>
      </div>
      <div class="dm-info">
        <div class="dm-name">${f.username}</div>
        <div class="dm-last">${f.last || 'DM başlat'}</div>
      </div>
      <div class="dm-actions">
        <button onclick="event.stopPropagation();removeFriend('${f.username}')" title="Çıkar">×</button>
        ${f.unread > 0 ? `<span class="dm-unread">${f.unread}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// Socket DM dinleyici
function initDMSocket() {
  if (!window._socket) return;
  
  window._socket.on('dm_message', (data) => {
    if (data.senderId === Store.user?._id) return;
    
    let friend = Store.dmFriends.find(f => f.username === data.sender);
    if (!friend) {
      friend = {
        id: genId(),
        username: data.sender,
        messages: [],
        last: '',
        time: 'Şimdi',
        unread: 0,
        online: true,
        createdAt: new Date().toISOString()
      };
      Store.dmFriends.unshift(friend);
    }
    
    friend.messages.push({
      id: genId(),
      sender: data.sender,
      senderId: data.senderId,
      text: data.text,
      time: new Date().toISOString(),
      read: false
    });
    
    friend.last = data.text;
    friend.time = 'Az önce';
    
    if (Store.activeDM !== data.sender) {
      friend.unread++;
    }
    
    saveStore();
    
    if (Store.activeDM === data.sender) {
      renderDM();
      markDMRead(data.sender);
    }
    
    renderDMList();
    addNotification(`${data.sender}: ${data.text.substring(0, 40)}`, 'dm');
    
    if (Store.notifPermission === 'granted' && document.hidden) {
      try {
        new Notification(data.sender, { 
          body: data.text.substring(0, 100),
          icon: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
          tag: 'dm-' + data.sender
        });
      } catch(e) {}
    }
  });
    }
