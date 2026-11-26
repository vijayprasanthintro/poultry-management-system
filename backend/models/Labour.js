const mongoose = require('mongoose');

const labourSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, default: '', trim: true },
    role: {
      type: String,
      enum: ['Worker', 'Supervisor', 'Driver', 'Cleaner', 'Other'],
      default: 'Worker',
    },
    dailyWage: { type: Number, default: 0, min: 0 },
    hiredDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

labourSchema.index({ name: 1 });

module.exports = mongoose.model('Labour', labourSchema);