const dmStore = reactive({
  friends: JSON.parse(localStorage.getItem('gt_dm') || '[]'),
  activeDM: null,
  dmInput: '',
  messages: {}
});

function startDM(username) {
  if (!dmStore.friends.find(f => f.username === username)) {
    dmStore.friends.push({ id: genId(), username, last: '', time: 'Şimdi' });
    localStorage.setItem('gt_dm', JSON.stringify(dmStore.friends));
  }
  dmStore.activeDM = username;
  if (!dmStore.messages[username]) dmStore.messages[username] = [];
}

function sendDMMessage() {
  if (!dmStore.dmInput.trim() || !dmStore.activeDM) return;
  const msg = { sender: store.user.username, text: dmStore.dmInput.trim(), time: new Date().toISOString() };
  dmStore.messages[dmStore.activeDM].push(msg);
  const friend = dmStore.friends.find(f => f.username === dmStore.activeDM);
  if (friend) { friend.last = msg.text; friend.time = 'Şimdi'; }
  dmStore.dmInput = '';
  if (socket) socket.emit('dm_message', { to: dmStore.activeDM, text: msg.text });
}

function addFriend(username) {
  if (dmStore.friends.find(f => f.username === username)) return toast('Zaten arkadaş', 'e');
  dmStore.friends.push({ id: genId(), username, last: '', time: 'Şimdi' });
  localStorage.setItem('gt_dm', JSON.stringify(dmStore.friends));
  toast(username + ' eklendi');
}
