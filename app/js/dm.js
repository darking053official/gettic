function DMPanel({ dmFriends, activeDM, dmInput, onStartDM, onSendDM, onSetDmInput, onAddFriend, t }) {
  return (
    <div>
      <h2 dangerouslySetInnerHTML={{ __html: I.dm }} /> {t('dm')}
      <button className="mb sec" onClick={() => window._setActiveModal?.('dmNew')}>+ Yeni DM</button>
      {dmFriends.map(f => (
        <div key={f.id} className="mitem" onClick={() => onStartDM(f.username)}>
          <div className="mav">{f.username.charAt(0).toUpperCase()}</div>
          <div className="minfo">
            <div className="mname">{f.username}</div>
            <div className="msub">{f.last || 'DM başlat'}</div>
          </div>
        </div>
      ))}
      {dmFriends.length === 0 && <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Henüz DM yok</p>}
    </div>
  );
}

function DMChat({ activeDM, dmInput, user, onSendDM, onSetDmInput, onClose }) {
  if (!activeDM) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chat-header">
        <span>@{activeDM.username}</span>
        <button className="ib" onClick={onClose}>×</button>
      </div>
      <div className="msgs" style={{ flex: 1 }}>
        {activeDM.messages.map((m, i) => (
          <div key={i} className="msg" style={{ flexDirection: m.sender === user.username ? 'row-reverse' : 'row' }}>
            <div className="msg-av">{m.sender.charAt(0).toUpperCase()}</div>
            <div className="msg-body">
              <div className="msg-head"><span>{m.sender}</span><span className="msg-time"> {timeAgo(m.time)}</span></div>
              <div className="msg-text">{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="input-area">
        <textarea className="msg-inp" placeholder="Mesaj yaz..." value={dmInput}
          onChange={e => onSetDmInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendDM(); } }} rows={1} />
        <button className="ib" style={{ background: 'var(--gr)' }} onClick={onSendDM} dangerouslySetInnerHTML={{ __html: I.send }} />
      </div>
    </div>
  );
        }
