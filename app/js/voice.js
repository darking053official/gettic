// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC VOICE.JS v2.0 - Ses Kanalı                              ║
// ╚══════════════════════════════════════════════════════════════════╝

function _voiceLog(msg, level = 'log') {
  console[level](`%c[Voice] ${msg}`, 'color:#22d3ee;font-weight:bold');
}

// ============ STATE ============
const voiceState = {
  active:        false,
  channelId:     null,
  channelName:   '',
  participants:  [],        // [{ userId, username, muted, deafened, speaking }]
  localStream:   null,
  peerConnections: {},      // userId → RTCPeerConnection
  audioContext:  null,
  gainNode:      null,
  analyser:      null,
  muted:         false,
  deafened:      false,
  volume:        localStorage.getItem('gt_voice_volume') ? parseFloat(localStorage.getItem('gt_voice_volume')) : 1.0,
  noiseSuppress: localStorage.getItem('gt_voice_noise')  !== '0',
  echoCancelation: true,
  speakingThreshold: 20,
  _speakTimer:   null,
  _isSpeaking:   false,
};

// ============ SES KANALNA KATIL ============
async function joinVoice(channelId) {
  if (voiceState.active && voiceState.channelId === channelId) return;
  if (voiceState.active) await leaveVoice();

  const ch = (Store.channels || []).find(c => c.id === channelId);
  if (!ch || ch.type !== 'voice') return toast('Bu bir ses kanalı değil', 'e');

  try {
    // Mikrofon izni
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation:   voiceState.echoCancelation,
        noiseSuppression:   voiceState.noiseSuppress,
        autoGainControl:    true,
        sampleRate:         48000,
        channelCount:       1,
      },
      video: false,
    });

    voiceState.localStream  = stream;
    voiceState.active       = true;
    voiceState.channelId    = channelId;
    voiceState.channelName  = ch.name;
    voiceState.muted        = false;
    voiceState.deafened     = false;

    // Audio context
    _initAudioContext(stream);

    // Socket'e bildir
    if (socket?.connected) {
      socket.emit('join_voice', {
        channelId,
        userId:   Store.user._id,
        username: Store.user.username,
      });
    }

    _renderVoicePanel();
    if (typeof renderChannels === 'function') renderChannels();
    toast(`🎤 ${ch.name} kanalına katıldın`, 'i');
    _voiceLog(`${channelId} kanalına katılındı`);
  } catch (err) {
    const msg = err.name === 'NotAllowedError'
      ? 'Mikrofon izni reddedildi'
      : err.name === 'NotFoundError'
      ? 'Mikrofon bulunamadı'
      : 'Ses kanalına bağlanılamadı: ' + err.message;
    toast(msg, 'e');
    _voiceLog(msg, 'error');
  }
}

// ============ SES KANALDAN AYRIL ============
async function leaveVoice() {
  if (!voiceState.active) return;

  // Stream durdur
  voiceState.localStream?.getTracks().forEach(t => t.stop());
  voiceState.localStream = null;

  // Peer bağlantıları kapat
  Object.values(voiceState.peerConnections).forEach(pc => pc.close());
  voiceState.peerConnections = {};

  // Audio context kapat
  if (voiceState.audioContext?.state !== 'closed') {
    voiceState.audioContext?.close();
  }
  voiceState.audioContext = null;
  voiceState.analyser     = null;
  voiceState.gainNode     = null;

  const channelId = voiceState.channelId;

  voiceState.active       = false;
  voiceState.channelId    = null;
  voiceState.channelName  = '';
  voiceState.participants = [];
  voiceState._isSpeaking  = false;
  clearTimeout(voiceState._speakTimer);

  if (socket?.connected) {
    socket.emit('leave_voice', { channelId, userId: Store.user._id });
  }

  _removeVoicePanel();
  if (typeof renderChannels === 'function') renderChannels();
  toast('Ses kanalından ayrıldın', 'i');
  _voiceLog('Ses kanalından ayrıldı');
}

