const { createApp, ref, computed, onMounted, nextTick } = Vue;

const app = createApp({
  setup() {
    return { store, toast, doLogin, doRegister, logout, sendMessage, deleteMessage, genId };
  }
});

// Bileşenler
app.component('auth-box', {
  template: `
    <div class="auth-wrap">
      <div class="auth-box">
        <img src="https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png" class="auth-logo" alt="Gettic">
        <div class="auth-title">gettic</div>
        <div class="auth-sub">Türkçe sohbet platformu</div>
        <div class="auth-tabs">
          <button :class="['auth-tab', tab==='login'?'act':'']" @click="tab='login'">Giriş</button>
          <button :class="['auth-tab', tab==='register'?'act':'']" @click="tab='register'">Kayıt</button>
        </div>
        <input class="mi" v-model="username" placeholder="Kullanıcı adı" @keydown.enter="submit">
        <input class="mi" type="password" v-model="password" placeholder="Şifre" @keydown.enter="submit">
        <button class="mb" @click="submit">{{ tab === 'login' ? 'Giriş' : 'Kayıt' }}</button>
      </div>
    </div>
  `,
  data() { return { tab: 'login', username: '', password: '' }; },
  methods: {
    submit() {
      if (this.tab === 'login') doLogin(this.username, this.password);
      else doRegister(this.username, this.password);
    }
  }
});

app.component('chat-area', {
  template: `
    <main class="chat">
      <header class="chat-header">
        <span v-html="I.hash"></span>
        <div class="ch-hname"># {{ store.activeChannel.name }}</div>
        <div class="hacts">
          <button class="ib" @click="store.sidebarOpen=!store.sidebarOpen" v-html="I.hash"></button>
          <button class="ib" @click="logout" v-html="I.logout"></button>
        </div>
      </header>
      <div class="msgs">
        <div v-if="store.messages.length===0" class="empty-ch">
          <h4># {{ store.activeChannel.name }}</h4>
          <p>Henüz mesaj yok</p>
        </div>
        <div v-for="msg in store.messages" :key="msg._id" class="msg">
          <div class="msg-av">{{ msg.senderName?.charAt(0) }}</div>
          <div class="msg-body">
            <div class="msg-head">
              <span>{{ msg.senderName }}</span>
              <span class="msg-time"> {{ new Date(msg.createdAt).toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'}) }}</span>
            </div>
            <div class="msg-text" v-html="formatMsg(msg.content)"></div>
          </div>
        </div>
      </div>
      <div class="input-area">
        <button class="ib" @click="store.emojiOpen=!store.emojiOpen" v-html="I.smile"></button>
        <div v-if="store.emojiOpen" class="epop show">
          <div class="egrid">
            <span v-for="e in ['😀','😂','❤️','👍','🔥','🎉']" :key="e" class="es" @click="store.input+=e;store.emojiOpen=false">{{ e }}</span>
          </div>
        </div>
        <textarea class="msg-inp" placeholder="Mesaj yaz..." v-model="store.input" @keydown.enter.exact.prevent="sendMessage" rows="1"></textarea>
        <button class="ib" style="background:var(--gr)" @click="sendMessage" v-html="I.send"></button>
      </div>
    </main>
  `,
  setup() {
    const I = {
      hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="9" x2="20" y2="9"/></svg>',
      send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="22" y1="2" x2="11" y2="13"/></svg>',
      smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>',
      logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5"/></svg>'
    };
    return { I, store, sendMessage, logout, formatMsg };
  }
});

// Socket.io
let socket;
onMounted(() => {
  if (store.token) {
    socket = io(API, { auth: { token: store.token } });
    socket.on('connect', () => socket.emit('join_channel', store.activeChannel.id));
    socket.on('new_message', (msg) => {
      if (msg.channelId === store.activeChannel.id) {
        store.messages.push(msg);
        if (store.messages.length > MAX_MSGS) store.messages.shift();
      }
    });
  }
  
  nextTick(() => {
    const ls = document.getElementById('ls');
    if (ls) ls.classList.add('hide');
  });
});

function formatMsg(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
}

app.mount('#root');
window.app = app;
