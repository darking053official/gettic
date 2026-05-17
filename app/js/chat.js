function formatTime(d) {
  try { return new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
  catch(e) { return ''; }
}

function formatMsg(t) {
  if (!t) return '';
  return t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
}

function createMessageElement(msg, isOwn) {
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = `
    <div class="msg-av">${msg.senderName?.charAt(0)?.toUpperCase() || '?'}</div>
    <div class="msg-body">
      <div class="msg-head">
        <span>${msg.senderName || '?'}</span>
        <span class="msg-time">${formatTime(msg.createdAt)}</span>
      </div>
      <div class="msg-text">${formatMsg(msg.content)}</div>
    </div>
  `;
  return div;
}
