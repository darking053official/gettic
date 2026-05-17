function createChannelElement(ch, isActive) {
  const div = document.createElement('div');
  div.className = 'ch-item' + (isActive ? ' act' : '');
  div.innerHTML = `<span class="ch-name"># ${ch.name}</span>`;
  return div;
}
