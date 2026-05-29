// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC GIF.JS v2.0 - GIF Arama Sistemi                         ║
// ╚══════════════════════════════════════════════════════════════════╝

function _gifLog(msg, level = 'log') {
  console[level](`%c[GIF] ${msg}`, 'color:#f472b6;font-weight:bold');
}

// ============ STATE ============
const gifState = {
  results:    [],
  trending:   [],
  query:      '',
  loading:    false,
  page:       0,
  debounce:   null,
};

// ============ API ============
// Tenor API (ücretsiz, kayıt gerekmez)
const GIF_API_KEY = 'AIzaSyAasmST7GqHAnDSYQj7GHCHa3OXlN-eJng'; // Demo key
const GIF_API     = 'https://tenor.googleapis.com/v2';
const GIF_LIMIT   = 20;

async function _fetchGifs(endpoint, params = {}) {
  const url = new URL(`${GIF_API}/${endpoint}`);
  url.searchParams.set('key',    GIF_API_KEY);
  url.searchParams.set('limit',  GIF_LIMIT);
  url.searchParams.set('locale', 'tr_TR');
  url.searchParams.set('media_filter', 'gif,tinygif');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res  = await fetch(url.toString());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    _gifLog('GIF API hatası: ' + e.message, 'warn');
    return null;
  }
}

// ============ TREND GİFLER ============
async function loadTrendingGifs() {
  if (gifState.trending.length) return gifState.trending;
  gifState.loading = true;
  _updateGifPanel();

  const data = await _fetchGifs('featured', { contentfilter: 'low' });
  gifState.loading  = false;

  if (data?.results) {
    gifState.trending = data.results;
    return data.results;
  }
  return [];
}

// ============ GİF ARA ============
async function searchGifs(query, next = false) {
  if (!query?.trim()) {
    gifState.results = [];
    gifState.query   = '';
    _updateGifPanel();
    return;
  }

  gifState.query   = query.trim();
  gifState.loading = true;
  if (!next) gifState.results = [];
  _updateGifPanel();

  const params = { q: gifState.query, contentfilter: 'low' };
  if (next && gifState.page > 0) params.pos = gifState.page;

  const data = await _fetchGifs('search', params);
  gifState.loading = false;

  if (data?.results) {
    gifState.results = next ? [...gifState.results, ...data.results] : data.results;
    gifState.page    = data.next ? parseInt(data.next) : 0;
  }
  _updateGifPanel();
}

// ============ GİF GÖNDER ============
function sendGif(gifUrl, title = 'GIF') {
  if (!Store.user) return;

  const msg = {
    _id:        genId(),
    content:    title || 'GIF',
    senderName: Store.user.username,
    senderId:   Store.user._id,
    channelId:  Store.activeChannel,
    createdAt:  new Date().toISOString(),
    reactions:  {},
    readBy:     [Store.user._id],
    image:      gifUrl,
    isGif:      true,
  };

  if (!Store.messages) Store.messages = [];
  Store.messages.push(msg);
  if (Store.messages.length > 200) Store.messages.shift();
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore      === 'function') saveStore();

  if (socket?.connected) socket.emit('send_message', msg);

  closeGifPanel();
  _gifLog('GIF gönderildi: ' + gifUrl.slice(0, 60));
}

// ============ PANELİ AÇ/KAPAT ============
let _gifPanelOpen = false;

function toggleGifPanel() {
  _gifPanelOpen = !_gifPanelOpen;
  if (_gifPanelOpen) {
    _buildGifPanel();
    loadTrendingGifs().then(() => _updateGifPanel());
  } else {
    closeGifPanel();
  }
}

function closeGifPanel() {
  _gifPanelOpen = false;
  const panel = document.getElementById('gifPanel');
  if (panel) {
    panel.classList.remove('show');
    setTimeout(() => panel.remove(), 250);
  }
}

// ============ PANELİ OLUŞTUR ============
function _buildGifPanel() {
  document.getElementById('gifPanel')?.remove();

  const panel = document.createElement('div');
  panel.id    = 'gifPanel';
  panel.className = 'gif-panel';
  panel.innerHTML = _gifPanelHTML();

  // Pozisyon
  const btn  = document.getElementById('gifBtn');
  const rect = btn?.getBoundingClientRect();
  if (rect) {
    panel.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    panel.style.left   = rect.left + 'px';
  } else {
    panel.style.bottom = '70px';
    panel.style.left   = '60px';
  }

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('show'));

  // Dışına tıkla → kapat
  setTimeout(() => {
    document.addEventListener('click', _gifOutsideClick);
  }, 100);
}

function _gifOutsideClick(e) {
  const panel = document.getElementById('gifPanel');
  const btn   = document.getElementById('gifBtn');
  if (!panel) { document.removeEventListener('click', _gifOutsideClick); return; }
  if (!panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
    closeGifPanel();
    document.removeEventListener('click', _gifOutsideClick);
  }
}

function _updateGifPanel() {
  const panel = document.getElementById('gifPanel');
  if (!panel) return;
  panel.innerHTML = _gifPanelHTML();
}

