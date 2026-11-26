const mongoose = require('mongoose');

const customerPaymentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'LocalSale', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Cheque', 'Other'],
      default: 'Cash',
    },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerPaymentSchema.index({ customer: 1, paymentDate: -1 });
customerPaymentSchema.index({ sale: 1 });

module.exports = mongoose.model('CustomerPayment', customerPaymentSchema);