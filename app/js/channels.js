function renderChannels() {
  const el = document.getElementById('channelList');
  if (!el) return;
  
  el.innerHTML = Store.categories.map(cat => `
    <div class="ch-cat">${cat} <button onclick="openModal('addChannel')">+</button></div>
    ${Store.channels.filter(ch => ch.category === cat).map(ch => `
      <div class="ch-item ${ch.id === Store.activeChannel ? 'act' : ''}" onclick="switchChannel('${ch.id}')">
        <span>${ch.type === 'voice' ? '🔊' : '#'}</span>
        <span class="ch-name">${ch.name}</span>
      </div>
    `).join('')}
  `).join('');
  
  document.getElementById('channelName').textContent = Store.activeChannel;
}

function switchChannel(chId) {
  Store.activeChannel = chId;
  Store.messages = [];
  Store.polls = {};
  renderMessages();
  renderChannels();
  if (window._socket) window._socket.emit('join_channel', chId);
}

function createChannel(name, type, cat) {
  if (!name || !name.trim()) return;
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  if (Store.channels.find(c => c.id === id)) return toast('Bu kanal zaten var', 'e');
  Store.channels.push({ id, name: name.trim(), type: type || 'text', category: cat || 'METİN' });
  if (!Store.categories.includes(cat || 'METİN')) Store.categories.push(cat || 'METİN');
  renderChannels();
  saveStore();
  toast(`# ${name} oluşturuldu`);
  closeModal();
}
