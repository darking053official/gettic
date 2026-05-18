// ============ GETTIC CHANNELS.JS - FULL GÜNCEL ============

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
      <div class="ch-cat">
        ${cat}
        ${isAdmin ? `<button onclick="openModal('addChannel')" title="Kanal Ekle">+</button>` : ''}
      </div>
      ${catChannels.map(ch => `
        <div class="ch-item ${ch.id === Store.activeChannel ? 'act' : ''}" 
             onclick="switchChannel('${ch.id}')"
             title="${ch.topic || ch.name}">
          <span class="ch-icon">${ch.type === 'voice' ? '🔊' : ch.type === 'forum' ? '📋' : ch.type === 'stage' ? '🎙️' : '#'}</span>
          <span class="ch-name">${ch.name}</span>
          ${ch.type === 'voice' ? `<span class="ch-acts"><button onclick="event.stopPropagation();joinVoice('${ch.id}')" title="Katıl">🎤</button></span>` : ''}
          ${isAdmin && ch.id !== 'genel-sohbet' ? 
            `<span class="ch-acts"><button onclick="event.stopPropagation();deleteChannel('${ch.id}')" title="Kanalı Sil" style="color:var(--re)">×</button></span>` : ''}
        </div>
      `).join('')}
    `;
  }).join('');
  
  // Kanal adını güncelle
  const chName = document.getElementById('channelName');
  if (chName) {
    const activeCh = channels.find(c => c.id === Store.activeChannel);
    chName.textContent = activeCh ? activeCh.name : Store.activeChannel;
  }
  
  // Yetkiye göre butonları göster/gizle
  const addCatBtn = document.getElementById('addCategoryBtn');
  const addChBtn = document.getElementById('addChannelSidebarBtn');
  if (addCatBtn) addCatBtn.style.display = isAdmin ? '' : 'none';
  if (addChBtn) addChBtn.style.display = isAdmin ? '' : 'none';
}

// Kanala geçiş yap
function switchChannel(chId) {
  if (!chId) return;
  
  // Mevcut kanal mesajlarını kaydet
  if (typeof saveStore === 'function') saveStore();
  
  Store.activeChannel = chId;
  Store.messages = [];
  Store.polls = {};
  
  localStorage.setItem('gt_activeChannel', chId);
  
  // MongoDB'den mesajları yükle
  if (typeof MongoSync !== 'undefined' && MongoSync.syncCurrentChannel) {
    MongoSync.syncCurrentChannel();
  }
  
  renderMessages();
  renderChannels();
  
  if (window._socket) {
    window._socket.emit('join_channel', chId);
  }
  
  // URL'i güncelle
  if (typeof navigateTo === 'function') {
    navigateTo('/server/gettic/chat/' + chId);
  }
  
  // Sidebar'ı kapat (mobil)
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
  
  if ((Store.channels || []).find(c => c.id === id)) {
    return toast('Bu kanal zaten var', 'e');
  }
  
  const newChannel = {
    id,
    name: name.trim(),
    type: type || 'text',
    category: category || 'METİN',
    topic: '',
    serverId: 'gettic',
    createdBy: Store.user?._id,
    createdAt: new Date().toISOString()
  };
  
  if (!Store.channels) Store.channels = [];
  Store.channels.push(newChannel);
  
  if (!Store.categories.includes(category)) {
    Store.categories.push(category);
  }
  
  // MongoDB'ye kaydet
  if (typeof MongoSync !== 'undefined' && MongoSync.saveChannel) {
    MongoSync.saveChannel(newChannel);
  }
  
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  
  toast('✅ #' + name + ' kanalı oluşturuldu');
  closeModal();
  
  // Yeni kanala geç
  switchChannel(id);
}

// Kanal sil
function deleteChannel(chId) {
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('❌ Yetkiniz yok', 'e');
  if (chId === 'genel-sohbet') return toast('Genel sohbet kanalı silinemez', 'e');
  
  const ch = (Store.channels || []).find(c => c.id === chId);
  if (!ch) return;
  
  if (!confirm(`"${ch.name}" kanalını silmek istediğine emin misin?`)) return;
  
  Store.channels = Store.channels.filter(c => c.id !== chId);
  
  // MongoDB'den sil
  if (typeof MongoSync !== 'undefined' && MongoSync.deleteChannel) {
    MongoSync.deleteChannel(chId);
  }
  
  // Aktif kanalsa genel sohbete geç
  if (Store.activeChannel === chId) {
    Store.activeChannel = 'genel-sohbet';
    switchChannel('genel-sohbet');
  }
  
  renderChannels();
  renderMessages();
  if (typeof saveStore === 'function') saveStore();
  
  toast('🗑️ ' + ch.name + ' kanalı silindi');
}

// Kanal düzenle
function editChannel(chId, updates) {
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('❌ Yetkiniz yok', 'e');
  
  const ch = (Store.channels || []).find(c => c.id === chId);
  if (!ch) return;
  
  if (updates.name) ch.name = updates.name;
  if (updates.topic !== undefined) ch.topic = updates.topic;
  if (updates.type) ch.type = updates.type;
  if (updates.category) {
    if (!Store.categories.includes(updates.category)) {
      Store.categories.push(updates.category);
    }
    ch.category = updates.category;
  }
  
  // MongoDB'de güncelle
  if (typeof MongoSync !== 'undefined' && MongoSync.saveChannel) {
    MongoSync.saveChannel(ch);
  }
  
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('✅ Kanal güncellendi');
}

// Kategori oluştur
function createCategory(name) {
  if (!name || !name.trim()) return toast('Kategori adı gerekli', 'e');
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

// Kategori sil
function deleteCategory(cat) {
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('❌ Yetkiniz yok', 'e');
  if (cat === 'METİN' || cat === 'SES') return toast('Varsayılan kategori silinemez', 'e');
  
  const channelsInCat = (Store.channels || []).filter(c => c.category === cat);
  if (channelsInCat.length > 0) return toast('Önce kategorideki kanalları silin', 'e');
  
  Store.categories = Store.categories.filter(c => c !== cat);
  
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
  toast('🗑️ ' + cat + ' kategorisi silindi');
}

// Kanal sıralaması
function moveChannel(chId, direction) {
  const idx = (Store.channels || []).findIndex(c => c.id === chId);
  if (idx === -1) return;
  
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= Store.channels.length) return;
  
  [Store.channels[idx], Store.channels[newIdx]] = [Store.channels[newIdx], Store.channels[idx]];
  
  renderChannels();
  if (typeof saveStore === 'function') saveStore();
}

// Stage kanalı oluştur
function createStageChannel(name, topic) {
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('❌ Yetkiniz yok', 'e');
  createChannel(name, 'stage', 'STAGE');
  
  if (topic) {
    const ch = Store.channels.find(c => c.name === name);
    if (ch) {
      ch.topic = topic;
      if (typeof MongoSync !== 'undefined' && MongoSync.saveChannel) {
        MongoSync.saveChannel(ch);
      }
    }
  }
}

// Forum kanalı oluştur
function createForumChannel(name) {
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('❌ Yetkiniz yok', 'e');
  createChannel(name, 'forum', 'FORUM');
}

// Sayfa yüklendiğinde kanalları MongoDB'den çek
document.addEventListener('DOMContentLoaded', () => {
  if (Store.token && typeof MongoSync !== 'undefined') {
    setTimeout(async () => {
      const channels = await MongoSync.loadChannels();
      if (channels && channels.length > 0) {
        Store.channels = channels;
        renderChannels();
      }
    }, 2000);
  }
});

console.log('✅ Channels.js yüklendi');
