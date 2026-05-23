// ============ GETTIC EMOJI.JS - EMOJI & REAKSİYON ============

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
  currentSkinTone: 0
};

function showEmojiPanel() {
  const panel = document.getElementById('emojiPanel');
  if (!panel) return;
  
  let html = '<div class="emoji-picker"><div class="emoji-tabs">';
  Object.keys(emojiState.categories).forEach(cat => {
    const icon = { smileys: '😀', gestures: '👍', hearts: '❤️', objects: '🔥', nature: '🌸', symbols: '✅' }[cat];
    html += `<button class="emoji-tab" onclick="showEmojiCategory('${cat}')">${icon}</button>`;
  });
  if (emojiState.customEmojis.length > 0) html += `<button class="emoji-tab" onclick="showCustomEmojis()">🖼️</button>`;
  html += '</div><div id="emojiGrid" class="emoji-grid"></div>';
  
  if (emojiState.frequentlyUsed.length > 0) {
    html += '<div class="emoji-frequent"><div class="emoji-frequent-title">Sık Kullanılanlar</div><div class="emoji-grid">';
    emojiState.frequentlyUsed.slice(0, 16).forEach(e => { html += `<span class="es" onclick="insertEmoji('${e}')">${e}</span>`; });
    html += '</div></div>';
  }
  html += '</div>';
  panel.innerHTML = html;
  panel.classList.remove('hidden');
  showEmojiCategory('smileys');
}

function showEmojiCategory(cat) {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  const emojis = emojiState.categories[cat] || [];
  grid.innerHTML = emojis.map(e => `<span class="es" onclick="insertEmoji('${e}')" title="${e}">${e}</span>`).join('');
}

function showCustomEmojis() {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  if (emojiState.customEmojis.length === 0) { grid.innerHTML = '<p style="color:var(--t3);font-size:11px;padding:10px">Henüz özel emoji yok</p>'; return; }
  grid.innerHTML = emojiState.customEmojis.map(e => `<span class="es" onclick="insertEmoji(':${e.name}:')" title="${e.name}"><img src="${e.url}" alt="${e.name}" style="width:28px;height:28px;object-fit:contain"></span>`).join('');
}

function insertEmoji(emoji) {
  const target = document.getElementById('messageInput') || document.getElementById('dmInput');
  if (target) {
    const start = target.selectionStart, end = target.selectionEnd;
    target.value = target.value.substring(0, start) + emoji + target.value.substring(end);
    target.selectionStart = target.selectionEnd = start + emoji.length;
    target.focus();
  }
  addToFrequent(emoji);
  document.getElementById('emojiPanel')?.classList.add('hidden');
}

function addToFrequent(emoji) {
  emojiState.frequentlyUsed = emojiState.frequentlyUsed.filter(e => e !== emoji);
  emojiState.frequentlyUsed.unshift(emoji);
  if (emojiState.frequentlyUsed.length > 30) emojiState.frequentlyUsed.pop();
  localStorage.setItem('gt_frequent_emojis', JSON.stringify(emojiState.frequentlyUsed));
}

function uploadCustomEmoji() {
  const name = prompt('Emoji adı (örn: pog):');
  if (!name?.trim()) return;
  if (emojiState.customEmojis.find(e => e.name === name.trim())) return toast('Bu isimde emoji zaten var', 'e');
  const url = prompt('Emoji URL (resim linki):');
  if (!url?.trim()) return;
  emojiState.customEmojis.push({ id: genId(), name: name.trim().toLowerCase(), url: url.trim(), uploadedBy: Store.user?.username, uploadedAt: new Date().toISOString() });
  localStorage.setItem('gt_custom_emojis', JSON.stringify(emojiState.customEmojis));
  toast('✅ Emoji eklendi: :' + name.trim() + ':');
}

const reactionStyle = document.createElement('style');
reactionStyle.textContent = `
  @keyframes reactionPop { 0% { transform: translateY(0) scale(1); opacity: 1; } 50% { transform: translateY(-20px) scale(1.3); opacity: 0.8; } 100% { transform: translateY(-40px) scale(0.5); opacity: 0; } }
  .emoji-picker { width: 320px; background: var(--bg1); border: 1px solid var(--b2); border-radius: 12px; overflow: hidden; }
  .emoji-tabs { display: flex; border-bottom: 1px solid var(--b2); padding: 4px; gap: 2px; }
  .emoji-tab { flex: 1; padding: 6px; background: none; border: none; cursor: pointer; font-size: 16px; border-radius: 6px; transition: background .15s; }
  .emoji-tab:hover { background: var(--bg2); }
  .emoji-grid { display: flex; flex-wrap: wrap; gap: 2px; padding: 8px; max-height: 200px; overflow-y: auto; }
  .emoji-frequent { border-top: 1px solid var(--b2); padding: 8px; }
  .emoji-frequent-title { font-size: 10px; color: var(--t3); font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
`;
document.head.appendChild(reactionStyle);

document.addEventListener('DOMContentLoaded', () => {
  const emojiBtn = document.getElementById('emojiBtn');
  if (emojiBtn) emojiBtn.onclick = () => { const panel = document.getElementById('emojiPanel'); if (panel?.classList.contains('hidden') || !panel?.innerHTML) showEmojiPanel(); else panel.classList.add('hidden'); };
});

console.log('✅ Emoji.js yüklendi');