// ============ HTML ============
function _gifPanelHTML() {
  const list = gifState.query ? gifState.results : gifState.trending;

  return `
    <div class="gif-header">
      <div class="gif-search-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="gif-search" id="gifSearch" placeholder="GIF ara..."
          value="${escapeHtml(gifState.query)}"
          oninput="_onGifSearch(this.value)"
          onkeydown="if(event.key==='Escape')closeGifPanel()">
        ${gifState.query
          ? `<button class="gif-clear" onclick="gifState.query='';document.getElementById('gifSearch').value='';_updateGifPanel()">✕</button>`
          : ''}
      </div>
      <button class="gif-close" onclick="closeGifPanel()">✕</button>
    </div>

    <div class="gif-cats">
      ${['😂 Komik','❤️ Aşk','🎉 Kutlama','😮 Şaşırtıcı','🙌 Alkış','😢 Üzgün'].map(cat => {
        const [emoji, ...words] = cat.split(' ');
        const label = words.join(' ');
        return `<button class="gif-cat-btn" onclick="_gifQuickSearch('${label}')">${emoji} ${label}</button>`;
      }).join('')}
    </div>

    <div class="gif-body" id="gifBody">
      ${gifState.loading
        ? `<div class="gif-loading">
             <div class="gif-spinner"></div>
             <span>Yükleniyor...</span>
           </div>`
        : list.length === 0
        ? `<div class="gif-empty">
             ${gifState.query ? `"${escapeHtml(gifState.query)}" için sonuç yok` : 'GIF arayın veya kategoriye tıklayın'}
           </div>`
        : `<div class="gif-grid">
             ${list.map(gif => {
               const tiny = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || gif.url;
               const full = gif.media_formats?.gif?.url || gif.url;
               return `<div class="gif-item" onclick="sendGif('${full}','${escapeHtml(gif.title||'GIF')}')" title="${escapeHtml(gif.title||'')}">
                 <img src="${tiny}" alt="${escapeHtml(gif.title||'GIF')}" loading="lazy" class="gif-img">
               </div>`;
             }).join('')}
           </div>
           ${gifState.page > 0 && !gifState.loading
             ? `<button class="gif-more" onclick="searchGifs('${escapeHtml(gifState.query)}',true)">Daha Fazla Yükle</button>`
             : ''}`}
    </div>`;
}

// ============ YARDIMCI ============
function _onGifSearch(query) {
  clearTimeout(gifState.debounce);
  gifState.debounce = setTimeout(() => {
    if (query.trim()) searchGifs(query);
    else {
      gifState.results = [];
      gifState.query   = '';
      loadTrendingGifs().then(() => _updateGifPanel());
    }
  }, 400);
}

function _gifQuickSearch(query) {
  const input = document.getElementById('gifSearch');
  if (input) input.value = query;
  searchGifs(query);
}

// ============ CSS ============
(function injectGifStyles() {
  const id = 'gt-gif-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.gif-panel{
  position:fixed;z-index:500;
  background:var(--bg1,#1a0f24);
  border:1px solid rgba(255,255,255,.1);
  border-radius:16px;overflow:hidden;
  box-shadow:0 12px 40px rgba(0,0,0,.5);
  width:320px;max-height:420px;display:flex;flex-direction:column;
  opacity:0;transform:scale(.92) translateY(8px);transform-origin:bottom left;
  transition:opacity .2s,transform .25s cubic-bezier(.34,1.56,.64,1);
}
.gif-panel.show{opacity:1;transform:scale(1) translateY(0)}

.gif-header{
  display:flex;align-items:center;gap:6px;
  padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.07);
  flex-shrink:0;
}
.gif-search-wrap{
  flex:1;display:flex;align-items:center;gap:6px;
  background:var(--bg2,#241535);border-radius:8px;padding:5px 8px;
}
.gif-search-wrap svg{opacity:.4;flex-shrink:0}
.gif-search{flex:1;background:none;border:none;outline:none;font-size:12px;color:var(--t1,#fff);font-family:inherit}
.gif-search::placeholder{color:var(--t3,#888)}
.gif-clear,.gif-close{background:none;border:none;cursor:pointer;color:var(--t3,#888);font-size:14px;padding:2px 5px;border-radius:6px;line-height:1}
.gif-clear:hover,.gif-close:hover{color:var(--t1,#fff);background:rgba(255,255,255,.08)}

.gif-cats{
  display:flex;gap:4px;padding:6px 8px;overflow-x:auto;flex-shrink:0;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.gif-cats::-webkit-scrollbar{display:none}
.gif-cat-btn{
  background:rgba(255,255,255,.06);border:none;border-radius:20px;
  padding:4px 10px;font-size:11px;color:var(--t2,#ccc);cursor:pointer;
  white-space:nowrap;flex-shrink:0;transition:background .12s;font-family:inherit;
}
.gif-cat-btn:hover{background:rgba(255,255,255,.12)}

.gif-body{flex:1;overflow-y:auto;padding:6px}
.gif-body::-webkit-scrollbar{width:3px}
.gif-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}

.gif-grid{columns:2;gap:4px}
.gif-item{break-inside:avoid;margin-bottom:4px;border-radius:8px;overflow:hidden;cursor:pointer;transition:transform .15s}
.gif-item:hover{transform:scale(1.03)}
.gif-img{width:100%;height:auto;display:block}

.gif-loading,.gif-empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:32px;gap:10px;color:var(--t3,#888);font-size:12px;
}
.gif-spinner{
  width:24px;height:24px;border-radius:50%;
  border:2.5px solid rgba(255,255,255,.1);
  border-top-color:var(--ac,#6366f1);
  animation:gifSpin .7s linear infinite;
}
@keyframes gifSpin{to{transform:rotate(360deg)}}

.gif-more{
  width:100%;padding:8px;background:rgba(255,255,255,.06);
  border:none;border-radius:8px;cursor:pointer;
  font-size:12px;color:var(--t2,#ccc);font-family:inherit;margin-top:4px;
}
.gif-more:hover{background:rgba(255,255,255,.1)}

@media (max-width:480px){
  .gif-panel{width:calc(100vw - 24px);left:12px!important}
}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initGif() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('#gifBtn');
    if (btn) { e.stopPropagation(); toggleGifPanel(); }
  });
  _gifLog('v2.0 yüklendi ✓');
})();
