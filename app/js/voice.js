// Ses state
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
  inputDevice: 'default',
  outputDevice: 'default',
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  bitrate: 64000,
  participants: new Map(), // userId -> { username, speaking, muted, deafened }
  screenStream: null,
  isScreenSharing: false,
  pushToTalk: false,
  pushToTalkKey: 'Space',
  vadLevel: -50 // dB, ses aktivite algılama seviyesi
};

// Ses kanalına katıl
async function joinVoice(channelId) {
  if (voiceState.isInVoice) {
    leaveVoice();
    await new Promise(r => setTimeout(r, 300));
  }
  
  try {
    // Ses kısıtlamaları
    const constraints = {
      audio: {
        deviceId: voiceState.inputDevice !== 'default' ? { exact: voiceState.inputDevice } : undefined,
        echoCancellation: voiceState.echoCancellation,
        noiseSuppression: voiceState.noiseSuppression,
        autoGainControl: voiceState.autoGainControl,
        sampleRate: 48000,
        channelCount: 1
      }
    };
    
    voiceState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    voiceState.isInVoice = true;
    voiceState.activeChannelId = channelId;
    voiceState.isMuted = false;
    voiceState.isDeafened = false;
    
    // Ses seviyesi göstergesi için AudioContext
    setupAudioAnalyser();
    
    // Mevcut bağlantıları temizle
    voiceState.peerConnections.forEach(pc => pc.close());
    voiceState.peerConnections.clear();
    voiceState.audioElements.forEach(a => a.remove());
    voiceState.audioElements.clear();
    voiceState.participants.clear();
    
    // Yeni bağlantı oluştur
    const pc = createPeerConnection(channelId);
    voiceState.peerConnections.set(channelId, pc);
    
    // Sunucuya katıldığını bildir
    if (window._socket) {
      window._socket.emit('voice_join', { 
        channel: channelId,
        muted: false,
        deafened: false
      });
    }
    
    // Ses kontrol panelini göster
    showVoicePanel();
    
    // Kanal adını güncelle
    const channel = Store.channels.find(c => c.id === channelId);
    toast('🔊 ' + (channel?.name || channelId) + ' kanalına katıldın');
    
    return true;
  } catch(e) {
    console.error('Ses hatası:', e);
    if (e.name === 'NotAllowedError') {
      toast('Mikrofon izni reddedildi', 'e');
    } else if (e.name === 'NotFoundError') {
      toast('Mikrofon bulunamadı', 'e');
    } else {
      toast('Ses başlatılamadı: ' + e.message, 'e');
    }
    return false;
  }
}

// PeerConnection oluştur
function createPeerConnection(channelId) {
  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 2
  };
  
  const pc = new RTCPeerConnection(config);
  
  // Lokal ses ekle
  if (voiceState.localStream) {
    voiceState.localStream.getTracks().forEach(track => {
      if (track.kind === 'audio') {
        pc.addTrack(track, voiceState.localStream);
      }
    });
  }
  
  // ICE adayı
  pc.onicecandidate = (e) => {
    if (e.candidate && window._socket) {
      window._socket.emit('voice_candidate', {
        candidate: e.candidate,
        channel: channelId
      });
    }
  };
  
  // ICE bağlantı durumu
  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
      handleParticipantDisconnect(channelId);
    }
  };
  
  // Bağlantı durumu
  pc.onconnectionstatechange = () => {
    updateVoiceStatus();
  };
  
  // Uzaktan ses geldiğinde
  pc.ontrack = (e) => {
    if (e.streams && e.streams[0]) {
      handleRemoteStream(e.streams[0], channelId);
    }
  };
  
  // Offer oluştur ve gönder
  pc.createOffer()
    .then(offer => pc.setLocalDescription(offer))
    .then(() => {
      if (window._socket) {
        window._socket.emit('voice_offer', { 
          sdp: pc.localDescription, 
          channel: channelId 
        });
      }
    });
  
  return pc;
}

