// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC SEARCH.JS v2.0 - Arama Sistemi                          ║
// ╚══════════════════════════════════════════════════════════════════╝

function _searchLog(msg, level = 'log') {
  console[level](`%c[Search] ${msg}`, 'color:#22d3ee;font-weight:bold');
}

// ============ STATE ============
const searchState = {
  query:       '',
  filter:      'all',    // 'all' | 'mine' | 'media' | 'pinned'
  results:     [],
  history:     [],
  debounceTimer: null,
  maxHistory:  20,
};

try {
  searchState.history = JSON.parse(localStorage.getItem('gt_search_history') || '[]');
} catch {}

// ============ ARAMA MODAL ============
if (typeof MODAL_TEMPLATES !== 'undefined') {
  MODAL_TEMPLATES.search = () => `
    <div class="gm-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <h2>Ara</h2>
    </div>
    <div class="gm-body" style="padding-top:12px">
      <div class="gm-input-wrap" style="margin-bottom:10px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="gm-input" id="searchInput" placeholder="Mesajlarda ara..." autofocus
          value="${escapeHtml(searchState.query)}"
          oninput="_onSearchInput(this.value)"
          onkeydown="if(event.key==='Escape')closeModal()">
        <button class="gm-input-clear" id="searchClear" style="${searchState.query ? '' : 'display:none'}"
          onclick="clearSearch()">✕</button>
      </div>

      <div class="search-filters">
        ${[
          { k:'all',    label:'Tümü' },
          { k:'mine',   label:'Benim' },
          { k:'media',  label:'Medya' },
          { k:'pinned', label:'Sabitlenmiş' },
        ].map(f => `
          <button class="gm-chip ${searchState.filter === f.k ? 'on' : ''}"
            onclick="_setSearchFilter('${f.k}')">${f.label}</button>`).join('')}
      </div>

      <div id="searchResults" class="search-results" style="margin-top:10px">
        ${searchState.query
          ? _renderSearchResults(searchState.results, searchState.query)
          : _renderSearchHistory()}
      </div>
    </div>`;
}

// ============ INPUT HANDLER ============
function _onSearchInput(query) {
  searchState.query = query;
  const clr = document.getElementById('searchClear');
  if (clr) clr.style.display = query ? '' : 'none';

  clearTimeout(searchState.debounceTimer);
  searchState.debounceTimer = setTimeout(() => {
    _doSearch(query);
  }, 200);
}

function _setSearchFilter(filter) {
  searchState.filter = filter;
  document.querySelectorAll('.search-filters .gm-chip').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.search-filters .gm-chip').forEach(b => {
    if (b.textContent.trim().toLowerCase().includes(filter === 'all' ? 'tümü' : filter === 'mine' ? 'benim' : filter === 'media' ? 'medya' : 'sabit')) {
      b.classList.add('on');
    }
  });
  _doSearch(searchState.query);
}

function clearSearch() {
  searchState.query   = '';
  searchState.results = [];
  const input = document.getElementById('searchInput');
  const clr   = document.getElementById('searchClear');
  if (input) { input.value = ''; input.focus(); }
  if (clr)   clr.style.display = 'none';
  const res = document.getElementById('searchResults');
  if (res) res.innerHTML = _renderSearchHistory();
}

// ============ ARA ============
function _doSearch(query) {
  const res = document.getElementById('searchResults');
  if (!res) return;

  if (!query || query.trim().length < 2) {
    res.innerHTML = _renderSearchHistory();
    return;
  }

  const q       = query.toLowerCase().trim();
  const uid     = Store.user?._id;
  const filter  = searchState.filter;

  let msgs = (Store.messages || []).filter(m => {
    if (filter === 'mine'   && m.senderId !== uid) return false;
    if (filter === 'media'  && !m.image && !m.file && !m.voiceUrl) return false;
    if (filter === 'pinned' && !m.pinned) return false;
    return (m.content || '').toLowerCase().includes(q)
      || (m.senderName || '').toLowerCase().includes(q);
  });

  // Skor: en iyi eşleşme önce
  msgs = msgs.sort((a, b) => {
    const aScore = _searchScore(a, q);
    const bScore = _searchScore(b, q);
    return bScore - aScore;
  }).slice(0, 40);

  searchState.results = msgs;
  res.innerHTML = _renderSearchResults(msgs, query);
}

function _searchScore(msg, q) {
  let score = 0;
  const content = (msg.content || '').toLowerCase();
  if (content.startsWith(q)) score += 10;
  if (content.includes(q))   score += 5;
  if (msg.pinned)            score += 3;
  const idx = content.indexOf(q);
  if (idx > -1) score += Math.max(0, 5 - Math.floor(idx / 20));
  return score;
}

