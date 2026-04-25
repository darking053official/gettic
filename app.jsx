// App.jsx - Gettic React Admin Panel
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// ============ STYLES ============
const styles = {
  container: {
    display: 'flex', height: '100vh', background: '#0a0a12', color: '#e8e8f0',
    fontFamily: "'Inter', sans-serif"
  },
  sidebar: {
    width: 240, background: '#0f0f1a', borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  sidebarHeader: {
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8
  },
  logo: { width: 32, height: 32, borderRadius: 8 },
  navItem: {
    padding: '10px 20px', cursor: 'pointer', fontSize: 14, color: '#a0a0c0',
    display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s'
  },
  navItemActive: { background: '#1a1a2e', color: '#5b6af0', fontWeight: 600 },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: 18, fontWeight: 700, display: 'flex', justifyContent: 'space-between'
  },
  content: { flex: 1, overflowY: 'auto', padding: 24 },
  card: {
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 24, marginBottom: 16
  },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#5b6af0' },
  input: {
    width: '100%', padding: '10px 14px', background: '#0f0f1a',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
    color: '#e8e8f0', fontSize: 14, marginBottom: 10, outline: 'none'
  },
  button: {
    padding: '10px 20px', background: '#5b6af0', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
    fontSize: 14, transition: 'all 0.2s'
  },
  buttonDanger: { background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 10 },
  th: { textAlign: 'left', padding: '10px 14px', background: '#0f0f1a', fontSize: 12, fontWeight: 600, color: '#a0a0c0', textTransform: 'uppercase' },
  td: { padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  statBox: {
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 24, textAlign: 'center'
  },
  statNumber: { fontSize: 36, fontWeight: 800, color: '#5b6af0' },
  statLabel: { fontSize: 13, color: '#a0a0c0', marginTop: 4 },
  chatArea: {
    flex: 1, overflowY: 'auto', padding: '16px 24px',
    display: 'flex', flexDirection: 'column', gap: 4
  },
  chatMsg: { padding: '6px 0', display: 'flex', gap: 10 },
  chatAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: '#5b6af0', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0
  },
  chatInput: {
    display: 'flex', gap: 8, padding: '12px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0f0f1a'
  }
};

// ============ ICONS ============
const Icons = {
  chat: '💬', bot: '🤖', webhook: '🔗', server: '🏠',
  users: '👥', settings: '⚙️', stats: '📊', plus: '＋',
  trash: '🗑️', copy: '📋', refresh: '🔄'
};

// ============ HOOKS ============
function useAPI(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('gettic_token');

  useEffect(() => {
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, [url]);

  return { data, loading, error };
}

// ============ COMPONENTS ============

// Sidebar
function Sidebar({ active, setActive }) {
  const items = [
    { id: 'chat', icon: Icons.chat, label: 'Sohbet' },
    { id: 'servers', icon: Icons.server, label: 'Sunucular' },
    { id: 'bots', icon: Icons.bot, label: 'Botlar' },
    { id: 'webhooks', icon: Icons.webhook, label: 'Webhooklar' },
    { id: 'stats', icon: Icons.stats, label: 'İstatistikler' },
  ];

  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <img
          src="https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png"
          alt="Gettic" style={styles.logo}
        />
        <span>Gettic Panel</span>
      </div>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            ...styles.navItem,
            ...(active === item.id ? styles.navItemActive : {})
          }}
          onClick={() => setActive(item.id)}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Chat View
