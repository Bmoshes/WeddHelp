'use strict';

const mongoose = require('mongoose');

const WeddingSchema = new mongoose.Schema(
  {
    coupleName:   { type: String, required: true, trim: true },   // "Bar & Maya"
    weddingDate:  { type: Date,   required: true },
    venue:        { type: String, trim: true, default: '' },
    globalBudget: { type: Number, default: 0, min: 0 },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wedding', WeddingSchema);
