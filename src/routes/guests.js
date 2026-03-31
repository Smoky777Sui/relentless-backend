const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { readData, writeData } = require('../models/store');
const { authenticate } = require('../middleware/auth');

// Submit guest application (public)
router.post('/', (req, res) => {
  const {
    fullName, email, phone, cityState, applyingFor, submitterName, submitterRole, submitterRelationship,
    businessName, industry, yearsInBusiness, website, instagram, linkedin, otherSocial,
    whatDidYouBuild, majorChallenge, whyValuable, topicsConfident, otherPodcasts, otherPodcastLinks,
    availableInPerson, openToRemote, agreeToPromote, additionalInfo
  } = req.body;

  if (!fullName || !email) return res.status(400).json({ error: 'Full name and email are required' });

  const guests = readData('guests');
  const guest = {
    id: uuidv4(),
    contact: { fullName, email, phone, cityState, applyingFor, submitterName, submitterRole, submitterRelationship },
    business: { businessName, industry, yearsInBusiness, website, instagram, linkedin, otherSocial },
    story: { whatDidYouBuild, majorChallenge, whyValuable, topicsConfident, otherPodcasts, otherPodcastLinks },
    logistics: { availableInPerson, openToRemote, agreeToPromote },
    additionalInfo,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  guests.push(guest);
  writeData('guests', guests);
  res.status(201).json({ success: true, message: 'Application submitted successfully!' });
});

// GET all applications (admin)
router.get('/', authenticate, (req, res) => {
  const guests = readData('guests').sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(guests);
});

// GET single (admin)
router.get('/:id', authenticate, (req, res) => {
  const guest = readData('guests').find(g => g.id === req.params.id);
  if (!guest) return res.status(404).json({ error: 'Not found' });
  res.json(guest);
});

// Update status (admin)
router.patch('/:id/status', authenticate, (req, res) => {
  const { status } = req.body;
  if (!['pending', 'reviewed', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const guests = readData('guests');
  const idx = guests.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  guests[idx].status = status;
  guests[idx].updatedAt = new Date().toISOString();
  writeData('guests', guests);
  res.json(guests[idx]);
});

// DELETE (admin)
router.delete('/:id', authenticate, (req, res) => {
  const guests = readData('guests');
  const filtered = guests.filter(g => g.id !== req.params.id);
  if (filtered.length === guests.length) return res.status(404).json({ error: 'Not found' });
  writeData('guests', filtered);
  res.json({ success: true });
});

module.exports = router;
