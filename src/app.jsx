import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

// ============ CONTEXTS ============
const AuthContext = createContext();
const SocketContext = createContext();
const ThemeContext = createContext();
const ToastContext = createContext();

function useAuth() { return useContext(AuthContext); }
function useSocket() { return useContext(SocketContext); }
function useTheme() { return useContext(ThemeContext); }
function useToast() { return useContext(ToastContext); }

// ============ TOAST ============
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-lg ${
                toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ============ AUTH PROVIDER ============
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('gt_token'));
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (token) {
      fetch(import.meta.env.VITE_API_URL + '/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data._id) {
            setUser(data);
          } else {
            localStorage.removeItem('gt_token');
            setToken(null);
          }
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('gt_token');
          setToken(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('gt_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast('Giriş başarılı!', 'success');
      return data.user;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const register = async (username, password) => {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('gt_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast('Kayıt başarılı!', 'success');
      return data.user;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('gt_token');
    setToken(null);
    setUser(null);
    showToast('Çıkış yapıldı', 'success');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============ SOCKET PROVIDER ============
function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      const newSocket = io(import.meta.env.VITE_API_URL, {
        auth: { token },
        transports: ['websocket']
      });
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

// ============ THEME PROVIDER ============
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('gt_theme') || 'dark');
  const [font, setFont] = useState(localStorage.getItem('gt_font') || 'inter');
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('gt_fontSize')) || 14);

  useEffect(() => {
    localStorage.setItem('gt_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('gt_font', font);
    document.documentElement.setAttribute('data-font', font);
  }, [font]);

  useEffect(() => {
    localStorage.setItem('gt_fontSize', fontSize);
    document.documentElement.style.fontSize = fontSize + 'px';
  }, [fontSize]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, font, setFont, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============ LOADING SCREEN ============
function LoadingScreen() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#04040e] flex flex-col items-center justify-center gap-6 z-[99999]"
    >
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[#6366f1]/20"></div>
        <div className="absolute inset-0 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-2 border-[#a855f7] border-b-transparent animate-spin animation-delay-300"></div>
      </div>
      <motion.p 
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="font-mono text-sm text-[#4a4a6a]"
      >
        Gettic yükleniyor...
      </motion.p>
    </motion.div>
  );
}

// ============ LOGIN COMPONENT ============
function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      // Hata zaten toast ile gösteriliyor
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-[#04040e] flex items-center justify-center z-[9999]"
      style={{ backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(99,102,241,0.3) 0%, transparent 70%)' }}
    >
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-[#0d0d24] border border-[#2a2a35] rounded-2xl p-10 w-[400px] max-w-[94vw] shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <motion.img 
            whileHover={{ scale: 1.05 }}
            src="https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png" 
            alt="Gettic"
            className="w-10 h-10 rounded-lg"
          />
          <span className="text-2xl font-extrabold font-['Syne'] tracking-tight bg-gradient-to-r from-[#818cf8] to-[#a5b4fc] bg-clip-text text-transparent">
            gettic
          </span>
        </div>

        <div className="flex gap-1 bg-[#08081a] rounded-lg p-1 mb-6">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${isLogin ? 'bg-[#202038] text-white shadow-lg' : 'text-[#4a4a6a]'}`}
            onClick={() => setIsLogin(true)}
          >
            Giriş
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.98 }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${!isLogin ? 'bg-[#202038] text-white shadow-lg' : 'text-[#4a4a6a]'}`}
            onClick={() => setIsLogin(false)}
          >
            Kayıt
          </motion.button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-[#4a4a6a] uppercase tracking-wide mb-1.5">
              Kullanıcı Adı
            </label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="text"
              className="w-full p-3 bg-[#08081a] border border-[#1a1a2e] rounded-lg text-white text-sm focus:border-[#6366f1] outline-none transition-all"
              placeholder="kullanici_adin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-[10px] font-bold text-[#4a4a6a] uppercase tracking-wide mb-1.5">
              Şifre
            </label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="password"
              className="w-full p-3 bg-[#08081a] border border-[#1a1a2e] rounded-lg text-white text-sm focus:border-[#6366f1] outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-lg text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#6366f1]/30 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            ) : (
              isLogin ? 'Giriş Yap' : 'Kayıt Ol'
            )}
          </motion.button>
        </form>

        <p className="text-center text-xs text-[#4a4a6a] mt-4">
          <motion.span 
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#a5b4fc] font-semibold cursor-pointer hover:underline inline-block"
          >
            {isLogin ? 'Hesabın yok mu? Kayıt ol' : 'Hesabın var mı? Giriş yap'}
          </motion.span>
        </p>
      </motion.div>
    </motion.div>
  );
}

// ============ SERVER RAIL COMPONENT ============
function ServerRail({ onSelect, selectedId }) {
  const [servers, setServers] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/api/servers', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setServers)
      .catch(console.error);
  }, [token]);

  return (
    <div className="w-[60px] flex-shrink-0 bg-[#04040e] flex flex-col items-center py-2 gap-1 border-r border-[#1a1a2e] overflow-y-auto">
      <motion.button
        whileHover={{ scale: 1.1, borderRadius: '13px' }}
        whileTap={{ scale: 0.95 }}
        className="w-[42px] h-[42px] rounded-full bg-[#0d0d24] flex items-center justify-center text-[#4a4a6a] hover:border-[#6366f1] hover:text-[#6366f1] transition-all"
        onClick={() => window.location.href = '/dm'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.1, borderRadius: '13px' }}
        whileTap={{ scale: 0.95 }}
        className="w-[42px] h-[42px] rounded-full bg-[#0d0d24] flex items-center justify-center text-[#4a4a6a] hover:border-[#6366f1] hover:text-[#6366f1] transition-all"
        onClick={() => window.location.href = '/discover'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </motion.button>

      <div className="w-[28px] h-[1px] bg-[#1a1a2e] my-2"></div>

      <AnimatePresence>
        {servers.map(server => (
          <motion.button
            key={server._id}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.1, borderRadius: '13px' }}
            whileTap={{ scale: 0.95 }}
            className={`w-[42px] h-[42px] rounded-full bg-[#0d0d24] flex items-center justify-center text-white font-bold text-sm transition-all relative ${
              selectedId === server._id ? 'border-2 border-[#6366f1] bg-[#6366f1]/20 rounded-[13px]' : ''
            }`}
            onClick={() => onSelect(server)}
          >
            {server.icon ? (
              <img src={server.icon} className="w-full h-full object-cover rounded-full" />
            ) : (
              server.name?.charAt(0).toUpperCase()
            )}
          </motion.button>
        ))}
      </AnimatePresence>

      <div className="w-[28px] h-[1px] bg-[#1a1a2e] my-2"></div>

      <motion.button
        whileHover={{ scale: 1.1, borderRadius: '13px', borderColor: '#22c55e', background: 'rgba(34,197,94,0.1)' }}
        whileTap={{ scale: 0.95 }}
        className="w-[42px] h-[42px] rounded-full bg-[#0d0d24] border-2 border-dashed border-[#2a2a35] flex items-center justify-center text-[#22c55e] transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </motion.button>
    </div>
  );
}

