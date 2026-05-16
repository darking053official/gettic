function createChannel(name, type = 'text', cat = 'METİN') {
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  if (store.channels.find(c => c.id === id)) return toast('Bu kanal zaten var', 'e');
  store.channels.push({ id, name, type, category: cat });
  if (!store.categories.includes(cat)) store.categories.push(cat);
  toast(`# ${name} oluşturuldu`);
}

function deleteChannel(id) {
  store.channels = store.channels.filter(c => c.id !== id);
  if (store.activeChannel.id === id) {
    const first = store.channels.find(c => c.type === 'text');
    if (first) store.activeChannel = first;
  }
  toast('Kanal silindi');
}

function switchChannel(ch) {
  store.activeChannel = ch;
  store.messages = [];
  store.sidebarOpen = false;
  if (socket) socket.emit('join_channel', ch.id);
}
