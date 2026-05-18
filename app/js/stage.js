// ============ GETTIC STAGE.JS - STAGE KANALI ============

const stageState = {
  activeStage: null,
  speakers: [],
  listeners: [],
  isSpeaker: false,
  isMuted: false,
  topic: '',
  startedAt: null,
  raisedHands: []
};

// Stage kanalı oluştur
function createStageChannel(name, topic) {
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('❌ Yetkiniz yok', 'e');
  if (!name?.trim()) return toast('Kanal adı gerekli', 'e');
  
  const channelId = 'stage_' + genId();
  const channel = {
    id: channelId,
    name: name.trim(),
    type: 'stage',
    category: 'STAGE',
    topic: topic || '',
    createdBy: Store.user._id,
    createdAt: new Date().toISOString()
  };
  
  if (!Store.channels) Store.channels = [];
  Store.channels.push(channel);
  
  if (!Store.categories.includes('STAGE')) {
    Store.categories.push('STAGE');
  }
  
  if (typeof renderChannels === 'function') renderChannels();
  if (typeof saveStore === 'function') saveStore();
  
  toast('🎙️ Stage kanalı oluşturuldu');
  joinStage(channelId, true);
}

// Stage'e katıl
function joinStage(channelId, asSpeaker = false) {
  // Önceki stage'den ayrıl
  if (stageState.activeStage) leaveStage();
  
  stageState.activeStage = channelId;
  stageState.isSpeaker = asSpeaker;
  stageState.startedAt = new Date().toISOString();
  
  if (asSpeaker) {
    stageState.speakers.push(Store.user._id);
    stageState.isMuted = false;
    
    // Mikrofon aç
    if (typeof joinVoice === 'function') {
      joinVoice(channelId);
    }
  } else {
    stageState.listeners.push(Store.user._id);
    stageState.isMuted = true;
  }
  
  showStageUI(channelId);
  
  if (typeof navigateTo === 'function') {
    navigateTo('/server/gettic/stage/' + channelId);
  }
}

// Stage'den ayrıl
function leaveStage() {
  if (stageState.isSpeaker && typeof leaveVoice === 'function') {
    leaveVoice();
  }
  
  stageState.speakers = stageState.speakers.filter(id => id !== Store.user._id);
  stageState.listeners = stageState.listeners.filter(id => id !== Store.user._id);
  
  if (stageState.speakers.length === 0 && stageState.listeners.length === 0) {
    stageState.activeStage = null;
    stageState.topic = '';
    stageState.raisedHands = [];
  }
  
  hideStageUI();
  
  if (typeof navigateTo === 'function') {
    navigateTo('/');
  }
}

// El kaldır (dinleyici → konuşmacı)
function raiseHand() {
  if (stageState.isSpeaker) return;
  if (stageState.raisedHands.includes(Store.user._id)) {
    stageState.raisedHands = stageState.raisedHands.filter(id => id !== Store.user._id);
    toast('✋ El indirildi');
  } else {
    stageState.raisedHands.push(Store.user._id);
    toast('✋ El kaldırıldı - moderatör onayı bekleniyor');
  }
  updateStageUI();
}

// Konuşmacıya davet et (moderatör)
function inviteToSpeak(userId) {
  if (!stageState.isSpeaker || !hasPermission(Store.user._id, 'manageMessages')) return;
  
  stageState.raisedHands = stageState.raisedHands.filter(id => id !== userId);
  if (!stageState.speakers.includes(userId)) {
    stageState.speakers.push(userId);
    stageState.listeners = stageState.listeners.filter(id => id !== userId);
  }
  updateStageUI();
  toast('✅ Konuşmacı eklendi');
}

// Konuşmacıyı dinleyici yap
function moveToListener(userId) {
  if (!hasPermission(Store.user._id, 'manageMessages')) return;
  
  stageState.speakers = stageState.speakers.filter(id => id !== userId);
  if (!stageState.listeners.includes(userId)) {
    stageState.listeners.push(userId);
  }
  updateStageUI();
  toast('👥 Dinleyiciye alındı');
}

