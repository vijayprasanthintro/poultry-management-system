const mongoose = require('mongoose');

const poultrySetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    birdCount: { type: Number, required: true, min: 0, default: 0 },
    startingBirdCount: { type: Number, required: true, min: 0, default: 0 },
    breed: { type: String, default: '', trim: true },
    startingDate: { type: Date },
    house: { type: String, default: '', trim: true },
    age: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PoultrySet', poultrySetSchema);