// ============ AUDIO CONTEXT ============
function _initAudioContext(stream) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    voiceState.audioContext = new AudioCtx();

    const source = voiceState.audioContext.createMediaStreamSource(stream);

    // Gain (ses seviyesi)
    voiceState.gainNode = voiceState.audioContext.createGain();
    voiceState.gainNode.gain.value = voiceState.muted ? 0 : 1;

    // Analyser (konuşma algılama)
    voiceState.analyser = voiceState.audioContext.createAnalyser();
    voiceState.analyser.fftSize = 512;
    voiceState.analyser.smoothingTimeConstant = 0.8;

    source
      .connect(voiceState.gainNode)
      .connect(voiceState.analyser);

    _startSpeakingDetection();
  } catch (e) {
    _voiceLog('Audio context hatası: ' + e.message, 'warn');
  }
}

// ============ KONUŞMA ALGILAMA ============
function _startSpeakingDetection() {
  if (!voiceState.analyser) return;
  const data = new Uint8Array(voiceState.analyser.frequencyBinCount);

  const tick = () => {
    if (!voiceState.active || !voiceState.analyser) return;

    voiceState.analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;

    const speaking = !voiceState.muted && avg > voiceState.speakingThreshold;
    if (speaking !== voiceState._isSpeaking) {
      voiceState._isSpeaking = speaking;
      _updateSpeakingUI(Store.user._id, speaking);
      if (socket?.connected) {
        socket.emit(speaking ? 'speaking_start' : 'speaking_stop', {
          channelId: voiceState.channelId,
          userId:    Store.user._id,
        });
      }
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

// ============ MİKROFON TOGGLE ============
function toggleMute() {
  voiceState.muted = !voiceState.muted;

  // Stream track'lerini mute et
  voiceState.localStream?.getAudioTracks().forEach(t => {
    t.enabled = !voiceState.muted;
  });

  if (voiceState.gainNode) {
    voiceState.gainNode.gain.value = voiceState.muted ? 0 : 1;
  }

  if (socket?.connected) {
    socket.emit('voice_mute', {
      channelId: voiceState.channelId,
      userId:    Store.user._id,
      muted:     voiceState.muted,
    });
  }

  _updateVoicePanel();
  toast(voiceState.muted ? '🔇 Mikrofon kapatıldı' : '🎤 Mikrofon açıldı', 'i');
}

// ============ SAĞIRLIK TOGGLE ============
function toggleDeafen() {
  voiceState.deafened = !voiceState.deafened;

  // Tüm gelen sesleri kapat
  document.querySelectorAll('.voice-remote-audio').forEach(el => {
    el.muted = voiceState.deafened;
  });

  if (voiceState.deafened && !voiceState.muted) toggleMute();

  if (socket?.connected) {
    socket.emit('voice_deafen', {
      channelId: voiceState.channelId,
      userId:    Store.user._id,
      deafened:  voiceState.deafened,
    });
  }

  _updateVoicePanel();
  toast(voiceState.deafened ? '🔕 Sağırlaştırıldı' : '🔔 Ses açıldı', 'i');
}

// ============ SES SEVİYESİ ============
function setVoiceVolume(val) {
  voiceState.volume = Math.min(Math.max(parseFloat(val), 0), 2);
  localStorage.setItem('gt_voice_volume', voiceState.volume);
  document.querySelectorAll('.voice-remote-audio').forEach(el => {
    el.volume = voiceState.volume;
  });
}

// ============ PANEL RENDER ============
function _renderVoicePanel() {
  _removeVoicePanel();

  const panel = document.createElement('div');
  panel.id    = 'voicePanel';
  panel.className = 'voice-panel';
  panel.innerHTML = _voicePanelHTML();
  document.body.appendChild(panel);

  requestAnimationFrame(() => panel.classList.add('show'));
}

function _removeVoicePanel() {
  const p = document.getElementById('voicePanel');
  if (p) {
    p.classList.remove('show');
    setTimeout(() => p.remove(), 300);
  }
}

function _updateVoicePanel() {
  const p = document.getElementById('voicePanel');
  if (p) p.innerHTML = _voicePanelHTML();
}

function _voicePanelHTML() {
  const participants = voiceState.participants;
  return `
    <div class="vp-header">
      <div class="vp-channel">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
        <span>${escapeHtml(voiceState.channelName)}</span>
        <span class="vp-quality" id="vpQuality">HD</span>
      </div>
      <span class="vp-conn">● Bağlı</span>
    </div>

    <div class="vp-participants" id="vpParticipants">
      ${_renderParticipant({ userId: Store.user._id, username: Store.user.username, muted: voiceState.muted, deafened: voiceState.deafened, speaking: voiceState._isSpeaking }, true)}
      ${participants.filter(p => p.userId !== Store.user._id).map(p => _renderParticipant(p, false)).join('')}
    </div>

    <div class="vp-controls">
      <button class="vp-btn ${voiceState.muted ? 'act' : ''}" onclick="toggleMute()" title="${voiceState.muted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}">
        ${voiceState.muted
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`}
      </button>

      <button class="vp-btn ${voiceState.deafened ? 'act' : ''}" onclick="toggleDeafen()" title="${voiceState.deafened ? 'Sesi Aç' : 'Sağırlaş'}">
        ${voiceState.deafened
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`}
      </button>

      <div class="vp-volume-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        <input type="range" class="vp-volume" min="0" max="2" step="0.1" value="${voiceState.volume}"
          oninput="setVoiceVolume(this.value)" title="Ses Seviyesi">
      </div>

      <button class="vp-btn leave" onclick="leaveVoice()" title="Kanaldan Ayrıl">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>`;
}

function _renderParticipant(p, isMe) {
  return `
    <div class="vp-participant ${p.speaking ? 'speaking' : ''}" id="vpu-${p.userId}">
      <div class="vp-av ${p.speaking ? 'speaking' : ''}">${(p.username || '?').charAt(0).toUpperCase()}</div>
      <span class="vp-name">${escapeHtml(p.username)}${isMe ? ' (Ben)' : ''}</span>
      <div class="vp-icons">
        ${p.muted    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/></svg>` : ''}
        ${p.deafened ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>` : ''}
      </div>
    </div>`;
}

function _updateSpeakingUI(userId, speaking) {
  const el = document.getElementById(`vpu-${userId}`);
  if (!el) return;
  el.classList.toggle('speaking', speaking);
  el.querySelector('.vp-av')?.classList.toggle('speaking', speaking);
}

// ============ WEBRTC (basit P2P) ============
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

async function _createPeerConnection(targetUserId) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  voiceState.peerConnections[targetUserId] = pc;

  // Lokal stream ekle
  voiceState.localStream?.getTracks().forEach(t => pc.addTrack(t, voiceState.localStream));

  // ICE adayı
  pc.onicecandidate = e => {
    if (e.candidate && socket?.connected) {
      socket.emit('voice_ice', {
        to:        targetUserId,
        candidate: e.candidate,
        channelId: voiceState.channelId,
      });
    }
  };

  // Uzak stream
  pc.ontrack = e => {
    const audio = document.createElement('audio');
    audio.className = 'voice-remote-audio';
    audio.autoplay  = true;
    audio.volume    = voiceState.volume;
    audio.muted     = voiceState.deafened;
    audio.srcObject = e.streams[0];
    document.body.appendChild(audio);
  };

  pc.onconnectionstatechange = () => {
    _voiceLog(`Peer [${targetUserId}] durumu: ${pc.connectionState}`);
    if (pc.connectionState === 'failed') {
      pc.restartIce();
    }
  };

  return pc;
}

// ============ SOCKET EVENTS ============
function initVoiceSocket() {
  if (!socket) return;

  socket.on('voice_users_updated', ({ channelId, users }) => {
    if (channelId !== voiceState.channelId) return;
    voiceState.participants = users.filter(u => u.userId !== Store.user._id);
    _updateVoicePanel();
    if (typeof ChannelState !== 'undefined') {
      ChannelState.setVoiceUsers(channelId, users);
      if (typeof renderChannels === 'function') renderChannels();
    }
  });

  socket.on('voice_user_joined', async ({ userId, username }) => {
    if (!voiceState.active) return;
    if (!voiceState.participants.find(p => p.userId === userId)) {
      voiceState.participants.push({ userId, username, muted: false, deafened: false, speaking: false });
      _updateVoicePanel();
    }
    // WebRTC: offer gönder
    try {
      const pc    = await _createPeerConnection(userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice_offer', { to: userId, offer, channelId: voiceState.channelId });
    } catch (e) {
      _voiceLog('Offer hatası: ' + e.message, 'warn');
    }
  });

  socket.on('voice_user_left', ({ userId }) => {
    voiceState.participants = voiceState.participants.filter(p => p.userId !== userId);
    voiceState.peerConnections[userId]?.close();
    delete voiceState.peerConnections[userId];
    // Uzak audio elementi temizle
    document.querySelectorAll('.voice-remote-audio').forEach(el => {
      if (el.dataset.userId === userId) el.remove();
    });
    _updateVoicePanel();
  });

  socket.on('voice_offer', async ({ from, offer }) => {
    try {
      const pc = await _createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice_answer', { to: from, answer, channelId: voiceState.channelId });
    } catch (e) {
      _voiceLog('Answer hatası: ' + e.message, 'warn');
    }
  });

  socket.on('voice_answer', async ({ from, answer }) => {
    try {
      const pc = voiceState.peerConnections[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
      _voiceLog('Set answer hatası: ' + e.message, 'warn');
    }
  });

  socket.on('voice_ice', async ({ from, candidate }) => {
    try {
      const pc = voiceState.peerConnections[from];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {}
  });

  socket.on('voice_mute', ({ userId, muted }) => {
    const p = voiceState.participants.find(p => p.userId === userId);
    if (p) { p.muted = muted; _updateVoicePanel(); }
  });

  socket.on('voice_deafen', ({ userId, deafened }) => {
    const p = voiceState.participants.find(p => p.userId === userId);
    if (p) { p.deafened = deafened; _updateVoicePanel(); }
  });

  socket.on('speaking_start', ({ userId }) => _updateSpeakingUI(userId, true));
  socket.on('speaking_stop',  ({ userId }) => _updateSpeakingUI(userId, false));

  _voiceLog('Socket events bağlandı');
}

// ============ CSS ============
(function injectVoiceStyles() {
  const id = 'gt-voice-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.voice-panel{
  position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);
  background:var(--bg1,#1a0f24);border:1px solid rgba(255,255,255,.1);
  border-radius:16px;padding:12px;min-width:260px;max-width:320px;
  box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:100;
  opacity:0;transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .3s;
}
.voice-panel.show{transform:translateX(-50%) translateY(0);opacity:1}

.vp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.vp-channel{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--t1,#fff)}
.vp-quality{font-size:9px;padding:1px 5px;border-radius:4px;background:#10b98122;color:#10b981}
.vp-conn{font-size:10px;color:#10b981}

.vp-participants{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;max-height:180px;overflow-y:auto}
.vp-participant{
  display:flex;align-items:center;gap:8px;padding:5px 8px;
  border-radius:8px;transition:background .15s;
}
.vp-participant.speaking{background:var(--ac,#6366f1)18}
.vp-av{
  width:28px;height:28px;border-radius:50%;
  background:var(--ac,#6366f1);color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;flex-shrink:0;
  transition:box-shadow .2s;
}
.vp-av.speaking{box-shadow:0 0 0 2px var(--ac,#6366f1),0 0 0 4px var(--ac,#6366f1)44}
.vp-name{flex:1;font-size:12px;color:var(--t2,#ccc);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vp-icons{display:flex;gap:2px;flex-shrink:0}

.vp-controls{display:flex;align-items:center;gap:6px}
.vp-btn{
  width:36px;height:36px;border-radius:10px;border:none;cursor:pointer;
  background:rgba(255,255,255,.07);color:var(--t2,#ccc);
  display:flex;align-items:center;justify-content:center;
  transition:all .15s;flex-shrink:0;
}
.vp-btn:hover{background:rgba(255,255,255,.14);color:var(--t1,#fff)}
.vp-btn.act{background:#ef444422;color:#ef4444}
.vp-btn.leave{background:#ef444422;color:#ef4444}
.vp-btn.leave:hover{background:#ef4444;color:#fff}

.vp-volume-wrap{
  flex:1;display:flex;align-items:center;gap:5px;
  padding:0 6px;color:var(--t3,#888);
}
.vp-volume{
  flex:1;height:3px;border-radius:2px;
  accent-color:var(--ac,#6366f1);cursor:pointer;
}

@media (max-width:768px){
  .voice-panel{bottom:80px;width:90vw;max-width:none}
}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initVoice() {
  if (typeof socket !== 'undefined' && socket) {
    initVoiceSocket();
  } else {
    document.addEventListener('socket_ready', initVoiceSocket, { once: true });
  }
  _voiceLog('v2.0 yüklendi ✓');
})();
