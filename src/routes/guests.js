const express = require('express');
const router = express.Router();
const { connectDB, Guest } = require('../models/store');
const { authenticate } = require('../middleware/auth');

router.post('/', async (req, res) => {
  await connectDB();
  const {
    fullName, email, phone, cityState, applyingFor, submitterName, submitterRole, submitterRelationship,
    businessName, industry, yearsInBusiness, website, instagram, linkedin, otherSocial,
    whatDidYouBuild, majorChallenge, whyValuable, topicsConfident, otherPodcasts, otherPodcastLinks,
    availableInPerson, openToRemote, agreeToPromote, additionalInfo
  } = req.body;

  if (!fullName || !email) return res.status(400).json({ error: 'Full name and email are required' });

  const guest = await Guest.create({
    contact: { fullName, email, phone, cityState, applyingFor, submitterName, submitterRole, submitterRelationship },
    business: { businessName, industry, yearsInBusiness, website, instagram, linkedin, otherSocial },
    story: { whatDidYouBuild, majorChallenge, whyValuable, topicsConfident, otherPodcasts, otherPodcastLinks },
    logistics: { availableInPerson, openToRemote, agreeToPromote },
    additionalInfo,
    status: 'pending'
  });

  res.status(201).json({ success: true, message: 'Application submitted successfully!' });
});

router.get('/', authenticate, async (req, res) => {
  await connectDB();
  const guests = await Guest.find().sort({ submittedAt: -1 });
  res.json(guests);
});

router.get('/:id', authenticate, async (req, res) => {
  await connectDB();
  const guest = await Guest.findById(req.params.id).catch(() => null);
  if (!guest) return res.status(404).json({ error: 'Not found' });
  res.json(guest);
});

router.patch('/:id/status', authenticate, async (req, res) => {
  await connectDB();
  const { status } = req.body;
  if (!['pending', 'reviewed', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const guest = await Guest.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!guest) return res.status(404).json({ error: 'Not found' });
  res.json(guest);
});

router.delete('/:id', authenticate, async (req, res) => {
  await connectDB();
  await Guest.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;