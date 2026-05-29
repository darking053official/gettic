// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC POLLS.JS v2.0 - Anket Sistemi                           ║
// ╚══════════════════════════════════════════════════════════════════╝

function _pollsLog(msg, level = 'log') {
  console[level](`%c[Polls] ${msg}`, 'color:#a78bfa;font-weight:bold');
}

// ============ LOCALSTORAGE ============
function _savePolls() {
  try {
    localStorage.setItem('gt_polls', JSON.stringify(Store.polls || {}));
  } catch (e) {
    _pollsLog('Kayıt hatası: ' + e.message, 'warn');
  }
}

function _loadPolls() {
  try {
    const raw = localStorage.getItem('gt_polls');
    if (raw) Store.polls = JSON.parse(raw);
  } catch {}
}

// ============ ANKET OLUŞTUR ============
function createPoll(question, options, duration = 0) {
  question = question?.trim();
  if (!question || question.length < 3)  return toast('Soru en az 3 karakter', 'e');
  if (question.length > 200)             return toast('Soru çok uzun', 'e');
  if (!Array.isArray(options) || options.length < 2) return toast('En az 2 seçenek gerekli', 'e');
  if (options.length > 10)               return toast('Maksimum 10 seçenek', 'w');

  const cleanOpts = options.map(o => String(o).trim()).filter(Boolean);
  if (new Set(cleanOpts.map(o => o.toLowerCase())).size !== cleanOpts.length) {
    return toast('Seçenekler tekrar etmemeli', 'w');
  }

  const pollId  = 'poll_' + genId();
  const msgId   = genId();

  const poll = {
    id:        pollId,
    question,
    options:   cleanOpts.map(text => ({ text })),
    votes:     new Array(cleanOpts.length).fill(0),
    voters:    {},
    createdBy: Store.user?._id,
    creatorName: Store.user?.username,
    channelId: Store.activeChannel,
    createdAt: new Date().toISOString(),
    endsAt:    duration > 0 ? Date.now() + duration * 1000 : null,
    closed:    false,
  };

  // Store'a kaydet
  if (!Store.polls) Store.polls = {};
  Store.polls[msgId] = poll;
  _savePolls();

  // Mesaj olarak gönder
  const msg = {
    _id:        msgId,
    content:    `📊 **${question}**`,
    senderName: Store.user?.username,
    senderId:   Store.user?._id,
    channelId:  Store.activeChannel,
    createdAt:  new Date().toISOString(),
    reactions:  {},
    readBy:     [Store.user?._id],
    isPoll:     true,
    pollId,
  };

  if (!Store.messages) Store.messages = [];
  Store.messages.push(msg);
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore      === 'function') saveStore();

  // Sunucuya gönder
  if (socket?.connected) {
    socket.emit('send_message', { ...msg, poll });
    socket.emit('poll_created', { msgId, poll, channelId: Store.activeChannel });
  }
  if (typeof SyncEngine !== 'undefined') {
    SyncEngine.add(`/api/polls`, 'POST', { msgId, poll });
  }

  // Süre varsa otomatik kapat
  if (poll.endsAt) {
    const remaining = poll.endsAt - Date.now();
    setTimeout(() => closePoll(msgId), remaining);
  }

  toast('Anket başlatıldı', 's');
  _pollsLog(`Anket oluşturuldu: ${question}`);
  return { msgId, poll };
}

// ============ OY VER ============
function votePoll(msgId, optionIndex) {
  const poll = Store.polls?.[msgId];
  if (!poll) return toast('Anket bulunamadı', 'e');
  if (poll.closed) return toast('Bu anket kapatıldı', 'w');
  if (poll.endsAt && Date.now() > poll.endsAt) return toast('Anket süresi doldu', 'w');

  const uid = Store.user?._id;
  if (!uid) return;

  if (poll.voters?.[uid] !== undefined) {
    // Oy değiştirme
    const oldOpt = poll.voters[uid];
    if (oldOpt === optionIndex) return toast('Zaten bu seçeneğe oy verdiniz', 'w');
    poll.votes[oldOpt] = Math.max(0, (poll.votes[oldOpt] || 0) - 1);
  }

  if (!poll.voters) poll.voters = {};
  if (!poll.votes)  poll.votes  = new Array(poll.options.length).fill(0);

  poll.voters[uid]      = optionIndex;
  poll.votes[optionIndex] = (poll.votes[optionIndex] || 0) + 1;

  _savePolls();
  if (typeof renderMessages === 'function') renderMessages({ scrollToEnd: false });

  // Sunucuya bildir
  if (socket?.connected) {
    socket.emit('poll_vote', {
      msgId,
      option:    optionIndex,
      userId:    uid,
      channelId: poll.channelId || Store.activeChannel,
    });
  }
  if (typeof SyncEngine !== 'undefined') {
    SyncEngine.add(`/api/polls/${msgId}/vote`, 'POST', { option: optionIndex });
  }

  if (typeof saveStore === 'function') saveStore();
}

