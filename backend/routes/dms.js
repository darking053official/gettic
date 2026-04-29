const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const router = express.Router();

// DM listesi
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('friends', 'username avatar status');
    const dms = user.friends.map(friend => ({
      _id: `dm_${friend._id}`,
      partner: friend,
      lastMessage: null
    }));
    res.json(dms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DM mesajlarını getir (public channel gibi)
router.get('/:userId/messages', auth, async (req, res) => {
  try {
    const channelId = `dm_${req.userId}_${req.params.userId}`;
    const messages = await Message.find({ channelId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DM mesajı gönder
router.post('/:userId/send', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const sender = await User.findById(req.userId);
    const receiver = await User.findById(req.params.userId);
    
    if (!receiver) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    const channelId = `dm_${req.userId}_${req.params.userId}`;
    
    const message = new Message({
      channelId,
      senderId: req.userId,
      senderName: sender.username,
      content,
      isBot: false
    });
    
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
