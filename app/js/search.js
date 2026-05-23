// ╔══════════════════════════════════════════════════════════════════╗
// ║    GETTIC SEARCH.JS - SVG İKONLU + TÜRKÇE DÜZELTMELER           ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function srcIcon(name, size = 18) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

// Arama state
const searchState = {
  query: '',
  results: [],
  filters: {
    messages: true,
    channels: true,
    users: true,
    files: true
  },
  history: JSON.parse(localStorage.getItem('gt_search_history') || '[]'),
  isSearching: false
};

// Arama penceresi
function showSearchModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  content.innerHTML = `
    <h2>${srcIcon('search', 24)} Arama</h2>
    <div class="search-input-wrapper" style="position:relative;margin-bottom:12px">
      <input class="mi" id="searchInput" placeholder="Mesaj, kanal, kullanıcı ara..." 
             value="${escapeHtml(searchState.query)}" 
             oninput="performSearch()" 
             onkeydown="if(event.key==='Escape')closeModal()"
             autofocus>
      ${searchState.query ? 
        `<button onclick="clearSearch()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--t3);cursor:pointer;font-size:16px">${srcIcon('x', 18)}</button>` : ''}
    </div>
    
    <div class="search-filters" style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      <button class="search-filter ${searchState.filters.messages?'active':''}" onclick="toggleSearchFilter('messages')">${srcIcon('message-square',14)} Mesajlar</button>
      <button class="search-filter ${searchState.filters.channels?'active':''}" onclick="toggleSearchFilter('channels')">${srcIcon('hash',14)} Kanallar</button>
      <button class="search-filter ${searchState.filters.users?'active':''}" onclick="toggleSearchFilter('users')">${srcIcon('user',14)} Kullanıcılar</button>
      <button class="search-filter ${searchState.filters.files?'active':''}" onclick="toggleSearchFilter('files')">${srcIcon('paperclip',14)} Dosyalar</button>
    </div>
    
    <div id="searchResults" style="max-height:400px;overflow-y:auto">
      ${renderSearchResults()}
    </div>
    
    ${searchState.history.length > 0 && !searchState.query ? `
      <div style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;color:var(--t3);font-weight:600">SON ARAMALAR</span>
          <button onclick="clearSearchHistory()" style="background:none;border:none;color:var(--re);cursor:pointer;font-size:10px">${srcIcon('trash',12)} Temizle</button>
        </div>
        ${searchState.history.slice(0, 8).map(h => `
          <div class="search-history-item" onclick="searchHistoryClick('${escapeHtml(h)}')" style="padding:6px 8px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--t2);transition:background .15s" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''">
            ${srcIcon('clock',12)} ${escapeHtml(h)}
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
  
  modal.classList.remove('hidden');
  modal.classList.add('show');
  updateSearchStyles();
}

// Arama stilleri
function updateSearchStyles() {
  document.querySelectorAll('.search-filter').forEach(btn => {
    const isActive = btn.classList.contains('active');
    btn.style.background = isActive ? 'var(--ac)' : 'var(--bg2)';
    btn.style.color = isActive ? '#fff' : 'var(--t2)';
    btn.style.borderColor = isActive ? 'var(--ac)' : 'var(--b2)';
    btn.style.padding = '4px 10px';
    btn.style.borderRadius = '14px';
    btn.style.border = '1px solid';
    btn.style.fontSize = '11px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all .15s';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '4px';
  });
}

// Arama yap
function performSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  
  const query = input.value.trim();
  searchState.query = query;
  
  if (query.length < 2) {
    const resultsEl = document.getElementById('searchResults');
    if (resultsEl) resultsEl.innerHTML = renderSearchResults();
    return;
  }
  
  searchState.isSearching = true;
  const q = query.toLowerCase();
  const results = {};
  
  // Mesajlarda ara
  if (searchState.filters.messages) {
    results.messages = Store.messages
      .filter(m => m.content?.toLowerCase().includes(q))
      .slice(-30)
      .reverse();
  }
  
  // Kanallarda ara
  if (searchState.filters.channels) {
    results.channels = (Store.channels || [])
      .filter(c => c.name?.toLowerCase().includes(q));
  }
  
  // Kullanıcılarda ara
  if (searchState.filters.users) {
    const users = new Set();
    Store.messages.forEach(m => {
      if (m.senderName?.toLowerCase().includes(q)) {
        users.add(JSON.stringify({ name: m.senderName, id: m.senderId }));
      }
    });
    results.users = [...users].map(u => JSON.parse(u)).slice(0, 10);
  }
  
  // Dosyalarda ara
  if (searchState.filters.files) {
    results.files = (typeof fileState !== 'undefined' ? fileState.uploadedFiles : [])
      .filter(f => f.name?.toLowerCase().includes(q))
      .slice(0, 10);
  }
  
  searchState.results = results;
  searchState.isSearching = false;
  
  // Geçmişe ekle
  addToSearchHistory(query);
  
  const resultsEl = document.getElementById('searchResults');
  if (resultsEl) resultsEl.innerHTML = renderSearchResults();
}

// Sonuçları göster
function renderSearchResults() {
  if (!searchState.query || searchState.query.length < 2) {
    return `<p style="color:var(--t3);text-align:center;padding:20px">${srcIcon('search',20)}<br>Aramak için en az 2 karakter yazın</p>`;
  }
  
  if (searchState.isSearching) {
    return `<p style="color:var(--t3);text-align:center;padding:20px">${srcIcon('loader',20)}<br>Aranıyor...</p>`;
  }
  
  const r = searchState.results;
  let html = '';
  let totalResults = 0;
  
  // Mesaj sonuçları
  if (r.messages?.length > 0) {
    totalResults += r.messages.length;
    html += `<div class="search-section-title">${srcIcon('message-square',14)} Mesajlar (${r.messages.length})</div>`;
    r.messages.forEach(m => {
      html += `
        <div class="mitem" onclick="jumpToMessage('${m._id}')">
          <div class="mav">${(m.senderName||'?').charAt(0).toUpperCase()}</div>
          <div class="minfo">
            <div class="mname">${escapeHtml(m.senderName)} <span style="font-weight:400;color:var(--t3)">#${escapeHtml(m.channelId)}</span></div>
            <div class="msub">${highlightMatch(m.content?.substring(0, 80), searchState.query)}</div>
            <div style="font-size:9px;color:var(--t3)">${formatTime(m.createdAt)}</div>
          </div>
        </div>
      `;
    });
  }
  
  // Kanal sonuçları
  if (r.channels?.length > 0) {
    totalResults += r.channels.length;
    html += `<div class="search-section-title">${srcIcon('hash',14)} Kanallar (${r.channels.length})</div>`;
    r.channels.forEach(c => {
      html += `
        <div class="mitem" onclick="switchChannel('${c.id}');closeModal()">
          <div class="mav" style="background:var(--acd);color:var(--ac);font-weight:700">#</div>
          <div class="minfo">
            <div class="mname">${highlightMatch(c.name, searchState.query)}</div>
            <div class="msub">${c.type === 'voice' ? 'Ses Kanalı' : 'Metin Kanalı'}</div>
          </div>
        </div>
      `;
    });
  }
  
  // Kullanıcı sonuçları
  if (r.users?.length > 0) {
    totalResults += r.users.length;
    html += `<div class="search-section-title">${srcIcon('user',14)} Kullanıcılar (${r.users.length})</div>`;
    r.users.forEach(u => {
      html += `
        <div class="mitem" onclick="startDM('${escapeHtml(u.name)}');closeModal()">
          <div class="mav">${u.name.charAt(0).toUpperCase()}</div>
          <div class="minfo">
            <div class="mname">${highlightMatch(u.name, searchState.query)}</div>
            <div class="msub">${srcIcon('mail',12)} DM başlat</div>
          </div>
        </div>
      `;
    });
  }
  
  // Dosya sonuçları
  if (r.files?.length > 0) {
    totalResults += r.files.length;
    html += `<div class="search-section-title">${srcIcon('paperclip',14)} Dosyalar (${r.files.length})</div>`;
    r.files.forEach(f => {
      html += `
        <div class="mitem" onclick="viewFile('${f.id}');closeModal()">
          <div class="mav" style="background:var(--acd)">${srcIcon('paperclip',16)}</div>
          <div class="minfo">
            <div class="mname">${highlightMatch(f.name, searchState.query)}</div>
            <div class="msub">${formatFileSize(f.size)} · ${formatTime(f.uploadedAt)}</div>
          </div>
        </div>
      `;
    });
  }
  
  if (totalResults === 0) {
    html = `<p style="color:var(--t3);text-align:center;padding:20px">${srcIcon('search',20)}<br>Sonuç bulunamadı</p>`;
  }
  
  return html;
}

// Eşleşmeyi vurgula
function highlightMatch(text, query) {
  if (!text || !query) return escapeHtml(text || '');
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return escapeHtml(text).replace(regex, '<span style="background:var(--acd);padding:0 2px;border-radius:2px;font-weight:600">$1</span>');
}

// Arama filtresi
function toggleSearchFilter(filter) {
  searchState.filters[filter] = !searchState.filters[filter];
  performSearch();
  showSearchModal();
}

// Aramayı temizle
function clearSearch() {
  searchState.query = '';
  searchState.results = {};
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  showSearchModal();
}

// Arama geçmişi
function addToSearchHistory(query) {
  if (!query || query.length < 2) return;
  searchState.history = searchState.history.filter(h => h !== query);
  searchState.history.unshift(query);
  if (searchState.history.length > 20) searchState.history.pop();
  localStorage.setItem('gt_search_history', JSON.stringify(searchState.history));
}

function searchHistoryClick(query) {
  const input = document.getElementById('searchInput');
  if (input) input.value = query;
  performSearch();
  showSearchModal();
}

function clearSearchHistory() {
  searchState.history = [];
  localStorage.removeItem('gt_search_history');
  showSearchModal();
}

// Mesaja atla
function jumpToMessage(mid) {
  closeModal();
  setTimeout(() => {
    const el = document.getElementById('msg-' + mid);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.background = 'var(--acd)';
      setTimeout(() => el.style.background = '', 2000);
    }
  }, 300);
}

// HTML kaçış
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// Dosya boyutu formatı
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// Arama CSS
const searchStyle = document.createElement('style');
searchStyle.textContent = `
  .search-section-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--t3);
    text-transform: uppercase;
    letter-spacing: .5px;
    padding: 8px 0 4px;
    margin-top: 4px;
    border-top: 1px solid var(--b);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .search-section-title:first-child {
    border-top: none;
    margin-top: 0;
  }
  .search-history-item:hover {
    background: var(--bg2) !important;
  }
`;
document.head.appendChild(searchStyle);

// Klavye kısayolu
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    showSearchModal();
  }
});

// Buton
document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) searchBtn.onclick = showSearchModal;
});

console.log('Search.js yüklendi (SVG ikonlu + Türkçe düzeltmeler)');
