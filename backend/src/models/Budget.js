'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const PaymentProofSchema = new Schema({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  uploadedAt:   { type: Date, default: () => new Date() },
}, { _id: false });

const BudgetSchema = new Schema(
  {
    weddingId:    { type: Schema.Types.ObjectId, ref: 'Wedding', required: true },
    category:     { type: String, required: true, trim: true },   // "צלם", "אולם"
    vendorName:   { type: String, trim: true, default: '' },
    linkedTaskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    plannedCost:  { type: Number, default: 0, min: 0 },
    actualCost:   { type: Number, default: 0, min: 0 },   // = paid amount so far
    advancePaid:  { type: Number, default: 0, min: 0 },
    // Remaining payment breakdown (how the outstanding balance will be paid)
    remainingCashAmount:         { type: Number, default: 0, min: 0 },
    remainingCreditAmount:       { type: Number, default: 0, min: 0 },
    remainingBankTransferAmount: { type: Number, default: 0, min: 0 },
    // Receipt / proof images
    paymentProofs: { type: [PaymentProofSchema], default: [] },
    // Soft delete — financial records must not be permanently destroyed
    isDeleted:    { type: Boolean, default: false },
    deletedAt:    { type: Date,    default: null },
  },
  { timestamps: true }
);

BudgetSchema.index({ weddingId: 1, isDeleted: 1 });

module.exports = mongoose.model('Budget', BudgetSchema);
