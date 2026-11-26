const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    area: { type: String, default: '', trim: true },
    customerType: {
      type: String,
      enum: ['Household', 'Shop', 'Hotel', 'Restaurant', 'Bakery', 'Regular Customer', 'Other'],
      default: 'Household',
    },
    defaultPrice: { type: Number, min: 0, default: 0 },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', mobile: 'text', area: 'text' });

module.exports = mongoose.model('Customer', customerSchema);