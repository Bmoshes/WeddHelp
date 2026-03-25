'use strict';

const { z } = require('zod');

const createInvitationSchema = z.object({
  householdName:  z.string().min(1).max(200),
  whatsappNumber: z.string().max(20).optional().nullable(),
  rsvpStatus:     z.enum(['pending', 'going', 'not_going', 'maybe']).optional(),
  giftAmount:     z.number().min(0).optional(),
  side:           z.enum(['groom', 'bride', 'mutual']).optional(),
  group:          z.enum(['family', 'friends', 'work', 'other']).optional(),
});

const updateInvitationSchema = createInvitationSchema.partial();

const rsvpSubmitSchema = z.object({
  rsvpStatus: z.enum(['going', 'not_going', 'maybe']),
  giftAmount: z.number().min(0).optional(),
});

module.exports = { createInvitationSchema, updateInvitationSchema, rsvpSubmitSchema };
