'use strict';

const { z } = require('zod');

const createTaskSchema = z.object({
  title:    z.string().min(1).max(300),
  category: z.enum(['bureaucracy', 'vendors', 'attire', 'logistics', 'extras']),
  dueDate:  z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Invalid date' }).optional(),
  isDone:   z.boolean().optional(),
});

const updateTaskSchema = z.object({
  title:    z.string().min(1).max(300).optional(),
  dueDate:  z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Invalid date' }).optional(),
  isDone:   z.boolean().optional(),
});

module.exports = { createTaskSchema, updateTaskSchema };
