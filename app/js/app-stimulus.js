console.log('calisiyo');
class AppController extends Stimulus.Controller {
  static targets = ["login", "main", "username", "password", "messages", "input", "displayName", "avatar", "sidebar"];

  connect() {
    console.log('Connect çalıştı');
    const ls = document.getElementById('ls');
    if (ls) {
        ls.style.display = 'none';
        console.log('Loading kaldırıldı');
    }
        });
    }
  }

  async login() {
    const username = this.usernameTarget.value;
    const password = this.passwordTarget.value;
    try {
      const res = await fetch(API + '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('gt_token', data.token);
        localStorage.setItem('gt_user', JSON.stringify(data.user));
        this.user = data.user;
        this.showMain();
      } else {
        alert(data.error || 'Giriş başarısız');
      }
    } catch(e) {
      alert('Bağlantı hatası');
    }
  }

  showMain() {
    this.loginTarget.style.display = 'none';
    this.mainTarget.style.display = 'flex';
    this.displayNameTarget.textContent = this.user.username;
    this.avatarTarget.textContent = this.user.username.charAt(0).toUpperCase();
  }

  sendMessage() {
    const content = this.inputTarget.value.trim();
    if (!content || !this.user) return;
    const msg = {
      _id: Date.now().toString(36),
      content,
      senderName: this.user.username,
      createdAt: new Date().toISOString()
    };
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML = `<div class="msg-av">${this.user.username.charAt(0).toUpperCase()}</div>
      <div class="msg-body">
        <div class="msg-head"><span>${this.user.username}</span> <span class="msg-time">${new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</span></div>
        <div class="msg-text">${content}</div>
      </div>`;
    this.messagesTarget.appendChild(div);
    this.messagesTarget.scrollTop = this.messagesTarget.scrollHeight;
    this.inputTarget.value = '';
  }

  toggleSidebar() {
    this.sidebarTarget.classList.toggle('open');
  }
}

const app = Stimulus.Application.start();
app.register('app', AppController);
console.log('✅ Stimulus başlatıldı');
