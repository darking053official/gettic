function ThemeModal({ theme, lightMode, onSetTheme, onToggleLight, onClose }) {
  return (
    <div>
      <h2>Tema</h2>
      <div className="color-row">
        {['#c94d8c', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6'].map(c => (
          <div key={c} className="color-swatch" style={{ background: c }} onClick={() => { onSetTheme(c); onClose(); }} />
        ))}
      </div>
      <div className="msep" />
      <button className="mb sec" onClick={() => { onToggleLight(); onClose(); }}>
        {lightMode ? '🌙 Karanlık' : '☀️ Aydınlık'}
      </button>
    </div>
  );
}

function SearchModal({ query, setQuery, messages, channels, activeChannel, onSwitchChannel, onClose, t }) {
  const results = messages.filter(m => (m.content || '').toLowerCase().includes(query.toLowerCase())).slice(-10);
  return (
    <div>
      <h2 dangerouslySetInnerHTML={{ __html: I.search }} /> {t('search')}
      <input className="mi" placeholder={t('search') + '...'} value={query} onChange={e => setQuery(e.target.value)} autoFocus />
      {results.map(m => (
        <div key={m._id} className="mitem" onClick={() => { onSwitchChannel(channels.find(c => c.id === m.channelId) || activeChannel); onClose(); }}>
          <div className="mav">{m.senderName?.charAt(0)}</div>
          <div className="minfo">
            <div className="mname">{m.senderName}</div>
            <div className="msub">{m.content.substring(0, 60)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ServerSettingsModal({ serverSettings, onSave, onClose }) {
  const [name, setName] = useState(serverSettings.name);
  return (
    <div>
      <h2 dangerouslySetInnerHTML={{ __html: I.settings }} /> Sunucu Ayarları
      <input className="mi" value={name} onChange={e => setName(e.target.value)} placeholder="Sunucu adı" />
      <button className="mb" onClick={() => { onSave(name); onClose(); }}>Kaydet</button>
    </div>
  );
}

function UserPanel({ isInVoice, isMuted, isDeafened, onToggleMute, onToggleDeafen, onLeaveVoice, onOpenModal, onLogout, t, lang, setLang }) {
  return (
    <aside className="sidebar" style={{ right: 0, width: 'var(--panel)', borderRight: 'none', borderLeft: '1px solid var(--b2)' }}>
      <div className="sidebar-header" dangerouslySetInnerHTML={{ __html: I.user }} /> Panel
      <div className="sidebar-scroll" style={{ padding: '8px' }}>
        {isInVoice && (
          <div className="vbar show">
            <div className="vbar-info">
              <div className="vbar-st"><span className="vpulse" /> Sesli Kanal</div>
            </div>
            <div className="vctrl">
              <button className={`vb ${isMuted ? 'muted' : ''}`} onClick={onToggleMute} dangerouslySetInnerHTML={{ __html: isMuted ? I.micOff : I.mic }} />
              <button className={`vb ${isDeafened ? 'muted' : ''}`} onClick={onToggleDeafen} dangerouslySetInnerHTML={{ __html: I.deafen }} />
              <button className="vb" style={{ background: 'var(--re)' }} onClick={onLeaveVoice} dangerouslySetInnerHTML={{ __html: I.logout }} />
            </div>
          </div>
        )}
        <button className="mb" onClick={() => onOpenModal('serverSettings')} dangerouslySetInnerHTML={{ __html: I.settings }} /> Sunucu
        <button className="mb" onClick={() => onOpenModal('roles')} dangerouslySetInnerHTML={{ __html: I.shield }} /> Roller
        <button className="mb" onClick={() => onOpenModal('dm')} dangerouslySetInnerHTML={{ __html: I.dm }} /> {t('dm')}
        <button className="mb" onClick={() => onOpenModal('addFriend')} dangerouslySetInnerHTML={{ __html: I.plus }} /> Arkadaş
        <button className="mb" onClick={() => onOpenModal('theme')} dangerouslySetInnerHTML={{ __html: I.settings }} /> Tema
        <button className="mb" onClick={() => onOpenModal('poll')} dangerouslySetInnerHTML={{ __html: I.poll }} /> Anket
        <button className="mb" onClick={() => { setLang(lang === 'tr' ? 'en' : 'tr'); localStorage.setItem('gt_lang', lang === 'tr' ? 'en' : 'tr'); }} dangerouslySetInnerHTML={{ __html: I.globe }} /> {lang.toUpperCase()}
        <button className="mb danger" onClick={onLogout} dangerouslySetInnerHTML={{ __html: I.logout }} /> {t('logout')}
      </div>
    </aside>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast ${type}`}>{msg}</div>;
}

function ContextMenu({ menu, messages, onDelete, onPin, onClose }) {
  if (!menu) return null;
  return (
    <div className="ctxmenu show" style={{ left: menu.x, top: menu.y }}>
      <button onClick={() => { onDelete(menu.mid); onClose(); }} className="danger" dangerouslySetInnerHTML={{ __html: I.trash }} /> Sil
      <button onClick={() => { onPin(menu.mid); onClose(); }} dangerouslySetInnerHTML={{ __html: I.pin }} /> Sabitle
      <button onClick={() => { navigator.clipboard.writeText(messages.find(m => m._id === menu.mid)?.content || ''); onClose(); }} dangerouslySetInnerHTML={{ __html: I.copy }} /> Kopyala
    </div>
  );
  }
