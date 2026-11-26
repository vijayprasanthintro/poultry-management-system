const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    feedType: {
      type: String,
      enum: ['Layer Mash', 'Starter Feed', 'Grower Feed', 'Finisher Feed', 'Concentrate', 'Other'],
      default: 'Layer Mash',
    },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    weight: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, enum: ['KG', 'GRAMS', 'BAGS'], default: 'KG' },
    bagWeightKg: { type: Number, min: 0, default: 0 },
    pricePerKg: { type: Number, required: true, min: 0, default: 0 },
    totalCost: { type: Number, min: 0, default: 0 },
    supplier: { type: String, default: '', trim: true },
    purchaseDate: { type: Date },
    expiryDate: { type: Date },
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'PoultrySet', default: null },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feed', feedSchema);