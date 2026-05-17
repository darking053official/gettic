// Anket oluşturma
function createPoll(question, options, settings = {}) {
  if (!question || !question.trim()) return toast('Soru gerekli', 'e');
  if (!options || options.length < 2) return toast('En az 2 seçenek gerekli', 'e');
  if (options.some(o => !o || !o.trim())) return toast('Tüm seçenekleri doldurun', 'e');
  
  const mid = genId();
  const poll = {
    id: mid,
    question: question.trim(),
    options: options.map(o => o.trim()),
    votes: new Array(options.length).fill(0),
    voters: {},
    createdBy: Store.user._id,
    creatorName: Store.user.username,
    channelId: Store.activeChannel,
    createdAt: new Date().toISOString(),
    settings: {
      multipleChoice: settings.multipleChoice || false,
      showResults: settings.showResults !== false,
      anonymous: settings.anonymous || false,
      duration: settings.duration || 0, // dakika, 0 = sınırsız
      maxVotes: settings.maxVotes || 100
    },
    active: true,
    totalVoters: 0
  };
  
  Store.polls[mid] = poll;
  
  const msg = {
    _id: mid,
    content: '📊 ' + question.trim(),
    senderName: Store.user.username,
    senderId: Store.user._id,
    channelId: Store.activeChannel,
    createdAt: new Date().toISOString(),
    type: 'poll',
    pollId: mid
  };
  
  Store.messages.push(msg);
  renderMessages();
  saveStore();
  toast('📊 Anket başlatıldı');
  closeModal();
  
  // Süre sınırı varsa otomatik kapat
  if (settings.duration > 0) {
    setTimeout(() => {
      if (Store.polls[mid]) {
        Store.polls[mid].active = false;
        renderMessages();
        saveStore();
      }
    }, settings.duration * 60 * 1000);
  }
  
  if (window._socket) {
    window._socket.emit('poll_created', { poll, channelId: Store.activeChannel });
  }
}

// Oy verme
function votePoll(mid, optIndex) {
  const poll = Store.polls[mid];
  if (!poll) return toast('Anket bulunamadı', 'e');
  if (!poll.active) return toast('Anket sona erdi', 'e');
  if (!Store.user) return toast('Önce giriş yapın', 'e');
  
  const userId = Store.user._id;
  
  // Çoklu seçim kontrolü
  if (!poll.settings.multipleChoice && poll.voters[userId] !== undefined) {
    // Aynı seçeneğe tekrar tıklanırsa oyu kaldır
    if (poll.voters[userId] === optIndex) {
      delete poll.voters[userId];
      poll.votes[optIndex]--;
      poll.totalVoters--;
      renderMessages();
      saveStore();
      toast('Oy geri alındı');
      return;
    }
    return toast('Zaten oy verdiniz. Çoklu seçim kapalı.', 'e');
  }
  
  // Çoklu seçim
  if (poll.settings.multipleChoice) {
    if (!Array.isArray(poll.voters[userId])) poll.voters[userId] = [];
    const idx = poll.voters[userId].indexOf(optIndex);
    if (idx !== -1) {
      poll.voters[userId].splice(idx, 1);
      poll.votes[optIndex]--;
      poll.totalVoters--;
      if (poll.voters[userId].length === 0) delete poll.voters[userId];
      renderMessages();
      saveStore();
      toast('Oy geri alındı');
      return;
    }
    
    if (poll.voters[userId].length >= (poll.settings.maxVotes || 10)) {
      return toast('Maksimum oy sayısına ulaştınız', 'e');
    }
    
    poll.voters[userId].push(optIndex);
    poll.votes[optIndex]++;
    poll.totalVoters++;
    renderMessages();
    saveStore();
    toast('Oy verildi ✅');
    return;
  }
  
  // Tekli seçim
  poll.voters[userId] = optIndex;
  poll.votes[optIndex]++;
  poll.totalVoters++;
  renderMessages();
  saveStore();
  toast('Oy verildi ✅');
  
  if (window._socket) {
    window._socket.emit('poll_vote', { pollId: mid, option: optIndex, userId });
  }
}

// Anket render
function renderPoll(mid, poll) {
  if (!poll) return '';
  
  const total = poll.votes.reduce((a, b) => a + b, 0) || 1;
  const userVoted = poll.voters[Store.user?._id] !== undefined;
  const isCreator = poll.createdBy === Store.user?._id;
  const showResults = poll.settings.showResults || userVoted || isCreator;
  
  // Kazanan seçeneği bul
  let winnerIndex = -1;
  if (showResults) {
    winnerIndex = poll.votes.indexOf(Math.max(...poll.votes));
  }
  
  return `
    <div class="poll-box ${!poll.active ? 'poll-ended' : ''}" id="poll-${mid}">
      <div class="poll-header">
        <div class="poll-q">📊 ${poll.question}</div>
        <div class="poll-meta">
          <span class="poll-total">${total} oy</span>
          ${poll.settings.anonymous ? '<span class="poll-anon">🔒 Gizli</span>' : ''}
          ${!poll.active ? '<span class="poll-ended-badge">Sona erdi</span>' : ''}
          ${isCreator ? `<button class="poll-close-btn" onclick="closePoll('${mid}')" title="Anketi Kapat">✕</button>` : ''}
        </div>
      </div>
      
      <div class="poll-opts">
        ${poll.options.map((o, i) => {
          const pct = showResults ? Math.round((poll.votes[i] / total) * 100) : 0;
          const voted = Array.isArray(poll.voters[Store.user?._id])
            ? poll.voters[Store.user?._id]?.includes(i)
            : poll.voters[Store.user?._id] === i;
          const isWinner = i === winnerIndex && total > 0;
          
          return `
            <div class="poll-opt ${voted ? 'voted' : ''} ${isWinner ? 'winner' : ''}" 
                 onclick="votePoll('${mid}', ${i})"
                 title="${showResults ? pct + '%' : 'Oy vermek için tıkla'}">
              ${showResults ? `<div class="poll-bar" style="width:${pct}%"></div>` : ''}
              <span class="poll-opt-text">${o}</span>
              ${showResults ? `<span class="poll-pct">${pct}% (${poll.votes[i]})</span>` : ''}
              ${voted ? '<span class="poll-check">✓</span>' : ''}
              ${isWinner && poll.active === false ? '<span class="poll-crown">👑</span>' : ''}
            </div>
          `;
        }).join('')}
      </div>
      
      ${showResults ? `
        <div class="poll-footer">
          <div class="poll-progress">
            <div class="poll-progress-bar" style="width:${Math.round((poll.totalVoters / (poll.settings.maxVotes || 100)) * 100)}%"></div>
          </div>
          <span class="poll-footer-text">${poll.totalVoters} kişi oy verdi</span>
        </div>
      ` : ''}
    </div>
  `;
}

