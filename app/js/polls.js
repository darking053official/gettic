function createPoll(question, options, user, activeChannel, setPolls, setMessages) {
  const mid = genId();
  setPolls(prev => ({
    ...prev,
    [mid]: { question, options, votes: new Array(options.length).fill(0), voters: {} }
  }));
  const msg = {
    _id: mid,
    content: `📊 **${question}**\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`,
    senderName: user.username,
    senderId: user._id,
    channelId: activeChannel.id,
    createdAt: new Date().toISOString(),
    reactions: {}
  };
  setMessages(prev => [...prev, msg]);
}

function votePoll(mid, opt, user, polls, setPolls, toast) {
  const poll = polls[mid];
  if (!poll) return;
  if (poll.voters[user._id] !== undefined) return toast('Zaten oy verdiniz', 'e');
  setPolls(prev => ({
    ...prev,
    [mid]: {
      ...prev[mid],
      voters: { ...prev[mid].voters, [user._id]: opt },
      votes: prev[mid].votes.map((v, i) => i === opt ? v + 1 : v)
    }
  }));
}

function PollModal({ onCreatePoll, onClose }) {
  const [question, setQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');

  const handleCreate = () => {
    if (question.trim() && opt1.trim() && opt2.trim()) {
      onCreatePoll(question.trim(), [opt1.trim(), opt2.trim()]);
      onClose();
    }
  };

  return (
    <div>
      <h2 dangerouslySetInnerHTML={{ __html: I.poll }} /> Anket
      <input className="mi" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Soru" />
      <input className="mi" value={opt1} onChange={e => setOpt1(e.target.value)} placeholder="Seçenek 1" />
      <input className="mi" value={opt2} onChange={e => setOpt2(e.target.value)} placeholder="Seçenek 2" />
      <button className="mb" onClick={handleCreate}>Başlat</button>
    </div>
  );
  }
