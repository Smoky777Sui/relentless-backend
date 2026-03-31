const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { readData } = require('../models/store');
const { generateToken, authenticate } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const users = readData('users');
  const user = users.find(u => u.username === username || u.email === username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

router.get('/me', authenticate, (req, res) => {
  const users = readData('users');
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

module.exports = router;
