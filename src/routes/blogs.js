const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { readData, writeData } = require('../models/store');
const { authenticate } = require('../middleware/auth');

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// GET all
router.get('/', (req, res) => {
  const blogs = readData('blogs').sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  res.json(blogs);
});

// GET single by slug or id
router.get('/:identifier', (req, res) => {
  const blogs = readData('blogs');
  const blog = blogs.find(b => b.slug === req.params.identifier || b.id === req.params.identifier);
  if (!blog) return res.status(404).json({ error: 'Not found' });
  res.json(blog);
});

// POST (admin)
router.post('/', authenticate, (req, res) => {
  const { title, excerpt, content, image, author, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  const blogs = readData('blogs');
  let slug = slugify(title);
  // Ensure unique slug
  let counter = 1;
  while (blogs.some(b => b.slug === slug)) { slug = `${slugify(title)}-${counter++}`; }

  const blog = {
    id: uuidv4(), title, slug,
    excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
    content,
    image: image || '',
    author: author || 'Sam DeMaio',
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  blogs.unshift(blog);
  writeData('blogs', blogs);
  res.status(201).json(blog);
});

// PUT (admin)
router.put('/:id', authenticate, (req, res) => {
  const blogs = readData('blogs');
  const idx = blogs.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { title, excerpt, content, image, author, tags } = req.body;
  blogs[idx] = {
    ...blogs[idx], title: title || blogs[idx].title,
    excerpt: excerpt || blogs[idx].excerpt,
    content: content || blogs[idx].content,
    image: image !== undefined ? image : blogs[idx].image,
    author: author || blogs[idx].author,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : blogs[idx].tags,
    updatedAt: new Date().toISOString()
  };

  writeData('blogs', blogs);
  res.json(blogs[idx]);
});

// DELETE (admin)
router.delete('/:id', authenticate, (req, res) => {
  const blogs = readData('blogs');
  const filtered = blogs.filter(b => b.id !== req.params.id);
  if (filtered.length === blogs.length) return res.status(404).json({ error: 'Not found' });
  writeData('blogs', filtered);
  res.json({ success: true });
});

module.exports = router;
