// =============================================
// GETTIC - 300 ÖZELLİKLİ STIMULUS CONTROLLER
// =============================================

class AppController extends Stimulus.Controller {
  static targets = [
    "login", "main", "username", "password", "authBtn", "authError",
    "messages", "input", "displayName", "avatar", "serverName", "channelName",
    "sidebar", "userPanel", "modal", "modalContent", "toast",
    "typing", "emojiPanel", "emojiGrid", "channelList"
  ];

  connect() {
    console.log('🔥 CONNECT çalıştı');
    window._app = this;
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

  // ==================== AUTH ====================
  setTab(tab) {
    const t = typeof tab === 'string' ? tab : (tab?.currentTarget?.dataset?.tab || 'login');
    this.tab = t;
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('act'));
    const btn = document.querySelector(`.auth-tab[onclick*="'${t}'"]`);
    if (btn) btn.classList.add('act');
    if (this.hasAuthBtnTarget) this.authBtnTarget.textContent = t === 'login' ? 'Giriş' : 'Kayıt';
  }

  async submitAuth() {
    console.log('🟢 submitAuth başladı');
    const username = this.usernameTarget?.value?.trim() || '';
    const password = this.passwordTarget?.value?.trim() || '';
    console.log('🟢 username:', username, 'password:', password ? '***' : 'boş');
    
    if (!username || username.length < 3) {
        console.log('🔴 Kullanıcı adı hatası');
        return this.showAuthError('Kullanıcı adı en az 3 karakter');
    }
    if (!password || password.length < 4) {
        console.log('🔴 Şifre hatası');
        return this.showAuthError('Şifre en az 4 karakter');
    }
    
    console.log('🟢 API çağrılıyor...');
    const username = this.usernameTarget?.value?.trim() || '';
    const password = this.passwordTarget?.value?.trim() || '';
    
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
    if (!this.hasAuthErrorTarget) return console.log('Hata:', msg);
    this.authErrorTarget.textContent = msg;
    this.authErrorTarget.style.display = 'block';
    setTimeout(() => {
      if (this.hasAuthErrorTarget) this.authErrorTarget.style.display = 'none';
    }, 3000);
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
    if (this.hasLoginTarget) this.loginTarget.classList.remove('hidden');
    if (this.hasMainTarget) this.mainTarget.classList.add('hidden');
    if (this.socket) this.socket.disconnect();
    this.toast('Çıkış yapıldı');
  }

  showMain() {
    if (this.hasLoginTarget) this.loginTarget.classList.add('hidden');
    if (this.hasMainTarget) {
      this.mainTarget.classList.remove('hidden');
      this.mainTarget.classList.add('flex');
    }
    if (this.hasDisplayNameTarget) this.displayNameTarget.textContent = this.user?.username || '';
    if (this.hasAvatarTarget) this.avatarTarget.textContent = this.user?.username?.charAt(0)?.toUpperCase() || 'G';
    this.renderChannels();
  }

  // ==================== MESAJLAŞMA ====================
  sendMessage(e) {
    if (e && e.key && e.key !== 'Enter') return;
    if (e && e.shiftKey) return;
    if (e) e.preventDefault();
    
    const content = this.inputTarget?.value?.trim();
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
    if (this.hasInputTarget) this.inputTarget.value = '';
    
    if (this.socket) {
      this.socket.emit('send_message', msg);
    }
  }

