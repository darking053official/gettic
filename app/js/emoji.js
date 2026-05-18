// ============ GETTIC EMOJI.JS - EMOJI & REAKSİYON ============

// Emoji state
const emojiState = {
  customEmojis: JSON.parse(localStorage.getItem('gt_custom_emojis') || '[]'),
  frequentlyUsed: JSON.parse(localStorage.getItem('gt_frequent_emojis') || '[]'),
  categories: {
    smileys: ['😀','😂','🤣','😊','😍','🥰','😘','😜','🤪','😎','🤩','🥳','😢','😭','😡','🤬','😱','🤯','😴','🤤'],
    gestures: ['👍','👎','👏','🙌','🤝','💪','🤞','✌️','🤟','👌','🤌','👋','🤚','🖐️','✋','🖖','🤏','👆','👇','👉'],
    hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️'],
    objects: ['🔥','⭐','🌟','✨','💎','🎉','🎊','🎈','🎁','🏆','🥇','🎯','💡','🔔','🎵','🎶','📱','💻','🖥️','⌨️'],
    nature: ['🌸','🌺','🌻','🌹','💐','🍀','🌈','☀️','🌙','⚡','💧','🔥','❄️','🌊','🍕','🍔','🍦','☕','🍺','🧃'],
    symbols: ['✅','❌','⭕','❓','❗','💯','🔞','🚫','⚠️','ℹ️','♻️','©️','®️','™️','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣']
  },
  skinTones: ['','🏻','🏼','🏽','🏾','🏿'],
  currentSkinTone: 0
};

// Emoji paneli göster
function showEmojiPanel() {
  const panel = document.getElementById('emojiPanel');
  if (!panel) return;
  
  let html = '<div class="emoji-picker">';
  
  // Kategori sekmeleri
  html += '<div class="emoji-tabs">';
  Object.keys(emojiState.categories).forEach(cat => {
    const icon = { smileys: '😀', gestures: '👍', hearts: '❤️', objects: '🔥', nature: '🌸', symbols: '✅' }[cat];
    html += `<button class="emoji-tab" onclick="showEmojiCategory('${cat}')">${icon}</button>`;
  });
  if (emojiState.customEmojis.length > 0) {
    html += `<button class="emoji-tab" onclick="showCustomEmojis()">🖼️</button>`;
  }
  html += '</div>';
  
  // Emoji grid
  html += '<div id="emojiGrid" class="emoji-grid"></div>';
  
  // Sık kullanılanlar
  if (emojiState.frequentlyUsed.length > 0) {
    html += '<div class="emoji-frequent">';
    html += '<div class="emoji-frequent-title">Sık Kullanılanlar</div>';
    html += '<div class="emoji-grid">';
    emojiState.frequentlyUsed.slice(0, 16).forEach(e => {
      html += `<span class="es" onclick="insertEmoji('${e}')">${e}</span>`;
    });
    html += '</div></div>';
  }
  
  html += '</div>';
  
  panel.innerHTML = html;
  panel.classList.remove('hidden');
  
  // Varsayılan kategori
  showEmojiCategory('smileys');
}

// Kategori göster
function showEmojiCategory(cat) {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  
  const emojis = emojiState.categories[cat] || [];
  grid.innerHTML = emojis.map(e => `
    <span class="es" onclick="insertEmoji('${e}')" title="${e}">${e}</span>
  `).join('');
}

// Özel emojileri göster
function showCustomEmojis() {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  
  if (emojiState.customEmojis.length === 0) {
    grid.innerHTML = '<p style="color:var(--t3);font-size:11px;padding:10px">Henüz özel emoji yok</p>';
    return;
  }
  
  grid.innerHTML = emojiState.customEmojis.map(e => `
    <span class="es" onclick="insertEmoji(':${e.name}:')" title="${e.name}">
      <img src="${e.url}" alt="${e.name}" style="width:28px;height:28px;object-fit:contain">
    </span>
  `).join('');
}

// Emoji ekle
function insertEmoji(emoji) {
  const input = document.getElementById('messageInput');
  const dmInput = document.getElementById('dmInput');
  const target = input || dmInput;
  
  if (target) {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const text = target.value;
    target.value = text.substring(0, start) + emoji + text.substring(end);
    target.selectionStart = target.selectionEnd = start + emoji.length;
    target.focus();
  }
  
  // Sık kullanılanlara ekle
  addToFrequent(emoji);
  
  // Paneli kapat
  document.getElementById('emojiPanel')?.classList.add('hidden');
}

// Sık kullanılanlara ekle
function addToFrequent(emoji) {
  emojiState.frequentlyUsed = emojiState.frequentlyUsed.filter(e => e !== emoji);
  emojiState.frequentlyUsed.unshift(emoji);
  if (emojiState.frequentlyUsed.length > 30) emojiState.frequentlyUsed.pop();
  localStorage.setItem('gt_frequent_emojis', JSON.stringify(emojiState.frequentlyUsed));
}

