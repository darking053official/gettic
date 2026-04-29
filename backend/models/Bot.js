const mongoose = require('mongoose');

const BotSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 30 },
  prefix: { type: String, default: '/', maxlength: 5 },
  description: { type: String, default: '', maxlength: 200 },
  token: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  ownerName: { type: String, required: true },
  avatar: { type: String, default: '' },
  commands: [{
    name: String,
    response: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bot', BotSchema);
