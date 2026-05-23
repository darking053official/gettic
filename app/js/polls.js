// ╔══════════════════════════════════════════════════════════════════╗
// ║      GETTIC POLLS.JS - SVG İKONLU + TÜRKÇE DÜZELTMELER          ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function pollIcon(name, size = 18) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

const pollState = {
  polls: JSON.parse(localStorage.getItem('gt_polls_v2') || '{}'),
  templates: [
    { name: 'Haftasonu Etkinliği', options: ['Sinema', 'Yemek', 'Oyun', 'Spor', 'Diğer'] },
    { name: 'Oylama', options: ['Evet', 'Hayır', 'Çekimser'] },
    { name: 'Derecelendirme', options: ['1 Yıldız', '2 Yıldız', '3 Yıldız', '4 Yıldız', '5 Yıldız'] }
  ]
};

// Anket oluştur
function createPoll(question, options, settings = {}) {
  if (!question?.trim()) return toast('Soru gerekli', 'e');
  if (!options || options.length < 2) return toast('En az 2 seçenek gerekli', 'e');
  if (options.length > 10) return toast('En fazla 10 seçenek', 'e');
  if (options.some(o => !o?.trim())) return toast('Tüm seçenekleri doldurun', 'e');
  
  const pollId = genId();
  const poll = {
    id: pollId, question: question.trim(),
    options: options.map((o, i) => ({ id: 'opt_' + i, text: o.trim(), votes: 0, voters: [] })),
    settings: {
      multipleChoice: settings.multipleChoice || false,
      maxChoices: settings.maxChoices || 1,
      showResults: settings.showResults !== false,
      anonymous: settings.anonymous || false,
      duration: settings.duration || 0,
      allowAddOptions: settings.allowAddOptions || false
    },
    createdBy: Store.user._id, creatorName: Store.user.username,
    channelId: Store.activeChannel, createdAt: new Date().toISOString(),
    endsAt: settings.duration ? new Date(Date.now() + settings.duration * 60000).toISOString() : null,
    isActive: true, isPinned: false, totalVoters: 0
  };
  
  pollState.polls[pollId] = poll;
  savePollState();
  
  const msg = {
    _id: pollId, content: `${pollIcon('bar-chart')} **${poll.question}**`,
    senderName: Store.user.username, senderId: Store.user._id,
    channelId: Store.activeChannel, createdAt: new Date().toISOString(), pollId
  };
  
  Store.messages.push(msg);
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
  
  if (settings.duration > 0) {
    setTimeout(() => {
      const p = pollState.polls[pollId];
      if (p) { p.isActive = false; savePollState(); if (typeof renderMessages === 'function') renderMessages(); toast(pollIcon('clock') + ' Anket süresi doldu: ' + poll.question); }
    }, settings.duration * 60000);
  }
  
  toast(pollIcon('bar-chart') + ' Anket başlatıldı');
  closeModal();
  return pollId;
}

// Oy ver
function votePoll(pollId, optionIds) {
  const poll = pollState.polls[pollId];
  if (!poll) return toast('Anket bulunamadı', 'e');
  if (!poll.isActive) return toast('Anket sona erdi', 'e');
  if (!Store.user) return toast('Giriş yapın', 'e');
  
  const userId = Store.user._id;
  
  if (poll.settings.multipleChoice) {
    if (!Array.isArray(optionIds)) optionIds = [optionIds];
    poll.options.forEach(opt => { const idx = opt.voters.indexOf(userId); if (idx !== -1 && !optionIds.includes(opt.id)) { opt.voters.splice(idx, 1); opt.votes--; } });
    optionIds.forEach(optId => {
      const opt = poll.options.find(o => o.id === optId);
      if (opt && !opt.voters.includes(userId)) {
        if (poll.settings.maxChoices > 0 && poll.options.reduce((sum, o) => sum + (o.voters.includes(userId) ? 1 : 0), 0) >= poll.settings.maxChoices) return;
        opt.voters.push(userId); opt.votes++;
      }
    });
  } else {
    const opt = poll.options.find(o => o.id === optionIds);
    if (!opt) return;
    if (opt.voters.includes(userId)) { opt.voters = opt.voters.filter(id => id !== userId); opt.votes--; poll.totalVoters = Math.max(0, poll.totalVoters - 1); }
    else { poll.options.forEach(o => { const idx = o.voters.indexOf(userId); if (idx !== -1) { o.voters.splice(idx, 1); o.votes--; } }); opt.voters.push(userId); opt.votes++; poll.totalVoters++; }
  }
  
  savePollState();
  if (typeof renderMessages === 'function') renderMessages();
}

