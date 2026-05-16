function createPoll(question, options) {
  const mid = genId();
  const poll = { question, options, votes: new Array(options.length).fill(0), voters: {} };
  const msg = {
    _id: mid,
    content: `📊 ${question}`,
    senderName: store.user.username,
    senderId: store.user._id,
    channelId: store.activeChannel.id,
    createdAt: new Date().toISOString(),
    poll
  };
  store.messages.push(msg);
}

function votePoll(mid, opt) {
  const msg = store.messages.find(m => m._id === mid);
  if (!msg?.poll) return;
  if (msg.poll.voters[store.user._id] !== undefined) return toast('Zaten oy verdiniz', 'e');
  msg.poll.voters[store.user._id] = opt;
  msg.poll.votes[opt]++;
}