  renderMessages() {
    if (!this.hasMessagesTarget) return;
    
    if (this.messages.length === 0) {
      this.messagesTarget.innerHTML = `<div class="empty-ch"><h4># ${this.currentChannel}</h4><p>Henüz mesaj yok</p></div>`;
      return;
    }
    
    this.messagesTarget.innerHTML = this.messages.map(msg => `
      <div class="msg">
        <div class="msg-av">${(msg.senderName || '?').charAt(0).toUpperCase()}</div>
        <div class="msg-body">
          <div class="msg-head">
            <span>${msg.senderName || '?'}</span>
            <span class="msg-time">${this.formatTime(msg.createdAt)}</span>
          </div>
          <div class="msg-text">${this.formatMsg(msg.content)}</div>
          ${msg.image ? `<img src="${msg.image}" style="max-width:100%;border-radius:12px;margin-top:8px">` : ''}
        </div>
        <div class="ma">
          <button onclick="window._app.reactToMessage('${msg._id}','👍')">👍</button>
          <button onclick="window._app.deleteMessage('${msg._id}')">🗑️</button>
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

  // ==================== KANALLAR ====================
  renderChannels() {
    if (!this.hasChannelListTarget) return;
    this.channelListTarget.innerHTML = this.categories.map(cat => `
      <div class="ch-cat">${cat} <button>+</button></div>
      ${this.channels.filter(ch => ch.category === cat).map(ch => `
        <div class="ch-item ${ch.id === this.currentChannel ? 'act' : ''}" onclick="window._app.switchChannel('${ch.id}')">
          <span>${ch.type === 'voice' ? '🔊' : '#'}</span>
          <span class="ch-name">${ch.name}</span>
        </div>
      `).join('')}
    `).join('');
  }

  switchChannel(chId) {
    this.currentChannel = typeof chId === 'string' ? chId : chId?.currentTarget?.dataset?.channel || 'genel-sohbet';
    this.messages = [];
    this.renderMessages();
    this.renderChannels();
    if (this.hasChannelNameTarget) this.channelNameTarget.textContent = this.currentChannel;
    if (this.socket) this.socket.emit('join_channel', this.currentChannel);
  }

  createChannel(name) {
    if (!name || !name.trim()) return;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (this.channels.find(c => c.id === id)) return this.toast('Bu kanal zaten var', 'e');
    this.channels.push({ id, name: name.trim(), type: 'text', category: 'METİN' });
    this.renderChannels();
    this.toast(`# ${name} oluşturuldu`);
    this.closeModal();
  }

  // ==================== DM ====================
  startDM(username) {
    if (!this.dmFriends.find(f => f.username === username)) {
      this.dmFriends.push({ id: Date.now(), username, messages: [], last: '' });
    }
    this.toast(username + ' ile DM başlatıldı');
    this.closeModal();
  }

  addFriend(username) {
    if (!username || !username.trim()) return;
    if (this.dmFriends.find(f => f.username === username)) return this.toast('Zaten arkadaş', 'e');
    this.dmFriends.push({ id: Date.now(), username, messages: [], last: '' });
    this.toast(username + ' eklendi');
    this.closeModal();
  }

  // ==================== SES ====================
  joinVoice(e) {
    const channel = typeof e === 'string' ? e : e?.currentTarget?.dataset?.channel || 'genel-ses';
    this.toast('Ses kanalına katıldın: ' + channel);
  }

  // ==================== ANKET ====================
  createPoll(question, opts) {
    if (!question || !opts) return;
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

  // ==================== GÖRSEL ====================
  async generateImage(prompt) {
    if (!prompt || !prompt.trim()) return;
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

  // ==================== MODALLAR ====================
  openModal(e) {
    const type = typeof e === 'string' ? e : e?.currentTarget?.dataset?.action?.split(':')[1] || 'info';
    if (!this.hasModalTarget || !this.hasModalContentTarget) return;
    
    this.modalTarget.classList.remove('hidden');
    this.modalTarget.classList.add('show');
    
    switch(type) {
      case 'addChannel':
        this.modalContentTarget.innerHTML = `<h2>Kanal Oluştur</h2><input class="mi" id="chName" placeholder="Kanal adı"><button class="mb" onclick="window._app.createChannel(document.getElementById('chName').value)">Oluştur</button>`;
        break;
      case 'addFriend':
        this.modalContentTarget.innerHTML = `<h2>Arkadaş Ekle</h2><input class="mi" id="frName" placeholder="Kullanıcı adı"><button class="mb" onclick="window._app.addFriend(document.getElementById('frName').value)">Ekle</button>`;
        break;
      case 'theme':
        this.modalContentTarget.innerHTML = `<h2>Tema</h2><div class="color-row">${['#c94d8c','#6366f1','#22c55e','#f59e0b','#ec4899'].map(c => `<div class="color-swatch" style="background:${c}" onclick="document.querySelector('.app').style.setProperty('--ac','${c}');localStorage.setItem('gt_ac','${c}')"></div>`).join('')}</div>`;
        break;
      case 'poll':
        this.modalContentTarget.innerHTML = `<h2>Anket</h2><input class="mi" id="pollQ" placeholder="Soru"><input class="mi" id="pollO1" placeholder="Seçenek 1"><input class="mi" id="pollO2" placeholder="Seçenek 2"><button class="mb" onclick="window._app.createPoll(document.getElementById('pollQ').value,[document.getElementById('pollO1').value,document.getElementById('pollO2').value])">Başlat</button>`;
        break;
      case 'imageGen':
        this.modalContentTarget.innerHTML = `<h2>Görsel Oluştur</h2><input class="mi" id="imgPrompt" placeholder="Görsel açıklaması..."><button class="mb" onclick="window._app.generateImage(document.getElementById('imgPrompt').value)">Oluştur</button>`;
        break;
      case 'dm':
        this.modalContentTarget.innerHTML = `<h2>DM</h2>${this.dmFriends.length === 0 ? '<p style="color:var(--t3)">Henüz DM yok</p>' : this.dmFriends.map(f => `<div class="mitem" onclick="window._app.startDM('${f.username}')"><div class="mav">${f.username.charAt(0).toUpperCase()}</div><div class="minfo"><div class="mname">${f.username}</div></div></div>`).join('')}`;
        break;
      default:
        this.modalContentTarget.innerHTML = `<h2>${type}</h2><p>Yakında...</p>`;
    }
  }

  closeModal(e) {
    if (e && e.target !== this.modalTarget && e.target !== e.currentTarget) return;
    if (this.hasModalTarget) {
      this.modalTarget.classList.add('hidden');
      this.modalTarget.classList.remove('show');
    }
  }

  // ==================== UI ====================
  toggleSidebar() {
    if (this.hasSidebarTarget) this.sidebarTarget.classList.toggle('open');
  }
  
  togglePanel() {
    if (this.hasUserPanelTarget) this.userPanelTarget.classList.toggle('hidden');
  }
  
  toggleEmoji() {
    if (this.hasEmojiPanelTarget) this.emojiPanelTarget.classList.toggle('hidden');
  }

  initEmojis() {
    if (!this.hasEmojiGridTarget) return;
    const emojis = ['😀','😂','❤️','👍','🔥','🎉','🥳','😎','💯','✅','👋','🙏'];
    this.emojiGridTarget.innerHTML = emojis.map(e => 
      `<span class="es" onclick="window._app.insertEmoji('${e}')">${e}</span>`
    ).join('');
  }

  insertEmoji(emoji) {
    if (this.hasInputTarget) this.inputTarget.value += emoji;
    if (this.hasEmojiPanelTarget) this.emojiPanelTarget.classList.add('hidden');
    if (this.hasInputTarget) this.inputTarget.focus();
  }

  toast(msg, type = 's') {
    if (!this.hasToastTarget) return console.log('Toast:', msg);
    this.toastTarget.textContent = msg;
    this.toastTarget.className = `toast ${type}`;
    this.toastTarget.classList.remove('hidden');
    setTimeout(() => {
      if (this.hasToastTarget) this.toastTarget.classList.add('hidden');
    }, 2500);
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

  // ==================== SOCKET ====================
  initSocket() {
    if (!this.token || typeof io === 'undefined') return;
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
  }
}

// BAŞLAT
const application = Stimulus.Application.start();
application.register('app', AppController);
console.log('✅ Gettic Stimulus hazır');