// Uzaktan ses akışını işle
function handleRemoteStream(stream, userId) {
  voiceState.remoteStreams.set(userId, stream);
  
  const audio = new Audio();
  audio.srcObject = stream;
  audio.autoplay = true;
  audio.volume = voiceState.isDeafened ? 0 : (voiceState.volume / 100);
  audio.setAttribute('data-user', userId);
  document.body.appendChild(audio);
  
  voiceState.audioElements.set(userId, audio);
  
  // Katılımcıyı ekle
  voiceState.participants.set(userId, {
    id: userId,
    username: userId,
    speaking: false,
    muted: false,
    deafened: false,
    joinedAt: new Date().toISOString()
  });
  
  updateVoiceParticipantList();
}

// Ses analizörü
let audioContext = null;
let analyserNode = null;

function setupAudioAnalyser() {
  if (!voiceState.localStream) return;
  
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(voiceState.localStream);
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  source.connect(analyserNode);
  
  // Ses seviyesi kontrolü
  checkSpeaking();
}

let speakingCheckInterval = null;

function checkSpeaking() {
  if (!analyserNode || !voiceState.isInVoice) {
    clearInterval(speakingCheckInterval);
    return;
  }
  
  const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(dataArray);
  
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const isSpeaking = average > 30; // Eşik değeri
  
  if (isSpeaking !== voiceState.isSpeaking) {
    voiceState.isSpeaking = isSpeaking;
    updateVoiceStatus();
    if (window._socket) {
      window._socket.emit('voice_speaking', {
        channel: voiceState.activeChannelId,
        speaking: isSpeaking
      });
    }
  }
  
  requestAnimationFrame(checkSpeaking);
}

// Sesi kapat/aç
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
  
  updateVoiceStatus();
  return voiceState.isMuted;
}

// Sağırlaştır
function toggleDeafen() {
  voiceState.isDeafened = !voiceState.isDeafened;
  voiceState.audioElements.forEach(audio => {
    audio.volume = voiceState.isDeafened ? 0 : (voiceState.volume / 100);
  });
  
  if (window._socket) {
    window._socket.emit('voice_deafen', {
      channel: voiceState.activeChannelId,
      deafened: voiceState.isDeafened
    });
  }
  
  updateVoiceStatus();
}

// Ses seviyesi ayarı
function setVolume(vol) {
  voiceState.volume = Math.max(0, Math.min(200, vol));
  if (!voiceState.isDeafened) {
    voiceState.audioElements.forEach(audio => {
      audio.volume = voiceState.volume / 100;
    });
  }
}

// Sesten ayrıl
function leaveVoice() {
  if (voiceState.localStream) {
    voiceState.localStream.getTracks().forEach(t => t.stop());
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
  }
  
  voiceState.isInVoice = false;
  voiceState.activeChannelId = null;
  voiceState.localStream = null;
  voiceState.isMuted = false;
  voiceState.isDeafened = false;
  
  hideVoicePanel();
  
  if (window._socket) {
    window._socket.emit('voice_leave', { channel: voiceState.activeChannelId });
  }
  
  toast('Sesten ayrıldın');
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
    
    voiceState.screenStream.getVideoTracks()[0].onended = () => {
      stopScreenShare();
    };
    
    if (window._socket) {
      window._socket.emit('screen_share_start', { channel: voiceState.activeChannelId });
    }
    
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
  
  if (window._socket) {
    window._socket.emit('screen_share_stop', { channel: voiceState.activeChannelId });
  }
  
  toast('Ekran paylaşımı durduruldu');
}

// Ses paneli
function showVoicePanel() {
  let panel = document.getElementById('voicePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'voicePanel';
    panel.className = 'voice-panel';
    panel.innerHTML = `
      <div class="voice-panel-header">
        <span class="voice-panel-channel">🔊 Sesli Kanal</span>
        <span class="voice-panel-status" id="voiceStatus">Bağlanıyor...</span>
      </div>
      <div class="voice-panel-controls">
        <button class="voice-btn" id="muteBtn" onclick="toggleMute()" title="Mikrofon">
          <span class="voice-btn-icon">🎤</span>
        </button>
        <button class="voice-btn" id="deafenBtn" onclick="toggleDeafen()" title="Sağır">
          <span class="voice-btn-icon">🔇</span>
        </button>
        <input type="range" id="volumeSlider" min="0" max="200" value="100" oninput="setVolume(this.value)" title="Ses">
        <button class="voice-btn danger" onclick="leaveVoice()" title="Ayrıl">
          <span class="voice-btn-icon">📴</span>
        </button>
      </div>
      <div class="voice-panel-participants" id="voiceParticipants"></div>
    `;
    document.body.appendChild(panel);
  }
  panel.style.display = 'flex';
  
  // Ses seviyesi slider'ı
  const slider = document.getElementById('volumeSlider');
  if (slider) slider.value = voiceState.volume;
}

