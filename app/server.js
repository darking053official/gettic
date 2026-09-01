const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'gettic_jwt_secret';

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});

app.use('/api/', limiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/v1/time', (req, res) => {
  res.json({ 
    timestamp: Math.floor(Date.now() / 1000),
    timestampMs: Date.now()
  });
});

app.post('/api/v1/auth/register', (req, res) => {
  const { username, email, password, deviceId } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const userId = `user_${Date.now()}`;
  const accessToken = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
  
  res.status(201).json({
    userId,
    username,
    email,
    deviceId: deviceId || `device_${Date.now()}`,
    accessToken,
    refreshToken,
    expiresIn: 3600
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password, deviceId } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const userId = `user_${Date.now()}`;
  const accessToken = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
  
  res.json({
    userId,
    email,
    deviceId: deviceId || `device_${Date.now()}`,
    accessToken,
    refreshToken,
    expiresIn: 3600
  });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ error: 'Missing refresh token' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const accessToken = jwt.sign(
      { userId: decoded.userId }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    res.json({
      accessToken,
      expiresIn: 3600
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/api/v1/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    res.json({
      userId: decoded.userId,
      email: decoded.email
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/v1/conversations', (req, res) => {
  res.json([]);
});

app.get('/api/v1/conversations/:id/messages', (req, res) => {
  res.json([]);
});

app.post('/api/v1/conversations/:id/messages', (req, res) => {
  const { content } = req.body;
  const { id } = req.params;
  
  if (!content) {
    return res.status(400).json({ error: 'Missing content' });
  }
  
  const message = {
    id: `msg_${Date.now()}`,
    conversationId: id,
    senderId: 'user_test',
    content,
    timestamp: Date.now(),
    encrypted: true,
    status: 'sent'
  };
  
  res.status(201).json(message);
});

module.exports = app;
