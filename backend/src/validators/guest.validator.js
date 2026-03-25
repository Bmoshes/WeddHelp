'use strict';

const { z } = require('zod');

const createGuestSchema = z.object({
  invitationId:   z.string().min(1),
  firstName:      z.string().min(1).max(100),
  lastName:       z.string().max(100).optional(),
  mealPreference: z.enum(['meat', 'chicken', 'vegan', 'kids', 'none']).optional(),
  age:            z.number().int().min(0).max(120).optional().nullable(),
  notes:          z.string().max(500).optional(),
  conflictsWith:  z.array(z.string()).optional(),
});

const updateGuestSchema = createGuestSchema.omit({ invitationId: true }).partial();

module.exports = { createGuestSchema, updateGuestSchema };
