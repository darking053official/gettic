function VoiceBar({ isInVoice, isMuted, isDeafened, onToggleMute, onToggleDeafen, onLeaveVoice }) {
  if (!isInVoice) return null;
  return (
    <div className="vbar show">
      <div className="vbar-info">
        <div className="vbar-st"><span className="vpulse" /> Sesli Kanal</div>
      </div>
      <div className="vctrl">
        <button className={`vb ${isMuted ? 'muted' : ''}`} onClick={onToggleMute}
          dangerouslySetInnerHTML={{ __html: isMuted ? I.micOff : I.mic }} />
        <button className={`vb ${isDeafened ? 'muted' : ''}`} onClick={onToggleDeafen}
          dangerouslySetInnerHTML={{ __html: I.deafen }} />
        <button className="vb" style={{ background: 'var(--re)' }} onClick={onLeaveVoice}
          dangerouslySetInnerHTML={{ __html: I.logout }} />
      </div>
    </div>
  );
}

async function joinVoiceChannel(channelId, setLocalStream, setVoiceChannelId, setIsInVoice, setPeerConnections, socketRef) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setLocalStream(stream);
    setVoiceChannelId(channelId);
    setIsInVoice(true);

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('voice_candidate', { candidate: e.candidate, channel: channelId });
    };
    pc.ontrack = (e) => {
      const audio = document.createElement('audio');
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
      document.body.appendChild(audio);
    };

    setPeerConnections(prev => new Map(prev).set(channelId, pc));
    socketRef.current?.emit('voice_join', { channel: channelId });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('voice_offer', { sdp: offer, channel: channelId });
  } catch (e) {
    alert('Mikrofon izni gerekli');
  }
}

function leaveVoiceChannel(localStream, peerConnections, setIsInVoice, setIsMuted, setIsDeafened, setVoiceChannelId, socketRef) {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  peerConnections.forEach(pc => pc.close());
  setIsInVoice(false);
  setIsMuted(false);
  setIsDeafened(false);
  setVoiceChannelId(null);
  socketRef.current?.emit('voice_leave');
                                   }
