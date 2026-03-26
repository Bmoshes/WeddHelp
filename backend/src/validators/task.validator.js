'use strict';

const { z } = require('zod');

const createTaskSchema = z.object({
  title:    z.string().min(1).max(300),
  category: z.enum(['bureaucracy', 'vendors', 'attire', 'logistics', 'extras']),
  dueDate:  z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Invalid date' }).optional(),
  isDone:   z.boolean().optional(),
  requiresPayment: z.boolean().optional(),
  paidAmount: z.number().min(0).optional(),
  remainingCashDue: z.number().min(0).optional(),
  paymentMethod: z.enum(['none', 'cash', 'credit', 'bank_transfer', 'mixed']).optional(),
});

const updateTaskSchema = z.object({
  title:    z.string().min(1).max(300).optional(),
  category: z.enum(['bureaucracy', 'vendors', 'attire', 'logistics', 'extras']).optional(),
  dueDate:  z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Invalid date' }).optional(),
  isDone:   z.boolean().optional(),
  requiresPayment: z.boolean().optional(),
  paidAmount: z.number().min(0).optional(),
  remainingCashDue: z.number().min(0).optional(),
  paymentMethod: z.enum(['none', 'cash', 'credit', 'bank_transfer', 'mixed']).optional(),
});

module.exports = { createTaskSchema, updateTaskSchema };
