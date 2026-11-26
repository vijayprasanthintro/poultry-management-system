const mongoose = require('mongoose');

const localSaleSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'PoultrySet', default: null },
    singleEggQuantity: { type: Number, min: 0, default: 0 },
    doubleEggQuantity: { type: Number, min: 0, default: 0 },
    singleEggPrice: { type: Number, min: 0, default: 0 },
    doubleEggPrice: { type: Number, min: 0, default: 0 },
    // Legacy single-value fields (kept for backward compatibility with older records)
    eggQuantity: { type: Number, required: true, min: 1 },
    pricePerEgg: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
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

localSaleSchema.index({ date: -1 });
localSaleSchema.index({ customer: 1, date: -1 });
localSaleSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('LocalSale', localSaleSchema);