// ╔══════════════════════════════════════════════════════════════════╗
// ║              GETTIC CHANNELS.JS - SVG İKONLU FINAL               ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function chIcon(name) {
  return window.Icons?.[name] ? Icons[name] : '';
}

// Kanal listesini render et
function renderChannels() {
  const el = document.getElementById('channelList');
  if (!el) return;
  
  const channels = Store.channels || [];
  const categories = Store.categories || ['METIN', 'SES'];
  const isAdmin = hasPermission(Store.user?._id, 'manageChannels');
  
  el.innerHTML = categories.map(cat => {
    const catChannels = channels.filter(ch => ch.category === cat);
    if (catChannels.length === 0 && !isAdmin) return '';
    
    return `
      <div class="ch-cat">${cat} ${isAdmin ? `<button onclick="openModal('addChannel')" title="Kanal Ekle" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:14px;padding:0 4px">+</button>` : ''}</div>
      ${catChannels.map(ch => `
        <div class="ch-item ${ch.id === Store.activeChannel ? 'act' : ''}" onclick="switchChannel('${ch.id}')" title="${escapeHtml(ch.topic || ch.name)}">
          <span class="ch-icon">${ch.type === 'voice' ? chIcon('mic') : ch.type === 'forum' ? chIcon('message-square') : chIcon('hash')}</span>
          <span class="ch-name">${escapeHtml(ch.name)}</span>
          ${ch.type === 'voice' ? `<span class="ch-acts"><button onclick="event.stopPropagation();joinVoice('${ch.id}')" title="Katil" style="background:none;border:none;cursor:pointer;padding:0 4px">${chIcon('phone')}</button></span>` : ''}
          ${isAdmin && ch.id !== 'genel-sohbet' ? `<span class="ch-acts"><button onclick="event.stopPropagation();deleteChannel('${ch.id}')" title="Kanal Sil" style="background:none;border:none;cursor:pointer;color:var(--re);padding:0 4px;font-size:16px">${chIcon('x')}</button></span>` : ''}
        </div>`).join('')}
    `;
  }).join('');
  
  // Kanal adını güncelle
  const chName = document.getElementById('channelName');
  if (chName) {
    const activeCh = channels.find(c => c.id === Store.activeChannel);
    chName.textContent = activeCh ? activeCh.name : Store.activeChannel;
  }
  
  // Yetki butonları
  const addCatBtn = document.getElementById('addCategoryBtn');
  const addChBtn = document.getElementById('addChannelSidebarBtn');
  if (addCatBtn) addCatBtn.style.display = isAdmin ? '' : 'none';
  if (addChBtn) addChBtn.style.display = isAdmin ? '' : 'none';
}

// Kanala geçiş yap
function switchChannel(chId) {
  if (!chId) return;
  if (typeof saveStore === 'function') saveStore();
  
  Store.activeChannel = chId;
  Store.messages = [];
  Store.polls = {};
  localStorage.setItem('gt_activeChannel', chId);
  
  if (typeof MongoSync !== 'undefined' && MongoSync.syncCurrentChannel) {
    MongoSync.syncCurrentChannel();
  }
  
  if (typeof renderMessages === 'function') renderMessages();
  renderChannels();
  
  if (socket) {
    socket.emit('join_channel', chId);
  }
  
  if (typeof closeMobileSidebar === 'function') {
    closeMobileSidebar();
  }
}

// Kanal oluştur
function createChannel(name, type = 'text', category = 'METIN') {
  if (!name?.trim()) return toast('Kanal adi gerekli', 'e');
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('Yetkiniz yok', 'e');
  
  const id = name.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i')
    .replace(/ö/g,'o').replace(/ç/g,'c').replace(/ə/g,'e')
    .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  
  if ((Store.channels || []).find(c => c.id === id)) return toast('Bu kanal zaten var', 'e');
  
  const newChannel = {
    id, name: name.trim(), type: type || 'text', category: category || 'METIN',
    topic: '', serverId: 'gettic', createdBy: Store.user?._id, createdAt: new Date().toISOString()
  };
  
  if (!Store.channels) Store.channels = [];
  Store.channels.push(newChannel);
  if (!Store.categories.includes(category)) Store.categories.push(category);
  
  if (typeof MongoSync !== 'undefined' && MongoSync.saveChannel) MongoSync.saveChannel(newChannel);
  
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('# ' + name + ' kanali olusturuldu');
  closeModal();
  switchChannel(id);
}

// Kanal sil
function deleteChannel(chId) {
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('Yetkiniz yok', 'e');
  if (chId === 'genel-sohbet') return toast('Genel sohbet kanali silinemez', 'e');
  if (!confirm('Bu kanali silmek istediginize emin misiniz?')) return;
  
  Store.channels = Store.channels.filter(c => c.id !== chId);
  if (typeof MongoSync !== 'undefined' && MongoSync.deleteChannel) MongoSync.deleteChannel(chId);
  
  if (Store.activeChannel === chId) switchChannel('genel-sohbet');
  
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('Kanal silindi');
}

// Kategori oluştur
function createCategory(name) {
  if (!name?.trim()) return toast('Kategori adi gerekli', 'e');
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('Yetkiniz yok', 'e');
  
  const cat = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  if ((Store.categories || []).includes(cat)) return toast('Bu kategori zaten var', 'e');
  
  if (!Store.categories) Store.categories = ['METIN', 'SES'];
  Store.categories.push(cat);
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast(cat + ' kategorisi eklendi');
  closeModal();
}

// HTML escape
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

console.log('Channels.js yuklendi (SVG ikonlu)');