// ============ CHANNEL LIST ============
function ChannelList({ server, onSelectChannel, selectedId }) {
  const [channels, setChannels] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    if (server) {
      fetch(import.meta.env.VITE_API_URL + `/api/servers/${server._id}/channels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(setChannels)
        .catch(console.error);
    }
  }, [server, token]);

  if (!server) {
    return (
      <div className="w-[224px] flex-shrink-0 bg-[#08081a] border-r border-[#1a1a2e] flex flex-col">
        <div className="h-[46px] border-b border-[#1a1a2e] flex items-center px-3">
          <span className="font-bold text-sm">Gettic</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[#4a4a6a] text-sm">
          Bir sunucu seç
        </div>
      </div>
    );
  }

  return (
    <div className="w-[224px] flex-shrink-0 bg-[#08081a] border-r border-[#1a1a2e] flex flex-col">
      <div className="h-[46px] border-b border-[#1a1a2e] flex items-center justify-between px-3 bg-[#0d0d24]">
        <span className="font-bold text-sm font-['Syne']">{server.name}</span>
        <button className="w-6 h-6 rounded-md flex items-center justify-center text-[#4a4a6a] hover:bg-[#1a1a2e] transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 1 21 12a10 10 0 0 1-1.93 7.07M4.93 4.93A10 10 0 0 0 3 12a10 10 0 0 0 1.93 7.07M12 2v2M12 20v2M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1 custom-scroll">
        {channels.map(channel => (
          <motion.div
            key={channel._id}
            whileHover={{ x: 4 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md mx-1 cursor-pointer text-[13px] transition-all ${
              selectedId === channel._id ? 'bg-[#202038] text-white' : 'text-[#4a4a6a] hover:bg-[#141422] hover:text-[#9090b8]'
            }`}
            onClick={() => onSelectChannel(channel)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
              <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
            </svg>
            <span className="flex-1 truncate">{channel.name}</span>
          </motion.div>
        ))}
      </div>

      <div className="p-2 border-t border-[#1a1a2e] flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1] font-bold text-xs">
          {server.owner?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{server.ownerName || 'Kullanıcı'}</div>
          <div className="text-[10px] text-[#4a4a6a]">Çevrimiçi</div>
        </div>
        <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#4a4a6a] hover:bg-[#1a1a2e] transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>
      </div>
    </div>
  );
}

