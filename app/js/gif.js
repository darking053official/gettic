// ╔══════════════════════════════════════════════════════════════════╗
// ║           GETTIC GIF.JS - SVG İKONLU FINAL                       ║
// ╚══════════════════════════════════════════════════════════════════╝

const TENOR_API_KEY = 'LIVDSRZULELA';
const TENOR_API = 'https://g.tenor.com/v1';

// SVG ikon yardımcı
function gifIcon(name, size = 20) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

function openGifPicker() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  modal.classList.remove('hidden');
  modal.classList.add('show');
  
  content.innerHTML = `
    <h2>${gifIcon('gif',24)} GIF Sec</h2>
    <input class="mi" id="gifSearch" placeholder="GIF ara..." oninput="searchGifs(this.value)" autofocus>
    <div id="gifResults" style="display:flex;flex-wrap:wrap;gap:8px;max-height:400px;overflow-y:auto;margin-top:12px;justify-content:center">
      <p style="color:var(--t3);font-size:12px">Trend GIF'ler yukleniyor...</p>
    </div>
  `;
  
  loadTrendingGifs();
}

async function loadTrendingGifs() {
  try {
    const res = await fetch(`${TENOR_API}/trending?key=${TENOR_API_KEY}&limit=20&media_filter=minimal`);
    const data = await res.json();
    renderGifs(data.results);
  } catch(e) {
    const container = document.getElementById('gifResults');
    if (container) container.innerHTML = `<p style="color:var(--re);text-align:center;padding:20px">${gifIcon('alert')} GIF yuklenemedi. Tekrar dene.</p>`;
  }
}

async function searchGifs(query) {
  if (!query || query.trim().length < 2) { loadTrendingGifs(); return; }
  try {
    const res = await fetch(`${TENOR_API}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query.trim())}&limit=20&media_filter=minimal`);
    const data = await res.json();
    renderGifs(data.results);
  } catch(e) {}
}

function renderGifs(results) {
  const container = document.getElementById('gifResults');
  if (!container) return;
  if (!results || results.length === 0) {
    container.innerHTML = `<p style="color:var(--t3);text-align:center;padding:20px">${gifIcon('search')} GIF bulunamadi</p>`;
    return;
  }
  container.innerHTML = results.map(gif => `
    <div onclick="sendGif('${gif.media[0].gif.url}')" 
         style="cursor:pointer;border-radius:8px;overflow:hidden;transition:transform .15s;position:relative" 
         onmouseover="this.style.transform='scale(1.05)'" 
         onmouseout="this.style.transform='scale(1)'"
         title="${escapeHtml(gif.content_description || 'GIF')}">
      <img src="${gif.media[0].tinygif.url}" alt="${escapeHtml(gif.content_description || 'GIF')}" 
           style="width:120px;height:120px;object-fit:cover" loading="lazy">
      <div style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,0.6);border-radius:4px;padding:1px 5px;font-size:8px;color:#fff">GIF</div>
    </div>
  `).join('');
}

function sendGif(url) {
  const msg = {
    _id: genId(),
    content: '',
    senderName: Store.user.username,
    senderId: Store.user._id,
    channelId: Store.activeChannel || 'genel-sohbet',
    createdAt: new Date().toISOString(),
    image: url
  };
  
  Store.messages.push(msg);
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
  if (typeof closeModal === 'function') closeModal();
  if (socket) socket.emit('send_message', msg);
  
  // Scroll
  setTimeout(() => {
    const msgs = document.getElementById('messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 100);
}

// HTML escape
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// GIF butonunu SVG yap
document.addEventListener('DOMContentLoaded', () => {
  const gifBtn = document.getElementById('gifBtn');
  if (gifBtn) {
    gifBtn.innerHTML = gifIcon('gif', 20);
    gifBtn.onclick = openGifPicker;
  }
});

console.log('GIF.js yuklendi (SVG ikonlu)');
