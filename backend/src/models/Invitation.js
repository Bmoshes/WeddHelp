'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const { Schema } = mongoose;

const InvitationSchema = new Schema(
  {
    weddingId:      { type: Schema.Types.ObjectId, ref: 'Wedding', required: true },
    householdName:  { type: String, required: true, trim: true },  // "משפחת כהן"
    whatsappNumber: { type: String, trim: true, default: null },
    rsvpStatus:     {
      type: String,
      enum: ['pending', 'going', 'not_going', 'maybe'],
      default: 'pending',
    },
    giftAmount:     { type: Number, default: 0, min: 0 },
    side:           { type: String, enum: ['groom', 'bride', 'mutual'], default: 'mutual' },
    group:          { type: String, enum: ['family', 'friends', 'work', 'other'], default: 'other' },
    // Secure public token for /rsvp/:token (NOT the MongoDB ObjectId)
    rsvpToken:      { type: String, unique: true },
    // Soft delete
    isDeleted:      { type: Boolean, default: false },
    deletedAt:      { type: Date,    default: null },
  },
  { timestamps: true }
);

// Auto-generate rsvpToken before first save
InvitationSchema.pre('save', function (next) {
  if (!this.rsvpToken) {
    this.rsvpToken = crypto.randomUUID();
  }
  next();
});

// Compound indexes for efficient tenant-scoped queries
InvitationSchema.index({ weddingId: 1, isDeleted: 1 });
InvitationSchema.index({ weddingId: 1, rsvpStatus: 1, isDeleted: 1 });

module.exports = mongoose.model('Invitation', InvitationSchema);
