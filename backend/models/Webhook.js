const mongoose = require('mongoose');

const WebhookSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 50 },
  token: { type: String, required: true, unique: true },
  serverId: { type: String, required: true },
  channelId: { type: String, required: true },
  ownerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Webhook', WebhookSchema);
