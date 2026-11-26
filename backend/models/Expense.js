const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    category: {
      type: String,
      enum: [
        'Feed',
        'Medicine',
        'Vaccination',
        'Labour',
        'Electricity',
        'Transportation',
        'Maintenance',
        'Equipment',
        'Other',
      ],
      required: true,
      default: 'Other',
    },
    description: { type: String, default: '', trim: true },
    amount: { type: Number, required: true, min: 0 },
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'PoultrySet', default: null },
    supplier: { type: String, default: '', trim: true },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);