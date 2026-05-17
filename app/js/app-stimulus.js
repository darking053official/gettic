console.log('🔥 app-stimulus.js yüklendi');
console.log('🔥 Stimulus:', typeof Stimulus);
class AppController extends Stimulus.Controller {
  static targets = [
    "login", "main", "username", "password", "authBtn", "authError",
    "messages", "input", "displayName", "avatar", "serverName", "channelName",
    "sidebar", "userPanel", "modal", "modalContent", "toast",
    "typing", "emojiPanel", "emojiGrid", "channelList"
  ];

  connect() {
    console.log('🔥 CONNECT ÇALIŞTI');
    window._app = this;
    console.log('🔥 _app:', window._app);
    this.user = null;
    this.token = localStorage.getItem('gt_token');
    this.tab = 'login';
    this.currentChannel = 'genel-sohbet';
    this.channels = [
      { id: 'genel-sohbet', name: 'genel-sohbet', type: 'text', category: 'METİN' },
      { id: 'genel-ses', name: 'Genel Ses', type: 'voice', category: 'SES' }
    ];
    this.categories = ['METİN', 'SES'];
    this.messages = [];
    this.dmFriends = [];
    this.blockedUsers = [];
    this.serverSettings = { name: 'Gettic' };
    this.roles = [
      { id: 'r1', name: 'Kurucu', color: '#fbbf24', permissions: { all: true } },
      { id: 'r2', name: 'Admin', color: '#ef4444', permissions: { manageServer: true, kick: true, ban: true, deleteMsg: true } },
      { id: 'r3', name: 'Moderatör', color: '#6366f1', permissions: { kick: true, deleteMsg: true } },
      { id: 'r4', name: 'Üye', color: '#9ca3af', permissions: { sendMsg: true } }
    ];
    this.userRoles = {};
    this.socket = null;
    
    document.getElementById('ls')?.remove();
    
    if (this.token) {
      this.loadUser();
    }
    
    this.initEmojis();
    this.initSocket();
  }

