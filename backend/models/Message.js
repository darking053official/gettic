const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  channelId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: '' },
  content: { type: String, required: true, maxlength: 2000 },
  replyTo: { type: String, default: null },
  reactions: [{
    emoji: String,
    users: [{ type: String }]
  }],
  editedAt: { type: Date, default: null },
  isBot: { type: Boolean, default: false },
  botName: { type: String, default: '' },
  pinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
