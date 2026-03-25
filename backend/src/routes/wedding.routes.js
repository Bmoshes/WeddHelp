'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateWeddingSchema } = require('../validators/wedding.validator');
const Wedding = require('../models/Wedding');
const { getWarnings } = require('../services/smartWarningsService');
const { calculateAlcohol } = require('../services/alcoholCalculatorService');
const Invitation = require('../models/Invitation');

const router = express.Router();

// All wedding routes require auth
router.use(auth);

// GET /api/wedding — get current wedding details
router.get('/', async (req, res, next) => {
  try {
    const wedding = await Wedding.findById(req.weddingId).select('-passwordHash');
    if (!wedding) return res.status(404).json({ message: 'Wedding not found' });
    res.json(wedding);
  } catch (err) { next(err); }
});

// PATCH /api/wedding — update wedding details
router.patch('/', validate(updateWeddingSchema), async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.weddingDate) updates.weddingDate = new Date(updates.weddingDate);

    const wedding = await Wedding.findByIdAndUpdate(
      req.weddingId,
      { $set: updates },
      { new: true }
    ).select('-passwordHash');

    res.json(wedding);
  } catch (err) { next(err); }
});

// GET /api/wedding/warnings — smart warnings dashboard
router.get('/warnings', async (req, res, next) => {
  try {
    const warnings = await getWarnings(req.weddingId);
    res.json({ warnings });
  } catch (err) { next(err); }
});

// GET /api/wedding/alcohol-calculator — estimated alcohol needs
router.get('/alcohol-calculator', async (req, res, next) => {
  try {
    const confirmedCount = await Invitation.countDocuments({
      weddingId: req.weddingId,
      rsvpStatus: { $in: ['going', 'pending', 'maybe'] },
      isDeleted: false,
    });
    const result = calculateAlcohol(confirmedCount);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
