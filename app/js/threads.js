// ============ GETTIC THREADS.JS - KONU BAŞLIKLARI ============

const threadState = {
  threads: JSON.parse(localStorage.getItem('gt_threads') || '{}'),
  activeThread: null,
  threadOrder: JSON.parse(localStorage.getItem('gt_thread_order') || '[]')
};

// Thread oluştur
function createThread(parentMsgId) {
  const parentMsg = Store.messages.find(m => m._id === parentMsgId);
  if (!parentMsg) return;
  
  const threadId = genId();
  const thread = {
    id: threadId,
    parentId: parentMsgId,
    parentContent: parentMsg.content?.substring(0, 100),
    parentAuthor: parentMsg.senderName,
    parentTime: parentMsg.createdAt,
    channelId: Store.activeChannel,
    title: parentMsg.content?.substring(0, 50) || 'Konu',
    messages: [],
    participants: [Store.user._id, parentMsg.senderId],
    participantNames: [Store.user.username, parentMsg.senderName],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
    isArchived: false,
    isLocked: false
  };
  
  threadState.threads[threadId] = thread;
  threadState.threadOrder.unshift(threadId);
  if (threadState.threadOrder.length > 100) threadState.threadOrder.pop();
  
  saveThreadState();
  openThread(threadId);
  toast('💬 Konu başlatıldı');
}

// Thread aç
function openThread(threadId) {
  const thread = threadState.threads[threadId];
  if (!thread) return;
  
  threadState.activeThread = threadId;
  
  const messagesEl = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  const inputArea = document.querySelector('.input-area');
  
  if (channelName) channelName.textContent = '💬 ' + (thread.title || 'Konu');
  
  if (messagesEl) {
    // Ana mesajı göster
    let html = `
      <div class="thread-parent-msg" style="background:var(--bg2);padding:12px;border-radius:8px;margin-bottom:12px;border-left:3px solid var(--ac)">
        <div class="msg-head">
          <span style="font-weight:700">${thread.parentAuthor}</span>
          <span class="msg-time">${formatTime(thread.parentTime)}</span>
        </div>
        <div class="msg-text">${formatMsg(thread.parentContent || '')}</div>
      </div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:12px">
        ${thread.messageCount} yanıt · ${thread.participantNames.length} katılımcı
        ${thread.isLocked ? '🔒 Kilitli' : ''} ${thread.isArchived ? '📦 Arşivlendi' : ''}
      </div>
    `;
    
    // Thread mesajları
    if (thread.messages.length === 0) {
      html += '<p style="color:var(--t3);text-align:center;padding:20px">Henüz yanıt yok</p>';
    } else {
      thread.messages.forEach(msg => {
        html += `
          <div class="msg">
            <div class="msg-av">${(msg.senderName||'?').charAt(0).toUpperCase()}</div>
            <div class="msg-body">
              <div class="msg-head">
                <span>${msg.senderName}</span>
                <span class="msg-time">${formatTime(msg.time)}</span>
              </div>
              <div class="msg-text">${formatMsg(msg.content)}</div>
            </div>
          </div>
        `;
      });
    }
    
    messagesEl.innerHTML = html;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  // Input alanını thread için değiştir
  if (inputArea) {
    inputArea.innerHTML = `
      <textarea class="msg-inp" id="threadInput" placeholder="Konuya yanıt yaz..." rows="1"></textarea>
      <button class="ib" style="background:var(--gr)" id="threadSendBtn">➤</button>
      <button class="ib" id="threadCloseBtn" title="Konuyu Kapat">×</button>
    `;
    
    document.getElementById('threadSendBtn').onclick = () => {
      const input = document.getElementById('threadInput');
      if (input?.value.trim()) sendThreadMessage(threadId, input.value);
    };
    
    document.getElementById('threadInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('threadSendBtn').click();
      }
    });
    
    document.getElementById('threadCloseBtn').onclick = closeThread;
  }
}

// Thread mesajı gönder
function sendThreadMessage(threadId, content) {
  const thread = threadState.threads[threadId];
  if (!thread || thread.isLocked) return;
  if (!content?.trim()) return;
  
  const msg = {
    id: genId(),
    senderId: Store.user._id,
    senderName: Store.user.username,
    content: content.trim(),
    time: new Date().toISOString()
  };
  
  thread.messages.push(msg);
  thread.messageCount = thread.messages.length;
  thread.updatedAt = new Date().toISOString();
  
  if (!thread.participants.includes(Store.user._id)) {
    thread.participants.push(Store.user._id);
    thread.participantNames.push(Store.user.username);
  }
  
  saveThreadState();
  openThread(threadId);
  
  // Thread sırasını güncelle
  threadState.threadOrder = threadState.threadOrder.filter(id => id !== threadId);
  threadState.threadOrder.unshift(threadId);
}

