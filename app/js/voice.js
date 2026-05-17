let localStream = null;
let peerConnections = new Map();

async function joinVoice(channelId) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    pc.ontrack = (e) => {
      const audio = document.createElement('audio');
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
      document.body.appendChild(audio);
    };
    peerConnections.set(channelId, pc);
    if (window._socket) window._socket.emit('voice_join', { channel: channelId });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (window._socket) window._socket.emit('voice_offer', { sdp: offer, channel: channelId });
    toast('Ses kanalına katıldın');
  } catch(e) {
    toast('Mikrofon izni gerekli', 'e');
  }
}

function leaveVoice() {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  peerConnections.forEach(pc => pc.close());
  peerConnections.clear();
  localStream = null;
  if (window._socket) window._socket.emit('voice_leave');
  toast('Sesten ayrıldın');
}

function toggleMute() {
  if (!localStream) return;
  const muted = !localStream.getAudioTracks()[0]?.enabled;
  localStream.getAudioTracks().forEach(t => t.enabled = muted);
  return !muted;
}
