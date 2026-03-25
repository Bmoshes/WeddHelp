'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createGuestSchema, updateGuestSchema } = require('../validators/guest.validator');
const Guest = require('../models/Guest');
const Invitation = require('../models/Invitation');

const router = express.Router();
router.use(auth);

// GET /api/guests — list all active guests for this wedding
router.get('/', async (req, res, next) => {
  try {
    const guests = await Guest.find({ weddingId: req.weddingId, isDeleted: false })
      .sort({ createdAt: 1 });
    res.json(guests);
  } catch (err) { next(err); }
});

// POST /api/guests — create a single guest
router.post('/', validate(createGuestSchema), async (req, res, next) => {
  try {
    // Verify invitation belongs to this wedding (tenant isolation)
    const invitation = await Invitation.findOne({
      _id: req.body.invitationId,
      weddingId: req.weddingId,
      isDeleted: false,
    });
    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

    const guest = await Guest.create({ ...req.body, weddingId: req.weddingId });
    res.status(201).json(guest);
  } catch (err) { next(err); }
});

// PATCH /api/guests/:id
router.patch('/:id', validate(updateGuestSchema), async (req, res, next) => {
  try {
    const guest = await Guest.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId, isDeleted: false },
      { $set: req.body },
      { new: true }
    );
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    res.json(guest);
  } catch (err) { next(err); }
});

// DELETE /api/guests/:id — soft delete
router.delete('/:id', async (req, res, next) => {
  try {
    const guest = await Guest.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    res.json({ message: 'Guest deleted' });
  } catch (err) { next(err); }
});

// POST /api/guests/import — Excel bulk import (handled by dedicated route in app)
// See excelImportService.js; route attached via multer middleware in app.js

module.exports = router;
