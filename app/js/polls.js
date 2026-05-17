function createPoll(question, options) {
  if (!question || !options || options.length < 2) return;
  const mid = genId();
  Store.polls[mid] = { question, options, votes: new Array(options.length).fill(0), voters: {} };
  const msg = {
    _id: mid,
    content: '📊 ' + question,
    senderName: Store.user.username,
    senderId: Store.user._id,
    channelId: Store.activeChannel,
    createdAt: new Date().toISOString()
  };
  Store.messages.push(msg);
  renderMessages();
  toast('Anket başlatıldı');
  closeModal();
}

function votePoll(mid, opt) {
  const poll = Store.polls[mid];
  if (!poll) return;
  if (poll.voters[Store.user._id] !== undefined) return toast('Zaten oy verdiniz', 'e');
  poll.voters[Store.user._id] = opt;
  poll.votes[opt]++;
  renderMessages();
}

function renderPoll(mid, poll) {
  const total = poll.votes.reduce((a,b) => a+b, 0) || 1;
  return `<div class="poll-box"><div class="poll-q">📊 ${poll.question}</div>
    ${poll.options.map((o, i) => {
      const pct = Math.round((poll.votes[i]/total)*100);
      return `<div class="poll-opt ${poll.voters[Store.user?._id]===i?'voted':''}" onclick="votePoll('${mid}',${i})">
        <div class="poll-bar" style="width:${pct}%"></div>
        <span>${o}</span><span class="poll-pct">${pct}%</span>
      </div>`;
    }).join('')}</div>`;
        }