function hideVoicePanel() {
  const panel = document.getElementById('voicePanel');
  if (panel) panel.style.display = 'none';
}

function updateVoiceStatus() {
  const statusEl = document.getElementById('voiceStatus');
  if (!statusEl) return;
  
  if (voiceState.isDeafened) {
    statusEl.textContent = '🔇 Sağır';
  } else if (voiceState.isMuted) {
    statusEl.textContent = '🔴 Susturuldu';
  } else if (voiceState.isSpeaking) {
    statusEl.textContent = '🟢 Konuşuyor';
  } else {
    statusEl.textContent = '🟡 Bağlı';
  }
  
  // Mikrofon butonu
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.classList.toggle('muted', voiceState.isMuted);
  }
  
  // Sağır butonu
  const deafenBtn = document.getElementById('deafenBtn');
  if (deafenBtn) {
    deafenBtn.classList.toggle('deafened', voiceState.isDeafened);
  }
}

function updateVoiceParticipantList() {
  const container = document.getElementById('voiceParticipants');
  if (!container) return;
  
  if (voiceState.participants.size === 0) {
    container.innerHTML = '<span class="voice-no-users">Henüz kimse yok</span>';
    return;
  }
  
  container.innerHTML = [...voiceState.participants.values()].map(p => `
    <div class="voice-participant">
      <span class="voice-participant-av">${(p.username||p.id).charAt(0).toUpperCase()}</span>
      <span class="voice-participant-name">${p.username||p.id}</span>
      <span class="voice-participant-status">${p.muted ? '🔴' : p.speaking ? '🟢' : '🟡'}</span>
    </div>
  `).join('');
}

function handleParticipantDisconnect(userId) {
  voiceState.remoteStreams.delete(userId);
  const audio = voiceState.audioElements.get(userId);
  if (audio) { audio.remove(); voiceState.audioElements.delete(userId); }
  voiceState.participants.delete(userId);
  updateVoiceParticipantList();
}

// Ses cihazlarını al
async function getAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      inputs: devices.filter(d => d.kind === 'audioinput').map(d => ({ id: d.deviceId, label: d.label || 'Mikrofon' })),
      outputs: devices.filter(d => d.kind === 'audiooutput').map(d => ({ id: d.deviceId, label: d.label || 'Hoparlör' }))
    };
  } catch(e) {
    return { inputs: [], outputs: [] };
  }
}

// Push-to-talk
let pushToTalkActive = false;

function enablePushToTalk(key = 'Space') {
  voiceState.pushToTalk = true;
  voiceState.pushToTalkKey = key;
  
  // Başlangıçta mute
  if (!voiceState.isMuted) toggleMute();
  
  document.addEventListener('keydown', handlePushToTalk);
  document.addEventListener('keyup', handlePushToTalk);
}

function disablePushToTalk() {
  voiceState.pushToTalk = false;
  document.removeEventListener('keydown', handlePushToTalk);
  document.removeEventListener('keyup', handlePushToTalk);
}

function handlePushToTalk(e) {
  if (e.code !== voiceState.pushToTalkKey) return;
  if (e.repeat) return;
  
  if (e.type === 'keydown' && !pushToTalkActive) {
    pushToTalkActive = true;
    if (voiceState.isMuted) toggleMute();
  } else if (e.type === 'keyup' && pushToTalkActive) {
    pushToTalkActive = false;
    if (!voiceState.isMuted) toggleMute();
  }
}

// Socket ses olayları
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
    updateVoiceParticipantList();
  });
  
  window._socket.on('user_left_voice', (data) => {
    handleParticipantDisconnect(data.userId);
  });
  
  window._socket.on('user_muted', (data) => {
    const p = voiceState.participants.get(data.userId);
    if (p) { p.muted = data.muted; updateVoiceParticipantList(); }
  });
  
  window._socket.on('user_speaking', (data) => {
    const p = voiceState.participants.get(data.userId);
    if (p) { p.speaking = data.speaking; updateVoiceParticipantList(); }
  });
  }
