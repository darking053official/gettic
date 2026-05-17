function createChannelElement(ch, isActive) {
  const div = document.createElement('div');
  div.className = 'ch-item' + (isActive ? ' act' : '');
  div.innerHTML = `<span class="ch-name"># ${ch.name}</span>`;
  div.onclick = () => switchChannel(ch.id);
  return div;
}

function switchChannel(channelId) {
  const msgs = document.querySelector('[data-app-target="messages"]');
  if (msgs) msgs.innerHTML = '<div class="empty-ch"><h4># ' + channelId + '</h4><p>Henüz mesaj yok</p></div>';
}
