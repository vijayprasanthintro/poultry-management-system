const mongoose = require('mongoose');

const eggPriceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    pricePerEgg: { type: Number, required: true, min: 0 },
    localSellingPrice: { type: Number, min: 0, default: 0 },
    source: { type: String, enum: ['API', 'LAST_KNOWN', 'MANUAL'], default: 'MANUAL' },
    location: { type: String, default: 'Namakkal' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

eggPriceSchema.index({ date: -1 });

module.exports = mongoose.model('EggPrice', eggPriceSchema);