// ============ ANKET KAPAT ============
function closePoll(msgId) {
  const poll = Store.polls?.[msgId];
  if (!poll) return;
  if (poll.closed) return;

  poll.closed    = true;
  poll.closedAt  = new Date().toISOString();

  _savePolls();
  if (typeof renderMessages === 'function') renderMessages({ scrollToEnd: false });

  if (socket?.connected) {
    socket.emit('poll_closed', { msgId, channelId: poll.channelId });
  }

  // Sonuçları göster
  const winner = _getPollWinner(poll);
  if (winner) toast(`📊 Anket bitti! Kazanan: "${winner}"`, 'i', 5000);
  _pollsLog(`Anket kapatıldı: ${msgId}`);
}

function _getPollWinner(poll) {
  if (!poll.votes || !poll.options) return null;
  const maxVotes = Math.max(...poll.votes);
  if (maxVotes === 0) return null;
  const idx = poll.votes.indexOf(maxVotes);
  return poll.options[idx]?.text || null;
}

// ============ RENDER ============
function renderPoll(msgId, poll) {
  if (!poll) return '';

  const total    = (poll.votes || []).reduce((a, b) => a + b, 0);
  const myVote   = poll.voters?.[Store.user?._id];
  const hasVoted = myVote !== undefined;
  const expired  = poll.endsAt && Date.now() > poll.endsAt;
  const closed   = poll.closed || expired;

  // Kalan süre
  let timerHTML = '';
  if (poll.endsAt && !closed) {
    const remaining = Math.max(0, poll.endsAt - Date.now());
    timerHTML = `<span class="poll-timer" data-ends="${poll.endsAt}">${_formatPollTime(remaining)}</span>`;
    // Timer güncelleme
    setTimeout(() => _updatePollTimer(msgId, poll.endsAt), 1000);
  }

  return `
    <div class="poll-box" id="poll-${msgId}">
      <div class="poll-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <span class="poll-q">${escapeHtml(poll.question)}</span>
        ${closed ? '<span class="poll-ended">Sona erdi</span>' : timerHTML}
      </div>

      <div class="poll-opts">
        ${(poll.options || []).map((opt, i) => {
          const votes   = poll.votes?.[i] || 0;
          const pct     = total > 0 ? Math.round((votes / total) * 100) : 0;
          const isWinner = closed && votes === Math.max(...(poll.votes || [0])) && votes > 0;
          const isMyVote = myVote === i;
          return `
            <div class="poll-opt ${isMyVote ? 'voted' : ''} ${isWinner ? 'winner' : ''} ${closed || hasVoted ? 'no-hover' : ''}"
              onclick="${!closed && !hasVoted ? `votePoll('${msgId}',${i})` : ''}">
              <div class="poll-bar" style="width:${pct}%"></div>
              <div class="poll-opt-content">
                <span class="poll-opt-text">${escapeHtml(opt.text || opt)}</span>
                <div class="poll-opt-right">
                  ${isWinner ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                  ${isMyVote ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
                  ${hasVoted || closed ? `<span class="poll-pct">${pct}%</span>` : ''}
                  <span class="poll-votes">${votes}</span>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>

      <div class="poll-footer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>${total} oy</span>
        ${!closed && !hasVoted ? ' · Oy kullanmak için seçeneğe tıkla' : ''}
        ${hasVoted && !closed ? ' · Oyu değiştirmek için başka seçeneğe tıkla' : ''}
        ${poll.creatorName && poll.createdBy === Store.user?._id && !closed
          ? `<button class="poll-close-btn" onclick="closePoll('${msgId}')">Kapat</button>` : ''}
      </div>
    </div>`;
}

function _formatPollTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}g ${h % 24}s`;
  if (h > 0)  return `${h}s ${m % 60}d`;
  if (m > 0)  return `${m}d ${s % 60}s`;
  return `${s}s`;
}

function _updatePollTimer(msgId, endsAt) {
  const el = document.querySelector(`#poll-${msgId} .poll-timer`);
  if (!el) return;
  const remaining = Math.max(0, endsAt - Date.now());
  if (remaining === 0) {
    closePoll(msgId);
    return;
  }
  el.textContent = _formatPollTime(remaining);
  setTimeout(() => _updatePollTimer(msgId, endsAt), 1000);
}

// ============ SOCKET EVENTS ============
function initPollsSocket() {
  if (!socket) return;

  socket.on('poll_created', ({ msgId, poll }) => {
    if (!Store.polls) Store.polls = {};
    if (!Store.polls[msgId]) {
      Store.polls[msgId] = poll;
      _savePolls();
      if (typeof renderMessages === 'function') renderMessages({ scrollToEnd: false });
    }
  });

  socket.on('poll_vote', ({ msgId, option, userId }) => {
    const poll = Store.polls?.[msgId];
    if (!poll || poll.closed) return;
    if (poll.voters?.[userId] !== undefined) {
      const old = poll.voters[userId];
      poll.votes[old] = Math.max(0, (poll.votes[old] || 0) - 1);
    }
    if (!poll.voters) poll.voters = {};
    if (!poll.votes)  poll.votes  = new Array(poll.options.length).fill(0);
    poll.voters[userId]    = option;
    poll.votes[option]     = (poll.votes[option] || 0) + 1;
    _savePolls();
    if (typeof renderMessages === 'function') renderMessages({ scrollToEnd: false });
  });

  socket.on('poll_closed', ({ msgId }) => {
    const poll = Store.polls?.[msgId];
    if (poll && !poll.closed) {
      poll.closed   = true;
      poll.closedAt = new Date().toISOString();
      _savePolls();
      if (typeof renderMessages === 'function') renderMessages({ scrollToEnd: false });
    }
  });

  _pollsLog('Socket events bağlandı');
}

// ============ CSS ============
(function injectPollStyles() {
  const id = 'gt-poll-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.poll-box{
  margin:4px 0;padding:12px 14px;
  background:var(--bg2,#241535);border-radius:12px;
  border:1.5px solid rgba(255,255,255,.07);
  max-width:420px;
}
.poll-header{display:flex;align-items:center;gap:7px;margin-bottom:10px;flex-wrap:wrap}
.poll-q{font-size:13px;font-weight:700;color:var(--t1,#fff);flex:1}
.poll-ended{font-size:10px;padding:2px 7px;border-radius:10px;background:#ef444422;color:#ef4444;font-weight:600}
.poll-timer{font-size:10px;padding:2px 7px;border-radius:10px;background:var(--ac,#6366f1)22;color:var(--ac,#6366f1);font-weight:600}

.poll-opts{display:flex;flex-direction:column;gap:5px}
.poll-opt{
  position:relative;border-radius:9px;overflow:hidden;
  border:1.5px solid rgba(255,255,255,.07);
  transition:border-color .15s,transform .1s;cursor:pointer;
}
.poll-opt:not(.no-hover):hover{border-color:var(--ac,#6366f1);transform:translateX(2px)}
.poll-opt.voted{border-color:var(--ac,#6366f1);background:var(--ac,#6366f1)08}
.poll-opt.winner{border-color:#10b981;background:#10b98108}
.poll-opt.no-hover{cursor:default}
.poll-bar{
  position:absolute;top:0;left:0;height:100%;
  background:var(--ac,#6366f1)18;pointer-events:none;
  transition:width .5s cubic-bezier(.4,0,.2,1);
}
.poll-opt.winner .poll-bar{background:#10b98118}

.poll-opt-content{
  position:relative;z-index:1;
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 10px;gap:8px;
}
.poll-opt-text{font-size:13px;color:var(--t1,#fff);flex:1}
.poll-opt-right{display:flex;align-items:center;gap:5px;flex-shrink:0}
.poll-pct{font-size:12px;font-weight:700;color:var(--ac,#6366f1)}
.poll-votes{font-size:10px;color:var(--t3,#888)}

.poll-footer{
  display:flex;align-items:center;gap:6px;
  font-size:10px;color:var(--t3,#888);margin-top:8px;flex-wrap:wrap;
}
.poll-close-btn{
  margin-left:auto;font-size:10px;padding:2px 8px;border-radius:6px;
  background:rgba(255,255,255,.07);border:none;cursor:pointer;
  color:var(--t2,#ccc);font-family:inherit;
}
.poll-close-btn:hover{background:rgba(255,255,255,.12)}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initPolls() {
  _loadPolls();

  if (typeof socket !== 'undefined' && socket) {
    initPollsSocket();
  } else {
    document.addEventListener('socket_ready', initPollsSocket, { once: true });
  }

  _pollsLog('v2.0 yüklendi ✓');
})();
