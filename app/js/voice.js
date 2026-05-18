// ============ GETTIC VOICE.JS - GERÇEK SESLİ KANAL ============

let voiceState = {
  localStream: null,
  peerConnections: new Map(),
  remoteStreams: new Map(),
  audioElements: new Map(),
  isInVoice: false,
  activeChannelId: null,
  isMuted: false,
  isDeafened: false,
  isSpeaking: false,
  volume: 100,
  participants: new Map(),
  screenStream: null,
  isScreenSharing: false,
  pushToTalk: false,
  pushToTalkKey: 'Space'
};

// Ses kanalına katıl
async function joinVoice(channelId) {
  if (voiceState.isInVoice) {
    leaveVoice();
    await new Promise(r => setTimeout(r, 500));
  }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    voiceState.localStream = stream;
    voiceState.isInVoice = true;
    voiceState.activeChannelId = channelId;
    voiceState.isMuted = false;
    voiceState.isDeafened = false;
    
    // Ses seviyesi analizi
    setupAudioAnalyser(stream);
    
    // Peer connection oluştur
    const pc = createPeerConnection(channelId, stream);
    voiceState.peerConnections.set(channelId, pc);
    
    // Sunucuya bildir
    if (window._socket) {
      window._socket.emit('voice_join', { 
        channel: channelId,
        muted: false,
        deafened: false
      });
    }
    
    showVoicePanel(channelId);
    
    const channel = Store.channels?.find(c => c.id === channelId);
    toast('🔊 ' + (channel?.name || channelId) + ' kanalına katıldın');
    
    if (typeof navigateTo === 'function') {
      navigateTo('/server/gettic/voice/' + channelId);
    }
    
    return true;
  } catch(e) {
    if (e.name === 'NotAllowedError') toast('Mikrofon izni reddedildi', 'e');
    else if (e.name === 'NotFoundError') toast('Mikrofon bulunamadı', 'e');
    else toast('Ses başlatılamadı', 'e');
    return false;
  }
}

function createPeerConnection(channelId, stream) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  });
  
  // Lokal sesi ekle
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream);
  });
  
  // ICE adayı
  pc.onicecandidate = (e) => {
    if (e.candidate && window._socket) {
      window._socket.emit('voice_candidate', {
        candidate: e.candidate,
        channel: channelId
      });
    }
  };
  
  // Bağlantı durumu
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      removeParticipant(channelId);
    }
  };
  
  // Uzaktan ses
  pc.ontrack = (e) => {
    if (e.streams && e.streams[0]) {
      addRemoteStream(e.streams[0], channelId);
    }
  };
  
  return pc;
}

function addRemoteStream(stream, userId) {
  voiceState.remoteStreams.set(userId, stream);
  
  const audio = new Audio();
  audio.srcObject = stream;
  audio.autoplay = true;
  audio.volume = voiceState.isDeafened ? 0 : (voiceState.volume / 100);
  document.body.appendChild(audio);
  
  voiceState.audioElements.set(userId, audio);
  voiceState.participants.set(userId, {
    id: userId,
    username: userId,
    speaking: false,
    muted: false,
    deafened: false,
    joinedAt: new Date().toISOString()
  });
  
  updateParticipantList();
}

function removeParticipant(userId) {
  voiceState.remoteStreams.delete(userId);
  const audio = voiceState.audioElements.get(userId);
  if (audio) { audio.remove(); voiceState.audioElements.delete(userId); }
  voiceState.participants.delete(userId);
  updateParticipantList();
}

// Ses analizi
let audioContext = null;
let analyserNode = null;
let speakingInterval = null;

function setupAudioAnalyser(stream) {
  if (!stream) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  source.connect(analyserNode);
  
  checkSpeaking();
}

function checkSpeaking() {
  if (!analyserNode || !voiceState.isInVoice) {
    clearInterval(speakingInterval);
    return;
  }
  
  const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(dataArray);
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const isSpeaking = average > 30;
  
  if (isSpeaking !== voiceState.isSpeaking) {
    voiceState.isSpeaking = isSpeaking;
    updateVoicePanelButtons();
    if (window._socket) {
      window._socket.emit('voice_speaking', {
        channel: voiceState.activeChannelId,
        speaking: isSpeaking
      });
    }
  }
  
  requestAnimationFrame(checkSpeaking);
}