// Anket render
function renderPoll(pollId) {
  const poll = pollState.polls[pollId];
  if (!poll) return '';
  
  const total = poll.options.reduce((sum, o) => sum + o.votes, 0) || 1;
  const userVoted = poll.options.some(o => o.voters.includes(Store.user?._id));
  const showResults = poll.settings.showResults || userVoted || poll.createdBy === Store.user?._id;
  const winner = poll.options.reduce((max, o) => o.votes > (max?.votes || -1) ? o : max, null);
  const timeLeft = poll.endsAt ? getTimeLeft(poll.endsAt) : '';
  
  return `
    <div class="poll-box ${!poll.isActive ? 'poll-ended' : ''}" id="poll-${pollId}">
      <div class="poll-header">
        <div class="poll-q">${pollIcon('bar-chart')} ${escapeHtml(poll.question)}</div>
        <div class="poll-meta">
          <span class="poll-total">${total} oy · ${poll.totalVoters} kişi</span>
          ${poll.settings.anonymous ? `<span>${pollIcon('lock')} Gizli</span>` : ''}
          ${poll.settings.multipleChoice ? `<span>${pollIcon('list')} Çoklu seçim</span>` : ''}
          ${!poll.isActive ? `<span class="poll-ended-badge" style="color:var(--re)">${pollIcon('x')} Sona erdi</span>` : ''}
          ${timeLeft ? `<span style="color:var(--ye)">${pollIcon('clock')} ${timeLeft}</span>` : ''}
        </div>
      </div>
      <div class="poll-opts">
        ${poll.options.map(o => {
          const pct = showResults ? Math.round((o.votes / total) * 100) : 0;
          const voted = o.voters.includes(Store.user?._id);
          const isWinner = o.id === winner?.id && !poll.isActive && total > 0;
          return `
            <div class="poll-opt ${voted ? 'voted' : ''} ${isWinner ? 'winner' : ''}" onclick="votePoll('${pollId}','${o.id}')">
              ${showResults ? `<div class="poll-bar" style="width:${pct}%"></div>` : ''}
              <span class="poll-opt-text">${escapeHtml(o.text)}</span>
              ${showResults ? `<span class="poll-pct">${pct}%</span>${!poll.settings.anonymous ? `<span class="poll-voter-count">(${o.votes})</span>` : ''}` : ''}
              ${voted ? `<span class="poll-check">${pollIcon('check',14)}</span>` : ''}
              ${isWinner ? `<span class="poll-crown">${pollIcon('trophy',14)}</span>` : ''}
            </div>`;
        }).join('')}
      </div>
      ${showResults ? `<div class="poll-footer"><div class="poll-progress"><div class="poll-progress-bar" style="width:${Math.min(100, (poll.totalVoters / 20) * 100)}%"></div></div></div>` : ''}
      ${poll.settings.allowAddOptions && poll.isActive ? `<div style="display:flex;gap:6px;margin-top:8px"><input class="mi" id="newOption-${pollId}" placeholder="Seçenek ekle..." style="margin-bottom:0"><button class="ib" onclick="addPollOption('${pollId}')" title="Ekle">+</button></div>` : ''}
      <div style="display:flex;gap:4px;margin-top:8px;justify-content:flex-end">
        ${poll.createdBy === Store.user?._id ? `
          <button class="ib" onclick="togglePollPin('${pollId}')" title="${poll.isPinned?'Sabitlemeyi Kaldır':'Sabitle'}" style="width:24px;height:24px">${pollIcon('pin',14)}</button>
          <button class="ib" onclick="endPoll('${pollId}')" title="Anketi Bitir" style="width:24px;height:24px">${pollIcon('stop-circle',14)}</button>
          <button class="ib" onclick="deletePoll('${pollId}')" title="Anketi Sil" style="width:24px;height:24px;color:var(--re)">${pollIcon('trash',14)}</button>
        ` : ''}
        ${showResults ? `<button class="ib" onclick="exportPollResults('${pollId}')" title="Sonuçları İndir" style="width:24px;height:24px">${pollIcon('download',14)}</button>` : ''}
      </div>
    </div>`;
}

// Seçenek ekle
function addPollOption(pollId) {
  const input = document.getElementById('newOption-' + pollId);
  const poll = pollState.polls[pollId];
  if (!input?.value.trim() || !poll) return;
  poll.options.push({ id: 'opt_' + poll.options.length, text: input.value.trim(), votes: 0, voters: [] });
  input.value = '';
  savePollState();
  if (typeof renderMessages === 'function') renderMessages();
}

// Anket bitir
function endPoll(pollId) {
  const poll = pollState.polls[pollId];
  if (!poll || poll.createdBy !== Store.user?._id) return;
  poll.isActive = false;
  savePollState();
  if (typeof renderMessages === 'function') renderMessages();
  toast(pollIcon('stop-circle') + ' Anket sonlandırıldı');
}

// Anket sil
function deletePoll(pollId) {
  const poll = pollState.polls[pollId];
  if (!poll || poll.createdBy !== Store.user?._id) return;
  delete pollState.polls[pollId];
  Store.messages = Store.messages.filter(m => m.pollId !== pollId);
  savePollState();
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
  toast(pollIcon('trash') + ' Anket silindi');
}

// Anket sabitle
function togglePollPin(pollId) {
  const poll = pollState.polls[pollId];
  if (!poll) return;
  poll.isPinned = !poll.isPinned;
  savePollState();
  if (typeof renderMessages === 'function') renderMessages();
}

