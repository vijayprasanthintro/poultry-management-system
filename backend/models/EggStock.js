const mongoose = require('mongoose');

const eggStockSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true, default: Date.now },
    openingStock: { type: Number, required: true, min: 0, default: 0 },
    production: { type: Number, required: true, min: 0, default: 0 },
    sold: { type: Number, required: true, min: 0, default: 0 },
    broken: { type: Number, required: true, min: 0, default: 0 },
    rejected: { type: Number, required: true, min: 0, default: 0 },
    adjustments: {
      type: Number,
      required: true,
      default: 0,
      set: (v) => Math.round(v),
    },
    adjustmentReason: { type: String, default: '' },
    closingStock: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

eggStockSchema.index({ date: -1 });

module.exports = mongoose.model('EggStock', eggStockSchema);