function ChatView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    fetch('/api/channels/genel/messages')
      .then(r => r.json())
      .then(d => setMessages(d || []));

    return () => socket.disconnect();
  }, []);

  const send = () => {
    if (!input.trim()) return;
    socketRef.current?.emit('send-message', {
      content: input,
      senderId: 'admin',
      senderName: 'Admin',
      roomId: 'genel',
      type: 'text'
    });
    setInput('');
  };

  return (
    <>
      <div style={styles.topbar}>
        <span>💬 Sohbet</span>
        <span style={{ fontSize: 13, color: '#a0a0c0' }}>{messages.length} mesaj</span>
      </div>
      <div style={styles.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={styles.chatMsg}>
            <div style={styles.chatAvatar}>
              {(msg.senderName || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                {msg.senderName}
                <span style={{ fontSize: 10, color: '#606080', marginLeft: 8 }}>
                  {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: 14, color: '#e8e8f0' }}>{msg.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={styles.chatInput}>
        <input
          style={{ ...styles.input, marginBottom: 0, flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Mesaj yaz..."
        />
        <button style={styles.button} onClick={send}>Gönder</button>
      </div>
    </>
  );
}

// Servers View
function ServersView() {
  const { data: servers, loading } = useAPI('/api/servers');
  const [name, setName] = useState('');

  const createServer = async () => {
    if (!name.trim()) return;
    await fetch('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, template: 'default' })
    });
    setName('');
    window.location.reload();
  };

  if (loading) return <div style={{ padding: 40, color: '#606080' }}>Yükleniyor...</div>;

  return (
    <>
      <div style={styles.topbar}>
        <span>{Icons.server} Sunucular</span>
        <span style={{ fontSize: 13, color: '#a0a0c0' }}>{servers?.length || 0} sunucu</span>
      </div>
      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Sunucu Oluştur</div>
          <input
            style={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Sunucu adı..."
          />
          <button style={styles.button} onClick={createServer}>
            {Icons.plus} Oluştur
          </button>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Tüm Sunucular</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sunucu</th>
                <th style={styles.th}>Davet Kodu</th>
                <th style={styles.th}>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {servers?.map(srv => (
                <tr key={srv._id}>
                  <td style={styles.td}>
                    <img src={srv.icon || ''} style={{ width: 24, height: 24, borderRadius: 6, marginRight: 8, objectFit: 'cover' }} alt="" />
                    {srv.name}
                  </td>
                  <td style={styles.td}>
                    <code style={{ background: '#0f0f1a', padding: '3px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                      onClick={() => navigator.clipboard.writeText(srv.inviteCode)}>
                      {srv.inviteCode} {Icons.copy}
                    </code>
                  </td>
                  <td style={styles.td}>{new Date(srv.createdAt).toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// Bots View
function BotsView() {
  const { data: bots, loading } = useAPI('/api/bots');
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('/');

  const createBot = async () => {
    if (!name.trim()) return;
    await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, prefix })
    });
    setName('');
    window.location.reload();
  };

  if (loading) return <div style={{ padding: 40, color: '#606080' }}>Yükleniyor...</div>;

  return (
    <>
      <div style={styles.topbar}>
        <span>{Icons.bot} Botlar</span>
        <span style={{ fontSize: 13, color: '#a0a0c0' }}>{bots?.length || 0} bot</span>
      </div>
      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Bot Oluştur</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={{ ...styles.input, flex: 2 }} value={name} onChange={e => setName(e.target.value)} placeholder="Bot adı..." />
            <input style={{ ...styles.input, flex: 1 }} value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="/" maxLength={5} />
          </div>
          <button style={styles.button} onClick={createBot}>{Icons.plus} Oluştur</button>
        </div>
        <div style={styles.grid}>
          {bots?.map(bot => (
            <div key={bot._id} style={styles.card}>
              <div style={styles.cardTitle}>{Icons.bot} {bot.name}</div>
              <p style={{ fontSize: 13, color: '#a0a0c0', marginBottom: 10 }}>
                Prefix: <code>{bot.prefix}</code> · {bot.isOnline ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
              </p>
              <div style={{
                background: '#0f0f1a', padding: '8px 12px', borderRadius: 6,
                fontFamily: 'monospace', fontSize: 11, color: '#a0a0c0',
                cursor: 'pointer', marginBottom: 10, wordBreak: 'break-all'
              }} onClick={() => navigator.clipboard.writeText(bot.token)}>
                {bot.token} {Icons.copy}
              </div>
              <button
                style={{ ...styles.button, ...styles.buttonDanger }}
                onClick={async () => {
                  await fetch(`/api/bots/${bot._id}`, { method: 'DELETE' });
                  window.location.reload();
                }}
              >
                {Icons.trash} Sil
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Webhooks View
function WebhooksView() {
  const { data: webhooks, loading } = useAPI('/api/webhooks');
  const { data: servers } = useAPI('/api/servers');
  const [name, setName] = useState('');
  const [selectedServer, setSelectedServer] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');

  const createWebhook = async () => {
    if (!name.trim() || !selectedServer || !selectedChannel) return;
    await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, serverId: selectedServer, channelId: selectedChannel })
    });
    setName('');
    window.location.reload();
  };

  if (loading) return <div style={{ padding: 40, color: '#606080' }}>Yükleniyor...</div>;

  return (
    <>
      <div style={styles.topbar}>
        <span>{Icons.webhook} Webhooklar</span>
        <span style={{ fontSize: 13, color: '#a0a0c0' }}>{webhooks?.length || 0} webhook</span>
      </div>
      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Webhook Oluştur</div>
          <input style={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Webhook adı..." />
          <select style={styles.input} value={selectedServer} onChange={e => setSelectedServer(e.target.value)}>
            <option value="">Sunucu seçin</option>
            {servers?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select style={styles.input} value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)}>
            <option value="">Kanal seçin</option>
            <option value="genel">genel</option>
          </select>
          <button style={styles.button} onClick={createWebhook}>{Icons.plus} Oluştur</button>
        </div>
        <div style={styles.grid}>
          {webhooks?.map(wh => (
            <div key={wh._id} style={styles.card}>
              <div style={styles.cardTitle}>{Icons.webhook} {wh.name}</div>
              <p style={{ fontSize: 13, color: '#a0a0c0', marginBottom: 10 }}>
                URL:
              </p>
              <div style={{
                background: '#0f0f1a', padding: '8px 12px', borderRadius: 6,
                fontFamily: 'monospace', fontSize: 11, color: '#a0a0c0',
                cursor: 'pointer', marginBottom: 10, wordBreak: 'break-all'
              }} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook/${wh.token}`)}>
                {window.location.origin}/api/webhook/{wh.token} {Icons.copy}
              </div>
              <button
                style={{ ...styles.button, ...styles.buttonDanger }}
                onClick={async () => {
                  await fetch(`/api/webhooks/${wh._id}`, { method: 'DELETE' });
                  window.location.reload();
                }}
              >
                {Icons.trash} Sil
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Stats View
function StatsView() {
  const { data: servers } = useAPI('/api/servers');
  const { data: bots } = useAPI('/api/bots');
  const { data: webhooks } = useAPI('/api/webhooks');

  return (
    <>
      <div style={styles.topbar}>
        <span>{Icons.stats} İstatistikler</span>
      </div>
      <div style={styles.content}>
        <div style={styles.grid}>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{servers?.length || 0}</div>
            <div style={styles.statLabel}>Sunucu</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{bots?.length || 0}</div>
            <div style={styles.statLabel}>Bot</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statNumber}>{webhooks?.length || 0}</div>
            <div style={styles.statLabel}>Webhook</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============ APP ============
export default function App() {
  const [active, setActive] = useState('chat');

  return (
    <div style={styles.container}>
      <Sidebar active={active} setActive={setActive} />
      <div style={styles.main}>
        {active === 'chat' && <ChatView />}
        {active === 'servers' && <ServersView />}
        {active === 'bots' && <BotsView />}
        {active === 'webhooks' && <WebhooksView />}
        {active === 'stats' && <StatsView />}
      </div>
    </div>
  );
    }
