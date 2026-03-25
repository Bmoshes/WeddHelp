'use strict';

const { z } = require('zod');

const registerSchema = z.object({
  coupleName:  z.string().min(2).max(100),
  weddingDate: z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Invalid date' }),
  venue:       z.string().max(200).optional(),
  email:       z.string().email(),
  password:    z.string().min(8),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const updateWeddingSchema = z.object({
  coupleName:   z.string().min(2).max(100).optional(),
  weddingDate:  z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Invalid date' }).optional(),
  venue:        z.string().max(200).optional(),
  globalBudget: z.number().min(0).optional(),
});

module.exports = { registerSchema, loginSchema, updateWeddingSchema };
