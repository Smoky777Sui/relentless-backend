const express = require('express');
const router = express.Router();
const { connectDB, Podcast } = require('../models/store');
const { authenticate } = require('../middleware/auth');

const extractYoutubeId = (url) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
  return m ? m[1] : null;
};

router.get('/', async (req, res) => {
  await connectDB();
  const podcasts = await Podcast.find().sort({ publishedAt: -1 });
  res.json(podcasts);
});

router.get('/featured', async (req, res) => {
  await connectDB();
  const featured = await Podcast.findOne({ featured: true }) || await Podcast.findOne().sort({ publishedAt: -1 });
  res.json(featured);
});

router.get('/:id', async (req, res) => {
  await connectDB();
  const podcast = await Podcast.findById(req.params.id).catch(() => null);
  if (!podcast) return res.status(404).json({ error: 'Not found' });
  res.json(podcast);
});

router.post('/', authenticate, async (req, res) => {
  await connectDB();
  const { title, description, youtubeUrl, guest, featured } = req.body;
  if (!title || !youtubeUrl) return res.status(400).json({ error: 'Title and YouTube URL required' });
  const youtubeId = extractYoutubeId(youtubeUrl);
  if (featured) await Podcast.updateMany({}, { featured: false });
  const podcast = await Podcast.create({
    title, description, youtubeUrl, youtubeId,
    thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : '',
    guest, featured: !!featured
  });
  res.status(201).json(podcast);
});

router.put('/:id', authenS