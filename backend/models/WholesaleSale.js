const mongoose = require('mongoose');

const wholesaleSaleSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    buyer: { type: String, required: true, trim: true },
    // eggClass distinguishes good (sellable) eggs from broken/rejected ones sold cheaply.
    eggClass: { type: String, enum: ['Good', 'Broken'], required: true, default: 'Good' },
    eggQuantity: { type: Number, required: true, min: 1 },
    pricePerEgg: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, min: 0, default: 0 },
    pendingAmount: { type: Number, min: 0, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PARTIAL', 'PENDING', 'UNPAID'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Cheque', 'Other', ''],
      default: '',
    },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

wholesaleSaleSchema.index({ date: -1 });
wholesaleSaleSchema.index({ eggClass: 1, date: -1 });

module.exports = mongoose.model('WholesaleSale', wholesaleSaleSchema);
