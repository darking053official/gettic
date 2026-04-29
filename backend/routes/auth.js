const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Kayıt
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış' });
    }
    
    const user = new User({ username, password });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { _id: user._id, username: user.username, status: user.status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Giriş
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(400).json({ error: 'Şifre yanlış' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { _id: user._id, username: user.username, status: user.status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Me (token ile kullanıcı bilgisi)
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
