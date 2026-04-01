require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const app = express();

// Connect MongoDB
if (!mongoose.connections[0].readyState) {
  mongoose.connect(process.env.MONGODB_URI).catch(console.error);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Auth
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET = process.env.JWT_SECRET || 'relentless_secret';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

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

const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const extractYTId = url => { const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/); return m ? m[1] : null; };

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Relentless2024!';
  if ((username === adminUsername || username === process.env.ADMIN_EMAIL) && password === adminPassword) {
    const token = jwt.sign({ id: '1', username: adminUsername, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: '1', username: adminUsername, role: 'admin' } });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/auth/me', authenticate, (req, res) => res.json(req.user));

// Podcast routes
app.get('/api/podcasts', async (req, res) => {
  const podcasts = await Podcast.find().sort({ publishedAt: -1 });
  res.json(podcasts);
});

app.get('/api/podcasts/featured', async (req, res) => {
  const p = await Podcast.findOne({ featured: true }) || await Podcast.findOne().sort({ publishedAt: -1 });
  res.json(p);
});

app.get('/api/podcasts/:id', async (req, res) => {
  const p = await Podcast.findById(req.params.id).catch(() => null);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.post('/api/podcasts', authenticate, async (req, res) => {
  const { title, description, youtubeUrl, guest, featured } = req.body;
  if (!title || !youtubeUrl) return res.status(400).json({ error: 'Title and YouTube URL required' });
  const youtubeId = extractYTId(youtubeUrl);
  if (featured) await Podcast.updateMany({}, { featured: false });
  const p = await Podcast.create({ title, description, youtubeUrl, youtubeId, thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : '', guest, featured: !!featured });
  res.status(201).json(p);
});

app.put('/api/podcasts/:id', authenticate, async (req, res) => {
  const { featured, youtubeUrl } = req.body;
  const youtubeId = youtubeUrl ? extractYTId(youtubeUrl) : undefined;
  if (featured) await Podcast.updateMany({}, { featured: false });
  const p = await Podcast.findByIdAndUpdate(req.params.id, { ...req.body, youtubeId, thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : undefined }, { new: true });
  res.json(p);
});

app.delete('/api/podcasts/:id', authenticate, async (req, res) => {
  await Podcast.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Blog routes
app.get('/api/blogs', async (req, res) => {
  const blogs = await Blog.find().sort({ publishedAt: -1 });
  res.json(blogs);
});

app.get('/api/blogs/:id', async (req, res) => {
  const b = await Blog.findOne({ slug: req.params.id }) || await Blog.findById(req.params.id).catch(() => null);
  if (!b) return res.status(404).json({ error: 'Not found' });
  res.json(b);
});

app.post('/api/blogs', authenticate, async (req, res) => {
  const { title, excerpt, content, image, author, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  let slug = slugify(title);
  if (await Blog.findOne({ slug })) slug = `${slug}-${Date.now()}`;
  const b = await Blog.create({ title, slug, excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200) + '...', content, image, author: author || 'Sam DeMaio', tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []) });
  res.status(201).json(b);
});

app.put('/api/blogs/:id', authenticate, async (req, res) => {
  const b = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(b);
});

app.delete('/api/blogs/:id', authenticate, async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Guest routes
app.post('/api/guests', async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) return res.status(400).json({ error: 'Name and email required' });
  const { phone, cityState, applyingFor, submitterName, submitterRole, submitterRelationship, businessName, industry, yearsInBusiness, website, instagram, linkedin, otherSocial, whatDidYouBuild, majorChallenge, whyValuable, topicsConfident, otherPodcasts, otherPodcastLinks, availableInPerson, openToRemote, agreeToPromote, additionalInfo } = req.body;
  await Guest.create({ contact: { fullName, email, phone, cityState, applyingFor, submitterName, submitterRole, submitterRelationship }, business: { businessName, industry, yearsInBusiness, website, instagram, linkedin, otherSocial }, story: { whatDidYouBuild, majorChallenge, whyValuable, topicsConfident, otherPodcasts, otherPodcastLinks }, logistics: { availableInPerson, openToRemote, agreeToPromote }, additionalInfo });
  res.status(201).json({ success: true, message: 'Application submitted!' });
});

app.get('/api/guests', authenticate, async (req, res) => {
  const guests = await Guest.find().sort({ submittedAt: -1 });
  res.json(guests);
});

app.get('/api/guests/:id', authenticate, async (req, res) => {
  const g = await Guest.findById(req.params.id).catch(() => null);
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json(g);
});

app.patch('/api/guests/:id/status', authenticate, async (req, res) => {
  const g = await Guest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json(g);
});

app.delete('/api/guests/:id', authenticate, async (req, res) => {
  await Guest.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = app;