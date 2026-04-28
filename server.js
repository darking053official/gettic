const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('.')); // HTML dosyanın olduğu dizin

// Mock API endpoints
app.post('/api/login', (req, res) => {
  res.json({ token: 'mock_token', user: { _id: '1', username: req.body.username } });
});

app.post('/api/register', (req, res) => {
  res.json({ token: 'mock_token', user: { _id: '1', username: req.body.username } });
});

app.get('/api/me', (req, res) => {
  res.json({ _id: '1', username: 'Demo', status: 'online' });
});

app.get('/api/servers', (req, res) => {
  res.json([{ _id: 'srv1', name: 'Demo Sunucu' }]);
});

app.get('/api/servers/:id/channels', (req, res) => {
  res.json([
    { _id: 'ch1', name: 'genel', type: 'text' },
    { _id: 'ch2', name: 'sesli', type: 'voice' }
  ]);
});

app.get('/api/channels/:id/messages', (req, res) => {
  res.json([]);
});

app.listen(3000, () => console.log('http://localhost:3000'));
