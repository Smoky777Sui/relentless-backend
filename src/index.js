require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();

// MongoDB connection
if (!mongoose.connections[0].readyState) {
  mongoose.connect(process.env.MONGODB_URI).catch(console.error);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auth middleware
const JWT_SECRET = process.env.JWT_SECRET || 'relentless_secret';
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Multer for image upload (memory storage for Vercel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Schemas
const Podcast = mongoose.models.Podcast || mongoose.model('Podcast', new mongoose.Schema({
  title: String, description: String, youtubeUrl: String,
  youtubeId: String, thumbnail: String, guest: String,
  featured: { type: Boolean, default: false },
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true }));

const Blog = mongoose.models.Blog || mongoose.model('Blog', new mongoose.Schema({
  title: String, slug: { type: String, unique: true },
  excerpt: String, content: String, image: String,
  author: { type: String, default: 'Sam DeMaio' },
  tags: [String], publishedAt: { type: Date, default: Date.now }
}, { timestamps: true }));

const Guest = mongoose.models.Guest || mongoose.model('Guest', new mongoose.Schema({
  contact: Object, business: Object, story: Object,
  logistics: Object, additionalInfo: String,
  status: { type: String, default: 'pending' },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true }));

// Helpers
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const extractYTId = url => { const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/); return m ? m[1] : null; };

// ===== HEALTH =====
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ===== AUTH =====
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Relentless2024!';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@relentlesspodcast.com';
  if ((username === adminUsername || username === adminEmail) && password === adminPassword) {
    const token = jwt.sign({ id: '1', username: adminUsername, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: '1', username: adminUsername, role: 'admin' } });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/auth/me', authenticate, (req, res) => res.json(req.user));

// ===== IMAGE UPLOAD =====
app.post('/api/upload/image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  // Convert to base64 data URL since Vercel has no persistent filesystem
  const base64 = req.file.buffer.toString('base64');
  const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
  res.json({ url: dataUrl });
});

// ===== PODCASTS =====
app.get('/api/podcasts', async (req, res) => {
  try {
    const podcasts = await Podcast.find().sort({ publishedAt: -1 });
    res.json(podcasts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/podcasts/featured', async (req, res) => {
  try {
    const p = await Podcast.findOne({ featured: true }) || await Podcast.findOne().sort({ publishedAt: -1 });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/podcasts/:id', async (req, res) => {
  try {
    const p = await Podcast.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/podcasts', authenticate, async (req, res) => {
  try {
    const { title, description, youtubeUrl, guest, featured } = req.body;
    if (!title || !youtubeUrl) return res.status(400).json({ error: 'Title and YouTube URL required' });
    const youtubeId = extractYTId(youtubeUrl);
    if (featured) await Podcast.updateMany({}, { featured: false });
    const p = await Podcast.create({
      title, description, youtubeUrl, youtubeId,
      thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : '',
      guest, featured: !!featured
    });
    res.status(201).json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/podcasts/:id', authenticate, async (req, res) => {
  try {
    const { title, description, youtubeUrl, guest, featured } = req.body;
    const youtubeId = youtubeUrl ? extractYTId(youtubeUrl) : undefined;
    if (featured) await Podcast.updateMany({}, { featured: false });
    const p = await Podcast.findByIdAndUpdate(req.params.id, {
      title, description, youtubeUrl, youtubeId,
      thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : undefined,
      guest, featured: !!featured
    }, { new: true });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/podcasts/:id', authenticate, async (req, res) => {
  try {
    await Podcast.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== BLOGS =====
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ publishedAt: -1 });
    res.json(blogs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const b = await Blog.findOne({ slug: req.params.id }) || await Blog.findById(req.params.id).catch(() => null);
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/blogs', authenticate, async (req, res) => {
  try {
    const { title, excerpt, content, image, author, tags } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    let slug = slugify(title);
    if (await Blog.findOne({ slug })) slug = `${slug}-${Date.now()}`;
    const b = await Blog.create({
      title, slug,
      excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
      content, image: image || '',
      author: author || 'Sam DeMaio',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : [])
    });
    res.status(201).json(b);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/blogs/:id', authenticate, async (req, res) => {
  try {
    const b = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/blogs/:id', authenticate, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== GUESTS =====
app.post('/api/guests', async (req, res) => {
  try {
    const { fullName, email, phone, cityState, applyingFor, submitterName, submitterRole,
      submitterRelationship, businessName, industry, yearsInBusiness, website, instagram,
      linkedin, otherSocial, whatDidYouBuild, majorChallenge, whyValuable, topicsConfident,
      otherPodcasts, otherPodcastLinks, availableInPerson, openToRemote, agreeToPromote, additionalInfo } = req.body;
    if (!fullName || !email) return res.status(400).json({ error: 'Name and email required' });
    await Guest.create({
      contact: { fullName, email, phone, cityState, applyingFor, submitterName, submitterRole, submitterRelationship },
      business: { businessName, industry, yearsInBusiness, website, instagram, linkedin, otherSocial },
      story: { whatDidYouBuild, majorChallenge, whyValuable, topicsConfident, otherPodcasts, otherPodcastLinks },
      logistics: { availableInPerson, openToRemote, agreeToPromote },
      additionalInfo
    });
    res.status(201).json({ success: true, message: 'Application submitted!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/guests', authenticate, async (req, res) => {
  try {
    const guests = await Guest.find().sort({ submittedAt: -1 });
    res.json(guests);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/guests/:id', authenticate, async (req, res) => {
  try {
    const g = await Guest.findById(req.params.id).catch(() => null);
    if (!g) return res.status(404).json({ error: 'Not found' });
    res.json(g);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/guests/:id/status', authenticate, async (req, res) => {
  try {
    const g = await Guest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!g) return res.status(404).json({ error: 'Not found' });
    res.json(g);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/guests/:id', authenticate, async (req, res) => {
  try {
    await Guest.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = app;