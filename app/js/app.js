function App() {
  const [user, setUser] = useState(() => { const s = localStorage.getItem('gt_user'); return s ? JSON.parse(s) : null; });
  const [token, setToken] = useState(localStorage.getItem('gt_token'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [channels, setChannels] = useState([{ id: 'genel-sohbet', name: 'genel-sohbet', type: 'text', category: 'METİN' }, { id: 'genel-ses', name: 'Genel Ses', type: 'voice', category: 'SES' }]);
  const [categories, setCategories] = useState(['METİN', 'SES']);
  const [activeChannel, setActiveChannel] = useState({ id: 'genel-sohbet', name: 'genel-sohbet' });
  const [unreadCounts, setUnreadCounts] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('gt_ac') || '#c94d8c');
  const [lang, setLang] = useState(localStorage.getItem('gt_lang') || 'tr');
  const [userStatus, setUserStatus] = useState('online');
  const [lightMode, setLightMode] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [dmFriends, setDmFriends] = useState([]);
  const [activeDM, setActiveDM] = useState(null);
  const [dmInput, setDmInput] = useState('');
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [voiceChannelId, setVoiceChannelId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnections, setPeerConnections] = useState(new Map());
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [userRoles, setUserRoles] = useState({});
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [serverSettings, setServerSettings] = useState({ name: 'Gettic' });
  const [polls, setPolls] = useState({});
  const [showImageBar, setShowImageBar] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const msgEndRef = useRef(null);

  const L = { tr: { login: 'Giriş', register: 'Kayıt', send: 'Mesaj yaz...', online: 'Çevrimiçi', logout: 'Çıkış Yap', search: 'Ara...', noMessages: 'Henüz mesaj yok', birth: 'doğuşu', typing: 'yazıyor...', dm: 'DM', offline: 'Çevrimdışı', retry: 'Tekrar Dene' }, en: { login: 'Login', register: 'Register', send: 'Message...', online: 'Online', logout: 'Logout', search: 'Search...' } };
  const t = (key) => (L[lang] || L.tr)[key] || key;

  window._toast = (msg, type) => { setToastMsg({ msg, type: type || 's' }); setTimeout(() => setToastMsg(null), 2500); };
  window._votePoll = (mid, opt) => votePoll(mid, opt, user, polls, setPolls, window._toast);
  window._setActiveModal = setActiveModal;

  const toast = window._toast;

  const doAuth = async (type, username, password) => {
    if (!checkRL('auth', 5, 10000)) return toast('Çok fazla deneme', 'e');
    try {
      const res = await fetch(`${API}/api/auth/${type}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Başarısız');
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('gt_token', data.token);
      localStorage.setItem('gt_user', JSON.stringify(data.user));
    } catch (e) { toast(e.message, 'e'); }
  };

  const logout = () => {
    localStorage.removeItem('gt_token');
    localStorage.removeItem('gt_user');
    setUser(null);
    setToken(null);
    if (socketRef.current) socketRef.current.disconnect();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    peerConnections.forEach(pc => pc.close());
  };

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    const msg = { _id: genId(), content: input.trim(), senderName: user.username, senderId: user._id, channelId: activeChannel.id, createdAt: new Date().toISOString(), reactions: {} };
    setMessages(prev => [...prev, msg]);
    setInput('');
    if (socketRef.current) socketRef.current.emit('send_message', msg);
  };

  const deleteMessage = (mid) => { setMessages(prev => prev.filter(m => m._id !== mid)); toast('Silindi'); };
  const pinMessage = (mid) => { const msg = messages.find(m => m._id === mid); if (msg) setPinnedMsg(msg); };
  const editMessage = (mid, newContent) => { setMessages(prev => prev.map(m => m._id === mid ? { ...m, content: newContent, edited: true } : m)); setEditingMsg(null); };
  const addReaction = (mid, emoji) => { setMessages(prev => prev.map(m => { if (m._id !== mid) return m; const reactions = { ...m.reactions }; if (!reactions[emoji]) reactions[emoji] = []; const idx = reactions[emoji].indexOf(user._id); if (idx === -1) reactions[emoji].push(user._id); else reactions[emoji].splice(idx, 1); if (!reactions[emoji].length) delete reactions[emoji]; return { ...m, reactions }; })); };

  const switchChannel = (ch) => { setActiveChannel({ id: ch.id, name: ch.name }); setSidebarOpen(false); };

  const generateImage = async () => {
    if (!imagePrompt.trim()) return;
    toast('🎨 Görsel oluşturuluyor...');
    try {
      const res = await fetch(`${API}/api/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: imagePrompt }) });
      const data = await res.json();
      if (data.image) { setMessages(prev => [...prev, { _id: genId(), content: `🎨 ${imagePrompt}`, senderName: user.username, senderId: user._id, channelId: activeChannel.id, createdAt: new Date().toISOString(), image: data.image }]); setImagePrompt(''); setShowImageBar(false); } else toast('Görsel oluşturulamadı', 'e');
    } catch (e) { toast('Bağlantı hatası', 'e'); }
  };

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { const hOnline = () => setIsOnline(true); const hOffline = () => setIsOnline(false); window.addEventListener('online', hOnline); window.addEventListener('offline', hOffline); return () => { window.removeEventListener('online', hOnline); window.removeEventListener('offline', hOffline); }; }, []);
  useEffect(() => { if (!token || !user) return; const sock = io(API, { auth: { token }, transports: ['websocket', 'polling'] }); socketRef.current = sock; sock.on('connect', () => sock.emit('join_channel', activeChannel.id)); sock.on('new_message', (msg) => { if (msg.channelId === activeChannel.id) setMessages(prev => [...prev, msg].slice(-MAX_MSGS)); else setUnreadCounts(prev => ({ ...prev, [msg.channelId]: (prev[msg.channelId] || 0) + 1 })); }); sock.on('disconnect', () => setIsOnline(false)); sock.on('connect', () => setIsOnline(true)); return () => sock.disconnect(); }, [token, activeChannel.id]);

  if (!user) {
    return (
      <div className="auth-wrap">
        <div className="auth-box">
          <img src="https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png" className="auth-logo" alt="Gettic" />
          <div className="auth-title">gettic</div>
          <div className="auth-sub">Türkçe sohbet platformu</div>
          {!captchaVerified ? (
            <CaptchaBox code={captchaCode} onRefresh={() => setCaptchaCode(Math.random().toString(36).substring(2, 6).toUpperCase())} />
          ) : (
            <AuthForm onLogin={(u, p) => doAuth('login', u, p)} onRegister={(u, p) => doAuth('register', u, p)} t={t} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ '--ac': theme }}>
      <nav className="rail">
        <div className="ri act" title={serverSettings.name} dangerouslySetInnerHTML={{ __html: I.hash }} />
        <div className="ri-sep" />
        <div className="ri" title="Tema" onClick={() => setActiveModal('theme')} dangerouslySetInnerHTML={{ __html: lightMode ? I.moon : I.sun }} />
        <div className="ri ri-push" title={isOnline ? 'Bağlı' : 'Bağlantı yok'} dangerouslySetInnerHTML={{ __html: isOnline ? I.wifi : I.wifiOff }} />
      </nav>

      <Sidebar channels={channels} categories={categories} activeChannel={activeChannel} unreadCounts={unreadCounts} serverSettings={serverSettings} sidebarOpen={sidebarOpen} user={user} userStatus={userStatus} onSwitchChannel={switchChannel} onJoinVoice={(id) => joinVoiceChannel(id, setLocalStream, setVoiceChannelId, setIsInVoice, setPeerConnections, socketRef)} onCreateChannel={() => setActiveModal('addChannel')} onCreateCategory={() => setActiveModal('addCategory')} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} t={t} />

      <main className="chat">
        {!isOnline && (<div id="connbar" className="show">{t('offline')} <button onClick={() => setIsOnline(true)}>{t('retry')}</button></div>)}
        <header className="chat-header">
          <span dangerouslySetInnerHTML={{ __html: I.hash }} />
          <div className="ch-hname"># {activeChannel.name}</div>
          <div className="hacts">
            <button className="ib" onClick={() => setActiveModal('search')} dangerouslySetInnerHTML={{ __html: I.search }} />
            <button className="ib" onClick={() => setSidebarOpen(!sidebarOpen)} dangerouslySetInnerHTML={{ __html: I.hash }} />
            <button className="ib" onClick={() => setUserPanelOpen(!userPanelOpen)} dangerouslySetInnerHTML={{ __html: I.user }} />
          </div>
        </header>

        <div className="msgs">
          {pinnedMsg && (
            <div className="msg pinned">
              <div className="msg-av">{pinnedMsg.senderName?.charAt(0)}</div>
              <div className="msg-body"><div className="msg-text">{esc(pinnedMsg.content.substring(0, 100))}</div></div>
              <button className="ib" onClick={() => setPinnedMsg(null)}>×</button>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="empty-ch"><h4># {activeChannel.name}</h4><p>{t('noMessages')}</p></div>
          ) : messages.map(msg => (
            <MessageItem key={msg._id} msg={msg} user={user} polls={polls} userRoles={userRoles} roles={roles} editingMsg={editingMsg} setEditingMsg={setEditingMsg} onDelete={deleteMessage} onPin={pinMessage} onEdit={editMessage} onReact={addReaction} />
          ))}
          <div ref={msgEndRef} />
        </div>

        <div className="typing">{Object.keys(typingUsers).length > 0 && 'Birisi yazıyor...'}</div>

        <div className="input-area">
          {showImageBar && (
            <div className="image-bar show">
              <input value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Görsel açıklaması..." onKeyDown={e => { if (e.key === 'Enter') generateImage(); }} />
              <button onClick={() => { setShowImageBar(false); setImagePrompt(''); }}>×</button>
            </div>
          )}
          <button className="ib" onClick={() => setShowImageBar(!showImageBar)} dangerouslySetInnerHTML={{ __html: I.image }} />
          <button className="ib" onClick={() => setEmojiOpen(!emojiOpen)} dangerouslySetInnerHTML={{ __html: I.smile }} />
          {emojiOpen && (
            <div className="epop show"><div className="egrid">
              {['😀','😂','❤️','👍'].map(e => <span key={e} className="es" onClick={() => { setInput(prev => prev + e); setEmojiOpen(false); }}>{e}</span>)}
            </div></div>
          )}
          <textarea ref={inputRef} className="msg-inp" placeholder={t('send')} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} rows={1} />
          <button className="ib" style={{ background: 'var(--gr)' }} onClick={sendMessage} dangerouslySetInnerHTML={{ __html: I.send }} />
        </div>
      </main>

      {userPanelOpen && <UserPanel isInVoice={isInVoice} isMuted={isMuted} isDeafened={isDeafened} onToggleMute={() => { if (localStream) { const m = !isMuted; localStream.getAudioTracks().forEach(t => t.enabled = !m); setIsMuted(m); } }} onToggleDeafen={() => { setIsDeafened(!isDeafened); }} onLeaveVoice={() => leaveVoiceChannel(localStream, peerConnections, setIsInVoice, setIsMuted, setIsDeafened, setVoiceChannelId, socketRef)} onOpenModal={setActiveModal} onLogout={logout} t={t} lang={lang} setLang={setLang} />}

      {activeModal && (
        <div className="modal show" onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="mbox">
            <button className="mclose" onClick={() => setActiveModal(null)}>×</button>
            {activeModal === 'addChannel' && <><h2>Kanal Oluştur</h2><input className="mi" id="chName" placeholder="Kanal adı" /><button className="mb" onClick={() => { const n = document.getElementById('chName').value.trim(); if (n) { setChannels(prev => [...prev, { id: n.toLowerCase().replace(/\s+/g, '-'), name: n, type: 'text', category: 'METİN' }]); setActiveModal(null); } }}>Oluştur</button></>}
            {activeModal === 'addCategory' && <><h2>Kategori Ekle</h2><input className="mi" id="catName" placeholder="Kategori adı" /><button className="mb" onClick={() => { const n = document.getElementById('catName').value.trim().toUpperCase(); if (n) { setCategories(prev => [...prev, n]); setActiveModal(null); } }}>Ekle</button></>}
            {activeModal === 'serverSettings' && <ServerSettingsModal serverSettings={serverSettings} onSave={(n) => setServerSettings({ name: n })} onClose={() => setActiveModal(null)} />}
            {activeModal === 'dm' && <DMPanel dmFriends={dmFriends} activeDM={activeDM} dmInput={dmInput} onStartDM={(u) => { if (!dmFriends.find(f => f.username === u)) setDmFriends(prev => [...prev, { id: genId(), username: u, messages: [], time: 'Şimdi' }]); setActiveDM({ username: u, messages: dmFriends.find(f => f.username === u)?.messages || [] }); setActiveModal(null); }} onSendDM={() => { if (dmInput.trim() && activeDM) { const msg = { sender: user.username, text: dmInput.trim(), time: new Date().toISOString() }; setActiveDM(prev => ({ ...prev, messages: [...prev.messages, msg] })); setDmFriends(prev => prev.map(f => f.username === activeDM.username ? { ...f, messages: [...f.messages, msg], last: msg.text } : f)); setDmInput(''); } }} onSetDmInput={setDmInput} onAddFriend={(n) => { setDmFriends(prev => [...prev, { id: genId(), username: n, messages: [], time: 'Şimdi' }]); toast(n + ' eklendi'); }} t={t} />}
            {activeModal === 'addFriend' && <><h2>Arkadaş Ekle</h2><input className="mi" id="frName" placeholder="Kullanıcı adı" /><button className="mb" onClick={() => { const n = document.getElementById('frName').value.trim(); if (n) { setDmFriends(prev => [...prev, { id: genId(), username: n, messages: [], time: 'Şimdi' }]); setActiveModal(null); toast(n + ' eklendi'); } }}>Ekle</button></>}
            {activeModal === 'search' && <SearchModal query={searchQuery} setQuery={setSearchQuery} messages={messages} channels={channels} activeChannel={activeChannel} onSwitchChannel={switchChannel} onClose={() => setActiveModal(null)} t={t} />}
            {activeModal === 'theme' && <ThemeModal theme={theme} lightMode={lightMode} onSetTheme={(c) => { setTheme(c); localStorage.setItem('gt_ac', c); }} onToggleLight={() => setLightMode(!lightMode)} onClose={() => setActiveModal(null)} />}
            {activeModal === 'poll' && <PollModal onCreatePoll={(q, opts) => createPoll(q, opts, user, activeChannel, setPolls, setMessages)} onClose={() => setActiveModal(null)} />}
            {activeModal === 'roles' && <RoleManager roles={roles} setRoles={setRoles} onClose={() => setActiveModal(null)} />}
          </div>
        </div>
      )}

      <ContextMenu menu={ctxMenu} messages={messages} onDelete={deleteMessage} onPin={pinMessage} onClose={() => setCtxMenu(null)} />
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} />}
    </div>
  );
}

window.App = App;
console.log('✅ App fonksiyonu tanımlandı:', typeof App);
