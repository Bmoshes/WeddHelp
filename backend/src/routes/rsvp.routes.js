'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { rsvpLimiter } = require('../middleware/rateLimiter');
const { rsvpSubmitSchema } = require('../validators/invitation.validator');
const Invitation = require('../models/Invitation');
const Guest = require('../models/Guest');

const router = express.Router();

// Rate-limit ALL public RSVP routes
router.use(rsvpLimiter);

/**
 * GET /api/rsvp/:token
 * Public — no JWT auth required.
 * Returns minimal invitation info needed for the RSVP page.
 * Lookup is by rsvpToken (UUID), NOT by _id, to prevent enumeration.
 */
router.get('/:token', async (req, res, next) => {
  try {
    const invitation = await Invitation.findOne({
      rsvpToken: req.params.token,
      isDeleted: false,
    }).select('householdName rsvpStatus side group rsvpToken');

    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

    // Return guest count so the RSVP page can show "X seats reserved"
    const guestCount = await Guest.countDocuments({
      invitationId: invitation._id,
      isDeleted: false,
    });

    res.json({
      invitationId:  invitation._id,
      householdName: invitation.householdName,
      rsvpStatus:    invitation.rsvpStatus,
      guestCount,
    });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/rsvp/:token
 * Public — submits RSVP response.
 */
router.patch('/:token', validate(rsvpSubmitSchema), async (req, res, next) => {
  try {
    const { rsvpStatus, giftAmount } = req.body;

    const updates = { rsvpStatus };
    if (typeof giftAmount === 'number') updates.giftAmount = giftAmount;

    const invitation = await Invitation.findOneAndUpdate(
      { rsvpToken: req.params.token, isDeleted: false },
      { $set: updates },
      { new: true }
    ).select('householdName rsvpStatus');

    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

    res.json({
      message: 'תודה! תגובתך נקלטה בהצלחה',   // "Thank you! Your response was saved"
      householdName: invitation.householdName,
      rsvpStatus: invitation.rsvpStatus,
    });
  } catch (err) { next(err); }
});

module.exports = router;
