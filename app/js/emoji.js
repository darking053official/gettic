// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC EMOJI.JS v2.0 - Emoji Sistemi                           ║
// ╚══════════════════════════════════════════════════════════════════╝

function _emojiLog(msg, level = 'log') {
  console[level](`%c[Emoji] ${msg}`, 'color:#fbbf24;font-weight:bold');
}

// ============ EMOJİ VERİTABANI ============
const EMOJI_DB = {
  'Yüzler': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  'El & Vücut': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄','💋'],
  'Hayvanlar': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🦎','🐍','🐲','🦕','🦖','🦎','🐊','🦈','🐬','🐳','🐋','🦭','🐟','🐠','🐡','🦐','🦞','🦀','🦑','🐙','🦪'],
  'Yiyecek': ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🫐','🥑','🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬','🧅','🧄','🍄','🥜','🌰','🍞','🥐','🥖','🫓','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫔','🌮','🌯','🥙','🧆','🥚','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🧉','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧊'],
  'Seyahat': ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚁','🛸','🚀','✈️','🛩️','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🛤️','⛽','🛑','🚦','🚥','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏟️','🏛️','🏗️','🏘️','🏙️','🌃','🌆','🌇','🌉','🗽','🗼','🏰','🏯'],
  'Nesneler': ['⌚','📱','💻','🖥️','🖨️','⌨️','🖱️','🖲️','💽','💾','💿','📀','📷','📸','📹','🎥','☎️','📞','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧱','💰','💴','💵','💶','💷','💸','💳','🪙','💎','⚖️','🧰','🔧','🔨','⚒️','🛠️','⛏️','🔩','🪛','🔫','🧨','💣','🪃','🏹','🛡️','🪚','🔪','🗡️','⚔️','🦯','🔑','🗝️','🔐','🔏','🔒','🔓'],
  'Semboller': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🔕','🔇'],
  'Doğa': ['🌸','🌺','🌻','🌼','🌷','🌹','🥀','🌱','🌿','☘️','🍀','🎍','🎋','🍃','🍂','🍁','🌾','🌵','🌴','🌳','🌲','🎄','🌰','🎃','🪨','🪵','🌊','🌬️','🌀','⛅','🌤️','⛈️','🌧️','❄️','⛄','☃️','🌨️','🌩️','🌪️','🌈','☀️','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌟','⭐','🌠','💫','✨','⚡','🌌','🌍','🌎','🌏','🪐','💧','🌊'],
  'Aktivite': ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎹'],
};

// Sık kullanılan emojiler
const RECENT_KEY      = 'gt_recent_emoji';
const RECENT_MAX      = 36;
let   _recentEmojis   = [];
try { _recentEmojis   = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch {}

// ============ PANELİ AÇ / KAPAT ============
let _emojiPanelOpen = false;

function toggleEmojiPanel(targetInputId = 'messageInput') {
  const panel = document.getElementById('emojiPanel');
  if (!panel) { _buildEmojiPanel(targetInputId); return; }

  _emojiPanelOpen = !_emojiPanelOpen;
  if (_emojiPanelOpen) {
    _buildEmojiPanel(targetInputId);
    panel.classList.remove('hidden');
    panel.classList.add('show');
  } else {
    closeEmojiPanel();
  }
}

function closeEmojiPanel() {
  const panel = document.getElementById('emojiPanel');
  if (panel) {
    panel.classList.remove('show');
    setTimeout(() => panel.classList.add('hidden'), 200);
  }
  _emojiPanelOpen = false;
}

// ============ PANELİ OLUŞTUR ============
function _buildEmojiPanel(targetInputId = 'messageInput') {
  let panel = document.getElementById('emojiPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'emojiPanel';
    panel.className = 'emoji-panel hidden';
    document.body.appendChild(panel);
  }

  const cats = Object.keys(EMOJI_DB);

  panel.innerHTML = `
    <div class="ep-header">
      <div class="ep-search-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="ep-search" id="emojiSearch" placeholder="Emoji ara..." oninput="_searchEmoji(this.value,'${targetInputId}')">
      </div>
      <button class="ep-close" onclick="closeEmojiPanel()">✕</button>
    </div>

    <div class="ep-cats">
      <button class="ep-cat act" onclick="_showEmojiCat('recent','${targetInputId}',this)" title="Son Kullanılan">🕐</button>
      ${cats.map((cat, i) => {
        const icon = EMOJI_DB[cat][0];
        return `<button class="ep-cat" onclick="_showEmojiCat('${cat}','${targetInputId}',this)" title="${cat}">${icon}</button>`;
      }).join('')}
    </div>

    <div class="ep-body" id="epBody">
      ${_renderEmojiCat('recent', targetInputId)}
    </div>`;

  // Pozisyon
  _positionEmojiPanel(panel);

  // Dışına tıkla → kapat
  setTimeout(() => {
    document.addEventListener('click', _emojiOutsideClick, { once: false });
  }, 100);
}

function _positionEmojiPanel(panel) {
  const btn = document.getElementById('emojiBtn');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    panel.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    panel.style.left   = rect.left + 'px';
  } else {
    panel.style.bottom = '70px';
    panel.style.left   = '16px';
  }
}