// Ses kontrol
function toggleMute() {
  if (!voiceState.localStream) return;
  voiceState.isMuted = !voiceState.isMuted;
  voiceState.localStream.getAudioTracks().forEach(t => t.enabled = !voiceState.isMuted);
  
  if (window._socket) {
    window._socket.emit('voice_mute', {
      channel: voiceState.activeChannelId,
      muted: voiceState.isMuted
    });
  }
  
  updateVoicePanelButtons();
  return voiceState.isMuted;
}

function toggleDeafen() {
  voiceState.isDeafened = !voiceState.isDeafened;
  voiceState.audioElements.forEach(audio => {
    audio.volume = voiceState.isDeafened ? 0 : (voiceState.volume / 100);
  });
  
  updateVoicePanelButtons();
}

function setVolume(vol) {
  voiceState.volume = Math.max(0, Math.min(200, vol));
  if (!voiceState.isDeafened) {
    voiceState.audioElements.forEach(audio => {
      audio.volume = voiceState.volume / 100;
    });
  }
}

// Ekran paylaşımı
async function startScreenShare() {
  try {
    voiceState.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    voiceState.isScreenSharing = true;
    
    const pc = voiceState.peerConnections.get(voiceState.activeChannelId);
    if (pc && voiceState.screenStream) {
      voiceState.screenStream.getTracks().forEach(track => {
        pc.addTrack(track, voiceState.screenStream);
      });
    }
    
    voiceState.screenStream.getVideoTracks()[0].onended = () => stopScreenShare();
    toast('🖥️ Ekran paylaşımı başladı');
  } catch(e) {
    toast('Ekran paylaşımı başlatılamadı', 'e');
  }
}

function stopScreenShare() {
  if (voiceState.screenStream) {
    voiceState.screenStream.getTracks().forEach(t => t.stop());
    voiceState.screenStream = null;
  }
  voiceState.isScreenSharing = false;
  toast('Ekran paylaşımı durduruldu');
}

// Ses kanalından ayrıl
function leaveVoice() {
  if (voiceState.localStream) {
    voiceState.localStream.getTracks().forEach(track => track.stop());
    voiceState.localStream = null;
  }
  
  voiceState.peerConnections.forEach(pc => pc.close());
  voiceState.peerConnections.clear();
  voiceState.audioElements.forEach(a => a.remove());
  voiceState.audioElements.clear();
  voiceState.remoteStreams.clear();
  voiceState.participants.clear();
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
    analyserNode = null;
  }
  
  voiceState.isInVoice = false;
  voiceState.activeChannelId = null;
  voiceState.isMuted = false;
  voiceState.isDeafened = false;
  voiceState.isSpeaking = false;
  voiceState.isScreenSharing = false;
  
  hideVoicePanel();
  
  if (window._socket) {
    window._socket.emit('voice_leave');
  }
  
  if (typeof navigateTo === 'function') {
    navigateTo('/');
  }
  
  toast('Ses kanalından ayrıldın');
}

// Ses paneli
function showVoicePanel(channelId) {
  let panel = document.getElementById('voicePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'voicePanel';
    panel.className = 'voice-panel';
    panel.innerHTML = `
      <div class="voice-panel-header">
        🔊 <span id="voiceChannelName">Sesli Kanal</span>
        <span id="voiceStatus" style="font-size:10px;color:var(--t3)">Bağlanıyor...</span>
      </div>
      <div class="voice-panel-controls">
        <button class="voice-btn" id="muteBtn" title="Mikrofon">🎤</button>
        <button class="voice-btn" id="deafenBtn" title="Sağır">🔇</button>
        <button class="voice-btn" id="screenShareBtn" title="Ekran Paylaş">🖥️</button>
        <button class="voice-btn danger" id="leaveVoiceBtn" title="Ayrıl">📴</button>
      </div>
      <div id="voiceParticipants" class="voice-participants" style="max-height:100px;overflow-y:auto;font-size:11px"></div>
    `;
    document.body.appendChild(panel);
    
    document.getElementById('muteBtn').onclick = toggleMute;
    document.getElementById('deafenBtn').onclick = toggleDeafen;
    document.getElementById('screenShareBtn').onclick = startScreenShare;
    document.getElementById('leaveVoiceBtn').onclick = leaveVoice;
  }
  
  panel.style.display = 'flex';
  document.getElementById('voiceChannelName').textContent = Store.channels?.find(c => c.id === channelId)?.name || 'Sesli Kanal';
  updateVoicePanelButtons();
  updateParticipantList();
}

