'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const BudgetSchema = new Schema(
  {
    weddingId:   { type: Schema.Types.ObjectId, ref: 'Wedding', required: true },
    category:    { type: String, required: true, trim: true },   // "צלם", "אולם"
    vendorName:  { type: String, trim: true, default: '' },
    plannedCost: { type: Number, default: 0, min: 0 },
    actualCost:  { type: Number, default: 0, min: 0 },
    advancePaid: { type: Number, default: 0, min: 0 },
    // Soft delete — financial records must not be permanently destroyed
    isDeleted:   { type: Boolean, default: false },
    deletedAt:   { type: Date,    default: null },
  },
  { timestamps: true }
);

BudgetSchema.index({ weddingId: 1, isDeleted: 1 });

module.exports = mongoose.model('Budget', BudgetSchema);