// Stage UI
function showStageUI(channelId) {
  let panel = document.getElementById('stagePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'stagePanel';
    panel.className = 'stage-panel';
    panel.innerHTML = `
      <div class="stage-header">
        <div class="stage-title">🎙️ Stage</div>
        <div class="stage-topic" id="stageTopic"></div>
      </div>
      <div class="stage-body">
        <div class="stage-section">
          <div class="stage-section-title">🔊 Konuşmacılar (<span id="speakerCount">0</span>)</div>
          <div id="speakersList"></div>
        </div>
        <div class="stage-section">
          <div class="stage-section-title">👥 Dinleyiciler (<span id="listenerCount">0</span>)</div>
          <div id="listenersList"></div>
        </div>
        <div class="stage-section" id="raisedHandsSection" style="display:none">
          <div class="stage-section-title">✋ El Kaldıranlar (<span id="handCount">0</span>)</div>
          <div id="raisedHandsList"></div>
        </div>
      </div>
      <div class="stage-controls">
        ${stageState.isSpeaker ? `
          <button class="stage-btn" onclick="leaveStage()" style="background:var(--re)">📴 Ayrıl</button>
        ` : `
          <button class="stage-btn" onclick="raiseHand()">✋ El Kaldır</button>
          <button class="stage-btn" onclick="leaveStage()">🚪 Çık</button>
        `}
      </div>
    `;
    document.body.appendChild(panel);
  }
  
  panel.style.display = 'flex';
  updateStageUI();
}

function hideStageUI() {
  const panel = document.getElementById('stagePanel');
  if (panel) panel.style.display = 'none';
}

function updateStageUI() {
  document.getElementById('speakerCount').textContent = stageState.speakers.length;
  document.getElementById('listenerCount').textContent = stageState.listeners.length;
  
  document.getElementById('speakersList').innerHTML = stageState.speakers.map(id => `
    <div class="stage-user">
      <span>🎤 ${id}</span>
      ${hasPermission(Store.user?._id, 'manageMessages') && id !== Store.user._id ? 
        `<button onclick="moveToListener('${id}')" style="font-size:10px">⬇️</button>` : ''}
    </div>
  `).join('') || '<span style="color:var(--t3);font-size:11px">Henüz konuşmacı yok</span>';
  
  document.getElementById('listenersList').innerHTML = stageState.listeners.map(id => `
    <div class="stage-user">
      <span>👤 ${id}</span>
    </div>
  `).join('') || '<span style="color:var(--t3);font-size:11px">Henüz dinleyici yok</span>';
  
  const handsSection = document.getElementById('raisedHandsSection');
  if (stageState.raisedHands.length > 0 && stageState.isSpeaker) {
    handsSection.style.display = 'block';
    document.getElementById('handCount').textContent = stageState.raisedHands.length;
    document.getElementById('raisedHandsList').innerHTML = stageState.raisedHands.map(id => `
      <div class="stage-user">
        <span>✋ ${id}</span>
        <button onclick="inviteToSpeak('${id}')" style="font-size:10px;background:var(--gr);color:#fff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer">Konuşmacı Yap</button>
      </div>
    `).join('');
  } else {
    handsSection.style.display = 'none';
  }
}

// Stage CSS
const stageStyle = document.createElement('style');
stageStyle.textContent = `
  .stage-panel {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 400px;
    max-width: 95vw;
    background: var(--bg1);
    border: 1px solid var(--b2);
    border-radius: 16px 16px 0 0;
    z-index: 150;
    display: none;
    flex-direction: column;
    box-shadow: 0 -4px 20px rgba(0,0,0,.3);
  }
  .stage-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--b2);
    text-align: center;
  }
  .stage-title {
    font-weight: 700;
    font-size: 15px;
  }
  .stage-topic {
    font-size: 11px;
    color: var(--t3);
  }
  .stage-body {
    padding: 12px;
    max-height: 200px;
    overflow-y: auto;
  }
  .stage-section {
    margin-bottom: 10px;
  }
  .stage-section-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--t3);
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 4px;
  }
  .stage-user {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 12px;
  }
  .stage-controls {
    padding: 10px 16px;
    border-top: 1px solid var(--b2);
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .stage-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--b2);
    background: var(--bg2);
    color: var(--t1);
    cursor: pointer;
    font-size: 12px;
    transition: all .15s;
  }
  .stage-btn:hover {
    background: var(--ac);
    border-color: var(--ac);
  }
`;
document.head.appendChild(stageStyle);

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  // Stage kanalına tıklanınca
  document.addEventListener('click', (e) => {
    const chItem = e.target.closest('.ch-item');
    if (chItem?.dataset?.type === 'stage') {
      joinStage(chItem.dataset.id, hasPermission(Store.user?._id, 'manageMessages'));
    }
  });
});
