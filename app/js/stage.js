// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC STAGE.JS - SVG İKONLU + TÜRKÇE DÜZELTMELER            ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function stgIcon(name, size = 18) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

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
  if (!hasPermission(Store.user?._id, 'manageChannels')) return toast('Yetkiniz yok', 'e');
  if (!name?.trim()) return toast('Kanal adı gerekli', 'e');
  
  const channelId = 'stage_' + genId();
  const channel = {
    id: channelId, name: name.trim(), type: 'stage',
    category: 'STAGE', topic: topic || '',
    createdBy: Store.user._id, createdAt: new Date().toISOString()
  };
  
  if (!Store.channels) Store.channels = [];
  Store.channels.push(channel);
  if (!Store.categories.includes('STAGE')) Store.categories.push('STAGE');
  
  if (typeof renderChannels === 'function') renderChannels();
  if (typeof saveStore === 'function') saveStore();
  
  toast(stgIcon('mic') + ' Stage kanalı oluşturuldu');
  joinStage(channelId, true);
}

// Stage'e katıl
function joinStage(channelId, asSpeaker = false) {
  if (stageState.activeStage) leaveStage();
  
  stageState.activeStage = channelId;
  stageState.isSpeaker = asSpeaker;
  stageState.startedAt = new Date().toISOString();
  
  if (asSpeaker) {
    stageState.speakers.push(Store.user._id);
    stageState.isMuted = false;
    if (typeof joinVoice === 'function') joinVoice(channelId);
  } else {
    stageState.listeners.push(Store.user._id);
    stageState.isMuted = true;
  }
  
  showStageUI(channelId);
  if (typeof navigateTo === 'function') navigateTo('/server/gettic/stage/' + channelId);
}

// Stage'den ayrıl
function leaveStage() {
  if (stageState.isSpeaker && typeof leaveVoice === 'function') leaveVoice();
  
  stageState.speakers = stageState.speakers.filter(id => id !== Store.user._id);
  stageState.listeners = stageState.listeners.filter(id => id !== Store.user._id);
  
  if (stageState.speakers.length === 0 && stageState.listeners.length === 0) {
    stageState.activeStage = null;
    stageState.topic = '';
    stageState.raisedHands = [];
  }
  
  hideStageUI();
  if (typeof navigateTo === 'function') navigateTo('/');
}

// El kaldır
function raiseHand() {
  if (stageState.isSpeaker) return;
  if (stageState.raisedHands.includes(Store.user._id)) {
    stageState.raisedHands = stageState.raisedHands.filter(id => id !== Store.user._id);
    toast(stgIcon('hand') + ' El indirildi');
  } else {
    stageState.raisedHands.push(Store.user._id);
    toast(stgIcon('hand') + ' El kaldırıldı - moderatör onayı bekleniyor');
  }
  updateStageUI();
}

// Konuşmacıya davet et
function inviteToSpeak(userId) {
  if (!stageState.isSpeaker || !hasPermission(Store.user?._id, 'manageMessages')) return;
  
  stageState.raisedHands = stageState.raisedHands.filter(id => id !== userId);
  if (!stageState.speakers.includes(userId)) {
    stageState.speakers.push(userId);
    stageState.listeners = stageState.listeners.filter(id => id !== userId);
  }
  updateStageUI();
  toast(stgIcon('user-plus') + ' Konuşmacı eklendi');
}

