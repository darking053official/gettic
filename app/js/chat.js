async function sendMessage() {
  if (!store.input.trim() || !store.user) return;
  const msg = {
    _id: genId(),
    content: store.input.trim(),
    senderName: store.user.username,
    senderId: store.user._id,
    channelId: store.activeChannel.id,
    createdAt: new Date().toISOString()
  };
  store.messages.push(msg);
  store.input = '';
  
  if (socket) socket.emit('send_message', msg);
}

function deleteMessage(mid) {
  store.messages = store.messages.filter(m => m._id !== mid);
  toast('Silindi');
}
