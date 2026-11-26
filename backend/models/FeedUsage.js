const mongoose = require('mongoose');

const feedUsageSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'PoultrySet', required: true },
    feed: { type: mongoose.Schema.Types.ObjectId, ref: 'Feed' },
    feedName: { type: String, default: '', trim: true },
    pricePerKg: { type: Number, min: 0, default: 0 },
    startingWeight: { type: Number, required: true, min: 0, default: 0 },
    feedAdded: { type: Number, min: 0, default: 0 },
    feedUsed: { type: Number, required: true, min: 0, default: 0 },
    endingWeight: { type: Number, min: 0, default: 0 },
    unit: { type: String, enum: ['KG', 'GRAMS', 'BAGS'], default: 'KG' },
    bagWeightKg: { type: Number, min: 0, default: 0 },
    feedCost: { type: Number, min: 0, default: 0 },
    isAdjustment: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

feedUsageSchema.index({ set: 1, date: -1 });
feedUsageSchema.index({ date: -1 });

module.exports = mongoose.model('FeedUsage', feedUsageSchema);