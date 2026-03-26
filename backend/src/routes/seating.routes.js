'use strict';

const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { buildLegacyGuestArray, persistOptimizationResult, syncSeatingPlanFromAssignments } = require('../services/seatingAdapterService');
const { runProximityOptimization } = require('../services/proximitySeatingService');
const SeatingPlan = require('../models/SeatingPlan');
const Guest = require('../models/Guest');
const Invitation = require('../models/Invitation');

const router = express.Router();
router.use(auth);

const optimizeSchema = z.object({
  tableCapacity:    z.number().int().min(1).max(50).optional(),
  mode:             z.enum(['default', 'proximity']).optional(),
  knightConfig: z.object({
    enabled:  z.boolean(),
    count:    z.number().int().min(0),
    capacity: z.number().int().min(1),
  }).optional(),
  knightGroupNames: z.array(z.string()).optional(),
});

const manualAssignmentSchema = z.object({
  tableId: z.string().min(1).nullable().optional(),
});

// POST /api/seating/optimize
// Runs the seating algorithm and persists results
router.post('/optimize', validate(optimizeSchema), async (req, res, next) => {
  try {
    const config = {
      tableCapacity:    req.body.tableCapacity ?? 12,
      knightConfig:     req.body.knightConfig ?? { enabled: false, count: 0, capacity: 20 },
      knightGroupNames: req.body.knightGroupNames ?? [],
    };
    const selectedMode = req.body.mode ?? 'default';
    const shouldUseProximity =
      selectedMode === 'proximity' ||
      (config.knightConfig.enabled && config.knightGroupNames.length > 0);

    let result;

    if (shouldUseProximity) {
      // Proximity-aware optimizer: clusters by relationship group + surname
      result = await runProximityOptimization(req.weddingId, config);
      if (!result) {
        return res.status(400).json({ message: 'No confirmed guests to seat' });
      }
    } else {
      // Default optimizer: lazy-load the compiled legacy algorithm
      let optimizeSeating;
      try {
        ({ optimizeSeating } = require('../../dist/utils/seatingAlgorithm'));
      } catch {
        return res.status(503).json({
          message: 'Seating algorithm not built. Run `npm run build:algo` at repo root first.',
        });
      }

      const guests = await buildLegacyGuestArray(req.weddingId);
      if (guests.length === 0) {
        return res.status(400).json({ message: 'No confirmed guests to seat' });
      }

      result = await optimizeSeating(guests, [], config);
    }

    // Persist assignments back to MongoDB
    await persistOptimizationResult(req.weddingId, result, config);

    res.json({
      message: 'Seating optimized successfully',
      tablesCount: result.tables.length,
      seatedGuests: Object.keys(result.assignments).length,
    });
  } catch (err) {
    // Surface 503 "algorithm not built" errors with their original message
    if (err.status === 503) return res.status(503).json({ message: err.message });
    next(err);
  }
});

// GET /api/seating/plan — current seating plan
router.get('/plan', async (req, res, next) => {
  try {
    const plan = await SeatingPlan.findOne({ weddingId: req.weddingId })
      .populate({
        path: 'tables.assignedGuestIds',
        select: 'firstName lastName mealPreference relationshipGroup amount',
        match: { isDeleted: false },
      });
    res.json(plan || { tables: [] });
  } catch (err) { next(err); }
});

router.get('/relationship-groups', async (req, res, next) => {
  try {
    const groups = await Guest.distinct('relationshipGroup', {
      weddingId: req.weddingId,
      isDeleted: false,
      relationshipGroup: { $nin: [null, ''] },
    });
    res.json({ groups: groups.filter(Boolean).sort((a, b) => a.localeCompare(b, 'he')) });
  } catch (err) { next(err); }
});

router.patch('/assignments/:guestId', validate(manualAssignmentSchema), async (req, res, next) => {
  try {
    const tableId = req.body.tableId ?? null;
    const guest = await Guest.findOne({
      _id: req.params.guestId,
      weddingId: req.weddingId,
      isDeleted: false,
    });

    if (!guest) return res.status(404).json({ message: 'Guest not found' });

    if (tableId) {
      const plan = await SeatingPlan.findOne({ weddingId: req.weddingId }).lean();
      if (!plan) return res.status(400).json({ message: 'No seating plan found' });

      const targetTable = plan.tables.find((table) => table.tableId === tableId);
      if (!targetTable) return res.status(404).json({ message: 'Table not found' });

      const assignedGuests = await Guest.find({
        weddingId: req.weddingId,
        isDeleted: false,
        assignedTableId: tableId,
        _id: { $ne: guest._id },
      }).select('amount').lean();

      const occupants = assignedGuests.reduce((sum, assignedGuest) => sum + (assignedGuest.amount || 1), 0);
      const guestSeats = guest.amount || 1;

      if (occupants + guestSeats > targetTable.capacity) {
        return res.status(400).json({ message: 'Table is already full' });
      }
    }

    guest.assignedTableId = tableId;
    await guest.save();
    await syncSeatingPlanFromAssignments(req.weddingId);

    res.json({
      message: tableId ? 'Guest assigned successfully' : 'Guest moved to unseated list',
      guestId: guest._id,
      tableId,
    });
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

// DELETE /api/seating/excel-import — remove all Excel-imported invitations, guests, and seating plan
router.delete('/excel-import', async (req, res, next) => {
  try {
    const now = new Date();

    // Soft-delete all Excel-imported guests (tenant-scoped)
    const guestResult = await Guest.updateMany(
      { weddingId: req.weddingId, source: 'excel_import', isDeleted: false },
      { $set: { isDeleted: true, deletedAt: now } }
    );

    // Soft-delete all Excel-imported invitations (tenant-scoped)
    const invResult = await Invitation.updateMany(
      { weddingId: req.weddingId, source: 'excel_import', isDeleted: false },
      { $set: { isDeleted: true, deletedAt: now } }
    );

    // Clear assignedTableId on any remaining guests (e.g. manually added)
    await Guest.updateMany(
      { weddingId: req.weddingId, isDeleted: false },
      { $set: { assignedTableId: null } }
    );

    // Delete the seating plan entirely
    await SeatingPlan.deleteOne({ weddingId: req.weddingId });

    res.json({
      message: 'Excel data cleared',
      invitationsDeleted: invResult.modifiedCount,
      guestsDeleted: guestResult.modifiedCount,
    });
  } catch (err) { next(err); }
});

// POST /api/seating/excel-import — parse Excel and import guests
router.post('/excel-import', auth, async (req, res, next) => {
  // Multer middleware is applied in app.js before this route
  // The file buffer is available as req.file.buffer
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { importFromExcel } = require('../services/excelImportService');

    // New Excel import must start from a clean seating state so stale tables do not linger.
    await Guest.updateMany(
      { weddingId: req.weddingId, isDeleted: false },
      { $set: { assignedTableId: null } }
    );
    await SeatingPlan.deleteOne({ weddingId: req.weddingId });

    const result = await importFromExcel(req.file.buffer, req.weddingId);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

module.exports = router;
