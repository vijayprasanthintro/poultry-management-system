const mongoose = require('mongoose');

const birdRecordSchema = new mongoose.Schema(
  {
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'PoultrySet', required: true },
    date: { type: Date, required: true, default: Date.now },
    openingBirds: { type: Number, required: true, min: 0, default: 0 },
    newBirds: { type: Number, required: true, min: 0, default: 0 },
    mortality: { type: Number, required: true, min: 0, default: 0 },
    soldBirds: { type: Number, required: true, min: 0, default: 0 },
    currentBirds: { type: Number, min: 0, default: 0 },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

birdRecordSchema.index({ set: 1, date: -1 });

module.exports = mongoose.model('BirdRecord', birdRecordSchema);