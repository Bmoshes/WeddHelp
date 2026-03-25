'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createInvitationSchema, updateInvitationSchema } = require('../validators/invitation.validator');
const Invitation = require('../models/Invitation');
const Guest = require('../models/Guest');
const { generateRsvpWhatsappLink, isValidPlanningWhatsappNumber } = require('../services/whatsappService');
const Wedding = require('../models/Wedding');

const router = express.Router();
router.use(auth);

// GET /api/invitations
router.get('/', async (req, res, next) => {
  try {
    const invitations = await Invitation.find({ weddingId: req.weddingId, isDeleted: false })
      .sort({ createdAt: -1 });
    res.json(invitations);
  } catch (err) { next(err); }
});

// POST /api/invitations
router.post('/', validate(createInvitationSchema), async (req, res, next) => {
  try {
    const invitation = await Invitation.create({ ...req.body, weddingId: req.weddingId });
    res.status(201).json(invitation);
  } catch (err) { next(err); }
});

// PATCH /api/invitations/:id
router.patch('/:id', validate(updateInvitationSchema), async (req, res, next) => {
  try {
    const invitation = await Invitation.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId, isDeleted: false },
      { $set: req.body },
      { new: true }
    );
    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
    res.json(invitation);
  } catch (err) { next(err); }
});

// DELETE /api/invitations/:id — soft delete
router.delete('/:id', async (req, res, next) => {
  try {
    const invitation = await Invitation.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

    // Soft-delete all guests under this invitation
    await Guest.updateMany(
      { invitationId: invitation._id, weddingId: req.weddingId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    res.json({ message: 'Invitation deleted' });
  } catch (err) { next(err); }
});

// GET /api/invitations/:id/whatsapp-link
router.get('/:id/whatsapp-link', async (req, res, next) => {
  try {
    const invitation = await Invitation.findOne({
      _id: req.params.id, weddingId: req.weddingId, isDeleted: false,
    });
    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
    if (!invitation.whatsappNumber) {
      return res.status(400).json({ message: 'Invitation has no WhatsApp number' });
    }
    if (!isValidPlanningWhatsappNumber(invitation.whatsappNumber)) {
      return res.status(400).json({ message: 'Invitation has an invalid WhatsApp number' });
    }

    const wedding = await Wedding.findById(req.weddingId).select('coupleName');
    const link = generateRsvpWhatsappLink(
      invitation.whatsappNumber,
      invitation.rsvpToken,
      wedding.coupleName
    );
    res.json({ link });
  } catch (err) { next(err); }
});

module.exports = router;
