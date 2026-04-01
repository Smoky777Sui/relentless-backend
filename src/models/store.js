const mongoose = require('mongoose');

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
};

const podcastSchema = new mongoose.Schema({
  title: String, description: String, youtubeUrl: String,
  youtubeId: String, thumbnail: String, guest: String,
  featured: { type: Boolean, default: false },
  publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const blogSchema = new mongoose.Schema({
  title: String, slug: { type: String, unique: true },
  excerpt: String, content: String, image: String,
  author: { type: String, default: 'Sam DeMaio' },
  tags: [String],
  publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const guestSchema = new mongoose.Schema({
  contact: Object, business: Object, story: Object,
  logistics: Object, additionalInfo: String,
  status: { type: String, default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Podcast = mongoose.models.Podcast || mongoose.model('Podcast', podcastSchema);
const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
const Guest = mongoose.models.Guest || mongoose.model('Guest', guestSchema);

module.exports = { connectDB, Podcast, Blog, Guest };