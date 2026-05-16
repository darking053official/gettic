function Sidebar({ channels, categories, activeChannel, unreadCounts, serverSettings, sidebarOpen, user, userStatus, onSwitchChannel, onJoinVoice, onCreateChannel, onCreateCategory, onToggleSidebar, t }) {
  return (
    <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header" dangerouslySetInnerHTML={{ __html: I.hash }} />
      <span>{serverSettings.name}</span>
      <div className="sidebar-scroll">
        {categories.map(cat => (
          <div key={cat}>
            <div className="ch-cat">{cat}<button onClick={() => onCreateCategory()}>+</button></div>
            {channels.filter(ch => ch.category === cat).map(ch => (
              <div key={ch.id} className={`ch-item ${ch.id === activeChannel.id ? 'act' : ''}`}
                onClick={() => ch.type === 'voice' ? onJoinVoice(ch.id) : onSwitchChannel(ch)}>
                <span dangerouslySetInnerHTML={{ __html: ch.type === 'voice' ? I.volume : I.hash }} />
                <span className="ch-name">{ch.name}</span>
                {unreadCounts[ch.id] > 0 && ch.id !== activeChannel.id && (
                  <span className="ub">{unreadCounts[ch.id]}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <button className="add-cat-btn" onClick={() => onCreateChannel()}>+ Kanal Ekle</button>
      <div className="sidebar-user">
        <div className="su-av">{user.username.charAt(0).toUpperCase()}<div className={`su-dot ${userStatus}`} /></div>
        <div className="su-info">
          <div className="su-name">{user.username}</div>
          <div className="su-tag">🟢 {t('online')}</div>
        </div>
      </div>
    </nav>
  );
  }