// ============ CHAT AREA ============
function ChatArea({ channel }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState([]);
  const messagesEndRef = useRef(null);
  const socket = useSocket();
  const { user } = useAuth();
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (channel && socket) {
      socket.emit('join_channel', channel._id);
      
      fetch(import.meta.env.VITE_API_URL + `/api/channels/${channel._id}/messages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('gt_token')}` }
      })
        .then(res => res.json())
        .then(setMessages)
        .catch(console.error);
    }
  }, [channel, socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (msg) => {
      if (msg.channelId === channel?._id) {
        setMessages(prev => [...prev, msg]);
      }
    });

    socket.on('user_typing', ({ username, channelId }) => {
      if (channelId === channel?._id && username !== user?.username) {
        setTyping(prev => [...prev, username]);
        setTimeout(() => setTyping(prev => prev.filter(u => u !== username)), 2000);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
    };
  }, [socket, channel, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !channel) return;
    
    const msg = { content: newMessage, channelId: channel._id };
    socket?.emit('send_message', msg);
    setNewMessage('');
  };

  const handleTyping = () => {
    socket?.emit('typing', { channelId: channel?._id, username: user?.username });
  };

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#4a4a6a]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          className="text-center"
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4">
            <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
            <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
          </svg>
          <h2 className="text-xl font-bold font-['Syne'] mb-2">Gettic'e Hoş Geldin!</h2>
          <p className="text-sm">Bir kanal seçerek sohbete başla</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-[46px] border-b border-[#1a1a2e] flex items-center px-4 gap-2 bg-[#0d0d24]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
          <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
        </svg>
        <span className="font-bold text-sm">{channel.name}</span>
        <span className="text-[10px] text-[#4a4a6a] font-mono ml-2">ID: {channel._id?.slice(-8)}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scroll">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 px-2 py-1.5 rounded-lg hover:bg-[#141422] transition-colors group ${msg.senderId === user?._id ? 'flex-row-reverse' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1] font-bold text-xs flex-shrink-0">
                {msg.senderName?.charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[70%] ${msg.senderId === user?._id ? 'text-right' : ''}`}>
                <div className="flex items-center gap-1 text-xs mb-0.5">
                  <span className="font-semibold">{msg.senderName}</span>
                  <span className="text-[10px] text-[#4a4a6a]">{new Date(msg.createdAt).toLocaleTimeString('tr-TR')}</span>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-sm ${msg.senderId === user?._id ? 'bg-[#6366f1] text-white' : 'bg-[#1a1a2e]'}`}>
                  {msg.content}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button className="w-6 h-6 rounded-md flex items-center justify-center text-[#4a4a6a] hover:bg-[#2a2a35]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-[#1a1a2e]">
        <div className="flex gap-2 bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-2 focus-within:border-[#6366f1] transition-colors">
          <textarea
            className="flex-1 bg-transparent text-white text-sm resize-none outline-none max-h-24 min-h-[36px]"
            rows="1"
            placeholder={`#${channel.name} kanalına mesaj gönder...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            onInput={handleTyping}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center text-white shadow-lg"
            onClick={sendMessage}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </motion.button>
        </div>
        {typing.length > 0 && (
          <div className="text-[10px] text-[#4a4a6a] mt-1 italic">
            {typing.join(', ')} yazıyor...
          </div>
        )}
      </div>
    </div>
  );
}

// ============ BOT PANEL ============
function BotPanel() {
  const [bots, setBots] = useState([]);
  const [botName, setBotName] = useState('');
  const [botPrefix, setBotPrefix] = useState('/');
  const { token } = useAuth();
  const { showToast } = useToast();

  const loadBots = useCallback(() => {
    fetch(import.meta.env.VITE_API_URL + '/api/bots', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setBots)
      .catch(console.error);
  }, [token]);

  useEffect(() => { loadBots(); }, [loadBots]);

  const createBot = async () => {
    if (!botName) { showToast('Bot adı gerekli', 'error'); return; }
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: botName, prefix: botPrefix })
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('Bot oluşturuldu', 'success');
      setBotName('');
      loadBots();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const deleteBot = async (id) => {
    try {
      await fetch(import.meta.env.VITE_API_URL + `/api/bots/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Bot silindi', 'success');
      loadBots();
    } catch (err) { showToast(err.message, 'error'); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold font-['Syne'] mb-1">Bot Paneli</h1>
      <p className="text-[13px] text-[#4a4a6a] mb-6">Botlarını oluştur ve yönet</p>

      <div className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5 mb-6">
        <h3 className="font-bold mb-3">Yeni Bot</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            className="flex-1 min-w-[150px] px-3 py-2 bg-[#08081a] border border-[#1a1a2e] rounded-lg text-white text-sm focus:border-[#6366f1] outline-none"
            placeholder="Bot adı"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
          />
          <input
            className="w-24 px-3 py-2 bg-[#08081a] border border-[#1a1a2e] rounded-lg text-white text-sm focus:border-[#6366f1] outline-none"
            placeholder="Prefix"
            value={botPrefix}
            onChange={(e) => setBotPrefix(e.target.value)}
          />
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-lg text-white font-semibold text-sm shadow-lg" onClick={createBot}>
            Oluştur
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {bots.map(bot => (
            <motion.div
              key={bot._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-4 hover:border-[#2a2a35] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 11V6"/><circle cx="12" cy="4" r="2"/></svg>
                </div>
                <div>
                  <div className="font-bold text-sm">{bot.name}</div>
                  <div className="text-[11px] text-[#4a4a6a]">Prefix: {bot.prefix}</div>
                </div>
              </div>
              <div className="mb-2">
                <div className="text-[10px] font-bold text-[#4a4a6a] uppercase mb-1">Bot Token</div>
                <div className="bg-[#08081a] border border-[#1a1a2e] rounded-lg px-3 py-1.5 font-mono text-[10px] text-[#a5b4fc] cursor-pointer select-all" onClick={(e) => { navigator.clipboard.writeText(bot.token); showToast('Token kopyalandı'); }}>
                  {bot.token}
                </div>
              </div>
              <div className="flex justify-end">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all" onClick={() => deleteBot(bot._id)}>
                  Sil
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {bots.length === 0 && (
          <div className="col-span-2 text-center text-[#4a4a6a] py-8">Henüz bot oluşturmadın</div>
        )}
      </div>
    </div>
  );
}

// ============ WEBHOOK PANEL ============
function WebhookPanel() {
  const [webhooks, setWebhooks] = useState([]);
  const [whName, setWhName] = useState('');
  const { token } = useAuth();
  const { showToast } = useToast();

  const loadWebhooks = useCallback(() => {
    fetch(import.meta.env.VITE_API_URL + '/api/webhooks', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setWebhooks)
      .catch(console.error);
  }, [token]);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const createWebhook = async () => {
    if (!whName) { showToast('Webhook adı gerekli', 'error'); return; }
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: whName })
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('Webhook oluşturuldu', 'success');
      setWhName('');
      loadWebhooks();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const deleteWebhook = async (id) => {
    try {
      await fetch(import.meta.env.VITE_API_URL + `/api/webhooks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Webhook silindi', 'success');
      loadWebhooks();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const getWebhookUrl = (token) => `${window.location.origin}/api/webhook/${token}`;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold font-['Syne'] mb-1">Webhook Paneli</h1>
      <p className="text-[13px] text-[#4a4a6a] mb-6">Dış sistemlerden mesaj gönder</p>

      <div className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5 mb-6">
        <h3 className="font-bold mb-3">Yeni Webhook</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            className="flex-1 min-w-[200px] px-3 py-2 bg-[#08081a] border border-[#1a1a2e] rounded-lg text-white text-sm focus:border-[#6366f1] outline-none"
            placeholder="Webhook adı"
            value={whName}
            onChange={(e) => setWhName(e.target.value)}
          />
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-lg text-white font-semibold text-sm shadow-lg" onClick={createWebhook}>
            Oluştur
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {webhooks.map(wh => (
            <motion.div
              key={wh._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-4 hover:border-[#2a2a35] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#a855f7]/20 flex items-center justify-center text-[#a855f7]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{wh.name}</div>
                  <div className="text-[11px] text-[#4a4a6a]">ID: {wh._id}</div>
                </div>
              </div>
              <div className="mb-3">
                <div className="text-[10px] font-bold text-[#4a4a6a] uppercase mb-1">Webhook URL</div>
                <div className="bg-[#08081a] border border-[#1a1a2e] rounded-lg px-3 py-1.5 font-mono text-[10px] text-[#a5b4fc] cursor-pointer select-all truncate" onClick={(e) => { navigator.clipboard.writeText(getWebhookUrl(wh.token)); showToast('URL kopyalandı'); }}>
                  {getWebhookUrl(wh.token)}
                </div>
              </div>
              <div className="flex justify-end">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all" onClick={() => deleteWebhook(wh._id)}>
                  Sil
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {webhooks.length === 0 && (
          <div className="col-span-2 text-center text-[#4a4a6a] py-8">Henüz webhook oluşturmadın</div>
        )}
      </div>
    </div>
  );
}

// ============ DOCS PANEL ============
function DocsPanel() {
  const [activeDoc, setActiveDoc] = useState('qs');

  const docs = {
    qs: {
      title: '🚀 Hızlı Başlangıç',
      content: `
        <div class="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5 mb-4">
          <h3 class="font-mono text-sm text-[#6366f1] mb-2">// Kurulum</h3>
          <pre class="bg-[#08081a] p-3 rounded-lg text-xs font-mono overflow-x-auto">npm install gettic.js</pre>
        </div>
        <div class="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5">
          <h3 class="font-mono text-sm text-[#6366f1] mb-2">// Minimal Bot</h3>
          <pre class="bg-[#08081a] p-3 rounded-lg text-xs font-mono overflow-x-auto">const { Client } = require('gettic.js');
const bot = new Client({ token: 'BOT_TOKEN', username: 'BenimBot' });
bot.on('ready', () => bot.send('genel', 'Merhaba!'));
bot.command('ping', ctx => ctx.reply('Pong!'));
bot.connect();</pre>
        </div>
      `
    },
    client: {
      title: '🤖 Client API',
      content: `
        <div class="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5">
          <h3 class="font-mono text-sm text-[#6366f1] mb-3">// Metodlar</h3>
          <table class="w-full text-sm">
            <tr class="border-b border-[#1a1a2e]"><td class="py-2 font-mono text-[#a5b4fc]">bot.send(oda, mesaj)</td><td class="py-2 text-[#4a4a6a]">Odaya mesaj gönder</td></tr>
            <tr class="border-b border-[#1a1a2e]"><td class="py-2 font-mono text-[#a5b4fc]">bot.command(isim, fn)</td><td class="py-2 text-[#4a4a6a]">Komut tanımla</td></tr>
            <tr><td class="py-2 font-mono text-[#a5b4fc]">bot.connect()</td><td class="py-2 text-[#4a4a6a]">Bağlan</td></tr>
          </table>
        </div>
      `
    },
    webhook: {
      title: '🔗 Webhook API',
      content: `
        <div class="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5">
          <h3 class="font-mono text-sm text-[#6366f1] mb-2">// WebhookClient</h3>
          <pre class="bg-[#08081a] p-3 rounded-lg text-xs font-mono overflow-x-auto">const { WebhookClient } = require('gettic.js');
const wh = new WebhookClient('WEBHOOK_URL');
await wh.send('Merhaba!');</pre>
        </div>
      `
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold font-['Syne'] mb-1">Dokümantasyon</h1>
      <p className="text-[13px] text-[#4a4a6a] mb-6">gettic.js API referansı</p>

      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { id: 'qs', label: '🚀 Başlangıç' },
          { id: 'client', label: '🤖 Client' },
          { id: 'webhook', label: '🔗 Webhook' }
        ].map(doc => (
          <motion.button
            key={doc.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeDoc === doc.id ? 'bg-[#6366f1] text-white' : 'bg-[#0d0d24] text-[#4a4a6a] hover:text-white'}`}
            onClick={() => setActiveDoc(doc.id)}
          >
            {doc.label}
          </motion.button>
        ))}
      </div>

      <div className="docs-content" dangerouslySetInnerHTML={{ __html: docs[activeDoc]?.content || '' }} />
    </div>
  );
}

// ============ DM PANEL ============
function DMPanel() {
  const [dms, setDms] = useState([]);
  const [selectedDm, setSelectedDm] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { user, token } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/api/dms', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setDms)
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (selectedDm && socket) {
      socket.emit('join_dm', selectedDm._id);
      fetch(import.meta.env.VITE_API_URL + `/api/dm/${selectedDm.partner._id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(setMessages)
        .catch(console.error);
    }
  }, [selectedDm, socket, token]);

  useEffect(() => {
    if (!socket) return;
    socket.on('dm_message', (msg) => {
      if (msg.dmId === selectedDm?._id) {
        setMessages(prev => [...prev, msg]);
      }
    });
    return () => socket.off('dm_message');
  }, [socket, selectedDm]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendDM = async () => {
    if (!newMessage.trim() || !selectedDm) return;
    try {
      await fetch(import.meta.env.VITE_API_URL + `/api/dm/${selectedDm.partner._id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newMessage })
      });
      setNewMessage('');
    } catch (err) { showToast(err.message, 'error'); }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[260px] flex-shrink-0 bg-[#08081a] border-r border-[#1a1a2e] flex flex-col">
        <div className="p-3 border-b border-[#1a1a2e]">
          <div className="text-[10px] font-bold text-[#4a4a6a] uppercase mb-2">Arkadaş Ekle</div>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-1.5 bg-[#0d0d24] border border-[#1a1a2e] rounded-lg text-white text-xs focus:border-[#6366f1] outline-none" placeholder="kullanici_adi" />
            <button className="px-3 py-1.5 bg-[#6366f1] rounded-lg text-white text-xs font-semibold">Ekle</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {dms.map(dm => (
            <motion.div
              key={dm._id}
              whileHover={{ x: 4 }}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${selectedDm?._id === dm._id ? 'bg-[#202038]' : 'hover:bg-[#141422]'}`}
              onClick={() => setSelectedDm(dm)}
            >
              <div className="w-9 h-9 rounded-full bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1] font-bold">
                {dm.partner?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{dm.partner?.username}</div>
                <div className="text-[11px] text-[#4a4a6a] truncate">{dm.lastMessage?.content || 'Yeni konuşma'}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedDm ? (
          <>
            <div className="h-[46px] border-b border-[#1a1a2e] flex items-center px-4">
              <span className="font-bold text-sm">{selectedDm.partner?.username}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scroll">
              {messages.map(msg => (
                <div key={msg._id} className={`flex gap-3 mb-3 ${msg.senderId === user?._id ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1] font-bold text-xs">
                    {msg.senderName?.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[70%] ${msg.senderId === user?._id ? 'text-right' : ''}`}>
                    <div className={`px-3 py-2 rounded-lg text-sm ${msg.senderId === user?._id ? 'bg-[#6366f1] text-white' : 'bg-[#1a1a2e]'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-[#1a1a2e]">
              <div className="flex gap-2 bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-2">
                <input
                  className="flex-1 bg-transparent text-white text-sm outline-none"
                  placeholder={`${selectedDm.partner?.username} ile mesajlaş...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendDM()}
                />
                <button className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center text-white" onClick={sendDM}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#4a4a6a]">
            <div className="text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mx-auto mb-3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p>Bir konuşma seç</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ DISCOVER PANEL ============
function DiscoverPanel() {
  const [servers, setServers] = useState([]);
  const { token } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/api/servers/discover', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setServers)
      .catch(console.error);
  }, [token]);

  const joinServer = async (inviteCode) => {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/servers/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ inviteCode })
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('Sunucuya katıldın!', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) { showToast(err.message, 'error'); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold font-['Syne'] mb-1">Sunucuları Keşfet</h1>
      <p className="text-[13px] text-[#4a4a6a] mb-6">Herkese açık sunucular</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {servers.map(server => (
            <motion.div
              key={server._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl overflow-hidden cursor-pointer hover:border-[#6366f1] transition-all"
              onClick={() => joinServer(server.inviteCode)}
            >
              <div className="h-[80px] bg-gradient-to-r from-[#6366f1] to-[#a855f7] relative">
                <div className="absolute -bottom-4 left-3 w-10 h-10 rounded-lg bg-[#0d0d24] border-2 border-[#0d0d24] flex items-center justify-center font-bold text-white shadow-lg">
                  {server.name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="p-4 pt-6">
                <div className="font-bold text-sm mb-1">{server.name}</div>
                <div className="text-[11px] text-[#4a4a6a] line-clamp-2">{server.description || 'Açıklama yok'}</div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-[#4a4a6a]">👥 {server.members?.length || 0} üye</span>
                  <span className="text-[10px] text-[#a5b4fc]">Katıl →</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============ SETTINGS PANEL ============
function SettingsPanel() {
  const { user, logout, token } = useAuth();
  const { theme, setTheme, font, setFont, fontSize, setFontSize } = useTheme();
  const { showToast } = useToast();

  const saveProfile = async () => {
    try {
      await fetch(import.meta.env.VITE_API_URL + '/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'online' })
      });
      showToast('Profil güncellendi', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold font-['Syne'] mb-6">Ayarlar</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-bold mb-3">Profil</h3>
          <div className="mb-3">
            <div className="text-[10px] font-bold text-[#4a4a6a] uppercase mb-1">Kullanıcı Adı</div>
            <div className="px-3 py-2 bg-[#08081a] border border-[#1a1a2e] rounded-lg text-white text-sm">{user?.username}</div>
          </div>
          <div className="mb-3">
            <div className="text-[10px] font-bold text-[#4a4a6a] uppercase mb-1">Durum</div>
            <select className="w-full px-3 py-2 bg-[#08081a] border border-[#1a1a2e] rounded-lg text-white text-sm">
              <option>online</option><option>idle</option><option>dnd</option>
            </select>
          </div>
          <button className="w-full px-4 py-2 bg-[#6366f1] rounded-lg text-white font-semibold text-sm" onClick={saveProfile}>Kaydet</button>
        </div>

        <div className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-bold mb-3">Görünüm</h3>
          <div className="mb-3">
            <div className="text-[10px] font-bold text-[#4a4a6a] uppercase mb-1">Tema</div>
            <div className="flex gap-2">
              {['dark', 'light', 'midnight', 'green', 'blue'].map(t => (
                <button key={t} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${theme === t ? 'bg-[#6366f1] text-white' : 'bg-[#08081a] text-[#4a4a6a]'}`} onClick={() => setTheme(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <div className="text-[10px] font-bold text-[#4a4a6a] uppercase mb-1">Font</div>
            <div className="flex gap-2">
              {['inter', 'syne', 'mono', 'nunito'].map(f => (
                <button key={f} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${font === f ? 'bg-[#6366f1] text-white' : 'bg-[#08081a] text-[#4a4a6a]'}`} onClick={() => setFont(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#4a4a6a] uppercase mb-1">Font Boyutu ({fontSize}px)</div>
            <input type="range" min="12" max="18" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full accent-[#6366f1]" />
          </div>
        </div>
      </div>

      <div className="mt-6 p-5 bg-[#0d0d24] border border-red-500/20 rounded-xl">
        <h3 className="font-bold text-red-400 mb-2">Tehlikeli Alan</h3>
        <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/30" onClick={logout}>Çıkış Yap</button>
      </div>
    </div>
  );
}

// ============ HELP CENTER PANEL ============
function HelpCenterPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold font-['Syne'] mb-1">Yardım Merkezi</h1>
      <p className="text-[13px] text-[#4a4a6a] mb-6">Sık sorulan sorular ve yardım dokümanları</p>

      <div className="space-y-4">
        <div className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-bold text-[#6366f1] mb-2">❓ gettic.js nedir?</h3>
          <p className="text-sm text-[#4a4a6a]">gettic.js, Gettic platformu için Node.js tabanlı bir bot kütüphanesidir. Dakikalar içinde bot oluşturmanı sağlar.</p>
        </div>
        <div className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-bold text-[#6366f1] mb-2">🚀 Nasıl başlarım?</h3>
          <p className="text-sm text-[#4a4a6a]">npm install gettic.js komutuyla kurabilir, dökümantasyondaki örnekleri inceleyerek başlayabilirsin.</p>
        </div>
        <div className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-5">
          <h3 className="font-bold text-[#6366f1] mb-2">💰 Ücretli mi?</h3>
          <p className="text-sm text-[#4a4a6a]">gettic.js tamamen ücretsiz ve açık kaynaktır. MIT lisansı ile dağıtılır.</p>
        </div>
      </div>
    </div>
  );
}

// ============ TERMS OF SERVICE PANEL ============
function TermsPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold font-['Syne'] mb-4">Kullanım Şartları</h1>
      <div className="space-y-4 text-sm text-[#4a4a6a] leading-relaxed">
        <p><strong className="text-white">1. Hizmet Kullanımı</strong><br/>Gettic platformunu kullanarak bot oluşturabilir ve yönetebilirsiniz. Platform, yasalara aykırı içeriklerin paylaşılmasına izin vermez.</p>
        <p><strong className="text-white">2. Hesaplar</strong><br/>Hesap güvenliği sizin sorumluluğunuzdadır. Şifrenizi paylaşmayın.</p>
        <p><strong className="text-white">3. Değişiklikler</strong><br/>Bu şartlar önceden haber verilmeksizin değiştirilebilir.</p>
        <p><strong className="text-white">4. İletişim</strong><br/>Sorularınız için: support@gettic.js.org</p>
      </div>
    </div>
  );
}

// ============ PRIVACY PANEL ============
function PrivacyPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold font-['Syne'] mb-4">Gizlilik Politikası</h1>
      <div className="space-y-4 text-sm text-[#4a4a6a] leading-relaxed">
        <p><strong className="text-white">Toplanan Veriler</strong><br/>Kullanıcı adı, şifre (hash'lenmiş) ve profil bilgileri gibi temel veriler toplanır.</p>
        <p><strong className="text-white">Veri Kullanımı</strong><br/>Verileriniz sadece platform hizmetlerini sağlamak için kullanılır. Üçüncü taraflarla paylaşılmaz.</p>
        <p><strong className="text-white">Haklarınız</strong><br/>Verilerinizin silinmesini talep etme hakkına sahipsiniz.</p>
      </div>
    </div>
  );
}

// ============ NPM PANEL ============
function NpmPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold font-['Syne'] mb-4">NPM Paketi</h1>
      <div className="bg-[#0d0d24] border border-[#1a1a2e] rounded-xl p-6 text-center">
        <div className="text-5xl mb-3">📦</div>
        <div className="font-mono text-lg mb-2">gettic.js</div>
        <div className="text-[#4a4a6a] text-sm mb-4">Modern sohbet platformu için bot framework</div>
        <div className="bg-[#08081a] rounded-lg p-3 font-mono text-sm select-all cursor-pointer" onClick={() => { navigator.clipboard.writeText('npm install gettic.js'); alert('Kopyalandı!'); }}>
          npm install gettic.js
        </div>
        <div className="mt-4 flex gap-2 justify-center">
          <span className="px-2 py-1 bg-[#6366f1]/20 text-[#a5b4fc] rounded-lg text-xs">v2.0.0</span>
          <span className="px-2 py-1 bg-[#22c55e]/20 text-[#22c55e] rounded-lg text-xs">MIT License</span>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  if (loading) return <LoadingScreen />;
  if (!user && route !== '/') return <Login />;

  return (
    <div className="flex h-screen overflow-hidden">
      <ServerRail onSelect={(srv) => { setSelectedServer(srv); navigate('/chat'); }} selectedId={selectedServer?._id} />
      <ChannelList server={selectedServer} onSelectChannel={(ch) => { setSelectedChannel(ch); navigate('/chat'); }} selectedId={selectedChannel?._id} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {route === '/chat' && <ChatArea channel={selectedChannel} />}
        {route === '/dm' && <DMPanel />}
        {route === '/discover' && <DiscoverPanel />}
        {route === '/settings' && <SettingsPanel />}
        {route === '/bots' && <BotPanel />}
        {route === '/webhooks' && <WebhookPanel />}
        {route === '/docs' && <DocsPanel />}
        {route === '/help-center' && <HelpCenterPanel />}
        {route === '/terms' && <TermsPanel />}
        {route === '/privacy-policy' && <PrivacyPanel />}
        {route === '/npm' && <NpmPanel />}
        {route === '/' && (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-7xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold font-['Syne'] mb-2">gettic.js</h2>
              <p className="text-[#4a4a6a] max-w-md mx-auto">Sol menüden bir sunucu seçerek sohbete başla, bot panelini keşfet veya dökümantasyonu incele.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ROOT APP ============
function RootApp() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}

export default RootApp;
