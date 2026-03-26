'use strict';

const path = require('path');
const fs   = require('fs');
const express = require('express');
const multer  = require('multer');
const { z }   = require('zod');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');
const Budget   = require('../models/Budget');

const router = express.Router();
router.use(auth);

// ── Proof image upload (disk storage) ────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'proofs');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const rand = Math.random().toString(36).slice(2, 8);
    cb(null, `${req.weddingId}_${req.params.id}_${Date.now()}_${rand}${ext}`);
  },
});

const proofUpload = multer({
  storage: proofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype));
  },
});

// ── Validation schemas ────────────────────────────────────────────────────────
const budgetBodyShape = z.object({
  category:                    z.string().min(1).max(100),
  vendorName:                  z.string().max(200).optional(),
  plannedCost:                 z.number().min(0).optional(),
  actualCost:                  z.number().min(0).optional(),
  advancePaid:                 z.number().min(0).optional(),
  remainingCashAmount:         z.number().min(0).optional(),
  remainingCreditAmount:       z.number().min(0).optional(),
  remainingBankTransferAmount: z.number().min(0).optional(),
});

// Cross-field rule: breakdown total must not exceed the true remaining amount.
// Uses ?? 0 so partial PATCH bodies that omit some fields default to 0 (safe).
function refineBreakdown(data, ctx) {
  const planned = data.plannedCost ?? 0;
  const actual  = data.actualCost  ?? 0;
  const cash    = data.remainingCashAmount         ?? 0;
  const credit  = data.remainingCreditAmount       ?? 0;
  const bank    = data.remainingBankTransferAmount ?? 0;
  const maxBreakdown = Math.max(0, planned - actual);
  // Round to 2 decimal places to absorb floating-point noise
  if (Math.round((cash + credit + bank) * 100) / 100 > Math.round(maxBreakdown * 100) / 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['remainingCashAmount'],
      message: 'סכום פירוט אמצעי התשלום עולה על הסכום שנותר לתשלום',
    });
  }
}

const createBudgetSchema = budgetBodyShape.superRefine(refineBreakdown);
const updateBudgetSchema = budgetBodyShape.partial().superRefine(refineBreakdown);

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

// POST /api/budget/:id/proofs — upload a receipt / proof image
router.post('/:id/proofs', proofUpload.single('proof'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded or unsupported format (jpeg/png/webp only)' });

    const entry = await Budget.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId, isDeleted: false },
      { $push: { paymentProofs: { filename: req.file.filename, originalName: req.file.originalname } } },
      { new: true }
    );

    if (!entry) {
      fs.unlink(path.join(UPLOADS_DIR, req.file.filename), () => {});
      return res.status(404).json({ message: 'Budget entry not found' });
    }
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

// DELETE /api/budget/:id/proofs/:filename — remove a single proof image
router.delete('/:id/proofs/:filename', async (req, res, next) => {
  try {
    const entry = await Budget.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId, isDeleted: false },
      { $pull: { paymentProofs: { filename: req.params.filename } } },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Budget entry not found' });
    fs.unlink(path.join(UPLOADS_DIR, req.params.filename), () => {});
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
