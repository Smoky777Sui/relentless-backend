require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./models/store');

const authRoutes = require('./routes/auth');
const podcastRoutes = require('./routes/podcasts');
const blogRoutes = require('./routes/blogs');
const guestRoutes = require('./routes/guests');
const uploadRoutes = require('./routes/upload');

const app = express();

connectDB().catch(err => console.error('MongoDB error:', err));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/podcasts', podcastRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;