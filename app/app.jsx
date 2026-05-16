import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io/client-dist';

const API = 'https://gettic-j49l.onrender.com';
const MAX_MSGS = 100;

// ===== SVG İKONLAR =====
const I = {
  hash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  smile: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  volume: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>,
  micOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="23" y1="1" x2="1" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 12v-2"/></svg>,
  deafen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>,
  poll: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  dm: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  wifi: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12.55a11 11 0 0 1 14 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>,
  wifiOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M5 12.55a11 11 0 0 1 14 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  video: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  screen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
};

// ===== RATE LIMITER =====
const RL = new Map();
function checkRL(key, max = 5, win = 3000) {
  const now = Date.now();
  const ts = (RL.get(key) || []).filter(t => now - t < win);
  if (ts.length >= max) return false;
  ts.push(now);
  RL.set(key, ts);
  return true;
}

// ===== APP COMPONENT =====
export default function App() {
  // State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gt_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(localStorage.getItem('gt_token'));
  const [socket, setSocket] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');

  // Kanal state
  const [channels, setChannels] = useState([
    { id: 'genel-sohbet', name: 'genel-sohbet', type: 'text', category: 'METİN' },
    { id: 'genel-ses', name: 'Genel Ses', type: 'voice', category: 'SES' },
    { id: 'kurallar', name: 'kurallar', type: 'forum', category: 'METİN' },
    { id: 'forum', name: 'forum', type: 'forum', category: 'FORUM' },
  ]);
  const [categories, setCategories] = useState(['METİN', 'SES', 'FORUM']);
  const [activeChannel, setActiveChannel] = useState({ id: 'genel-sohbet', name: 'genel-sohbet', topic: 'Sohbet odası' });
  const [unreadCounts, setUnreadCounts] = useState({});

  // Mesaj state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('gt_ac') || '#c94d8c');
  const [lang, setLang] = useState(localStorage.getItem('gt_lang') || 'tr');
  const [userStatus, setUserStatus] = useState('online');
  const [lightMode, setLightMode] = useState(localStorage.getItem('gt_light') === '1');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // DM state
  const [dmFriends, setDmFriends] = useState([]);
  const [dmUnread, setDmUnread] = useState({});
  const [activeDM, setActiveDM] = useState(null);
  const [dmInput, setDmInput] = useState('');

  // Ses state
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [voiceChannelId, setVoiceChannelId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnections, setPeerConnections] = useState(new Map());
  const [remoteAudioElements, setRemoteAudioElements] = useState([]);

  // Rol state
  const [roles, setRoles] = useState([
    { id: 'r1', name: 'Kurucu', color: '#fbbf24', permissions: { all: true }, position: 0 },
    { id: 'r2', name: 'Admin', color: '#ef4444', permissions: { manageServer: true, manageRoles: true, manageChannels: true, kick: true, ban: true, deleteMsg: true }, position: 1 },
    { id: 'r3', name: 'Moderatör', color: '#6366f1', permissions: { kick: true, deleteMsg: true }, position: 2 },
    { id: 'r4', name: 'Üye', color: '#9ca3af', permissions: { sendMsg: true, addReactions: true }, position: 3 },
  ]);
  const [userRoles, setUserRoles] = useState({});
  const [blockedUsers, setBlockedUsers] = useState([]);

  // Diğer state
  const [serverSettings, setServerSettings] = useState({ name: 'Gettic' });
  const [notifications, setNotifications] = useState([]);
  const [polls, setPolls] = useState({});
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [notifPermission, setNotifPermission] = useState(Notification.permission);

  // Refs
  const msgEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);

  // ===== ÇEVİRİ =====
  const L = {
    tr: { login: 'Giriş', register: 'Kayıt', send: 'Mesaj yaz...', online: 'Çevrimiçi', logout: 'Çıkış Yap', search: 'Ara...', noMessages: 'Henüz mesaj yok', birth: 'doğuşu', typing: 'yazıyor...', pinned: 'Sabitlenmiş', copy: 'Kopyala', delete: 'Sil', edit: 'Düzenle', pin: 'Sabitle', block: 'Engelle', unblock: 'Engeli Kaldır', kick: 'At', dm: 'DM', offline: 'Çevrimdışı', retry: 'Tekrar Dene', noChannels: 'Kanal yok', noDM: 'DM yok' },
    en: { login: 'Login', register: 'Register', send: 'Message...', online: 'Online', logout: 'Logout', search: 'Search...', noMessages: 'No messages', birth: 'beginning', typing: 'typing...', pinned: 'Pinned', copy: 'Copy', delete: 'Delete', edit: 'Edit', pin: 'Pin', block: 'Block', unblock: 'Unblock', kick: 'Kick', dm: 'DM', offline: 'Offline', retry: 'Retry', noChannels: 'No channels', noDM: 'No DMs' },
  };
  const t = (key) => (L[lang] || L.tr)[key] || key;

  // ===== YARDIMCI FONKSİYONLAR =====
  const toast = (msg, type = 's') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 2500);
  };

  const esc = (s) => {
    if (!s) return '';
    return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);
  };

  const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 7);

  const getHighestRole = (uid) => {
    const rids = userRoles[uid] || ['r4'];
    let h = roles[roles.length - 1];
    rids.forEach(rid => {
      const r = roles.find(x => x.id === rid);
      if (r && r.position < h.position) h = r;
    });
    return h;
  };

  const hasPermission = (uid, perm) => {
    if (!uid) return false;
    const rids = userRoles[uid] || ['r4'];
    for (const rid of rids) {
      const r = roles.find(x => x.id === rid);
      if (r && (r.permissions.all || r.permissions[perm])) return true;
    }
    return false;
  };

  const persistState = () => {
    const state = {
      channels, categories, dmFriends, roles, userRoles, serverSettings,
      pinnedMsg, userStatus, unreadCounts, blockedUsers, polls,
      lang, dmUnread, offlineQueue, captchaVerified,
    };
    localStorage.setItem('gt_state', JSON.stringify(state));
  };

  // ===== AUTH =====
  const doAuth = async (type, username, password) => {
    if (!checkRL('auth', 5, 10000)) return toast('Çok fazla deneme, bekleyin', 'e');
    try {
      const res = await fetch(`${API}/api/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Başarısız');
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('gt_token', data.token);
      localStorage.setItem('gt_user', JSON.stringify(data.user));
      if (!userRoles[data.user._id]) {
        setUserRoles(prev => ({ ...prev, [data.user._id]: ['r4'] }));
      }
      persistState();
    } catch (e) {
      toast(e.message, 'e');
    }
  };

  const logout = () => {
    localStorage.removeItem('gt_token');
    localStorage.removeItem('gt_user');
    localStorage.removeItem('gt_state');
    setUser(null);
    setToken(null);
    if (socketRef.current) socketRef.current.disconnect();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    peerConnections.forEach(pc => pc.close());
  };

  // ===== CAPTCHA =====
  const generateCaptcha = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  const verifyCaptcha = (input) => {
    if (input.toUpperCase() === captchaCode) {
      setCaptchaVerified(true);
      setCaptchaCode('');
      return true;
    }
    setCaptchaCode(generateCaptcha());
    return false;
  };

  // ===== SOCKET =====
  useEffect(() => {
    if (!token || !user) return;
    const sock = io(API, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 4, reconnectionDelay: 2000 });
    socketRef.current = sock;

    sock.on('connect', () => {
      sock.emit('join_channel', activeChannel.id);
      // Offline kuyruğu gönder
      if (offlineQueue.length) {
        offlineQueue.forEach(msg => sock.emit('send_message', msg));
        setOfflineQueue([]);
      }
    });

    sock.on('new_message', (msg) => {
      if (msg.channelId === activeChannel.id) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          const updated = [...prev, msg];
          return updated.slice(-MAX_MSGS);
        });
      } else {
        setUnreadCounts(prev => ({ ...prev, [msg.channelId]: (prev[msg.channelId] || 0) + 1 }));
      }
      if (msg.senderId !== user._id) {
        setNotifications(prev => [...prev, { text: `${msg.senderName}: ${msg.content.substring(0, 40)}`, time: new Date().toISOString() }]);
        if (notifPermission === 'granted') {
          try { new Notification(msg.senderName, { body: msg.content.substring(0, 50) }); } catch (e) { }
        }
      }
    });

    sock.on('user_typing', ({ username, channelId }) => {
      if (channelId === activeChannel.id && username !== user.username) {
        setTypingUsers(prev => ({ ...prev, [username]: Date.now() }));
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = { ...prev };
            delete next[username];
            return next;
          });
        }, 3000);
      }
    });

    sock.on('voice_answer', async (d) => {
      const pc = peerConnections.get(voiceChannelId);
      if (pc && d.sdp) await pc.setRemoteDescription(new RTCSessionDescription(d.sdp));
    });

    sock.on('voice_candidate', (d) => {
      const pc = peerConnections.get(voiceChannelId);
      if (pc && d.candidate) pc.addIceCandidate(new RTCIceCandidate(d.candidate));
    });

    sock.on('disconnect', () => setIsOnline(false));
    sock.on('connect', () => setIsOnline(true));

    return () => sock.disconnect();
  }, [token, activeChannel.id]);

  // ===== MESAJ YÜKLEME (MongoDB) =====
  const loadMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/channels/${activeChannel.id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.slice(-MAX_MSGS));
      }
    } catch (e) { }
  }, [token, activeChannel.id]);

  useEffect(() => {
    loadMessages();
    setUnreadCounts(prev => ({ ...prev, [activeChannel.id]: 0 }));
    if (socketRef.current) socketRef.current.emit('join_channel', activeChannel.id);
  }, [activeChannel.id, loadMessages]);

  // ===== MESAJ GÖNDERME =====
  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    if (!checkRL('send_' + user._id, 8, 5000)) return toast('Yavaş gönder', 'e');
    if (!hasPermission(user._id, 'sendMsg')) return toast('Yetkiniz yok', 'e');

    const content = input.trim();
    setInput('');

    const msg = {
      _id: genId(),
      content,
      senderName: user.username,
      senderId: user._id,
      channelId: activeChannel.id,
      createdAt: new Date().toISOString(),
      reactions: {},
    };

    setMessages(prev => [...prev, msg]);

    try {
      const res = await fetch(`${API}/api/channels/${activeChannel.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      if (res.status === 401) {
        toast('Oturum süresi doldu', 'e');
        logout();
      }
    } catch (e) {
      setOfflineQueue(prev => [...prev, msg]);
      toast('Çevrimdışı kaydedildi', 'w');
    }

    if (socketRef.current) socketRef.current.emit('send_message', msg);
    socketRef.current?.emit('typing', { channelId: activeChannel.id, username: user.username });
  };

  // ===== MESAJ İŞLEMLERİ =====
  const deleteMessage = (mid) => {
    const msg = messages.find(m => m._id === mid);
    if (!msg) return;
    if (msg.senderId !== user._id && !hasPermission(user._id, 'deleteMsg')) return toast('Yetkiniz yok', 'e');
    setMessages(prev => prev.filter(m => m._id !== mid));
    socketRef.current?.emit('delete_message', { id: mid, channelId: activeChannel.id });
    toast('Silindi');
  };

  const pinMessage = (mid) => {
    const msg = messages.find(m => m._id === mid);
    if (!msg) return;
    setPinnedMsg(msg);
    toast('📌 Sabitlendi');
  };

  const editMessage = (mid, newContent) => {
    setMessages(prev => prev.map(m => m._id === mid ? { ...m, content: newContent, edited: true } : m));
    setEditingMsg(null);
    socketRef.current?.emit('edit_message', { id: mid, content: newContent, channelId: activeChannel.id });
  };

  const addReaction = (mid, emoji) => {
    setMessages(prev => prev.map(m => {
      if (m._id !== mid) return m;
      const reactions = { ...m.reactions };
      if (!reactions[emoji]) reactions[emoji] = [];
      const idx = reactions[emoji].indexOf(user._id);
      if (idx === -1) reactions[emoji].push(user._id);
      else reactions[emoji].splice(idx, 1);
      if (!reactions[emoji].length) delete reactions[emoji];
      return { ...m, reactions };
    }));
  };

  // ===== TYPING =====
  const handleInputChange = (e) => {
    setInput(e.target.value);
    socketRef.current?.emit('typing', { channelId: activeChannel.id, username: user.username });
  };

  // ===== KANAL İŞLEMLERİ =====
  const switchChannel = (ch) => {
    setActiveChannel({ id: ch.id, name: ch.name, topic: 'Sohbet odası' });
    setSidebarOpen(false);
  };

  const createChannel = (name, type = 'text', cat = 'METİN') => {
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    if (channels.find(c => c.id === id)) return toast('Bu kanal zaten var', 'e');
    setChannels(prev => [...prev, { id, name, type, category: cat }]);
    if (!categories.includes(cat)) setCategories(prev => [...prev, cat]);
    toast(`# ${name} oluşturuldu`);
  };

  const deleteChannel = (id) => {
    if (!hasPermission(user._id, 'manageChannels') && !hasPermission(user._id, 'all')) return toast('Yetkiniz yok', 'e');
    setChannels(prev => prev.filter(c => c.id !== id));
    if (activeChannel.id === id) {
      const first = channels.find(c => c.type === 'text');
      if (first) setActiveChannel({ id: first.id, name: first.name, topic: 'Sohbet odası' });
    }
    toast('Kanal silindi');
  };

  // ===== DM İŞLEMLERİ =====
  const startDM = (username) => {
    if (!dmFriends.find(f => f.username === username)) {
      setDmFriends(prev => [...prev, { id: genId(), username, messages: [], time: 'Şimdi' }]);
    }
    setActiveDM({ username, messages: dmFriends.find(f => f.username === username)?.messages || [] });
  };

  const sendDMMessage = () => {
    if (!dmInput.trim() || !activeDM) return;
    const msg = { sender: user.username, text: dmInput.trim(), time: new Date().toISOString() };
    setActiveDM(prev => ({ ...prev, messages: [...prev.messages, msg] }));
    setDmFriends(prev => prev.map(f => f.username === activeDM.username ? { ...f, messages: [...f.messages, msg], last: msg.text } : f));
    setDmInput('');
    socketRef.current?.emit('dm_message', { to: activeDM.username, text: msg.text, sender: user.username });
  };

  // ===== SES İŞLEMLERİ =====
  const joinVoice = async (channelId) => {
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
        setRemoteAudioElements(prev => [...prev, audio]);
      };

      setPeerConnections(prev => new Map(prev).set(channelId, pc));
      socketRef.current?.emit('voice_join', { channel: channelId });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('voice_offer', { sdp: offer, channel: channelId });
    } catch (e) {
      toast('Mikrofon izni gerekli', 'e');
    }
  };

  const leaveVoice = () => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    peerConnections.forEach(pc => pc.close());
    remoteAudioElements.forEach(a => a.remove());
    setLocalStream(null);
    setPeerConnections(new Map());
    setRemoteAudioElements([]);
    setIsInVoice(false);
    setIsMuted(false);
    setIsDeafened(false);
    setVoiceChannelId(null);
    socketRef.current?.emit('voice_leave');
  };

  const toggleMute = () => {
    if (!localStream) return;
    const muted = !isMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !muted);
    setIsMuted(muted);
  };

  const toggleDeafen = () => {
    const deaf = !isDeafened;
    remoteAudioElements.forEach(a => a.muted = deaf);
    setIsDeafened(deaf);
  };

  // ===== ANKET =====
  const createPoll = (question, options) => {
    const mid = genId();
    setPolls(prev => ({ ...prev, [mid]: { question, options, votes: new Array(options.length).fill(0), voters: {} } }));
    const msg = {
      _id: mid,
      content: `📊 **${question}**\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`,
      senderName: user.username,
      senderId: user._id,
      channelId: activeChannel.id,
      createdAt: new Date().toISOString(),
      reactions: {},
    };
    setMessages(prev => [...prev, msg]);
  };

  const votePoll = (mid, opt) => {
    const poll = polls[mid];
    if (!poll || poll.voters[user._id] !== undefined) return toast('Zaten oy verdiniz', 'e');
    setPolls(prev => ({
      ...prev,
      [mid]: {
        ...prev[mid],
        voters: { ...prev[mid].voters, [user._id]: opt },
        votes: prev[mid].votes.map((v, i) => i === opt ? v + 1 : v),
      },
    }));
  };

  // ===== TEMA =====
  const toggleLight = () => {
    const isLight = !lightMode;
    setLightMode(isLight);
    localStorage.setItem('gt_light', isLight ? '1' : '0');
  };

  const setAppTheme = (primary) => {
    setTheme(primary);
    localStorage.setItem('gt_ac', primary);
    localStorage.setItem('gt_ac2', primary);
  };

  // ===== SCROLL =====
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== NETWORK =====
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ===== INIT =====
  useEffect(() => {
    const saved = localStorage.getItem('gt_state');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.channels) setChannels(data.channels);
        if (data.categories) setCategories(data.categories);
        if (data.dmFriends) setDmFriends(data.dmFriends);
        if (data.roles) setRoles(data.roles);
        if (data.userRoles) setUserRoles(data.userRoles);
        if (data.serverSettings) setServerSettings(data.serverSettings);
        if (data.userStatus) setUserStatus(data.userStatus);
        if (data.unreadCounts) setUnreadCounts(data.unreadCounts);
        if (data.blockedUsers) setBlockedUsers(data.blockedUsers);
        if (data.polls) setPolls(data.polls);
        if (data.lang) setLang(data.lang);
        if (data.dmUnread) setDmUnread(data.dmUnread);
        if (data.offlineQueue) setOfflineQueue(data.offlineQueue);
        if (data.captchaVerified) setCaptchaVerified(data.captchaVerified);
      } catch (e) { }
    }
    if (notifPermission === 'default') {
      Notification.requestPermission().then(p => setNotifPermission(p));
    }
    setLoading(false);
    if (!captchaCode) setCaptchaCode(generateCaptcha());
  }, []);

  // ===== STATE PERSIST =====
  useEffect(() => {
    if (!user) return;
    persistState();
  }, [channels, categories, dmFriends, roles, userRoles, serverSettings, userStatus, unreadCounts, blockedUsers, polls, lang, dmUnread, offlineQueue, captchaVerified]);

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spin" />
        <div className="ls-logo">gettic</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-wrap" style={{ '--ac': theme }}>
        <div className="auth-box">
          <img src="https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png" className="auth-logo" alt="Gettic" />
          <div className="auth-title">gettic</div>
          <div className="auth-sub">Türkçe sohbet platformu</div>
          {!captchaVerified ? (
            <CaptchaBox code={captchaCode} onVerify={verifyCaptcha} onRefresh={() => setCaptchaCode(generateCaptcha())} t={t} />
          ) : (
            <AuthForm onLogin={(u, p) => doAuth('login', u, p)} onRegister={(u, p) => doAuth('register', u, p)} t={t} />
          )}
        </div>
      </div>
    );
  }

  const typingNames = Object.keys(typingUsers).filter(u => typingUsers[u] > Date.now() - 3000);

  return (
    <div className="app" style={{ '--ac': theme, '--ac2': theme }}>
      {/* SERVER RAIL */}
      <nav className="rail">
        <div className="ri act" title={serverSettings.name}>{I.hash}</div>
        <div className="ri-sep" />
        <div className="ri" title="Sunucu ekle" onClick={() => setActiveModal('addServer')}>{I.plus}</div>
        <div className="ri" title="Tema değiştir" onClick={toggleLight}>{lightMode ? I.sun : I.moon}</div>
        <div className="ri ri-push" title={isOnline ? 'Bağlı' : 'Bağlantı yok'}>{isOnline ? I.wifi : I.wifiOff}</div>
      </nav>

      {/* CHANNEL SIDEBAR */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          {I.hash}<span>{serverSettings.name}</span>
        </div>
        <div className="sidebar-scroll">
          {categories.map(cat => (
            <div key={cat}>
              <div className="ch-cat">{cat}<button onClick={() => setActiveModal('addChannel')}>+</button></div>
              {channels.filter(ch => ch.category === cat).map(ch => (
                <div
                  key={ch.id}
                  className={`ch-item ${ch.id === activeChannel.id ? 'act' : ''}`}
                  onClick={() => ch.type === 'voice' ? joinVoice(ch.id) : switchChannel(ch)}
                >
                  <span>{ch.type === 'voice' ? I.volume : I.hash}</span>
                  <span className="ch-name">{ch.name}</span>
                  {unreadCounts[ch.id] > 0 && ch.id !== activeChannel.id && (
                    <span className="ub">{unreadCounts[ch.id]}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <button className="add-cat-btn" onClick={() => setActiveModal('addCategory')}>+ Kategori Ekle</button>
        <div className="sidebar-user">
          <div className="su-av">{user.username.charAt(0).toUpperCase()}<div className={`su-dot ${userStatus}`} /></div>
          <div className="su-info">
            <div className="su-name">{user.username}</div>
            <div className="su-tag">🟢 {t('online')}</div>
          </div>
        </div>
      </nav>

      {/* CHAT AREA */}
      <main className="chat">
        {/* Connection bar */}
        {!isOnline && (
          <div id="connbar" className="show">
            {I.wifiOff} {t('offline')} <button onClick={() => { socketRef.current?.connect(); setIsOnline(true); }}>{t('retry')}</button>
          </div>
        )}

        {/* Chat header */}
        <header className="chat-header">
          {I.hash}
          <div className="ch-hname"># {activeChannel.name}</div>
          <div className="hacts">
            <button className="ib" title="Ara (Ctrl+K)" onClick={() => setActiveModal('search')}>{I.search}</button>
            <button className="ib" title="Bildirimler" onClick={() => setActiveModal('notifications')}>{I.bell}</button>
            <button className="ib" title="Kanallar" onClick={() => setSidebarOpen(!sidebarOpen)}>{I.hash}</button>
            <button className="ib" title="Ayarlar" onClick={() => setUserPanelOpen(!userPanelOpen)}>{I.user}</button>
          </div>
        </header>

        {/* Messages */}
        <div className="msgs">
          <div className="msgs-inner">
            {pinnedMsg && (
              <div className="msg pinned">
                <div className="msg-av">{pinnedMsg.senderName?.charAt(0).toUpperCase()}</div>
                <div className="msg-body">
                  <div className="msg-head">
                    <span>{pinnedMsg.senderName}</span>
                    <span className="msg-time">📌 {t('pinned')}</span>
                  </div>
                  <div className="msg-text">{esc(pinnedMsg.content.substring(0, 100))}</div>
                </div>
                <button className="ib" onClick={() => setPinnedMsg(null)}>×</button>
              </div>
            )}
            {messages.length === 0 ? (
              <div className="empty-ch">
                {I.hash}
                <h4># {activeChannel.name} {t('birth')}</h4>
                <p>{t('noMessages')}</p>
              </div>
            ) : (
              messages.map(msg => (
                <MessageItem
                  key={msg._id}
                  msg={msg}
                  user={user}
                  polls={polls}
                  blockedUsers={blockedUsers}
                  userRoles={userRoles}
                  roles={roles}
                  t={t}
                  I={I}
                  onDelete={deleteMessage}
                  onPin={pinMessage}
                  onEdit={editMessage}
                  onReact={addReaction}
                  onUserClick={(uid) => setActiveModal('userInfo')}
                  editingMsg={editingMsg}
                  setEditingMsg={setEditingMsg}
                />
              ))
            )}
            <div ref={msgEndRef} />
          </div>
        </div>

        {/* Typing indicator */}
        <div className="typing">
          {typingNames.length > 0 && `${typingNames.join(', ')} ${t('typing')}`}
        </div>

        {/* Input area */}
        <div className="input-area">
          <button className="ib" onClick={() => document.getElementById('fileUpload')?.click()}>{I.image}</button>
          <input type="file" id="fileUpload" style={{ display: 'none' }} onChange={(e) => {
            const f = e.target.files[0];
            if (f && f.size < 10 * 1024 * 1024) setInput(prev => prev + ` [📎 ${f.name}] `);
          }} />
          <button className="ib" onClick={() => setEmojiOpen(!emojiOpen)}>{I.smile}</button>
          {emojiOpen && (
            <div className="epop show">
              <div className="egrid">
                {['😀','😂','❤️','🔥','🎉','👍','👎','🙏','🎮','💻','✨','✅','❌','😮','😢','😡','🥳','👋','🤔','😎','💯'].map(e => (
                  <span key={e} className="es" onClick={() => { setInput(prev => prev + e); setEmojiOpen(false); inputRef.current?.focus(); }}>{e}</span>
                ))}
              </div>
            </div>
          )}
          <textarea
            ref={inputRef}
            className="msg-inp"
            placeholder={t('send')}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            rows={1}
          />
          <button className="ib" style={{ background: 'var(--gr)' }} onClick={sendMessage}>{I.send}</button>
        </div>
      </main>

      {/* USER PANEL */}
      {userPanelOpen && (
        <aside className="sidebar" style={{ right: 0, width: 'var(--panel)', borderRight: 'none', borderLeft: '1px solid var(--b2)' }}>
          <div className="sidebar-header">{I.user} Panel</div>
          <div className="sidebar-scroll" style={{ padding: '8px' }}>
            {/* Voice bar */}
            {isInVoice && (
              <div className="vbar show">
                <div className="vbar-info">
                  <div className="vbar-st"><span className="vpulse" /> Sesli Kanal</div>
                </div>
                <div className="vctrl">
                  <button className={`vb ${isMuted ? 'muted' : ''}`} onClick={toggleMute}>{isMuted ? I.micOff : I.mic}</button>
                  <button className={`vb ${isDeafened ? 'muted' : ''}`} onClick={toggleDeafen}>{I.deafen}</button>
                  <button className="vb" style={{ background: 'var(--re)' }} onClick={leaveVoice}>{I.logout}</button>
                </div>
              </div>
            )}
            <button className="mb" onClick={() => setActiveModal('serverSettings')}>{I.settings} Sunucu</button>
            <button className="mb" onClick={() => setActiveModal('roles')}>{I.shield} Roller</button>
            <button className="mb" onClick={() => setActiveModal('dm')}>{I.dm} {t('dm')}</button>
            <button className="mb" onClick={() => setActiveModal('addFriend')}>{I.plus} Arkadaş</button>
            <button className="mb" onClick={() => setActiveModal('theme')}>{I.settings} Tema</button>
            <button className="mb" onClick={() => setActiveModal('poll')}>{I.poll} Anket</button>
            <button className="mb" onClick={() => { setLang(lang === 'tr' ? 'en' : 'tr'); localStorage.setItem('gt_lang', lang === 'tr' ? 'en' : 'tr'); }}>{I.globe} {lang.toUpperCase()}</button>
            <button className="mb danger" onClick={logout}>{I.logout} {t('logout')}</button>
          </div>
        </aside>
      )}

      {/* MODALS */}
      {activeModal && (
        <ModalManager
          activeModal={activeModal}
          setActiveModal={setActiveModal}
          channels={channels}
          categories={categories}
          roles={roles}
          userRoles={userRoles}
          user={user}
          serverSettings={serverSettings}
          theme={theme}
          dmFriends={dmFriends}
          dmUnread={dmUnread}
          messages={messages}
          activeChannel={activeChannel}
          t={t}
          I={I}
          onCreateChannel={createChannel}
          onDeleteChannel={deleteChannel}
          onSwitchChannel={switchChannel}
          onCreateServer={(name) => { setServerSettings({ name }); setChannels([{ id: 'genel-sohbet', name: 'genel-sohbet', type: 'text', category: 'METİN' }, { id: 'genel-ses', name: 'Genel Ses', type: 'voice', category: 'SES' }]); setCategories(['METİN', 'SES']); }}
          onAddCategory={(name) => setCategories(prev => [...prev, name])}
          onStartDM={startDM}
          onAddFriend={(u) => { setDmFriends(prev => [...prev, { id: genId(), username: u, messages: [], time: 'Şimdi' }]); toast(`${u} eklendi`); }}
          onSaveServer={(name) => setServerSettings({ name })}
          onSaveRole={(role) => setRoles(prev => prev.map(r => r.id === role.id ? role : r))}
          onAddRole={(role) => setRoles(prev => [...prev, role])}
          onCreatePoll={createPoll}
          onToggleBlock={(uid) => { setBlockedUsers(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]); }}
          onSetTheme={setAppTheme}
          onToggleLight={toggleLight}
          lightMode={lightMode}
          toast={toast}
        />
      )}

      {/* TOAST */}
      {toastMsg && (
        <div className={`toast ${toastMsg.type}`}>
          {toastMsg.msg}
        </div>
      )}

      {/* CONTEXT MENU */}
      {ctxMenu && (
        <div className="ctxmenu show" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          {ctxMenu.type === 'message' ? (
            <>
              <button onClick={() => { copyMsg(ctxMenu.mid); setCtxMenu(null); }}>{I.copy} {t('copy')}</button>
              <button onClick={() => { deleteMessage(ctxMenu.mid); setCtxMenu(null); }} className="danger">{I.trash} {t('delete')}</button>
              <button onClick={() => { pinMessage(ctxMenu.mid); setCtxMenu(null); }}>{I.pin} {t('pin')}</button>
            </>
          ) : (
            <>
              <button onClick={() => { setActiveModal('addChannel'); setCtxMenu(null); }}>{I.plus} Kanal Ekle</button>
              <button onClick={() => { setActiveModal('addCategory'); setCtxMenu(null); }}>📁 Kategori Ekle</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ===== MESAJ BİLEŞENİ =====
function MessageItem({ msg, user, polls, blockedUsers, userRoles, roles, t, I, onDelete, onPin, onEdit, onReact, editingMsg, setEditingMsg }) {
  if (blockedUsers.includes(msg.senderId)) return null;

  const role = getRole(msg.senderId, userRoles, roles);
  const badge = role && role.id !== 'r4'
    ? <span className="rbadge" style={{ background: role.color + '20', color: role.color }}>{role.name}</span>
    : null;

  const time = new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const poll = polls[msg._id];
  const isOwn = msg.senderId === user._id;
  const canDelete = isOwn || hasPerm(user._id, userRoles, roles, 'deleteMsg');

  return (
    <div className="msg" onContextMenu={(e) => {
      e.preventDefault();
      window._ctxMenu = { type: 'message', mid: msg._id, x: e.clientX, y: e.clientY };
    }}>
      <div className="msg-av" onClick={() => window._showUserInfo?.(msg.senderId, msg.senderName)}>
        {esc(msg.senderName?.charAt(0)?.toUpperCase() || '?')}
      </div>
      <div className="msg-body">
        <div className="msg-head">
          <span className="msg-un" onClick={() => window._showUserInfo?.(msg.senderId, msg.senderName)}>{esc(msg.senderName || '?')}</span>
          {badge}
          <span className="msg-time">{time}{msg.edited ? <span className="msg-edited"> (düzenlendi)</span> : null}</span>
        </div>
        {editingMsg === msg._id ? (
          <div>
            <input className="edit-inp" defaultValue={msg.content} onKeyDown={(e) => {
              if (e.key === 'Enter') onEdit(msg._id, e.target.value);
              if (e.key === 'Escape') setEditingMsg(null);
            }} />
            <div className="edit-acts">
              <button className="edit-btn save" onClick={() => onEdit(msg._id, document.querySelector('.edit-inp')?.value || msg.content)}>Kaydet</button>
              <button className="edit-btn cancel" onClick={() => setEditingMsg(null)}>İptal</button>
            </div>
          </div>
        ) : (
          <div className="msg-text" dangerouslySetInnerHTML={{ __html: formatMsg(msg.content) }} />
        )}
        {poll && <PollDisplay poll={poll} mid={msg._id} user={user} onVote={window._votePoll} />}
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
        {isOwn && <button onClick={() => setEditingMsg(msg._id)}>{I.edit}</button>}
        <button onClick={() => { navigator.clipboard.writeText(msg.content); }}>{I.copy}</button>
        <button onClick={() => onPin(msg._id)}>{I.pin}</button>
        {canDelete && <button onClick={() => onDelete(msg._id)} style={{ color: 'var(--re)' }}>{I.trash}</button>}
      </div>
    </div>
  );
}

// ===== YARDIMCI FONKSİYONLAR =====
function esc(s) { if (!s) return ''; return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]); }
function formatMsg(text) { return esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`([^`\n]+?)`/g, '<code>$1</code>'); }
function getRole(uid, userRoles, roles) { const rids = userRoles[uid] || ['r4']; let h = roles[roles.length - 1]; rids.forEach(rid => { const r = roles.find(x => x.id === rid); if (r && r.position < h.position) h = r; }); return h; }
function hasPerm(uid, userRoles, roles, perm) { if (!uid) return false; const rids = userRoles[uid] || ['r4']; for (const rid of rids) { const r = roles.find(x => x.id === rid); if (r && (r.permissions.all || r.permissions[perm])) return true; } return false; }

// ===== CAPTCHA =====
function CaptchaBox({ code, onVerify, onRefresh, t }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="cap-box">
      <div className="cap-title">{t('captchaTitle') || 'Güvenlik Doğrulaması'}</div>
      <canvas className="cap-cvs" width="240" height="72" ref={el => { if (el) drawCaptcha(el, code); }} />
      <input className="cap-inp" value={input} onChange={e => setInput(e.target.value)} maxLength={4} autoFocus
        onKeyDown={e => { if (e.key === 'Enter') { if (!onVerify(input)) { setError(t('captchaError') || 'Hatalı kod'); setInput(''); } else setError(''); } }} />
      <button className="cap-btn" onClick={() => { if (!onVerify(input)) { setError(t('captchaError') || 'Hatalı kod'); setInput(''); } }}>{t('captchaBtn') || 'Doğrula'}</button>
      {error && <div className="cap-err">{error}</div>}
      <span className="cap-ref" onClick={onRefresh}>{t('captchaRefresh') || 'Yenile'}</span>
    </div>
  );
}
function drawCaptcha(canvas, code) {
  const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#faf6f0'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(Math.random() * w, Math.random() * h); ctx.lineTo(Math.random() * w, Math.random() * h); ctx.strokeStyle = 'rgba(201,77,140,' + (Math.random() * .3 + .08) + ')'; ctx.lineWidth = Math.random() * 2 + .5; ctx.stroke(); }
  ctx.textBaseline = 'middle';
  code.split('').forEach((c, i) => { ctx.save(); ctx.translate(w / 5 * (i + .7), h / 2); ctx.rotate(Math.random() * .4 - .2); ctx.font = 'bold 28px "Courier New"'; ctx.fillStyle = '#c94d8c'; ctx.fillText(c, 0, 0); ctx.restore(); });
}

// ===== AUTH FORM =====
function AuthForm({ onLogin, onRegister, t }) {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  return (
    <div>
      <div className="auth-tabs">
        <button className={`auth-tab ${tab === 'login' ? 'act' : ''}`} onClick={() => setTab('login')}>{t('login')}</button>
        <button className={`auth-tab ${tab === 'register' ? 'act' : ''}`} onClick={() => setTab('register')}>{t('register')}</button>
      </div>
      <input className="mi" value={username} onChange={e => setUsername(e.target.value)} placeholder="Kullanıcı adı" />
      <input className="mi" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Şifre"
        onKeyDown={e => { if (e.key === 'Enter') tab === 'login' ? onLogin(username, password) : onRegister(username, password); }} />
      <button className="mb" onClick={() => tab === 'login' ? onLogin(username, password) : onRegister(username, password)}>
        {tab === 'login' ? t('login') : t('register')}
      </button>
      {error && <div style={{ color: 'var(--re)', marginTop: 8, fontSize: 11 }}>{error}</div>}
    </div>
  );
}

// ===== POLL DISPLAY =====
function PollDisplay({ poll, mid, user, onVote }) {
  const total = poll.votes.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="poll-box">
      <div className="poll-q">📊 {poll.question}</div>
      <div className="poll-opts">
        {poll.options.map((o, i) => {
          const pct = Math.round((poll.votes[i] / total) * 100);
          const voted = poll.voters[user._id] === i;
          return (
            <div key={i} className={`poll-opt ${voted ? 'voted' : ''}`} onClick={() => onVote?.(mid, i)}>
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

// ===== MODAL YÖNETİCİ =====
function ModalManager({ activeModal, setActiveModal, channels, categories, roles, user, serverSettings, dmFriends, messages, activeChannel, t, I, onCreateChannel, onDeleteChannel, onSwitchChannel, onCreateServer, onAddCategory, onStartDM, onAddFriend, onSaveServer, onSaveRole, onAddRole, onCreatePoll, onToggleBlock, onSetTheme, onToggleLight, lightMode, toast }) {
  const close = () => setActiveModal(null);
  const [input, setInput] = useState('');
  const [input2, setInput2] = useState('');
  const [input3, setInput3] = useState('');

  switch (activeModal) {
    case 'addChannel':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>{I.plus} Kanal Oluştur</h2>
            <input className="mi" value={input} onChange={e => setInput(e.target.value)} placeholder="Kanal adı" />
            <button className="mb" onClick={() => { if (input.trim()) { onCreateChannel(input.trim()); setInput(''); close(); } }}>Oluştur</button>
          </div>
        </div>
      );
    case 'addServer':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>{I.plus} Sunucu Oluştur</h2>
            <input className="mi" value={input} onChange={e => setInput(e.target.value)} placeholder="Sunucu adı" />
            <button className="mb" onClick={() => { if (input.trim()) { onCreateServer(input.trim()); setInput(''); close(); } }}>Oluştur</button>
          </div>
        </div>
      );
    case 'addCategory':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>{I.plus} Kategori Ekle</h2>
            <input className="mi" value={input} onChange={e => setInput(e.target.value)} placeholder="Kategori adı" />
            <button className="mb" onClick={() => { if (input.trim()) { onAddCategory(input.trim().toUpperCase()); setInput(''); close(); } }}>Ekle</button>
          </div>
        </div>
      );
    case 'serverSettings':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>{I.settings} Sunucu Ayarları</h2>
            <input className="mi" defaultValue={serverSettings.name} onChange={e => setInput(e.target.value)} placeholder="Sunucu adı" />
            <button className="mb" onClick={() => { if (input.trim()) { onSaveServer(input.trim()); close(); } }}>Kaydet</button>
          </div>
        </div>
      );
    case 'dm':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>{I.dm} {t('dm')}</h2>
            <button className="mb sec" onClick={() => setActiveModal('dmNew')}>{I.plus} Yeni DM</button>
            {dmFriends.map(f => (
              <div key={f.id} className="mitem" onClick={() => { onStartDM(f.username); close(); }}>
                <div className="mav">{f.username.charAt(0).toUpperCase()}</div>
                <div className="minfo"><div className="mname">{f.username}</div><div className="msub">{f.last || 'DM başlat'}</div></div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'dmNew':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>{I.plus} Yeni DM</h2>
            <input className="mi" placeholder="Kullanıcı adı" onKeyDown={e => { if (e.key === 'Enter') { onStartDM(e.target.value); close(); } }} />
            <button className="mb" onClick={() => { if (input.trim()) { onStartDM(input.trim()); close(); } }}>Başlat</button>
          </div>
        </div>
      );
    case 'addFriend':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>{I.plus} Arkadaş Ekle</h2>
            <input className="mi" placeholder="Kullanıcı adı" onChange={e => setInput(e.target.value)} />
            <button className="mb" onClick={() => { if (input.trim()) { onAddFriend(input.trim()); setInput(''); close(); } }}>Ekle</button>
          </div>
        </div>
      );
    case 'search':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>{I.search} {t('search')}</h2>
            <input className="mi" placeholder={t('search') + '...'} onChange={e => setInput(e.target.value)} autoFocus />
            {messages.filter(m => (m.content || '').toLowerCase().includes(input.toLowerCase())).slice(-10).map(m => (
              <div key={m._id} className="mitem" onClick={() => { onSwitchChannel(channels.find(c => c.id === m.channelId) || activeChannel); close(); }}>
                <div className="mav">{m.senderName?.charAt(0)}</div>
                <div className="minfo"><div className="mname">{m.senderName}</div><div className="msub">{m.content.substring(0, 60)}</div></div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'theme':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>Tema</h2>
            <div className="color-row">
              {['#c94d8c', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6'].map(c => (
                <div key={c} className="color-swatch" style={{ background: c }} onClick={() => { onSetTheme(c); close(); }} />
              ))}
            </div>
            <div className="msep" />
            <button className="mb sec" onClick={() => { onToggleLight(); close(); }}>{lightMode ? I.moon : I.sun} Aydınlık/Karanlık</button>
          </div>
        </div>
      );
    case 'poll':
      return (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="mbox">
            <button className="mclose" onClick={close}>×</button>
            <h2>{I.poll} Anket</h2>
            <input className="mi" placeholder="Soru" onChange={e => setInput(e.target.value)} />
            <input className="mi" placeholder="Seçenek 1" onChange={e => setInput2(e.target.value)} />
            <input className="mi" placeholder="Seçenek 2" onChange={e => setInput3(e.target.value)} />
            <button className="mb" onClick={() => { if (input && input2 && input3) { onCreatePoll(input, [input2, input3]); close(); } }}>Başlat</button>
          </div>
        </div>
      );
    default:
      return null;
  }
    }
