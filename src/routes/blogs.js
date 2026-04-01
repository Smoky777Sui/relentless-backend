const express = require('express');
const router = express.Router();
const { connectDB, Blog } = require('../models/store');
const { authenticate } = require('../middleware/auth');

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

router.get('/', async (req, res) => {
  await connectDB();
  const blogs = await Blog.find().sort({ publishedAt: -1 });
  res.json(blogs);
});

router.get('/:identifier', async (req, res) => {
  await connectDB();
  const blog = await Blog.findOne({ slug: req.params.identifier }) || await Blog.findById(req.params.identifier).catch(() => null);
  if (!blog) return res.status(404).json({ error: 'Not found' });
  res.json(blog);
});

router.post('/', authenticate, async (req, res) => {
  await connectDB();
  const { title, excerpt, content, image, author, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  let slug = slugify(title);
  const existing = await Blog.findOne({ slug });
  if (existing) slug = `${slug}-${Date.now()}`;
  const blog = await Blog.create({
    title, slug,
    excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
    content, image, author: author || 'Sam DeMaio',
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : [])
  });
  res.status(201).json(blog);
});

router.put('/:id', authenticate, async (req, res) => {
  await connectDB();
  const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!blog) return res.status(404).json({ error: 'Not found' });
  res.json(blog);
});

router.delete('/:id', authenticate, async (