// Sonuç dışa aktar
function exportPollResults(pollId) {
  const poll = pollState.polls[pollId];
  if (!poll) return;
  const total = poll.options.reduce((s, o) => s + o.votes, 0) || 1;
  let csv = 'Seçenek,Oy,Yüzde\n';
  poll.options.forEach(o => { csv += `"${o.text}",${o.votes},${Math.round((o.votes/total)*100)}%\n`; });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `anket-${poll.question.substring(0,20)}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast(pollIcon('download') + ' Sonuçlar indirildi');
}

// Anket oluşturma penceresi
function showPollModal() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  content.innerHTML = `
    <h2>${pollIcon('bar-chart',24)} Anket Oluştur</h2>
    <div class="poll-form">
      <input class="mi" id="pollQuestion" placeholder="Soru sor..." maxlength="200">
      <div id="pollOptionsContainer">
        <div class="poll-option-row"><input class="mi" placeholder="Seçenek 1"><button class="poll-remove-opt" style="display:none">${pollIcon('x',16)}</button></div>
        <div class="poll-option-row"><input class="mi" placeholder="Seçenek 2"><button class="poll-remove-opt" style="display:none">${pollIcon('x',16)}</button></div>
      </div>
      <button class="mb sec" onclick="addPollOptionUI()">+ Seçenek Ekle (en fazla 10)</button>
      <div class="poll-settings">
        <label class="poll-setting"><input type="checkbox" id="pollMultiple"> Çoklu seçim</label>
        <label class="poll-setting"><input type="checkbox" id="pollAnonymous" checked> Gizli oylama</label>
        <label class="poll-setting"><input type="checkbox" id="pollAllowAdd"> Seçenek eklemeye izin ver</label>
        <input class="mi" type="number" id="pollMaxChoices" placeholder="En fazla seçim (çoklu için)" value="1" min="1" max="10">
        <input class="mi" type="number" id="pollDuration" placeholder="Süre (dk, 0=sınırsız)" value="0" min="0">
      </div>
      <div class="settings-group"><div class="settings-group-title">Şablonlar</div>
        ${pollState.templates.map((t, i) => `<div class="settings-item" onclick="applyPollTemplate(${i})"><div class="settings-item-left">${pollIcon('file-text')} ${escapeHtml(t.name)}</div><div class="settings-item-right">${t.options.length} seçenek</div></div>`).join('')}
      </div>
      <button class="mb" onclick="submitPollForm()">${pollIcon('bar-chart')} Anketi Başlat</button>
    </div>`;
  openModal('poll');
}

function addPollOptionUI() {
  const container = document.getElementById('pollOptionsContainer');
  if (!container || container.children.length >= 10) return;
  const div = document.createElement('div'); div.className = 'poll-option-row';
  div.innerHTML = `<input class="mi" placeholder="Seçenek ${container.children.length + 1}"><button class="poll-remove-opt" onclick="this.parentElement.remove()">${pollIcon('x',16)}</button>`;
  container.appendChild(div);
}

function submitPollForm() {
  const question = document.getElementById('pollQuestion')?.value;
  const options = [...document.querySelectorAll('#pollOptionsContainer input')].map(i => i.value).filter(v => v.trim());
  const multiple = document.getElementById('pollMultiple')?.checked;
  const anonymous = document.getElementById('pollAnonymous')?.checked;
  const allowAdd = document.getElementById('pollAllowAdd')?.checked;
  const maxChoices = parseInt(document.getElementById('pollMaxChoices')?.value || '1');
  const duration = parseInt(document.getElementById('pollDuration')?.value || '0');
  createPoll(question, options, { multipleChoice: multiple, anonymous, allowAddOptions: allowAdd, maxChoices: multiple ? maxChoices : 1, duration });
}

function applyPollTemplate(index) {
  const template = pollState.templates[index];
  if (!template) return;
  document.getElementById('pollQuestion').value = template.name;
  document.getElementById('pollOptionsContainer').innerHTML = template.options.map((o, i) => `<div class="poll-option-row"><input class="mi" value="${escapeHtml(o)}" placeholder="Seçenek ${i+1}"><button class="poll-remove-opt" onclick="this.parentElement.remove()">${pollIcon('x',16)}</button></div>`).join('');
}

function getTimeLeft(endTime) {
  const diff = new Date(endTime) - Date.now();
  if (diff <= 0) return 'Süre doldu';
  const min = Math.floor(diff / 60000);
  if (min < 60) return min + ' dk';
  const hours = Math.floor(min / 60);
  return hours + ' sa ' + (min % 60) + ' dk';
}

function savePollState() { localStorage.setItem('gt_polls_v2', JSON.stringify(pollState.polls)); }

// HTML kaçış
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// CSS
const pollStyle = document.createElement('style');
pollStyle.textContent = `.poll-voter-count{font-size:9px;color:var(--t3);min-width:20px;text-align:right}.poll-footer{margin-top:6px}`;
document.head.appendChild(pollStyle);

console.log('Polls.js yüklendi (SVG ikonlu + Türkçe düzeltmeler)');