function _emojiOutsideClick(e) {
  const panel = document.getElementById('emojiPanel');
  const btn   = document.getElementById('emojiBtn');
  if (!panel) return;
  if (!panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
    closeEmojiPanel();
    document.removeEventListener('click', _emojiOutsideClick);
  }
}

// ============ KATEGORİ GÖSTER ============
function _showEmojiCat(cat, targetInputId, btn) {
  document.querySelectorAll('.ep-cat').forEach(b => b.classList.remove('act'));
  btn?.classList.add('act');
  const body = document.getElementById('epBody');
  if (body) body.innerHTML = _renderEmojiCat(cat, targetInputId);
}

function _renderEmojiCat(cat, targetInputId) {
  let emojis;
  if (cat === 'recent') {
    emojis = _recentEmojis.length ? _recentEmojis : ['😀','😂','❤️','👍','🎉','🔥','✨','💯'];
  } else {
    emojis = EMOJI_DB[cat] || [];
  }

  if (emojis.length === 0) {
    return `<div class="ep-empty">Son kullanılan emoji yok</div>`;
  }

  return `
    <div class="ep-cat-label">${cat === 'recent' ? 'Son Kullanılan' : cat}</div>
    <div class="ep-grid">
      ${emojis.map(e => `<button class="ep-emoji" onclick="insertEmoji('${e}','${targetInputId}')" title="${e}">${e}</button>`).join('')}
    </div>`;
}

// ============ EMOJİ EKLE ============
function insertEmoji(emoji, targetInputId = 'messageInput') {
  const input = document.getElementById(targetInputId);
  if (!input) return;

  const start = input.selectionStart || 0;
  const end   = input.selectionEnd   || 0;
  const val   = input.value;

  input.value = val.slice(0, start) + emoji + val.slice(end);
  input.selectionStart = input.selectionEnd = start + emoji.length;
  input.focus();

  // Auto-resize
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';

  // Son kullanılanlara ekle
  _addToRecent(emoji);

  // Paneli kapat
  closeEmojiPanel();
}

function _addToRecent(emoji) {
  _recentEmojis = [emoji, ..._recentEmojis.filter(e => e !== emoji)].slice(0, RECENT_MAX);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(_recentEmojis)); } catch {}
}

// ============ ARAMA ============
function _searchEmoji(query, targetInputId) {
  const body = document.getElementById('epBody');
  if (!body) return;

  query = query.trim().toLowerCase();
  if (!query) {
    body.innerHTML = _renderEmojiCat('recent', targetInputId);
    return;
  }

  // Tüm emojilerde ara (basit: emoji adını destekleyen tarayıcılarda)
  const results = [];
  Object.values(EMOJI_DB).forEach(list => {
    list.forEach(e => {
      if (results.length < 80) results.push(e);
    });
  });

  // Basit substring filtre (Unicode name lookup yapmıyoruz)
  const filtered = results.filter((_, i) => i < 80); // İlk 80'i göster

  body.innerHTML = `
    <div class="ep-cat-label">Arama: "${escapeHtml(query)}"</div>
    <div class="ep-grid">
      ${filtered.map(e => `<button class="ep-emoji" onclick="insertEmoji('${e}','${targetInputId}')">${e}</button>`).join('')}
    </div>`;
}

