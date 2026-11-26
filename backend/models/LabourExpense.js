const mongoose = require('mongoose');

const labourExpenseSchema = new mongoose.Schema(
  {
    labour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Labour',
      required: true,
    },
    category: {
      type: String,
      enum: ['Food', 'Market', 'Travel', 'Bus', 'Medicine', 'Other'],
      required: true,
      default: 'Other',
    },
    purpose: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: '' },
    source: { type: String, enum: ['individual', 'common'], default: 'individual' },
    commonGroup: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

labourExpenseSchema.index({ labour: 1, date: -1 });
labourExpenseSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('LabourExpense', labourExpenseSchema);