// ============ GETTIC GIF.JS ============
const TENOR_API_KEY = 'LIVDSRZULELA';
const TENOR_API = 'https://g.tenor.com/v1';

function openGifPicker() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  modal.classList.remove('hidden');
  modal.classList.add('show');
  
  content.innerHTML = `
    <h2>🎬 GIF Seç</h2>
    <input class="mi" id="gifSearch" placeholder="GIF ara..." oninput="searchGifs(this.value)" autofocus>
    <div id="gifResults" style="display:flex;flex-wrap:wrap;gap:8px;max-height:400px;overflow-y:auto;margin-top:12px;justify-content:center">
      <p style="color:var(--t3);font-size:12px">Trend GIF'ler yükleniyor...</p>
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
    document.getElementById('gifResults').innerHTML = '<p style="color:var(--re)">GIF yüklenemedi</p>';
  }
}

async function searchGifs(query) {
  if (!query || query.trim().length < 2) { loadTrendingGifs(); return; }
  try {
    const res = await fetch(`${TENOR_API}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=20&media_filter=minimal`);
    const data = await res.json();
    renderGifs(data.results);
  } catch(e) {}
}

function renderGifs(results) {
  const container = document.getElementById('gifResults');
  if (!container) return;
  if (!results || results.length === 0) {
    container.innerHTML = '<p style="color:var(--t3)">GIF bulunamadı</p>';
    return;
  }
  container.innerHTML = results.map(gif => `
    <div onclick="sendGif('${gif.media[0].gif.url}')" style="cursor:pointer;border-radius:8px;overflow:hidden;transition:transform .15s" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      <img src="${gif.media[0].tinygif.url}" alt="${gif.content_description}" style="width:120px;height:120px;object-fit:cover" loading="lazy">
    </div>
  `).join('');
}

function sendGif(url) {
  const msg = {
    _id: genId(),
    content: '',
    senderName: Store.user.username,
    senderId: Store.user._id,
    channelId: Store.activeChannel,
    createdAt: new Date().toISOString(),
    image: url
  };
  Store.messages.push(msg);
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
  if (typeof closeModal === 'function') closeModal();
  if (window._socket) window._socket.emit('send_message', msg);
  }
