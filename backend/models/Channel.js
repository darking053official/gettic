const mongoose = require('mongoose');

const ChannelSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 30 },
  type: { type: String, enum: ['text', 'voice', 'forum', 'stage', 'announce', 'rules'], default: 'text' },
  serverId: { type: String, required: true },
  category: { type: String, default: '' },
  topic: { type: String, default: '', maxlength: 100 },
  position: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Channel', ChannelSchema);
