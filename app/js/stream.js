// ============ GETTIC STREAM.JS - STREAM ENTEGRASYONU ============

const streamState = {
  activeStreams: {},
  streamKey: null,
  isLive: false,
  viewers: 0,
  chatEnabled: true,
  overlayUrl: '',
  alerts: {
    follow: true,
    subscribe: true,
    donation: true,
    raid: true
  }
};

// Stream başlat
function startStream(title, game = 'Sohbet') {
  if (!hasPermission(Store.user?._id, 'stream')) return toast('❌ Yetkiniz yok', 'e');
  if (streamState.isLive) return toast('Zaten yayındasın', 'e');
  
  streamState.isLive = true;
  streamState.streamKey = genId();
  
  const stream = {
    id: genId(),
    title: title || Store.user?.username + ' yayını',
    game,
    streamerId: Store.user._id,
    streamerName: Store.user.username,
    startedAt: new Date().toISOString(),
    viewers: 0,
    peakViewers: 0,
    chatMessages: [],
    isLive: true,
    thumbnail: '',
    tags: ['Türkçe', 'Sohbet'],
    language: 'tr'
  };
  
  streamState.activeStreams[stream.id] = stream;
  
  // Yayın mesajı
  const msg = {
    _id: genId(),
    content: `🔴 **YAYIN BAŞLADI:** ${stream.title}\n🎮 ${stream.game}\n👤 ${Store.user.username}`,
    senderName: '📡 Yayın',
    senderId: 'system',
    channelId: Store.activeChannel,
    createdAt: new Date().toISOString(),
    streamId: stream.id
  };
  
  Store.messages.push(msg);
  if (typeof renderMessages === 'function') renderMessages();
  
  showStreamPanel(stream.id);
  updateStreamStatus();
  
  toast('🔴 Yayın başladı!');
  return stream.id;
}

// Stream durdur
function stopStream(streamId) {
  const stream = streamState.activeStreams[streamId];
  if (!stream) return;
  
  stream.isLive = false;
  stream.endedAt = new Date().toISOString();
  
  const duration = Math.floor((new Date(stream.endedAt) - new Date(stream.startedAt)) / 1000);
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  
  // Bitiş mesajı
  const msg = {
    _id: genId(),
    content: `⚫ **Yayın bitti:** ${stream.title}\n⏱️ Süre: ${hours > 0 ? hours + 'sa ' : ''}${minutes}dk\n👁️ ${stream.peakViewers} izleyici`,
    senderName: '📡 Yayın',
    senderId: 'system',
    channelId: Store.activeChannel,
    createdAt: new Date().toISOString()
  };
  
  Store.messages.push(msg);
  if (typeof renderMessages === 'function') renderMessages();
  
  streamState.isLive = false;
  hideStreamPanel();
  updateStreamStatus();
  
  toast('⚫ Yayın bitti');
}