// Konuşmacıyı dinleyici yap
function moveToListener(userId) {
  if (!hasPermission(Store.user?._id, 'manageMessages')) return;
  
  stageState.speakers = stageState.speakers.filter(id => id !== userId);
  if (!stageState.listeners.includes(userId)) stageState.listeners.push(userId);
  updateStageUI();
  toast(stgIcon('users') + ' Dinleyiciye alındı');
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
        <div class="stage-title">${stgIcon('mic',20)} Stage</div>
        <div class="stage-topic" id="stageTopic"></div>
      </div>
      <div class="stage-body">
        <div class="stage-section">
          <div class="stage-section-title">${stgIcon('volume',14)} Konuşmacılar (<span id="speakerCount">0</span>)</div>
          <div id="speakersList"></div>
        </div>
        <div class="stage-section">
          <div class="stage-section-title">${stgIcon('users',14)} Dinleyiciler (<span id="listenerCount">0</span>)</div>
          <div id="listenersList"></div>
        </div>
        <div class="stage-section" id="raisedHandsSection" style="display:none">
          <div class="stage-section-title">${stgIcon('hand',14)} El Kaldıranlar (<span id="handCount">0</span>)</div>
          <div id="raisedHandsList"></div>
        </div>
      </div>
      <div class="stage-controls">
        ${stageState.isSpeaker ? `
          <button class="stage-btn" onclick="leaveStage()" style="background:var(--re)">${stgIcon('log-out',16)} Ayrıl</button>
        ` : `
          <button class="stage-btn" onclick="raiseHand()">${stgIcon('hand',16)} El Kaldır</button>
          <button class="stage-btn" onclick="leaveStage()">${stgIcon('log-out',16)} Çık</button>
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
  const speakerCount = document.getElementById('speakerCount');
  const listenerCount = document.getElementById('listenerCount');
  const speakersList = document.getElementById('speakersList');
  const listenersList = document.getElementById('listenersList');
  
  if (speakerCount) speakerCount.textContent = stageState.speakers.length;
  if (listenerCount) listenerCount.textContent = stageState.listeners.length;
  
  if (speakersList) {
    speakersList.innerHTML = stageState.speakers.map(id => `
      <div class="stage-user">
        <span>${stgIcon('mic',14)} ${escapeHtml(id)}</span>
        ${hasPermission(Store.user?._id, 'manageMessages') && id !== Store.user._id ? 
          `<button onclick="moveToListener('${id}')" style="font-size:10px;background:none;border:none;cursor:pointer">${stgIcon('arrow-down',14)}</button>` : ''}
      </div>
    `).join('') || `<span style="color:var(--t3);font-size:11px">Henüz konuşmacı yok</span>`;
  }
  
  if (listenersList) {
    listenersList.innerHTML = stageState.listeners.map(id => `
      <div class="stage-user">
        <span>${stgIcon('user',14)} ${escapeHtml(id)}</span>
      </div>
    `).join('') || `<span style="color:var(--t3);font-size:11px">Henüz dinleyici yok</span>`;
  }
  
  const handsSection = document.getElementById('raisedHandsSection');
  const handCount = document.getElementById('handCount');
  const raisedHandsList = document.getElementById('raisedHandsList');
  
  if (stageState.raisedHands.length > 0 && stageState.isSpeaker) {
    if (handsSection) handsSection.style.display = 'block';
    if (handCount) handCount.textContent = stageState.raisedHands.length;
    if (raisedHandsList) {
      raisedHandsList.innerHTML = stageState.raisedHands.map(id => `
        <div class="stage-user">
          <span>${stgIcon('hand',14)} ${escapeHtml(id)}</span>
          <button onclick="inviteToSpeak('${id}')" style="font-size:10px;background:var(--gr);color:#fff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer">${stgIcon('user-plus',12)} Konuşmacı Yap</button>
        </div>
      `).join('');
    }
  } else {
    if (handsSection) handsSection.style.display = 'none';
  }
}

// HTML kaçış
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// Stage CSS
const stageStyle = document.createElement('style');
stageStyle.textContent = `
  .stage-panel {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 400px; max-width: 95vw; background: var(--bg1);
    border: 1px solid var(--b2); border-radius: 16px 16px 0 0;
    z-index: 150; display: none; flex-direction: column;
    box-shadow: 0 -4px 20px rgba(0,0,0,.3);
  }
  .stage-header { padding: 12px 16px; border-bottom: 1px solid var(--b2); text-align: center; }
  .stage-title { font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .stage-topic { font-size: 11px; color: var(--t3); }
  .stage-body { padding: 12px; max-height: 200px; overflow-y: auto; }
  .stage-section { margin-bottom: 10px; }
  .stage-section-title { font-size: 10px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
  .stage-user { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .stage-controls { padding: 10px 16px; border-top: 1px solid var(--b2); display: flex; gap: 8px; justify-content: center; }
  .stage-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--b2); background: var(--bg2); color: var(--t1); cursor: pointer; font-size: 12px; transition: all .15s; display: flex; align-items: center; gap: 4px; }
  .stage-btn:hover { background: var(--ac); border-color: var(--ac); }
`;
document.head.appendChild(stageStyle);

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    const chItem = e.target.closest('.ch-item');
    if (chItem?.dataset?.type === 'stage') {
      joinStage(chItem.dataset.id, hasPermission(Store.user?._id, 'manageMessages'));
    }
  });
});

console.log('Stage.js yüklendi (SVG ikonlu + Türkçe düzeltmeler)');