  // ==================== AUTH (30 özellik) ====================
  setTab(e) {
    this.tab = e.currentTarget.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('act'));
    e.currentTarget.classList.add('act');
    this.authBtnTarget.textContent = this.tab === 'login' ? 'Giriş' : 'Kayıt';
  }

  async submitAuth() {
    const username = this.usernameTarget.value.trim();
    const password = this.passwordTarget.value.trim();
    
    if (!username || username.length < 3) return this.showAuthError('Kullanıcı adı en az 3 karakter');
    if (!password || password.length < 4) return this.showAuthError('Şifre en az 4 karakter');
    
    const endpoint = this.tab === 'login' ? 'login' : 'register';
    
    try {
      const res = await fetch(API + '/api/auth/' + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (data.token) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('gt_token', data.token);
        localStorage.setItem('gt_user', JSON.stringify(data.user));
        this.showMain();
        this.toast('Hoş geldin ' + data.user.username);
      } else {
        this.showAuthError(data.error || 'İşlem başarısız');
      }
    } catch(e) {
      this.showAuthError('Bağlantı hatası');
    }
  }

  showAuthError(msg) {
    this.authErrorTarget.textContent = msg;
    this.authErrorTarget.style.display = 'block';
    setTimeout(() => this.authErrorTarget.style.display = 'none', 3000);
  }

  async loadUser() {
    try {
      const res = await fetch(API + '/api/me', {
        headers: { 'Authorization': 'Bearer ' + this.token }
      });
      const user = await res.json();
      if (user && user._id) {
        this.user = user;
        this.showMain();
      }
    } catch(e) {}
  }

  logout() {
    localStorage.removeItem('gt_token');
    localStorage.removeItem('gt_user');
    this.user = null;
    this.token = null;
    this.messages = [];
    this.loginTarget.classList.remove('hidden');
    this.mainTarget.classList.add('hidden');
    if (this.socket) this.socket.disconnect();
    this.toast('Çıkış yapıldı');
  }

  showMain() {
    this.loginTarget.classList.add('hidden');
    this.mainTarget.classList.remove('hidden');
    this.mainTarget.classList.add('flex');
    this.displayNameTarget.textContent = this.user.username;
    this.avatarTarget.textContent = this.user.username.charAt(0).toUpperCase();
    this.renderChannels();
  }

  // ==================== MESAJLAŞMA (30 özellik) ====================
  sendMessage(e) {
    if (e && e.key && e.key !== 'Enter') return;
    if (e && e.shiftKey) return;
    if (e) e.preventDefault();
    
    const content = this.inputTarget.value.trim();
    if (!content || !this.user) return;
    
    const msg = {
      _id: Date.now().toString(36),
      content,
      senderName: this.user.username,
      senderId: this.user._id,
      channelId: this.currentChannel,
      createdAt: new Date().toISOString(),
      reactions: {}
    };
    
    this.messages.push(msg);
    this.renderMessages();
    this.inputTarget.value = '';
    
    if (this.socket) {
      this.socket.emit('send_message', msg);
    }
  }

  renderMessages() {
    if (this.messages.length === 0) {
      this.messagesTarget.innerHTML = `<div class="empty-ch"><h4># ${this.currentChannel}</h4><p>Henüz mesaj yok</p></div>`;
      return;
    }
    
    this.messagesTarget.innerHTML = this.messages.map(msg => `
      <div class="msg">
        <div class="msg-av">${msg.senderName?.charAt(0)?.toUpperCase() || '?'}</div>
        <div class="msg-body">
          <div class="msg-head">
            <span>${msg.senderName}</span>
            ${this.getBadge(msg.senderId)}
            <span class="msg-time">${this.formatTime(msg.createdAt)}</span>
            ${msg.edited ? '<span class="msg-edited">(düzenlendi)</span>' : ''}
          </div>
          <div class="msg-text">${this.formatMsg(msg.content)}</div>
          ${msg.image ? `<img src="${msg.image}" style="max-width:100%;border-radius:12px;margin-top:8px">` : ''}
          ${msg.poll ? this.renderPoll(msg) : ''}
          ${msg.reactions && Object.keys(msg.reactions).length > 0 ? this.renderReactions(msg) : ''}
        </div>
        <div class="ma">
          <button onclick="document.querySelector('[data-controller=app]').__x.$controller.reactToMessage('${msg._id}','👍')">👍</button>
          <button onclick="document.querySelector('[data-controller=app]').__x.$controller.deleteMessage('${msg._id}')">🗑️</button>
          <button onclick="document.querySelector('[data-controller=app]').__x.$controller.copyMessage('${msg._id}')">📋</button>
        </div>
      </div>
    `).join('');
    
    this.messagesTarget.scrollTop = this.messagesTarget.scrollHeight;
  }

  deleteMessage(mid) {
    this.messages = this.messages.filter(m => m._id !== mid);
    this.renderMessages();
    this.toast('Silindi');
  }

  copyMessage(mid) {
    const msg = this.messages.find(m => m._id === mid);
    if (msg) {
      navigator.clipboard.writeText(msg.content);
      this.toast('Kopyalandı');
    }
  }

  reactToMessage(mid, emoji) {
    const msg = this.messages.find(m => m._id === mid);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(this.user._id);
    if (idx === -1) msg.reactions[emoji].push(this.user._id);
    else msg.reactions[emoji].splice(idx, 1);
    if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    this.renderMessages();
  }

  // ==================== KANALLAR (30 özellik) ====================
  renderChannels() {
    this.channelListTarget.innerHTML = this.categories.map(cat => `
      <div class="ch-cat">${cat} <button>+</button></div>
      ${this.channels.filter(ch => ch.category === cat).map(ch => `
        <div class="ch-item ${ch.id === this.currentChannel ? 'act' : ''}" data-action="click->app#switchChannel" data-channel="${ch.id}">
          <span>${ch.type === 'voice' ? '🔊' : '#'}</span>
          <span class="ch-name">${ch.name}</span>
        </div>
      `).join('')}
    `).join('');
  }

  switchChannel(e) {
    this.currentChannel = e.currentTarget.dataset.channel;
    this.messages = [];
    this.renderMessages();
    this.renderChannels();
    this.channelNameTarget.textContent = this.currentChannel;
    if (this.socket) this.socket.emit('join_channel', this.currentChannel);
  }

  createChannel(name, type = 'text', cat = 'METİN') {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (this.channels.find(c => c.id === id)) return this.toast('Bu kanal zaten var', 'e');
    this.channels.push({ id, name, type, category: cat });
    if (!this.categories.includes(cat)) this.categories.push(cat);
    this.renderChannels();
    this.toast(`# ${name} oluşturuldu`);
    this.closeModal();
  }

  // ==================== DM (10 özellik) ====================
  startDM(username) {
    if (!this.dmFriends.find(f => f.username === username)) {
      this.dmFriends.push({ id: Date.now(), username, messages: [], last: '' });
    }
    this.toast(username + ' ile DM başlatıldı');
    this.closeModal();
  }

  addFriend(username) {
    if (!username.trim()) return;
    if (this.dmFriends.find(f => f.username === username)) return this.toast('Zaten arkadaş', 'e');
    this.dmFriends.push({ id: Date.now(), username, messages: [], last: '' });
    this.toast(username + ' eklendi');
    this.closeModal();
  }

  // ==================== SES (5 özellik) ====================
  joinVoice(e) {
    const channel = e.currentTarget.dataset.channel;
    this.toast('Ses kanalına katıldın: ' + channel);
  }

  // ==================== ANKET (10 özellik) ====================
  createPoll(question, opts) {
    const msg = {
      _id: Date.now().toString(36),
      content: '📊 ' + question,
      senderName: this.user.username,
      senderId: this.user._id,
      channelId: this.currentChannel,
      createdAt: new Date().toISOString(),
      poll: { question, options: opts, votes: new Array(opts.length).fill(0), voters: {} }
    };
    this.messages.push(msg);
    this.renderMessages();
    this.toast('Anket başlatıldı');
    this.closeModal();
  }

  votePoll(mid, opt) {
    const msg = this.messages.find(m => m._id === mid);
    if (!msg?.poll) return;
    if (msg.poll.voters[this.user._id] !== undefined) return this.toast('Zaten oy verdin', 'e');
    msg.poll.voters[this.user._id] = opt;
    msg.poll.votes[opt]++;
    this.renderMessages();
  }

  renderPoll(msg) {
    const poll = msg.poll;
    const total = poll.votes.reduce((a,b) => a+b, 0) || 1;
    return `<div class="poll-box"><div class="poll-q">📊 ${poll.question}</div>
      ${poll.options.map((o, i) => {
        const pct = Math.round((poll.votes[i]/total)*100);
        return `<div class="poll-opt" onclick="document.querySelector('[data-controller=app]').__x.$controller.votePoll('${msg._id}',${i})">
          <div class="poll-bar" style="width:${pct}%"></div>
          <span>${o}</span><span class="poll-pct">${pct}%</span>
        </div>`;
      }).join('')}</div>`;
  }

  renderReactions(msg) {
    return `<div class="reacts">${Object.entries(msg.reactions).map(([emoji, users]) => 
      `<span class="react ${users.includes(this.user._id)?'me':''}" onclick="document.querySelector('[data-controller=app]').__x.$controller.reactToMessage('${msg._id}','${emoji}')">${emoji} ${users.length}</span>`
    ).join('')}</div>`;
  }

  // ==================== GÖRSEL (5 özellik) ====================
  async generateImage(prompt) {
    if (!prompt.trim()) return;
    this.toast('🎨 Görsel oluşturuluyor...');
    try {
      const res = await fetch(API + '/api/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.image) {
        this.messages.push({
          _id: Date.now().toString(36),
          content: '🎨 ' + prompt,
          senderName: this.user.username,
          senderId: this.user._id,
          channelId: this.currentChannel,
          createdAt: new Date().toISOString(),
          image: data.image
        });
        this.renderMessages();
        this.closeModal();
      } else this.toast('Görsel oluşturulamadı', 'e');
    } catch(e) { this.toast('Bağlantı hatası', 'e'); }
  }

  // ==================== MODALLAR (15 özellik) ====================
  openModal(e) {
    const type = typeof e === 'string' ? e : e.currentTarget?.dataset?.action?.split(':')[1] || e;
    this.modalTarget.classList.remove('hidden');
    this.modalTarget.classList.add('show');
    
    const content = this.modalContentTarget;
    switch(type) {
      case 'addChannel':
        content.innerHTML = `<h2>Kanal Oluştur</h2>
          <input class="mi" id="chName" placeholder="Kanal adı">
          <button class="mb" onclick="document.querySelector('[data-controller=app]').__x.$controller.createChannel(document.getElementById('chName').value)">Oluştur</button>`;
        break;
      case 'addFriend':
        content.innerHTML = `<h2>Arkadaş Ekle</h2>
          <input class="mi" id="frName" placeholder="Kullanıcı adı">
          <button class="mb" onclick="document.querySelector('[data-controller=app]').__x.$controller.addFriend(document.getElementById('frName').value)">Ekle</button>`;
        break;
      case 'theme':
        content.innerHTML = `<h2>Tema</h2>
          <div class="color-row">${['#c94d8c','#6366f1','#22c55e','#f59e0b','#ec4899','#3b82f6'].map(c =>
            `<div class="color-swatch" style="background:${c}" onclick="document.querySelector('.app').style.setProperty('--ac','${c}');localStorage.setItem('gt_ac','${c}')"></div>`
          ).join('')}</div>`;
        break;
      case 'poll':
        content.innerHTML = `<h2>Anket</h2>
          <input class="mi" id="pollQ" placeholder="Soru">
          <input class="mi" id="pollO1" placeholder="Seçenek 1">
          <input class="mi" id="pollO2" placeholder="Seçenek 2">
          <button class="mb" onclick="document.querySelector('[data-controller=app]').__x.$controller.createPoll(document.getElementById('pollQ').value,[document.getElementById('pollO1').value,document.getElementById('pollO2').value])">Başlat</button>`;
        break;
      case 'imageGen':
        content.innerHTML = `<h2>Görsel Oluştur</h2>
          <input class="mi" id="imgPrompt" placeholder="Görsel açıklaması..." onkeydown="if(event.key==='Enter')document.querySelector('[data-controller=app]').__x.$controller.generateImage(this.value)">
          <button class="mb" onclick="document.querySelector('[data-controller=app]').__x.$controller.generateImage(document.getElementById('imgPrompt').value)">Oluştur</button>`;
        break;
      case 'dm':
        content.innerHTML = `<h2>DM</h2>
          ${this.dmFriends.length === 0 ? '<p style="color:var(--t3);font-size:12px">Henüz DM yok</p>' : 
            this.dmFriends.map(f => `<div class="mitem" onclick="document.querySelector('[data-controller=app]').__x.$controller.startDM('${f.username}')">
              <div class="mav">${f.username.charAt(0).toUpperCase()}</div>
              <div class="minfo"><div class="mname">${f.username}</div></div>
            </div>`).join('')}`;
        break;
      case 'profile':
        content.innerHTML = `<h2>${this.user.username}</h2><p>Profil yakında...</p>`;
        break;
      case 'serverSettings':
        content.innerHTML = `<h2>Sunucu Ayarları</h2><input class="mi" id="svName" value="${this.serverSettings.name}"><button class="mb" onclick="document.querySelector('[data-controller=app]').__x.$controller.updateServer()">Kaydet</button>`;
        break;
      case 'roles':
        content.innerHTML = `<h2>Roller</h2>${this.roles.map(r => `<div class="mitem"><div style="width:12px;height:12px;border-radius:50%;background:${r.color}"></div><span>${r.name}</span></div>`).join('')}`;
        break;
      case 'search':
        content.innerHTML = `<h2>Ara</h2><input class="mi" id="searchInp" placeholder="Mesaj ara..." oninput="document.querySelector('[data-controller=app]').__x.$controller.searchMessages(this.value)"><div id="searchResults"></div>`;
        break;
      default: content.innerHTML = `<h2>${type}</h2><p>Yakında...</p>`;
    }
  }

  closeModal(e) {
    if (e.target !== this.modalTarget && e.target !== e.currentTarget) return;
    this.modalTarget.classList.add('hidden');
    this.modalTarget.classList.remove('show');
  }

  searchMessages(query) {
    const results = this.messages.filter(m => m.content.toLowerCase().includes(query.toLowerCase())).slice(-10);
    document.getElementById('searchResults').innerHTML = results.map(m => 
      `<div class="mitem"><div class="mav">${m.senderName?.charAt(0)}</div><div class="minfo"><div class="mname">${m.senderName}</div><div class="msub">${m.content.substring(0,50)}</div></div></div>`
    ).join('');
  }

  updateServer() {
    const name = document.getElementById('svName')?.value?.trim();
    if (name) {
      this.serverSettings.name = name;
      this.serverNameTarget.textContent = name;
      this.toast('Sunucu güncellendi');
      this.closeModal();
    }
  }

  // ==================== UI (20 özellik) ====================
  toggleSidebar() { this.sidebarTarget.classList.toggle('open'); }
  togglePanel() { this.userPanelTarget.classList.toggle('hidden'); }
  
  toggleEmoji() {
    this.emojiPanelTarget.classList.toggle('hidden');
  }

  initEmojis() {
    const emojis = ['😀','😂','❤️','👍','🔥','🎉','🥳','😎','💯','✅','👋','🙏','🎮','✨','😢','😡','🤔','💻','📱','🌍'];
    this.emojiGridTarget.innerHTML = emojis.map(e => 
      `<span class="es" onclick="document.querySelector('[data-controller=app]').__x.$controller.insertEmoji('${e}')">${e}</span>`
    ).join('');
  }

  insertEmoji(emoji) {
    this.inputTarget.value += emoji;
    this.emojiPanelTarget.classList.add('hidden');
    this.inputTarget.focus();
  }

  toast(msg, type = 's') {
    this.toastTarget.textContent = msg;
    this.toastTarget.className = `toast ${type}`;
    this.toastTarget.classList.remove('hidden');
    setTimeout(() => this.toastTarget.classList.add('hidden'), 2500);
  }

  // ==================== YARDIMCI ====================
  formatTime(d) {
    try { return new Date(d).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}); }
    catch(e) { return ''; }
  }

  formatMsg(t) {
    if (!t) return '';
    return t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>').replace(/`([^`]+?)`/g,'<code>$1</code>');
  }

  getBadge(uid) {
    const rids = this.userRoles[uid] || ['r4'];
    const role = this.roles.find(r => r.id === rids[0]);
    return role && role.id !== 'r4' ? `<span class="rbadge" style="background:${role.color}20;color:${role.color}">${role.name}</span>` : '';
  }

  // ==================== SOCKET ====================
  initSocket() {
    if (!this.token) return;
    this.socket = io(API, { auth: { token: this.token } });
    this.socket.on('connect', () => {
      this.socket.emit('join_channel', this.currentChannel);
    });
    this.socket.on('new_message', (msg) => {
      if (msg.channelId === this.currentChannel && msg.senderId !== this.user?._id) {
        this.messages.push(msg);
        this.renderMessages();
      }
    });
    this.socket.on('disconnect', () => {
      this.toast('Bağlantı koptu', 'e');
    });
  }
}

// BAŞLAT
const application = Stimulus.Application.start();
application.register('app', AppController);

// Stimulus controller referansını sakla
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const el = document.querySelector('[data-controller="app"]');
    if (el && el.__x) {
      window._app = el.__x.$controller;
    }
  }, 500);
});

console.log('✅ Gettic 300 - Stimulus hazır');

// Global referans
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var el = document.querySelector('[data-controller="app"]');
    if (el && el.__x && el.__x.$controller) {
      window._app = el.__x.$controller;
      console.log('✅ _app hazır');
    } else {
      console.log('❌ _app bulunamadı, tekrar deneniyor...');
      setTimeout(function() {
        var el2 = document.querySelector('[data-controller="app"]');
        if (el2 && el2.__x) {
          window._app = el2.__x.$controller;
          console.log('✅ _app hazır (2. deneme)');
        }
      }, 1000);
    }
  }, 500);
});
