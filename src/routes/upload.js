const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid image uploaded' });
  const url = `${process.env.API_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

module.exports = router;
