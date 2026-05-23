// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC THREADS.JS - SVG İKONLU + TÜRKÇE DÜZELTMELER           ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function thrIcon(name, size = 16) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

const threadState = {
  threads: JSON.parse(localStorage.getItem('gt_threads') || '{}'),
  activeThread: null,
  threadOrder: JSON.parse(localStorage.getItem('gt_thread_order') || '[]')
};

// Konu oluştur
function createThread(parentMsgId) {
  const parentMsg = Store.messages.find(m => m._id === parentMsgId);
  if (!parentMsg) return;
  
  const threadId = genId();
  const thread = {
    id: threadId, parentId: parentMsgId,
    parentContent: parentMsg.content?.substring(0, 100),
    parentAuthor: parentMsg.senderName, parentTime: parentMsg.createdAt,
    channelId: Store.activeChannel,
    title: parentMsg.content?.substring(0, 50) || 'Konu',
    messages: [], participants: [Store.user._id, parentMsg.senderId],
    participantNames: [Store.user.username, parentMsg.senderName],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    messageCount: 0, isArchived: false, isLocked: false
  };
  
  threadState.threads[threadId] = thread;
  threadState.threadOrder.unshift(threadId);
  if (threadState.threadOrder.length > 100) threadState.threadOrder.pop();
  
  saveThreadState();
  openThread(threadId);
  toast(thrIcon('message-square') + ' Konu başlatıldı');
}

// Konu aç
function openThread(threadId) {
  const thread = threadState.threads[threadId];
  if (!thread) return;
  
  threadState.activeThread = threadId;
  
  const messagesEl = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  const inputArea = document.querySelector('.input-area');
  
  if (channelName) channelName.textContent = (thread.title || 'Konu');
  
  if (messagesEl) {
    let html = `
      <div class="thread-parent-msg" style="background:var(--bg2);padding:12px;border-radius:8px;margin-bottom:12px;border-left:3px solid var(--ac)">
        <div class="msg-head">
          <span style="font-weight:700">${escapeHtml(thread.parentAuthor)}</span>
          <span class="msg-time">${formatTime(thread.parentTime)}</span>
        </div>
        <div class="msg-text">${formatMsg(thread.parentContent || '')}</div>
      </div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <span>${thrIcon('message-square',12)} ${thread.messageCount} yanıt</span>
        <span>${thrIcon('users',12)} ${thread.participantNames.length} katılımcı</span>
        ${thread.isLocked ? `<span>${thrIcon('lock',12)} Kilitli</span>` : ''}
        ${thread.isArchived ? `<span>${thrIcon('archive',12)} Arşivlendi</span>` : ''}
      </div>
    `;
    
    if (thread.messages.length === 0) {
      html += `<p style="color:var(--t3);text-align:center;padding:20px">${thrIcon('message-square',20)}<br>Henüz yanıt yok</p>`;
    } else {
      thread.messages.forEach(msg => {
        html += `
          <div class="msg">
            <div class="msg-av">${(msg.senderName||'?').charAt(0).toUpperCase()}</div>
            <div class="msg-body">
              <div class="msg-head"><span>${escapeHtml(msg.senderName)}</span><span class="msg-time">${formatTime(msg.time)}</span></div>
              <div class="msg-text">${formatMsg(msg.content)}</div>
            </div>
          </div>
        `;
      });
    }
    
    messagesEl.innerHTML = html;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  if (inputArea) {
    inputArea.innerHTML = `
      <textarea class="msg-inp" id="threadInput" placeholder="Konuya yanıt yaz..." rows="1"></textarea>
      <button class="ib" style="background:var(--gr)" id="threadSendBtn">${thrIcon('send',16)}</button>
      <button class="ib" id="threadCloseBtn" title="Konuyu Kapat">${thrIcon('x',16)}</button>
    `;
    
    document.getElementById('threadSendBtn').onclick = () => {
      const input = document.getElementById('threadInput');
      if (input?.value.trim()) sendThreadMessage(threadId, input.value);
    };
    
    document.getElementById('threadInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('threadSendBtn').click(); }
    });
    
    document.getElementById('threadCloseBtn').onclick = closeThread;
  }
}

// Konu mesajı gönder
function sendThreadMessage(threadId, content) {
  const thread = threadState.threads[threadId];
  if (!thread || thread.isLocked) return;
  if (!content?.trim()) return;
  
  const msg = { id: genId(), senderId: Store.user._id, senderName: Store.user.username, content: content.trim(), time: new Date().toISOString() };
  
  thread.messages.push(msg);
  thread.messageCount = thread.messages.length;
  thread.updatedAt = new Date().toISOString();
  
  if (!thread.participants.includes(Store.user._id)) {
    thread.participants.push(Store.user._id);
    thread.participantNames.push(Store.user.username);
  }
  
  saveThreadState();
  openThread(threadId);
  
  threadState.threadOrder = threadState.threadOrder.filter(id => id !== threadId);
  threadState.threadOrder.unshift(threadId);
}

