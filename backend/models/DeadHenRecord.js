const mongoose = require('mongoose');

const deadHenRecordSchema = new mongoose.Schema(
  {
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'PoultrySet', required: true },
    date: { type: Date, required: true, default: Date.now },
    deadHens: { type: Number, required: true, min: 1 },
    reason: { type: String, default: '', trim: true },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

deadHenRecordSchema.index({ set: 1, date: -1 });

module.exports = mongoose.model('DeadHenRecord', deadHenRecordSchema);