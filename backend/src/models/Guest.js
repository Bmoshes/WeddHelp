'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Guest — represents a single physical seat at the wedding.
 *
 * Design principle: this schema is kept lean and SaaS-domain-clean.
 * Legacy seating-engine fields (category, side, groupId, amount) are NOT stored here;
 * they are derived from the parent Invitation in seatingAdapterService.js.
 *
 * Fields stored here and justification:
 *   conflictsWith — SaaS-level conflict management, also consumed by the algorithm
 *   age, notes    — per-person data (not household-level)
 *   mealPreference — per-person requirement
 *   assignedTableId — seating result (written back by optimizer)
 */
const GuestSchema = new Schema(
  {
    weddingId:       { type: Schema.Types.ObjectId, ref: 'Wedding',    required: true },
    invitationId:    { type: Schema.Types.ObjectId, ref: 'Invitation', required: true },
    firstName:       { type: String, required: true, trim: true },
    lastName:        { type: String, trim: true, default: '' },
    mealPreference:  {
      type: String,
      enum: ['meat', 'chicken', 'vegan', 'kids', 'none'],
      default: 'none',
    },
    // Written by optimizer; string matches legacy tableId format ("table-0", etc.)
    assignedTableId: { type: String, default: null },
    age:             { type: Number, min: 0, max: 120, default: null },
    notes:           { type: String, trim: true, default: '' },
    // SaaS-level conflict management; adapter maps ObjectIds → strings for the engine
    conflictsWith:   [{ type: Schema.Types.ObjectId, ref: 'Guest' }],
    // Soft delete
    isDeleted:       { type: Boolean, default: false },
    deletedAt:       { type: Date,    default: null },
  },
  { timestamps: true }
);

GuestSchema.index({ weddingId: 1, isDeleted: 1 });
GuestSchema.index({ weddingId: 1, invitationId: 1, isDeleted: 1 });

module.exports = mongoose.model('Guest', GuestSchema);