// Anket kapatma
function closePoll(mid) {
  const poll = Store.polls[mid];
  if (!poll) return;
  if (poll.createdBy !== Store.user?._id && !hasPermission(Store.user?._id, 'manageMessages')) {
    return toast('Yetkiniz yok', 'e');
  }
  poll.active = false;
  renderMessages();
  saveStore();
  toast('📊 Anket sona erdi');
  
  if (window._socket) {
    window._socket.emit('poll_closed', { pollId: mid, channelId: Store.activeChannel });
  }
}

// Anket silme
function deletePoll(mid) {
  const poll = Store.polls[mid];
  if (!poll) return;
  if (poll.createdBy !== Store.user?._id && !hasPermission(Store.user?._id, 'deleteMsg')) {
    return toast('Yetkiniz yok', 'e');
  }
  delete Store.polls[mid];
  Store.messages = Store.messages.filter(m => m.pollId !== mid);
  renderMessages();
  saveStore();
  toast('🗑️ Anket silindi');
}

// Anket sonuçlarını dışa aktar
function exportPollResults(mid) {
  const poll = Store.polls[mid];
  if (!poll) return;
  
  const total = poll.votes.reduce((a, b) => a + b, 0) || 1;
  let csv = 'Seçenek,Oy,Yüzde\n';
  poll.options.forEach((o, i) => {
    csv += `"${o}",${poll.votes[i]},${Math.round((poll.votes[i]/total)*100)}%\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anket-${mid}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('📥 Sonuçlar indirildi');
}

// Anket Modal - Gelişmiş
function showPollModal() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>📊 Anket Oluştur</h2>
    <div class="poll-form">
      <input class="mi" id="pollQuestion" placeholder="Soru sor...">
      <div id="pollOptions">
        <div class="poll-option-row">
          <input class="mi" placeholder="Seçenek 1" data-opt="1">
          <button class="poll-remove-opt" onclick="removePollOption(this)" style="display:none">×</button>
        </div>
        <div class="poll-option-row">
          <input class="mi" placeholder="Seçenek 2" data-opt="2">
          <button class="poll-remove-opt" onclick="removePollOption(this)" style="display:none">×</button>
        </div>
      </div>
      <button class="mb sec" onclick="addPollOption()">+ Seçenek Ekle</button>
      <div class="poll-settings">
        <label class="poll-setting">
          <input type="checkbox" id="pollMultiple"> Çoklu seçim
        </label>
        <label class="poll-setting">
          <input type="checkbox" id="pollAnonymous" checked> Gizli oylama
        </label>
        <label class="poll-setting">
          <input type="number" id="pollDuration" placeholder="Süre (dk, 0=sınırsız)" min="0" value="0" style="width:100%;padding:8px;border:1px solid var(--b2);border-radius:8px;margin-top:5px">
        </label>
      </div>
      <button class="mb" onclick="submitPollForm()">📊 Anketi Başlat</button>
    </div>
  `;
}

function addPollOption() {
  const container = document.getElementById('pollOptions');
  if (!container) return;
  const count = container.children.length + 1;
  if (count > 10) return toast('En fazla 10 seçenek', 'e');
  const row = document.createElement('div');
  row.className = 'poll-option-row';
  row.innerHTML = `
    <input class="mi" placeholder="Seçenek ${count}" data-opt="${count}">
    <button class="poll-remove-opt" onclick="removePollOption(this)">×</button>
  `;
  container.appendChild(row);
}

function removePollOption(btn) {
  const container = document.getElementById('pollOptions');
  if (!container || container.children.length <= 2) return toast('En az 2 seçenek gerekli', 'e');
  btn.parentElement.remove();
}

function submitPollForm() {
  const question = document.getElementById('pollQuestion')?.value;
  const options = [...document.querySelectorAll('#pollOptions input')].map(i => i.value).filter(v => v.trim());
  const multiple = document.getElementById('pollMultiple')?.checked;
  const anonymous = document.getElementById('pollAnonymous')?.checked;
  const duration = parseInt(document.getElementById('pollDuration')?.value || '0');
  
  if (!question || question.trim().length < 3) return toast('Soru en az 3 karakter', 'e');
  if (options.length < 2) return toast('En az 2 seçenek gerekli', 'e');
  
  createPoll(question, options, { multipleChoice: multiple, anonymous, duration });
                                         }
