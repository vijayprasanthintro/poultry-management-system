const mongoose = require('mongoose');

const dailyEggRecordSchema = new mongoose.Schema(
  {
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'PoultrySet', required: true },
    date: { type: Date, required: true, default: Date.now },
    birds: { type: Number, required: true, min: 0, default: 0 },
    singleEggs: { type: Number, required: true, min: 0, default: 0 },
    doubleEggs: { type: Number, required: true, min: 0, default: 0 },
    totalEggs: { type: Number, required: true, min: 0, default: 0 },
    brokenEggs: { type: Number, required: true, min: 0, default: 0 },
    rejectedEggs: { type: Number, required: true, min: 0, default: 0 },
    sellableEggs: { type: Number, min: 0, default: 0 },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dailyEggRecordSchema.index({ set: 1, date: -1 });
dailyEggRecordSchema.index({ date: -1 });

module.exports = mongoose.model('DailyEggRecord', dailyEggRecordSchema);