// Konu kapat
function closeThread() {
  threadState.activeThread = null;
  
  const inputArea = document.querySelector('.input-area');
  if (inputArea) {
    inputArea.innerHTML = `
      <button class="ib" id="emojiBtn">${thrIcon('smile',18)}</button>
      <div id="emojiPanel" class="epop hidden" style="bottom:60px;left:10px"></div>
      <button class="ib" id="gifBtn">${thrIcon('gif',18)}</button>
      <button class="ib" id="imageBtn">${thrIcon('image',18)}</button>
      <button class="ib" id="pollBtn">${thrIcon('bar-chart',18)}</button>
      <button class="ib" id="fileBtn">${thrIcon('paperclip',18)}</button>
      <button class="ib" id="voiceMsgBtn">${thrIcon('mic',18)}</button>
      <textarea class="msg-inp" id="messageInput" placeholder="Mesaj yaz..." rows="1"></textarea>
      <button class="ib send-btn-main" id="sendBtn">${thrIcon('send',18)}</button>
    `;
  }
  
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof navigateTo === 'function') navigateTo('/');
}

// Arşivle
function archiveThread(threadId) {
  const thread = threadState.threads[threadId];
  if (!thread) return;
  thread.isArchived = !thread.isArchived;
  saveThreadState();
  toast(thread.isArchived ? thrIcon('archive') + ' Arşivlendi' : thrIcon('folder') + ' Arşivden çıkarıldı');
}

// Kilitle
function lockThread(threadId) {
  const thread = threadState.threads[threadId];
  if (!thread) return;
  if (!hasPermission(Store.user?._id, 'manageMessages')) return toast('Yetkiniz yok', 'e');
  thread.isLocked = !thread.isLocked;
  saveThreadState();
  toast(thread.isLocked ? thrIcon('lock') + ' Konu kilitlendi' : thrIcon('unlock') + ' Konu kilidi açıldı');
}

// Konu listesi
function showThreadList() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  const activeThreads = threadState.threadOrder.map(id => threadState.threads[id]).filter(t => t && !t.isArchived);
  const archivedThreads = threadState.threadOrder.map(id => threadState.threads[id]).filter(t => t && t.isArchived);
  
  content.innerHTML = `
    <h2>${thrIcon('message-square',24)} Konu Başlıkları</h2>
    <div style="max-height:400px;overflow-y:auto">
      ${activeThreads.length === 0 && archivedThreads.length === 0 ? `<p style="color:var(--t3);text-align:center;padding:20px">Henüz konu yok</p>` : ''}
      
      ${activeThreads.length > 0 ? `
        <div class="search-section-title">Aktif Konular (${activeThreads.length})</div>
        ${activeThreads.map(t => `
          <div class="mitem" onclick="openThread('${t.id}');closeModal()">
            <div class="mav" style="background:var(--acd)">${thrIcon('message-square',16)}</div>
            <div class="minfo">
              <div class="mname">${escapeHtml(t.title)}</div>
              <div class="msub">${t.messageCount} yanıt · ${t.participantNames.length} kişi · ${formatTime(t.updatedAt)}</div>
            </div>
            <div style="display:flex;gap:4px;align-items:center">
              ${t.isLocked ? thrIcon('lock',12) : ''}
              <button class="ib" onclick="event.stopPropagation();archiveThread('${t.id}')" style="width:22px;height:22px" title="Arşivle">${thrIcon('archive',14)}</button>
            </div>
          </div>
        `).join('')}
      ` : ''}
      
      ${archivedThreads.length > 0 ? `
        <div class="search-section-title">Arşivlenenler (${archivedThreads.length})</div>
        ${archivedThreads.map(t => `
          <div class="mitem" onclick="openThread('${t.id}');closeModal()" style="opacity:0.6">
            <div class="mav">${thrIcon('archive',16)}</div>
            <div class="minfo">
              <div class="mname">${escapeHtml(t.title)}</div>
              <div class="msub">${t.messageCount} yanıt</div>
            </div>
          </div>
        `).join('')}
      ` : ''}
    </div>
  `;
  
  openModal('threads');
}

// Mesajlarda konu butonu
function renderThreadButton(msgId) {
  const thread = Object.values(threadState.threads).find(t => t.parentId === msgId);
  const count = thread?.messageCount || 0;
  
  return `
    <div class="thread-indicator" onclick="openThread('${thread?.id}');${!thread ? `createThread('${msgId}')` : ''}" 
         style="font-size:11px;color:var(--ac);cursor:pointer;margin-top:4px">
      ${count > 0 ? `${thrIcon('message-square',12)} ${count} yanıt` : `${thrIcon('corner-up-left',12)} Yanıtla`}
    </div>
  `;
}

// HTML kaçış
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// CSS
const threadStyle = document.createElement('style');
threadStyle.textContent = `
  .thread-parent-msg { position: relative; }
  .thread-parent-msg::after { content: ''; position: absolute; left: 20px; bottom: -12px; width: 2px; height: 12px; background: var(--ac); }
  .thread-indicator { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; transition: background .15s; }
  .thread-indicator:hover { background: var(--acd); }
`;
document.head.appendChild(threadStyle);

// Kaydet
function saveThreadState() {
  localStorage.setItem('gt_threads', JSON.stringify(threadState.threads));
  localStorage.setItem('gt_thread_order', JSON.stringify(threadState.threadOrder));
}

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  const threadBtn = document.getElementById('threadBtn');
  if (threadBtn) threadBtn.onclick = showThreadList;
});

console.log('Threads.js yüklendi (SVG ikonlu + Türkçe düzeltmeler)');
