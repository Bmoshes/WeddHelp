'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * SeatingPlan — one per wedding (upserted on each optimization run).
 * Stores the canonical table layout and guest assignments.
 * No soft delete — the plan is always the latest optimization result.
 */
const SeatingPlanSchema = new Schema(
  {
    weddingId: {
      type: Schema.Types.ObjectId,
      ref: 'Wedding',
      required: true,
      unique: true,   // one active plan per wedding
    },
    tables: [
      {
        tableId:          { type: String, required: true },   // e.g. "table-0" from algorithm
        number:           { type: Number },                    // human-readable label (1, 2, 3…)
        capacity:         { type: Number, required: true },
        isKnight:         { type: Boolean, default: false },
        side:             { type: String, default: 'both' },   // 'groom' | 'bride' | 'both'
        assignedGuestIds: [{ type: Schema.Types.ObjectId, ref: 'Guest' }],
      },
    ],
    // Config snapshot — records what settings produced this plan
    optimizationConfig: {
      tableCapacity:    { type: Number },
      knightConfig:     { type: Schema.Types.Mixed },
      knightGroupNames: [{ type: String }],
    },
    lastOptimizedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SeatingPlan', SeatingPlanSchema);
