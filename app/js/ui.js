function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${type||'s'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

function openModal(type) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  modal.classList.remove('hidden');
  modal.classList.add('show');
  
  switch(type) {
    case 'addChannel':
      content.innerHTML = `<h2>Kanal Oluştur</h2><input class="mi" id="modalChName" placeholder="Kanal adı"><button class="mb" onclick="createChannel(document.getElementById('modalChName').value,'text','METİN')">Oluştur</button>`;
      break;
    case 'addFriend':
      content.innerHTML = `<h2>Arkadaş Ekle</h2><input class="mi" id="modalFrName" placeholder="Kullanıcı adı"><button class="mb" onclick="addFriend(document.getElementById('modalFrName').value)">Ekle</button>`;
      break;
    case 'theme':
      content.innerHTML = `<h2>Tema</h2><div class="color-row">${['#c94d8c','#6366f1','#22c55e','#f59e0b','#ec4899','#3b82f6'].map(c => `<div class="color-swatch" style="background:${c}" onclick="setTheme('${c}')"></div>`).join('')}</div>`;
      break;
    case 'poll':
      content.innerHTML = `<h2>Anket</h2><input class="mi" id="modalPollQ" placeholder="Soru"><input class="mi" id="modalPollO1" placeholder="Seçenek 1"><input class="mi" id="modalPollO2" placeholder="Seçenek 2"><button class="mb" onclick="createPoll(document.getElementById('modalPollQ').value,[document.getElementById('modalPollO1').value,document.getElementById('modalPollO2').value])">Başlat</button>`;
      break;
    case 'imageGen':
      content.innerHTML = `<h2>Görsel Oluştur</h2><input class="mi" id="modalImgPrompt" placeholder="Görsel açıklaması..."><button class="mb" onclick="generateImage(document.getElementById('modalImgPrompt').value)">Oluştur</button><img id="modalImgResult" style="width:100%;border-radius:12px;margin-top:12px">`;
      break;
    case 'dm':
      content.innerHTML = `<h2>DM</h2>${Store.dmFriends.length===0?'<p style="color:var(--t3)">Henüz DM yok</p>':Store.dmFriends.map(f=>`<div class="mitem" onclick="startDM('${f.username}')"><div class="mav">${f.username.charAt(0).toUpperCase()}</div><div class="minfo"><div class="mname">${f.username}</div><div class="msub">${f.last||'DM başlat'}</div></div></div>`).join('')}`;
      break;
    case 'profile':
      content.innerHTML = `<h2>${Store.user?.username}</h2><p>Profil yakında...</p>`;
      break;
    default:
      content.innerHTML = `<h2>${type}</h2><p>Yakında...</p>`;
  }
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('show'); }
}

function setTheme(color) {
  Store.theme = color;
  saveStore();
  document.querySelector('.app')?.style.setProperty('--ac', color);
  toast('Tema değiştirildi');
  closeModal();
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

function togglePanel() {
  document.getElementById('userPanel')?.classList.toggle('hidden');
}

async function generateImage(prompt) {
  if (!prompt || !prompt.trim()) return;
  toast('🎨 Görsel oluşturuluyor...');
  try {
    const res = await fetch(API + '/api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (data.image) {
      document.getElementById('modalImgResult').src = data.image;
      Store.messages.push({
        _id: genId(), content: '🎨 ' + prompt,
        senderName: Store.user.username, senderId: Store.user._id,
        channelId: Store.activeChannel, createdAt: new Date().toISOString(), image: data.image
      });
      renderMessages();
      toast('✅ Görsel oluşturuldu');
    } else toast('Görsel oluşturulamadı', 'e');
  } catch(e) { toast('Bağlantı hatası', 'e'); }
                                 }