// Thread kapat
function closeThread() {
  threadState.activeThread = null;
  
  const inputArea = document.querySelector('.input-area');
  if (inputArea) {
    inputArea.innerHTML = `
      <button class="ib" id="emojiBtn">😊</button>
      <div id="emojiPanel" class="epop hidden" style="bottom:60px;left:10px"></div>
      <button class="ib" id="gifBtn">🎬</button>
      <button class="ib" id="imageBtn">🖼️</button>
      <button class="ib" id="pollBtn">📊</button>
      <textarea class="msg-inp" id="messageInput" placeholder="Mesaj yaz..." rows="1"></textarea>
      <button class="ib" style="background:var(--gr)" id="sendBtn">➤</button>
    `;
  }
  
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof navigateTo === 'function') navigateTo('/');
}

// Thread arşivle
function archiveThread(threadId) {
  const thread = threadState.threads[threadId];
  if (!thread) return;
  thread.isArchived = !thread.isArchived;
  saveThreadState();
  toast(thread.isArchived ? '📦 Arşivlendi' : '📂 Arşivden çıkarıldı');
}

// Thread kilitle
function lockThread(threadId) {
  const thread = threadState.threads[threadId];
  if (!thread) return;
  if (!hasPermission(Store.user?._id, 'manageMessages')) return toast('❌ Yetkiniz yok', 'e');
  thread.isLocked = !thread.isLocked;
  saveThreadState();
  toast(thread.isLocked ? '🔒 Konu kilitlendi' : '🔓 Konu kilidi açıldı');
}

// Thread listesi
function showThreadList() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  const activeThreads = threadState.threadOrder
    .map(id => threadState.threads[id])
    .filter(t => t && !t.isArchived);
  
  const archivedThreads = threadState.threadOrder
    .map(id => threadState.threads[id])
    .filter(t => t && t.isArchived);
  
  content.innerHTML = `
    <h2>💬 Konu Başlıkları</h2>
    
    <div style="max-height:400px;overflow-y:auto">
      ${activeThreads.length === 0 && archivedThreads.length === 0 ? 
        '<p style="color:var(--t3);text-align:center;padding:20px">Henüz konu yok</p>' : ''}
      
      ${activeThreads.length > 0 ? `
        <div class="search-section-title">Aktif Konular (${activeThreads.length})</div>
        ${activeThreads.map(t => `
          <div class="mitem" onclick="openThread('${t.id}');closeModal()">
            <div class="mav">💬</div>
            <div class="minfo">
              <div class="mname">${t.title}</div>
              <div class="msub">${t.messageCount} yanıt · ${t.participantNames.length} kişi · ${formatTime(t.updatedAt)}</div>
            </div>
            <div style="display:flex;gap:4px">
              ${t.isLocked ? '<span>🔒</span>' : ''}
              <button class="ib" onclick="event.stopPropagation();archiveThread('${t.id}')" style="width:22px;height:22px" title="Arşivle">📦</button>
            </div>
          </div>
        `).join('')}
      ` : ''}
      
      ${archivedThreads.length > 0 ? `
        <div class="search-section-title">Arşivlenenler (${archivedThreads.length})</div>
        ${archivedThreads.map(t => `
          <div class="mitem" onclick="openThread('${t.id}');closeModal()" style="opacity:0.6">
            <div class="mav">📦</div>
            <div class="minfo">
              <div class="mname">${t.title}</div>
              <div class="msub">${t.messageCount} yanıt</div>
            </div>
          </div>
        `).join('')}
      ` : ''}
    </div>
  `;
  
  openModal('threads');
}

// Thread render (mesajlarda thread butonu)
function renderThreadButton(msgId) {
  const thread = Object.values(threadState.threads).find(t => t.parentId === msgId);
  const count = thread?.messageCount || 0;
  
  return `
    <div class="thread-indicator" onclick="openThread('${thread?.id}');${!thread ? `createThread('${msgId}')` : ''}" 
         style="font-size:11px;color:var(--ac);cursor:pointer;margin-top:4px">
      ${count > 0 ? `💬 ${count} yanıt` : '💬 Yanıtla'}
    </div>
  `;
}

// Thread CSS
const threadStyle = document.createElement('style');
threadStyle.textContent = `
  .thread-parent-msg {
    position: relative;
  }
  .thread-parent-msg::after {
    content: '';
    position: absolute;
    left: 20px;
    bottom: -12px;
    width: 2px;
    height: 12px;
    background: var(--ac);
  }
  .thread-indicator {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    transition: background .15s;
  }
  .thread-indicator:hover {
    background: var(--acd);
  }
`;
document.head.appendChild(threadStyle);

// Kaydet
function saveThreadState() {
  localStorage.setItem('gt_threads', JSON.stringify(threadState.threads));
  localStorage.setItem('gt_thread_order', JSON.stringify(threadState.threadOrder));
}

// Thread butonunu mesajlara ekle (chat.js renderMessages içinde)
// msg-text'ten sonra: ${renderThreadButton(msg._id)}

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  // Thread modal butonu
  const threadBtn = document.getElementById('threadBtn');
  if (threadBtn) threadBtn.onclick = showThreadList;
});
