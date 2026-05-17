function renderChannels() {
  const el = document.getElementById('channelList');
  if (!el) return;
  
  el.innerHTML = Store.categories.map(cat => `
    <div class="ch-cat">
      ${cat} 
      <button onclick="openModal('addChannel')" title="Kanal Ekle">+</button>
    </div>
    ${Store.channels.filter(ch => ch.category === cat).map(ch => `
      <div class="ch-item ${ch.id === Store.activeChannel ? 'act' : ''}" 
           onclick="switchChannel('${ch.id}')"
           title="${ch.topic || ch.name}">
        <span>${ch.type === 'voice' ? '🔊' : ch.type === 'forum' ? '📋' : '#'}</span>
        <span class="ch-name">${ch.name}</span>
        ${ch.type === 'voice' ? '<span class="ch-acts"><button onclick="event.stopPropagation();joinVoice(\''+ch.id+'\')">🎤</button></span>' : ''}
        ${ch.id !== 'genel-sohbet' && ch.id !== 'genel-ses' ? '<span class="ch-acts"><button onclick="event.stopPropagation();deleteChannel(\''+ch.id+'\')" style="color:var(--re)">×</button></span>' : ''}
      </div>
    `).join('')}
  `).join('');
  
  // Kanal adını güncelle
  const chName = document.getElementById('channelName');
  if (chName) {
    const activeCh = Store.channels.find(c => c.id === Store.activeChannel);
    chName.textContent = activeCh ? activeCh.name : Store.activeChannel;
  }
}

function switchChannel(chId) {
  // Mevcut kanal mesajlarını kaydet
  saveStore();
  
  Store.activeChannel = chId;
  Store.messages = [];
  Store.polls = {};
  
  // localStorage'dan bu kanala ait mesajları yükle
  const saved = localStorage.getItem('gt_messages_' + chId);
  if (saved) {
    try { Store.messages = JSON.parse(saved); } catch(e) {}
  }
  
  localStorage.setItem('gt_activeChannel', chId);
  renderMessages();
  renderChannels();
  
  if (window._socket) {
    window._socket.emit('leave_channel', Store.activeChannel);
    window._socket.emit('join_channel', chId);
  }
}

function createChannel(name, type, cat) {
  if (!name || !name.trim()) return toast('Kanal adı gerekli', 'e');
  
  const id = name.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i')
    .replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  
  if (Store.channels.find(c => c.id === id)) return toast('Bu kanal zaten var', 'e');
  
  Store.channels.push({ 
    id, 
    name: name.trim(), 
    type: type || 'text', 
    category: cat || 'METİN',
    topic: '',
    createdAt: new Date().toISOString()
  });
  
  if (!Store.categories.includes(cat || 'METİN')) {
    Store.categories.push(cat || 'METİN');
  }
  
  renderChannels();
  saveStore();
  toast(`✅ # ${name} kanalı oluşturuldu`);
  closeModal();
}

function deleteChannel(chId) {
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('Yetkiniz yok', 'e');
  
  const ch = Store.channels.find(c => c.id === chId);
  if (!ch) return;
  if (chId === 'genel-sohbet') return toast('Genel sohbet kanalı silinemez', 'e');
  
  if (!confirm(`"${ch.name}" kanalını silmek istediğine emin misin?`)) return;
  
  Store.channels = Store.channels.filter(c => c.id !== chId);
  localStorage.removeItem('gt_messages_' + chId);
  
  if (Store.activeChannel === chId) {
    Store.activeChannel = 'genel-sohbet';
    Store.messages = [];
    const saved = localStorage.getItem('gt_messages_genel-sohbet');
    if (saved) { try { Store.messages = JSON.parse(saved); } catch(e) {} }
  }
  
  renderChannels();
  renderMessages();
  saveStore();
  toast(`🗑️ ${ch.name} kanalı silindi`);
}

function createCategory(name) {
  if (!name || !name.trim()) return toast('Kategori adı gerekli', 'e');
  const cat = name.trim().toUpperCase();
  if (Store.categories.includes(cat)) return toast('Bu kategori zaten var', 'e');
  Store.categories.push(cat);
  renderChannels();
  saveStore();
  toast(`📁 ${cat} kategorisi eklendi`);
  closeModal();
}

function deleteCategory(cat) {
  if (cat === 'METİN' || cat === 'SES') return toast('Varsayılan kategori silinemez', 'e');
  const channelsInCat = Store.channels.filter(c => c.category === cat);
  if (channelsInCat.length > 0) return toast('Önce kategorideki kanalları silin', 'e');
  Store.categories = Store.categories.filter(c => c !== cat);
  renderChannels();
  saveStore();
  toast(`🗑️ ${cat} kategorisi silindi`);
}

function editChannel(chId, updates) {
  const ch = Store.channels.find(c => c.id === chId);
  if (!ch) return;
  if (updates.name) ch.name = updates.name;
  if (updates.topic !== undefined) ch.topic = updates.topic;
  if (updates.type) ch.type = updates.type;
  if (updates.category) {
    if (!Store.categories.includes(updates.category)) Store.categories.push(updates.category);
    ch.category = updates.category;
  }
  renderChannels();
  saveStore();
  toast('✅ Kanal güncellendi');
}

// Kanal sıralaması
function moveChannel(chId, direction) {
  const idx = Store.channels.findIndex(c => c.id === chId);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= Store.channels.length) return;
  [Store.channels[idx], Store.channels[newIdx]] = [Store.channels[newIdx], Store.channels[idx]];
  renderChannels();
  saveStore();
                               }
