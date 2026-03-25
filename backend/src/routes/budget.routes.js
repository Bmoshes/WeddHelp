'use strict';

const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const Budget = require('../models/Budget');

const router = express.Router();
router.use(auth);

const createBudgetSchema = z.object({
  category:    z.string().min(1).max(100),
  vendorName:  z.string().max(200).optional(),
  plannedCost: z.number().min(0).optional(),
  actualCost:  z.number().min(0).optional(),
  advancePaid: z.number().min(0).optional(),
});

const updateBudgetSchema = createBudgetSchema.partial();

// GET /api/budget
router.get('/', async (req, res, next) => {
  try {
    const entries = await Budget.find({ weddingId: req.weddingId, isDeleted: false })
      .sort({ category: 1 });
    res.json(entries);
  } catch (err) { next(err); }
});

// POST /api/budget
router.post('/', validate(createBudgetSchema), async (req, res, next) => {
  try {
    const entry = await Budget.create({ ...req.body, weddingId: req.weddingId });
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

// PATCH /api/budget/:id
router.patch('/:id', validate(updateBudgetSchema), async (req, res, next) => {
  try {
    const entry = await Budget.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId, isDeleted: false },
      { $set: req.body },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Budget entry not found' });
    res.json(entry);
  } catch (err) { next(err); }
});

// DELETE /api/budget/:id — soft delete (financial records)
router.delete('/:id', async (req, res, next) => {
  try {
    const entry = await Budget.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Budget entry not found' });
    res.json({ message: 'Budget entry deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