// ============ RENDER ============
function _renderSearchResults(msgs, query) {
  if (msgs.length === 0) {
    return `<div class="gm-empty">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span>Sonuç bulunamadı</span>
      <small>"${escapeHtml(query)}" için eşleşme yok</small>
    </div>`;
  }

  const q = query.toLowerCase().trim();

  return `
    <div class="search-count">${msgs.length} sonuç bulundu</div>
    <div class="gm-list">
      ${msgs.map(m => {
        const content   = m.content || '';
        const idx       = content.toLowerCase().indexOf(q);
        const start     = Math.max(0, idx - 20);
        const excerpt   = content.slice(start, start + 100);
        const hl        = _highlightQuery(excerpt, q);
        const time      = typeof formatRelativeTime === 'function' ? formatRelativeTime(m.createdAt) : '';
        const chName    = (Store.channels || []).find(c => c.id === m.channelId)?.name || m.channelId;

        return `
          <div class="gm-list-item search-result" onclick="_jumpToSearchResult('${m._id}')">
            <div class="gm-av">${(m.senderName || '?').charAt(0).toUpperCase()}</div>
            <div class="gm-item-info">
              <div style="display:flex;align-items:center;gap:6px">
                <span class="gm-item-name">${escapeHtml(m.senderName || '?')}</span>
                <span style="font-size:10px;color:var(--t3)">#${escapeHtml(chName)}</span>
                ${m.pinned ? '<span style="font-size:10px">📌</span>' : ''}
              </div>
              <span class="gm-item-sub">${hl}</span>
              ${m.image ? '<span style="font-size:10px;color:var(--t3)">🖼️ Görsel</span>' : ''}
              ${m.file  ? `<span style="font-size:10px;color:var(--t3)">📎 ${escapeHtml(m.file.name || '')}</span>` : ''}
            </div>
            <span class="gm-item-time">${time}</span>
          </div>`;
      }).join('')}
    </div>`;
}

function _highlightQuery(text, q) {
  const safe = escapeHtml(text);
  if (!q) return safe;
  const regex = new RegExp(escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return safe.replace(regex, m => `<mark class="gm-hl">${m}</mark>`);
}

function _renderSearchHistory() {
  if (searchState.history.length === 0) {
    return `<div class="gm-empty">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>Arama geçmişi yok</span>
    </div>`;
  }

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span class="gm-section-label" style="margin:0">Son Aramalar</span>
      <button class="gm-btn ghost sm" onclick="clearSearchHistory()">Temizle</button>
    </div>
    <div class="gm-list">
      ${searchState.history.slice(0, 10).map(h => `
        <div class="gm-list-item search-history-item" onclick="_selectHistory('${escapeHtml(h)}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span class="gm-item-name">${escapeHtml(h)}</span>
          <button class="gm-icon-btn" onclick="event.stopPropagation();removeSearchHistory('${escapeHtml(h)}')">✕</button>
        </div>`).join('')}
    </div>`;
}

// ============ SONUCA GİT ============
function _jumpToSearchResult(msgId) {
  // Geçmişe ekle
  if (searchState.query && !searchState.history.includes(searchState.query)) {
    searchState.history.unshift(searchState.query);
    searchState.history = searchState.history.slice(0, searchState.maxHistory);
    try { localStorage.setItem('gt_search_history', JSON.stringify(searchState.history)); } catch {}
  }

  closeModal();

  setTimeout(() => {
    const el = document.getElementById('msg-' + msgId);
    if (!el) {
      toast('Mesaj görünümde değil', 'w');
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight');
    setTimeout(() => el.classList.remove('highlight'), 2200);
  }, 300);
}

function _selectHistory(query) {
  searchState.query = query;
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = query;
    input.focus();
  }
  _doSearch(query);
}

// ============ GEÇMİŞ YÖNETİMİ ============
function clearSearchHistory() {
  searchState.history = [];
  try { localStorage.removeItem('gt_search_history'); } catch {}
  const res = document.getElementById('searchResults');
  if (res) res.innerHTML = _renderSearchHistory();
}

function removeSearchHistory(query) {
  searchState.history = searchState.history.filter(h => h !== query);
  try { localStorage.setItem('gt_search_history', JSON.stringify(searchState.history)); } catch {}
  const res = document.getElementById('searchResults');
  if (res) res.innerHTML = _renderSearchHistory();
}

// ============ GLOBAL ARAMA (Ctrl+K) ============
function performSearch(query) { _onSearchInput(query); }

function jumpToMessage(msgId) { _jumpToSearchResult(msgId); }

// ============ KULLANICI ARA ============
async function searchUsers(query) {
  if (!query || query.length < 2) return [];
  if (typeof MongoSync !== 'undefined') {
    return MongoSync.searchUsers(query);
  }
  // Yerel fallback
  return (Store.members || []).filter(m =>
    m.username?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10);
}

// ============ CSS ============
(function injectSearchStyles() {
  const id = 'gt-search-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.search-filters{display:flex;flex-wrap:wrap;gap:5px;margin-top:2px}
.search-results{max-height:400px;overflow-y:auto}
.search-results::-webkit-scrollbar{width:3px}
.search-results::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
.search-count{font-size:11px;color:var(--t3,#888);margin-bottom:8px}
.search-result{cursor:pointer}
.search-history-item{cursor:pointer}
mark.gm-hl{background:var(--ac,#6366f1)44;color:inherit;border-radius:3px;padding:0 2px;font-style:normal}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initSearch() {
  // Ctrl+K kısayolu
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (typeof openModal === 'function') openModal('search');
    }
  });
  _searchLog('v2.0 yüklendi ✓');
})();