function hideVoicePanel() {
  const panel = document.getElementById('voicePanel');
  if (panel) panel.style.display = 'none';
}

function updateVoicePanelButtons() {
  const muteBtn = document.getElementById('muteBtn');
  const deafenBtn = document.getElementById('deafenBtn');
  const statusEl = document.getElementById('voiceStatus');
  
  if (muteBtn) muteBtn.classList.toggle('active', voiceState.isMuted);
  if (deafenBtn) deafenBtn.classList.toggle('active', voiceState.isDeafened);
  if (statusEl) {
    if (voiceState.isDeafened) statusEl.textContent = '🔇 Sağır';
    else if (voiceState.isMuted) statusEl.textContent = '🔴 Susturuldu';
    else if (voiceState.isSpeaking) statusEl.textContent = '🟢 Konuşuyor';
    else statusEl.textContent = '🟡 Bağlı';
  }
}

function updateParticipantList() {
  const container = document.getElementById('voiceParticipants');
  if (!container) return;
  
  if (voiceState.participants.size === 0) {
    container.innerHTML = '<div style="color:var(--t3);text-align:center;padding:4px">Henüz kimse yok</div>';
    return;
  }
  
  container.innerHTML = [...voiceState.participants.values()].map(p => `
    <div class="voice-participant" style="display:flex;align-items:center;gap:6px;padding:2px 0">
      <span style="width:22px;height:22px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${(p.username||p.id).charAt(0).toUpperCase()}</span>
      <span>${p.username||p.id}</span>
      <span>${p.muted ? '🔴' : p.speaking ? '🟢' : '🟡'}</span>
    </div>
  `).join('');
}

// Push to talk
function enablePushToTalk(key = 'Space') {
  voiceState.pushToTalk = true;
  voiceState.pushToTalkKey = key;
  if (!voiceState.isMuted) toggleMute();
  
  document.addEventListener('keydown', handlePushToTalk);
  document.addEventListener('keyup', handlePushToTalk);
}

function disablePushToTalk() {
  voiceState.pushToTalk = false;
  document.removeEventListener('keydown', handlePushToTalk);
  document.removeEventListener('keyup', handlePushToTalk);
}

let pushToTalkActive = false;
function handlePushToTalk(e) {
  if (e.code !== voiceState.pushToTalkKey || e.repeat) return;
  
  if (e.type === 'keydown' && !pushToTalkActive) {
    pushToTalkActive = true;
    if (voiceState.isMuted) toggleMute();
  } else if (e.type === 'keyup' && pushToTalkActive) {
    pushToTalkActive = false;
    if (!voiceState.isMuted) toggleMute();
  }
}

// Socket olayları
function initVoiceSocket() {
  if (!window._socket) return;
  
  window._socket.on('voice_offer', async (data) => {
    const pc = voiceState.peerConnections.get(data.channel);
    if (pc && data.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      window._socket.emit('voice_answer', { sdp: answer, channel: data.channel });
    }
  });
  
  window._socket.on('voice_answer', async (data) => {
    const pc = voiceState.peerConnections.get(data.channel);
    if (pc && data.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    }
  });
  
  window._socket.on('voice_candidate', (data) => {
    const pc = voiceState.peerConnections.get(data.channel);
    if (pc && data.candidate) {
      pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });
  
  window._socket.on('user_joined_voice', (data) => {
    voiceState.participants.set(data.userId, {
      id: data.userId,
      username: data.username,
      speaking: false,
      muted: data.muted || false,
      deafened: data.deafened || false,
      joinedAt: new Date().toISOString()
    });
    updateParticipantList();
  });
  
  window._socket.on('user_left_voice', (data) => {
    removeParticipant(data.userId);
  });
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initVoiceSocket, 1000);
});