// Özel emoji yükle
function uploadCustomEmoji() {
  const name = prompt('Emoji adı (örn: pog):');
  if (!name?.trim()) return;
  if (emojiState.customEmojis.find(e => e.name === name.trim())) {
    return toast('Bu isimde emoji zaten var', 'e');
  }
  
  const url = prompt('Emoji URL (resim linki):');
  if (!url?.trim()) return;
  
  emojiState.customEmojis.push({
    id: genId(),
    name: name.trim().toLowerCase(),
    url: url.trim(),
    uploadedBy: Store.user?.username,
    uploadedAt: new Date().toISOString()
  });
  
  localStorage.setItem('gt_custom_emojis', JSON.stringify(emojiState.customEmojis));
  toast('✅ Emoji eklendi: :' + name.trim() + ':');
}

// Özel emoji sil
function deleteCustomEmoji(emojiId) {
  if (!hasPermission(Store.user?._id, 'manageEmojis')) return toast('❌ Yetkiniz yok', 'e');
  emojiState.customEmojis = emojiState.customEmojis.filter(e => e.id !== emojiId);
  localStorage.setItem('gt_custom_emojis', JSON.stringify(emojiState.customEmojis));
  toast('🗑️ Emoji silindi');
}

// Emoji ara
function searchEmojis(query) {
  if (!query || query.trim().length < 2) {
    showEmojiCategory('smileys');
    return;
  }
  
  const q = query.toLowerCase();
  const results = [];
  
  Object.values(emojiState.categories).forEach(emojis => {
    emojis.forEach(e => {
      if (e.includes(q) || getEmojiName(e)?.toLowerCase().includes(q)) {
        results.push(e);
      }
    });
  });
  
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  
  if (results.length === 0) {
    grid.innerHTML = '<p style="color:var(--t3);font-size:11px;padding:10px">Emoji bulunamadı</p>';
    return;
  }
  
  grid.innerHTML = results.slice(0, 40).map(e => `
    <span class="es" onclick="insertEmoji('${e}')">${e}</span>
  `).join('');
}

// Emoji adı (emoji için açıklama)
function getEmojiName(emoji) {
  const names = {
    '😀': 'grinning', '😂': 'joy', '🤣': 'rofl', '😊': 'blush', '😍': 'heart_eyes',
    '🥰': 'smiling_face_with_hearts', '😘': 'kiss', '😜': 'wink_tongue',
    '🤪': 'crazy', '😎': 'cool', '🤩': 'star_struck', '🥳': 'party',
    '😢': 'cry', '😭': 'sob', '😡': 'angry', '🤬': 'cursing',
    '😱': 'scream', '🤯': 'mind_blown', '😴': 'sleeping', '🤤': 'drooling',
    '👍': 'thumbs_up', '👎': 'thumbs_down', '👏': 'clap', '🙌': 'raised_hands',
    '❤️': 'heart', '🔥': 'fire', '⭐': 'star', '🌟': 'glowing_star',
    '✨': 'sparkles', '💎': 'gem', '🎉': 'party_popper', '🏆': 'trophy',
    '✅': 'check', '❌': 'cross', '💯': 'hundred', '🚫': 'prohibited'
  };
  return names[emoji] || '';
}

// Reaksiyon animasyonu
function animateReaction(element, emoji) {
  const rect = element.getBoundingClientRect();
  const particle = document.createElement('span');
  particle.textContent = emoji;
  particle.style.cssText = `
    position: fixed;
    left: ${rect.left + rect.width/2}px;
    top: ${rect.top}px;
    font-size: 20px;
    pointer-events: none;
    z-index: 9999;
    animation: reactionPop 0.6s ease forwards;
  `;
  document.body.appendChild(particle);
  
  setTimeout(() => particle.remove(), 600);
}

// Reaksiyon pop animasyonu için CSS
const reactionStyle = document.createElement('style');
reactionStyle.textContent = `
  @keyframes reactionPop {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    50% { transform: translateY(-20px) scale(1.3); opacity: 0.8; }
    100% { transform: translateY(-40px) scale(0.5); opacity: 0; }
  }
  
  .emoji-picker {
    width: 320px;
    background: var(--bg1);
    border: 1px solid var(--b2);
    border-radius: 12px;
    overflow: hidden;
  }
  
  .emoji-tabs {
    display: flex;
    border-bottom: 1px solid var(--b2);
    padding: 4px;
    gap: 2px;
  }
  
  .emoji-tab {
    flex: 1;
    padding: 6px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    border-radius: 6px;
    transition: background .15s;
  }
  
  .emoji-tab:hover {
    background: var(--bg2);
  }
  
  .emoji-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 8px;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .emoji-frequent {
    border-top: 1px solid var(--b2);
    padding: 8px;
  }
  
  .emoji-frequent-title {
    font-size: 10px;
    color: var(--t3);
    font-weight: 600;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
`;
document.head.appendChild(reactionStyle);

// Emoji butonunu güncelle
document.addEventListener('DOMContentLoaded', () => {
  const emojiBtn = document.getElementById('emojiBtn');
  if (emojiBtn) {
    emojiBtn.onclick = () => {
      const panel = document.getElementById('emojiPanel');
      if (panel?.classList.contains('hidden') || !panel?.innerHTML) {
        showEmojiPanel();
      } else {
        panel.classList.add('hidden');
      }
    };
  }
  
  // Reaksiyon butonlarına animasyon ekle
  document.addEventListener('click', (e) => {
    if (e.target.closest('.ma button')) {
      const emoji = e.target.closest('.ma button').textContent.trim();
      if (emoji) animateReaction(e.target, emoji);
    }
  });
});
