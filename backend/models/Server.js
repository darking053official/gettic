const mongoose = require('mongoose');

const ServerSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 50 },
  description: { type: String, default: '', maxlength: 200 },
  icon: { type: String, default: '' },
  banner: { type: String, default: '' },
  ownerId: { type: String, required: true },
  ownerName: { type: String, required: true },
  members: [{
    userId: String,
    username: String,
    avatar: String,
    roles: [{ type: String }],
    joinedAt: { type: Date, default: Date.now }
  }],
  categories: [{
    name: String,
    order: Number
  }],
  inviteCode: { type: String, unique: true },
  template: { type: String, default: 'default' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Server', ServerSchema);