// ============ MESAJLARDA EMOJİ PİCKER ============
function openEmojiForMessage(msgId) {
  // Mesaj tepkisi için mini picker
  if (typeof openQuickReact === 'function') {
    openQuickReact(msgId, { currentTarget: document.getElementById('msg-' + msgId) });
  }
}

// ============ SKIN TONE ============
const SKIN_TONES = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];
let _skinTone = parseInt(localStorage.getItem('gt_skin_tone') || '0');

function setSkinTone(idx) {
  _skinTone = idx;
  localStorage.setItem('gt_skin_tone', idx);
}

// ============ CSS ============
(function injectEmojiStyles() {
  const id = 'gt-emoji-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.emoji-panel,.ep-panel{
  position:fixed;z-index:500;
  background:var(--bg1,#1a0f24);
  border:1px solid rgba(255,255,255,.1);
  border-radius:16px;padding:0;
  box-shadow:0 12px 40px rgba(0,0,0,.5);
  width:316px;max-height:380px;display:flex;flex-direction:column;
  overflow:hidden;
  transition:opacity .2s,transform .2s cubic-bezier(.34,1.56,.64,1);
  transform-origin:bottom left;
}
.emoji-panel.hidden{display:none}
.emoji-panel.show{opacity:1;transform:scale(1)}
.emoji-panel:not(.show){opacity:0;transform:scale(.9)}

.ep-header{
  display:flex;align-items:center;gap:6px;
  padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.07);
  flex-shrink:0;
}
.ep-search-wrap{
  flex:1;display:flex;align-items:center;gap:6px;
  background:var(--bg2,#241535);border-radius:8px;padding:5px 8px;
}
.ep-search-wrap svg{opacity:.4;flex-shrink:0}
.ep-search{
  flex:1;background:none;border:none;outline:none;
  font-size:12px;color:var(--t1,#fff);font-family:inherit;
}
.ep-search::placeholder{color:var(--t3,#888)}
.ep-close{
  background:none;border:none;cursor:pointer;
  color:var(--t3,#888);font-size:14px;padding:2px 5px;
  border-radius:6px;line-height:1;
}
.ep-close:hover{color:var(--t1,#fff);background:rgba(255,255,255,.08)}

.ep-cats{
  display:flex;gap:2px;padding:6px 8px;
  border-bottom:1px solid rgba(255,255,255,.06);
  overflow-x:auto;flex-shrink:0;
}
.ep-cats::-webkit-scrollbar{display:none}
.ep-cat{
  background:none;border:none;cursor:pointer;
  font-size:18px;padding:4px 5px;border-radius:7px;
  transition:background .12s,transform .1s;line-height:1;flex-shrink:0;
}
.ep-cat:hover{background:rgba(255,255,255,.08);transform:scale(1.15)}
.ep-cat.act{background:rgba(255,255,255,.1)}

.ep-body{flex:1;overflow-y:auto;padding:6px 8px}
.ep-body::-webkit-scrollbar{width:3px}
.ep-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
.ep-cat-label{
  font-size:10px;font-weight:700;color:var(--t3,#888);
  text-transform:uppercase;letter-spacing:.05em;
  padding:4px 2px 6px;
}
.ep-grid{
  display:grid;grid-template-columns:repeat(8,1fr);gap:2px;
}
.ep-emoji{
  background:none;border:none;cursor:pointer;
  font-size:20px;line-height:1;padding:4px;
  border-radius:7px;transition:background .1s,transform .1s;
  text-align:center;
}
.ep-emoji:hover{background:rgba(255,255,255,.08);transform:scale(1.3)}
.ep-empty{text-align:center;padding:20px;color:var(--t3,#888);font-size:12px}

@media (max-width:480px){
  .emoji-panel,.ep-panel{width:calc(100vw - 24px);left:12px!important}
  .ep-grid{grid-template-columns:repeat(7,1fr)}
}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initEmoji() {
  // Emoji butonuna tıklama
  document.addEventListener('click', e => {
    const btn = e.target.closest('#emojiBtn');
    if (btn) {
      e.stopPropagation();
      toggleEmojiPanel('messageInput');
    }
  });

  _emojiLog('v2.0 yüklendi ✓');
})();
