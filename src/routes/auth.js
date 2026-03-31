const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { readData } = require('../models/store');
const { generateToken, authenticate } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const adminUser = process.env.ADMIN_EMAIL || 'admin@relentlesspodcast.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'Admin@Relentless2024!';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';

  // Check against env vars directly
  const isAdmin =
    (username === adminUsername || username === adminUser) &&
    password === adminPass;

  if (!isAdmin) return res.status(401).json({ error: 'Invalid credentials' });

  const user = { id: '1', username: adminUsername, email: adminUser, role: 'admin' };
  const token = generateToken(user);
  res.json({ token, user });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ id: '1', username: process.env.ADMIN_USERNAME || 'admin', email: process.env.ADMIN_EMAIL || 'admin@relentlesspodcast.com', role: 'admin' });
});

module.exports = router;