// Stream izle
function watchStream(streamId) {
  const stream = streamState.activeStreams[streamId];
  if (!stream || !stream.isLive) return toast('Yayın aktif değil', 'e');
  
  const messagesEl = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  
  if (channelName) channelName.textContent = '🔴 ' + stream.title;
  
  if (messagesEl) {
    messagesEl.innerHTML = `
      <div class="stream-container">
        <div class="stream-player" style="background:var(--bg2);border-radius:12px;padding:40px;text-align:center;margin-bottom:16px;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:48px;margin-bottom:12px">🔴</div>
          <h3 style="margin-bottom:8px">${stream.title}</h3>
          <p style="color:var(--t3);margin-bottom:4px">🎮 ${stream.game}</p>
          <p style="color:var(--t3);margin-bottom:4px">👤 ${stream.streamerName}</p>
          <p style="color:var(--t3);margin-bottom:4px">👁️ ${stream.viewers} izleyici</p>
          <p style="color:var(--t3);font-size:11px">⏱️ ${getStreamDuration(stream.startedAt)}</p>
          
          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="mb" onclick="sendStreamReaction('👏')">👏</button>
            <button class="mb sec" onclick="sendStreamReaction('🔥')">🔥</button>
            <button class="mb sec" onclick="sendStreamReaction('😂')">😂</button>
            <button class="mb sec" onclick="sendStreamReaction('❤️')">❤️</button>
          </div>
        </div>
        
        <div class="stream-chat" id="streamChat" style="max-height:300px;overflow-y:auto">
          ${stream.chatMessages.length === 0 ? 
            '<p style="color:var(--t3);text-align:center;padding:20px">Henüz mesaj yok</p>' :
            stream.chatMessages.slice(-30).map(m => `
              <div class="msg" style="padding:4px 0">
                <span style="font-weight:700;font-size:11px">${m.sender}</span>
                <span style="font-size:11px;margin-left:4px">${m.type === 'reaction' ? m.content : m.content}</span>
                <span style="font-size:9px;color:var(--t3);margin-left:4px">${formatTime(m.time)}</span>
              </div>
            `).join('')
          }
        </div>
        
        <div class="input-area" style="margin-top:8px">
          <textarea class="msg-inp" id="streamChatInput" placeholder="Yayın sohbeti..." rows="1"></textarea>
          <button class="ib" style="background:var(--gr)" onclick="sendStreamMessage('${streamId}')">➤</button>
        </div>
      </div>
    `;
    
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  // İzleyici ekle
  stream.viewers++;
  if (stream.viewers > stream.peakViewers) stream.peakViewers = stream.viewers;
  
  // Sayfadan ayrılınca izleyici düş
  window.addEventListener('beforeunload', () => {
    stream.viewers = Math.max(0, stream.viewers - 1);
  }, { once: true });
}

// Stream sohbet mesajı
function sendStreamMessage(streamId) {
  const input = document.getElementById('streamChatInput');
  const stream = streamState.activeStreams[streamId];
  if (!input?.value.trim() || !stream) return;
  
  stream.chatMessages.push({
    sender: Store.user?.username || 'İzleyici',
    content: input.value.trim(),
    type: 'message',
    time: new Date().toISOString()
  });
  
  input.value = '';
  
  // Sohbeti güncelle
  const chatEl = document.getElementById('streamChat');
  if (chatEl) {
    const msg = stream.chatMessages[stream.chatMessages.length - 1];
    chatEl.innerHTML += `
      <div class="msg" style="padding:4px 0">
        <span style="font-weight:700;font-size:11px">${msg.sender}</span>
        <span style="font-size:11px;margin-left:4px">${msg.content}</span>
      </div>
    `;
    chatEl.scrollTop = chatEl.scrollHeight;
  }
}

// Stream tepki
function sendStreamReaction(emoji) {
  const streamId = Object.keys(streamState.activeStreams)[0];
  if (!streamId) return;
  
  const stream = streamState.activeStreams[streamId];
  stream.chatMessages.push({
    sender: Store.user?.username || 'İzleyici',
    content: emoji,
    type: 'reaction',
    time: new Date().toISOString()
  });
  
  // Sohbeti güncelle
  const chatEl = document.getElementById('streamChat');
  if (chatEl) {
    const msg = stream.chatMessages[stream.chatMessages.length - 1];
    chatEl.innerHTML += `
      <div class="msg" style="padding:4px 0">
        <span style="font-weight:700;font-size:11px">${msg.sender}</span>
        <span style="font-size:16px;margin-left:4px">${msg.content}</span>
      </div>
    `;
    chatEl.scrollTop = chatEl.scrollHeight;
  }
}

// Stream panel
function showStreamPanel(streamId) {
  let panel = document.getElementById('streamPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'streamPanel';
    panel.className = 'stream-panel';
    panel.innerHTML = `
      <div class="stream-panel-header">
        <span class="stream-live-dot">🔴</span>
        <span id="streamPanelTitle">Yayında</span>
      </div>
      <div class="stream-panel-info">
        <div id="streamPanelViewers">👁️ 0</div>
        <div id="streamPanelDuration">00:00</div>
      </div>
      <div class="stream-panel-controls">
        <button onclick="stopStream('${streamId}')" style="background:var(--re);color:#fff;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px">⏹️ Yayını Kapat</button>
      </div>
    `;
    document.body.appendChild(panel);
  }
  
  panel.style.display = 'flex';
  
  // Süre güncelleme
  const stream = streamState.activeStreams[streamId];
  if (stream) {
    setInterval(() => {
      document.getElementById('streamPanelViewers').textContent = '👁️ ' + stream.viewers;
      document.getElementById('streamPanelDuration').textContent = getStreamDuration(stream.startedAt);
    }, 1000);
  }
}

function hideStreamPanel() {
  const panel = document.getElementById('streamPanel');
  if (panel) panel.style.display = 'none';
}

// Stream durum güncelleme
function updateStreamStatus() {
  const statusEl = document.getElementById('streamStatus');
  if (statusEl) {
    statusEl.textContent = streamState.isLive ? '🔴 CANLI' : '';
    statusEl.style.display = streamState.isLive ? 'block' : 'none';
  }
}

// OBS/Streamlabs overlay URL
function getStreamOverlayUrl() {
  const streamId = Object.keys(streamState.activeStreams)[0];
  return streamId ? `${API}/stream/overlay/${streamId}` : '';
}

// Stream ayarları
function showStreamSettings() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>📡 Yayın Ayarları</h2>
    
    <div class="settings-group">
      <div class="settings-group-title">Genel</div>
      <div class="settings-item" onclick="editStreamKey()">
        <div class="settings-item-left">🔑 Yayın Anahtarı</div>
        <div class="settings-item-right">${streamState.streamKey ? '****' + streamState.streamKey.slice(-4) : 'Yok'}</div>
      </div>
      <div class="settings-item">
        <div class="settings-item-left">🔗 Overlay URL</div>
        <div class="settings-item-right">
          <code style="font-size:9px">${getStreamOverlayUrl()}</code>
          <button class="ib" onclick="copyOverlayUrl()" style="width:20px;height:20px">📋</button>
        </div>
      </div>
    </div>
    
    <div class="settings-group">
      <div class="settings-group-title">Bildirimler</div>
      <div class="settings-item" onclick="toggleStreamAlert('follow')">
        <div class="settings-item-left">👤 Takip</div>
        <div class="settings-item-right"><div class="toggle ${streamState.alerts.follow?'on':''}"></div></div>
      </div>
      <div class="settings-item" onclick="toggleStreamAlert('subscribe')">
        <div class="settings-item-left">⭐ Abone</div>
        <div class="settings-item-right"><div class="toggle ${streamState.alerts.subscribe?'on':''}"></div></div>
      </div>
      <div class="settings-item" onclick="toggleStreamAlert('donation')">
        <div class="settings-item-left">💸 Bağış</div>
        <div class="settings-item-right"><div class="toggle ${streamState.alerts.donation?'on':''}"></div></div>
      </div>
    </div>
  `;
  
  openModal('streamSettings');
}

// Yardımcı fonksiyonlar
function getStreamDuration(startTime) {
  const diff = Math.floor((Date.now() - new Date(startTime)) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function editStreamKey() {
  const key = prompt('Yeni yayın anahtarı (boş = rastgele):');
  streamState.streamKey = key?.trim() || genId();
  toast('✅ Yayın anahtarı güncellendi');
}

function copyOverlayUrl() {
  navigator.clipboard.writeText(getStreamOverlayUrl()).then(() => toast('📋 Kopyalandı'));
}

function toggleStreamAlert(type) {
  streamState.alerts[type] = !streamState.alerts[type];
  showStreamSettings();
}

// CSS
const streamStyle = document.createElement('style');
streamStyle.textContent = `
  .stream-panel {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg1);
    border: 1px solid var(--b2);
    border-radius: 12px;
    padding: 10px 16px;
    z-index: 150;
    display: none;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 4px 20px rgba(0,0,0,.3);
    min-width: 220px;
  }
  .stream-panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .stream-live-dot {
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .stream-panel-info {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: var(--t3);
  }
  .stream-panel-controls {
    display: flex;
    justify-content: center;
    margin-top: 4px;
  }
  .stream-container {
    padding: 10px;
  }
  .stream-player {
    position: relative;
  }
  .stream-player::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px solid var(--re);
    border-radius: 12px;
    animation: streamGlow 2s infinite;
    pointer-events: none;
  }
  @keyframes streamGlow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
`;
document.head.appendChild(streamStyle);

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('streamBtn');
  if (btn) btn.onclick = () => {
    if (streamState.isLive) {
      const streamId = Object.keys(streamState.activeStreams)[0];
      watchStream(streamId);
    } else {
      showStreamSettings();
    }
  };
  
  // Yayın başlatma butonu (sidebar'da)
  document.addEventListener('click', (e) => {
    if (e.target.id === 'startStreamBtn') {
      const title = prompt('Yayın başlığı:', Store.user?.username + ' yayını');
      if (title) startStream(title);
    }
  });
});
