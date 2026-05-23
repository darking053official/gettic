// =========== GETTIC CHANNELS.JS - FULL GÜNCEL ============

// Kanal listesini render et
function renderChannels() {
  const el = document.getElementById('channelList');
  if (!el) return;
  
  const channels = Store.channels || [];
  const categories = Store.categories || ['METİN', 'SES'];
  const isAdmin = hasPermission(Store.user?._id, 'manageChannels');
  
  el.innerHTML = categories.map(cat => {
    const catChannels = channels.filter(ch => ch.category === cat);
    if (catChannels.length === 0 && !isAdmin) return '';
    
    return `
      <div class="ch-cat">${cat} ${isAdmin ? `<button onclick="openModal('addChannel')" title="Kanal Ekle">+</button>` : ''}</div>
      ${catChannels.map(ch => `
        <div class="ch-item ${ch.id === Store.activeChannel ? 'act' : ''}" onclick="switchChannel('${ch.id}')" title="${ch.topic || ch.name}">
          <span class="ch-icon">${ch.type === 'voice' ? '🔊' : ch.type === 'forum' ? '📋' : ch.type === 'stage' ? '🎙️' : '#'}</span>
          <span class="ch-name">${ch.name}</span>
          ${ch.type === 'voice' ? `<span class="ch-acts"><button onclick="event.stopPropagation();joinVoice('${ch.id}')" title="Katıl">🎤</button></span>` : ''}
          ${isAdmin && ch.id !== 'genel-sohbet' ? `<span class="ch-acts"><button onclick="event.stopPropagation();deleteChannel('${ch.id}')" title="Kanalı Sil" style="color:var(--re)">×</button></span>` : ''}
        </div>`).join('')}
    `;
  }).join('');
  
  const chName = document.getElementById('channelName');
  if (chName) {
    const activeCh = channels.find(c => c.id === Store.activeChannel);
    chName.textContent = activeCh ? activeCh.name : Store.activeChannel;
  }
  
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
  
  renderMessages();
  renderChannels();
  
  if (socket) {
    socket.emit('join_channel', chId);
  }
  
  if (typeof closeMobileSidebar === 'function') {
    closeMobileSidebar();
  }
}

// Kanal oluştur
function createChannel(name, type = 'text', category = 'METİN') {
  if (!name || !name.trim()) return toast('Kanal adı gerekli', 'e');
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('❌ Yetkiniz yok', 'e');
  
  const id = name.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i')
    .replace(/ö/g,'o').replace(/ç/g,'c').replace(/ə/g,'e')
    .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  
  if ((Store.channels || []).find(c => c.id === id)) return toast('Bu kanal zaten var', 'e');
  
  const newChannel = {
    id, name: name.trim(), type: type || 'text', category: category || 'METİN',
    topic: '', serverId: 'gettic', createdBy: Store.user?._id, createdAt: new Date().toISOString()
  };
  
  if (!Store.channels) Store.channels = [];
  Store.channels.push(newChannel);
  if (!Store.categories.includes(category)) Store.categories.push(category);
  
  if (typeof MongoSync !== 'undefined' && MongoSync.saveChannel) MongoSync.saveChannel(newChannel);
  
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('✅ #' + name + ' kanalı oluşturuldu');
  closeModal();
  switchChannel(id);
}

// Kanal sil
function deleteChannel(chId) {
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('❌ Yetkiniz yok', 'e');
  if (chId === 'genel-sohbet') return toast('Genel sohbet kanalı silinemez', 'e');
  if (!confirm(`Bu kanalı silmek istediğine emin misin?`)) return;
  
  Store.channels = Store.channels.filter(c => c.id !== chId);
  if (typeof MongoSync !== 'undefined' && MongoSync.deleteChannel) MongoSync.deleteChannel(chId);
  
  if (Store.activeChannel === chId) switchChannel('genel-sohbet');
  
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('🗑️ Kanal silindi');
}

// Kategori oluştur
function createCategory(name) {
  if (!name?.trim()) return toast('Kategori adı gerekli', 'e');
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('❌ Yetkiniz yok', 'e');
  
  const cat = name.trim().toUpperCase();
  if ((Store.categories || []).includes(cat)) return toast('Bu kategori zaten var', 'e');
  
  if (!Store.categories) Store.categories = ['METİN', 'SES'];
  Store.categories.push(cat);
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('📁 ' + cat + ' kategorisi eklendi');
  closeModal();
}

console.log('✅ Channels.js yüklendi');
