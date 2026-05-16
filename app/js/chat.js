function MessageItem({ msg, user, polls, userRoles, roles, editingMsg, setEditingMsg, onDelete, onPin, onEdit, onReact }) {
  const role = getHighestRole(msg.senderId, userRoles, roles);
  const isOwn = msg.senderId === user._id;
  const canDelete = isOwn || hasPermission(user._id, 'deleteMsg', userRoles, roles);

  return (
    <div className="msg" onContextMenu={e => {
      e.preventDefault();
      window._ctxMenu = { type: 'message', mid: msg._id, x: e.clientX, y: e.clientY };
    }}>
      <div className="msg-av">{msg.senderName?.charAt(0).toUpperCase()}</div>
      <div className="msg-body">
        <div className="msg-head">
          <span className="msg-un">{esc(msg.senderName)}</span>
          {role && role.id !== 'r4' && (
            <span className="rbadge" style={{ background: role.color + '20', color: role.color }}>{role.name}</span>
          )}
          <span className="msg-time"> {timeAgo(msg.createdAt)}{msg.edited ? ' (düzenlendi)' : ''}</span>
        </div>
        {editingMsg === msg._id ? (
          <div>
            <input className="edit-inp" defaultValue={msg.content}
              onKeyDown={e => { if (e.key === 'Enter') onEdit(msg._id, e.target.value); if (e.key === 'Escape') setEditingMsg(null); }} />
            <div className="edit-acts">
              <button className="edit-btn save" onClick={() => onEdit(msg._id, document.querySelector('.edit-inp')?.value || msg.content)}>Kaydet</button>
              <button className="edit-btn cancel" onClick={() => setEditingMsg(null)}>İptal</button>
            </div>
          </div>
        ) : msg.image ? (
          <div className="msg-text">
            <img src={msg.image} alt={msg.content} style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '8px' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--t3)' }}>{msg.content}</div>
          </div>
        ) : (
          <div className="msg-text" dangerouslySetInnerHTML={{ __html: formatMsg(msg.content) }} />
        )}
        {polls[msg._id] && <PollDisplay poll={polls[msg._id]} mid={msg._id} user={user} />}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="reacts">
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <span key={emoji} className={`react ${users.includes(user._id) ? 'me' : ''}`} onClick={() => onReact(msg._id, emoji)}>
                {emoji} <span>{users.length}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="ma">
        <button onClick={() => onReact(msg._id, '👍')}>👍</button>
        {isOwn && <button onClick={() => setEditingMsg(msg._id)} dangerouslySetInnerHTML={{ __html: I.edit }} />}
        <button onClick={() => { navigator.clipboard.writeText(msg.content); window._toast?.('Kopyalandı'); }} dangerouslySetInnerHTML={{ __html: I.copy }} />
        <button onClick={() => onPin(msg._id)} dangerouslySetInnerHTML={{ __html: I.pin }} />
        {canDelete && <button onClick={() => onDelete(msg._id)} style={{ color: 'var(--re)' }} dangerouslySetInnerHTML={{ __html: I.trash }} />}
      </div>
    </div>
  );
}

function PollDisplay({ poll, mid, user }) {
  const total = poll.votes.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="poll-box">
      <div className="poll-q">📊 {poll.question}</div>
      <div className="poll-opts">
        {poll.options.map((o, i) => {
          const pct = Math.round((poll.votes[i] / total) * 100);
          return (
            <div key={i} className={`poll-opt ${poll.voters[user._id] === i ? 'voted' : ''}`} onClick={() => window._votePoll?.(mid, i)}>
              <div className="poll-bar" style={{ width: pct + '%' }} />
              <span>{o}</span>
              <span className="poll-pct">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
  }
