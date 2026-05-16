const API = 'https://gettic-j49l.onrender.com';
const MAX_MSGS = 100;
const RL = new Map();

function checkRL(key, max = 5, win = 3000) {
  const now = Date.now();
  const ts = (RL.get(key) || []).filter(t => now - t < win);
  if (ts.length >= max) return false;
  ts.push(now);
  RL.set(key, ts);
  return true;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 7);
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);
}

function formatMsg(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/`([^`\n]+?)`/g, '<code>$1</code>');
}

function timeAgo(dateStr) {
  return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      }
