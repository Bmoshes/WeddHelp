'use strict';

const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { buildLegacyGuestArray, persistOptimizationResult } = require('../services/seatingAdapterService');
const SeatingPlan = require('../models/SeatingPlan');
const Guest = require('../models/Guest');

const router = express.Router();
router.use(auth);

const optimizeSchema = z.object({
  tableCapacity:    z.number().int().min(1).max(50).optional(),
  knightConfig: z.object({
    enabled:  z.boolean(),
    count:    z.number().int().min(0),
    capacity: z.number().int().min(1),
  }).optional(),
  knightGroupNames: z.array(z.string()).optional(),
});

// POST /api/seating/optimize
// Runs the seating algorithm and persists results
router.post('/optimize', validate(optimizeSchema), async (req, res, next) => {
  try {
    // Lazy-require the compiled algorithm (must run `npm run build:algo` first)
    let optimizeSeating;
    try {
      ({ optimizeSeating } = require('../../dist/utils/seatingAlgorithm'));
    } catch {
      return res.status(503).json({
        message: 'Seating algorithm not built. Run `npm run build:algo` at repo root first.',
      });
    }

    const config = {
      tableCapacity:    req.body.tableCapacity ?? 12,
      knightConfig:     req.body.knightConfig ?? { enabled: false, count: 0, capacity: 20 },
      knightGroupNames: req.body.knightGroupNames ?? [],
    };

    // Build legacy guest array (only 'going' guests, tenant-scoped)
    const guests = await buildLegacyGuestArray(req.weddingId);

    if (guests.length === 0) {
      return res.status(400).json({ message: 'No confirmed guests to seat' });
    }

    // Run the untouched seating algorithm (black box)
    const result = await optimizeSeating(guests, [], config);

    // Persist assignments back to MongoDB
    await persistOptimizationResult(req.weddingId, result, config);

    res.json({
      message: 'Seating optimized successfully',
      tablesCount: result.tables.length,
      seatedGuests: Object.keys(result.assignments).length,
    });
  } catch (err) { next(err); }
});

// GET /api/seating/plan — current seating plan
router.get('/plan', async (req, res, next) => {
  try {
    const plan = await SeatingPlan.findOne({ weddingId: req.weddingId })
      .populate('tables.assignedGuestIds', 'firstName lastName mealPreference');
    res.json(plan || { tables: [] });
  } catch (err) { next(err); }
});

// DELETE /api/seating/plan — clear all assignments
router.delete('/plan', async (req, res, next) => {
  try {
    // Unassign all guests (tenant-scoped)
    await Guest.updateMany(
      { weddingId: req.weddingId, isDeleted: false },
      { $set: { assignedTableId: null } }
    );
    await SeatingPlan.deleteOne({ weddingId: req.weddingId });
    res.json({ message: 'Seating plan cleared' });
  } catch (err) { next(err); }
});

// POST /api/seating/excel-import — parse Excel and import guests
router.post('/excel-import', auth, async (req, res, next) => {
  // Multer middleware is applied in app.js before this route
  // The file buffer is available as req.file.buffer
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { importFromExcel } = require('../services/excelImportService');
    const result = await importFromExcel(req.file.buffer, req.weddingId);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

module.exports = router;
