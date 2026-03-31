const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { readData, writeData } = require('../models/store');
const { authenticate } = require('../middleware/auth');

const extractYoutubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/,
    /youtube\.com\/embed\/([^&\s?]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

// GET all
router.get('/', (req, res) => {
  const podcasts = readData('podcasts').sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  res.json(podcasts);
});

// GET featured
router.get('/featured', (req, res) => {
  const podcasts = readData('podcasts');
  const featured = podcasts.find(p => p.featured) || podcasts[0];
  res.json(featured || null);
});

// GET single
router.get('/:id', (req, res) => {
  const podcast = readData('podcasts').find(p => p.id === req.params.id);
  if (!podcast) return res.status(404).json({ error: 'Not found' });
  res.json(podcast);
});

// POST (admin)
router.post('/', authenticate, (req, res) => {
  const { title, description, youtubeUrl, guest, featured } = req.body;
  if (!title || !youtubeUrl) return res.status(400).json({ error: 'Title and YouTube URL required' });

  const youtubeId = extractYoutubeId(youtubeUrl);
  const podcasts = readData('podcasts');

  // Unset previous featured if setting new one
  if (featured) podcasts.forEach(p => p.featured = false);

  const podcast = {
    id: uuidv4(),
    title, description, youtubeUrl, youtubeId,
    thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : '',
    guest: guest || '',
    featured: !!featured,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  podcasts.unshift(podcast);
  writeData('podcasts', podcasts);
  res.status(201).json(podcast);
});

// PUT (admin)
router.put('/:id', authenticate, (req, res) => {
  const podcasts = readData('podcasts');
  const idx = podcasts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { title, description, youtubeUrl, guest, featured } = req.body;
  const youtubeId = youtubeUrl ? extractYoutubeId(youtubeUrl) : podcasts[idx].youtubeId;

  if (featured) podcasts.forEach(p => p.featured = false);

  podcasts[idx] = {
    ...podcasts[idx], title, description,
    youtubeUrl: youtubeUrl || podcasts[idx].youtubeUrl,
    youtubeId,
    thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : podcasts[idx].thumbnail,
    guest: guest || podcasts[idx].guest,
    featured: featured !== undefined ? !!featured : podcasts[idx].featured,
    updatedAt: new Date().toISOString()
  };

  writeData('podcasts', podcasts);
  res.json(podcasts[idx]);
});

// DELETE (admin)
router.delete('/:id', authenticate, (req, res) => {
  const podcasts = readData('podcasts');
  const filtered = podcasts.filter(p => p.id !== req.params.id);
  if (filtered.length === podcasts.length) return res.status(404).json({ error: 'Not found' });
  writeData('podcasts', filtered);
  res.json({ success: true });
});

module.exports = router;
