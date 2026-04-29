const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Arkadaş listesi ve istekler
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'username avatar status')
      .populate('friendRequests.from', 'username avatar');
    
    res.json({
      friends: user.friends,
      requests: user.friendRequests
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Arkadaşlık isteği gönder
router.post('/request', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    if (targetUser._id.toString() === req.userId) {
      return res.status(400).json({ error: 'Kendine istek gönderemezsin' });
    }
    
    const alreadyRequested = targetUser.friendRequests.some(r => r.from.toString() === req.userId);
    if (alreadyRequested) {
      return res.status(400).json({ error: 'Zaten istek gönderildi' });
    }
    
    targetUser.friendRequests.push({ from: req.userId });
    await targetUser.save();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Arkadaşlık isteğini kabul et
router.post('/accept', auth, async (req, res) => {
  try {
    const { fromId } = req.body;
    const user = await User.findById(req.userId);
    const fromUser = await User.findById(fromId);
    
    if (!fromUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    user.friendRequests = user.friendRequests.filter(r => r.from.toString() !== fromId);
    user.friends.push(fromId);
    fromUser.friends.push(req.userId);
    
    await user.save();
    await fromUser.save();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Arkadaşlık isteğini reddet
router.post('/decline', auth, async (req, res) => {
  try {
    const { fromId } = req.body;
    const user = await User.findById(req.userId);
    
    user.friendRequests = user.friendRequests.filter(r => r.from.toString() !== fromId);
    await user.save();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
