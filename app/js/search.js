// ============ GETTIC SEARCH.JS - ARAMA SİSTEMİ ============

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

// Arama modal'ı
function showSearchModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  content.innerHTML = `
    <h2>🔍 Arama</h2>
    <div class="search-input-wrapper" style="position:relative;margin-bottom:12px">
      <input class="mi" id="searchInput" placeholder="Mesaj, kanal, kullanıcı ara..." 
             value="${searchState.query}" 
             oninput="performSearch()" 
             onkeydown="if(event.key==='Escape')closeModal()"
             autofocus>
      ${searchState.query ? 
        `<button onclick="clearSearch()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--t3);cursor:pointer;font-size:16px">×</button>` : ''}
    </div>
    
    <div class="search-filters" style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      <button class="search-filter ${searchState.filters.messages?'active':''}" onclick="toggleSearchFilter('messages')" style="padding:4px 10px;border-radius:14px;border:1px solid var(--b2);background:var(--bg2);color:var(--t2);font-size:11px;cursor:pointer;transition:all .15s">💬 Mesajlar</button>
      <button class="search-filter ${searchState.filters.channels?'active':''}" onclick="toggleSearchFilter('channels')" style="padding:4px 10px;border-radius:14px;border:1px solid var(--b2);background:var(--bg2);color:var(--t2);font-size:11px;cursor:pointer;transition:all .15s"># Kanallar</button>
      <button class="search-filter ${searchState.filters.users?'active':''}" onclick="toggleSearchFilter('users')" style="padding:4px 10px;border-radius:14px;border:1px solid var(--b2);background:var(--bg2);color:var(--t2);font-size:11px;cursor:pointer;transition:all .15s">👤 Kullanıcılar</button>
      <button class="search-filter ${searchState.filters.files?'active':''}" onclick="toggleSearchFilter('files')" style="padding:4px 10px;border-radius:14px;border:1px solid var(--b2);background:var(--bg2);color:var(--t2);font-size:11px;cursor:pointer;transition:all .15s">📎 Dosyalar</button>
    </div>
    
    <div id="searchResults" style="max-height:400px;overflow-y:auto">
      ${renderSearchResults()}
    </div>
    
    ${searchState.history.length > 0 && !searchState.query ? `
      <div style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;color:var(--t3);font-weight:600">SON ARAMALAR</span>
          <button onclick="clearSearchHistory()" style="background:none;border:none;color:var(--re);cursor:pointer;font-size:10px">Temizle</button>
        </div>
        ${searchState.history.slice(0, 8).map(h => `
          <div class="search-history-item" onclick="searchHistoryClick('${h}')" style="padding:6px 8px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--t2);transition:background .15s" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''">
            🕐 ${h}
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
  
  modal.classList.remove('hidden');
  modal.classList.add('show');
  
  // CSS güncelle
  updateSearchStyles();
}

// Arama stilleri
function updateSearchStyles() {
  document.querySelectorAll('.search-filter.active').forEach(btn => {
    btn.style.background = 'var(--ac)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--ac)';
  });
}

// Arama yap
function performSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  
  const query = input.value.trim();
  searchState.query = query;
  
  if (query.length < 2) {
    document.getElementById('searchResults').innerHTML = renderSearchResults();
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
  
  document.getElementById('searchResults').innerHTML = renderSearchResults();
}

// Sonuçları render et
function renderSearchResults() {
  if (!searchState.query || searchState.query.length < 2) {
    return '<p style="color:var(--t3);text-align:center;padding:20px">Aramak için en az 2 karakter yazın</p>';
  }
  
  if (searchState.isSearching) {
    return '<p style="color:var(--t3);text-align:center;padding:20px">Aranıyor...</p>';
  }
  
  const r = searchState.results;
  let html = '';
  let totalResults = 0;
  
  // Mesaj sonuçları
  if (r.messages?.length > 0) {
    totalResults += r.messages.length;
    html += `<div class="search-section-title">💬 Mesajlar (${r.messages.length})</div>`;
    r.messages.forEach(m => {
      html += `
        <div class="mitem" onclick="jumpToMessage('${m._id}')">
          <div class="mav">${(m.senderName||'?').charAt(0).toUpperCase()}</div>
          <div class="minfo">
            <div class="mname">${m.senderName} <span style="font-weight:400;color:var(--t3)">#${m.channelId}</span></div>
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
    html += `<div class="search-section-title"># Kanallar (${r.channels.length})</div>`;
    r.channels.forEach(c => {
      html += `
        <div class="mitem" onclick="switchChannel('${c.id}');closeModal()">
          <div class="mav">#</div>
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
    html += `<div class="search-section-title">👤 Kullanıcılar (${r.users.length})</div>`;
    r.users.forEach(u => {
      html += `
        <div class="mitem" onclick="startDM('${u.name}');closeModal()">
          <div class="mav">${u.name.charAt(0).toUpperCase()}</div>
          <div class="minfo">
            <div class="mname">${highlightMatch(u.name, searchState.query)}</div>
            <div class="msub">DM başlat</div>
          </div>
        </div>
      `;
    });
  }
  
  // Dosya sonuçları
  if (r.files?.length > 0) {
    totalResults += r.files.length;
    html += `<div class="search-section-title">📎 Dosyalar (${r.files.length})</div>`;
    r.files.forEach(f => {
      html += `
        <div class="mitem" onclick="viewFile('${f.id}');closeModal()">
          <div class="mav">📎</div>
          <div class="minfo">
            <div class="mname">${highlightMatch(f.name, searchState.query)}</div>
            <div class="msub">${formatFileSize(f.size)} · ${formatTime(f.uploadedAt)}</div>
          </div>
        </div>
      `;
    });
  }
  
  if (totalResults === 0) {
    html = '<p style="color:var(--t3);text-align:center;padding:20px">Sonuç bulunamadı</p>';
  }
  
  return html || '<p style="color:var(--t3);text-align:center;padding:20px">Sonuç bulunamadı</p>';
}

// Eşleşmeyi vurgula
function highlightMatch(text, query) {
  if (!text || !query) return text || '';
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<span style="background:var(--acg);padding:0 2px;border-radius:2px">$1</span>');
}

// Arama filtresi toggle
function toggleSearchFilter(filter) {
  searchState.filters[filter] = !searchState.filters[filter];
  performSearch();
  showSearchModal(); // Refresh modal
}

// Aramayı temizle
function clearSearch() {
  searchState.query = '';
  searchState.results = {};
  document.getElementById('searchInput').value = '';
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
  document.getElementById('searchInput').value = query;
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
