const CustomerPayment = require('../models/CustomerPayment');
const LocalSale = require('../models/LocalSale');
const Customer = require('../models/Customer');
const logAudit = require('../utils/audit');
const { getDateRange, parseDate, parseAmount } = require('../utils/helpers');
const { isValidObjectId } = require('mongoose');

// GET /api/customer-payments
const getPayments = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const filter = { isActive: true, paymentDate: { $gte: start, $lte: end } };
    if (req.query.customer) filter.customer = req.query.customer;
    const payments = await CustomerPayment.find(filter)
      .populate('customer', 'name mobile')
      .populate('sale', 'totalAmount date eggQuantity pricePerEgg')
      .sort({ paymentDate: -1, createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    next(err);
  }
};

// POST /api/customer-payments
const createPayment = async (req, res, next) => {
  try {
    const { customer, sale, amount, paymentDate = new Date(), paymentMethod = 'Cash', notes = '' } = req.body;
    if (!customer || !isValidObjectId(customer)) return res.status(400).json({ success: false, message: 'A valid customer is required.' });
    if (!sale || !isValidObjectId(sale)) return res.status(400).json({ success: false, message: 'A valid sale reference is required.' });
    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0.' });
    }
    const paid = parseAmount(amount, 'Payment amount', 0, 0.01);

    const saleDoc = await LocalSale.findOne({ _id: sale, isActive: true });
    if (!saleDoc) return res.status(400).json({ success: false, message: 'Sale record not found.' });
    if (String(saleDoc.customer) !== String(customer)) {
      return res.status(400).json({ success: false, message: 'This sale does not belong to the selected customer.' });
    }
    const parsedPaymentDate = parseDate(paymentDate);
    if (paid > saleDoc.pendingAmount + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${amount}) cannot exceed pending amount (₹${saleDoc.pendingAmount}).`,
      });
    }

    const payment = await CustomerPayment.create({
      customer,
      sale,
      amount: paid,
      paymentDate: parsedPaymentDate,
      paymentMethod,
      notes,
    });

    // Update the sale's paid and pending amounts.
    saleDoc.paidAmount = Math.round((saleDoc.paidAmount + paid) * 100) / 100;
    saleDoc.pendingAmount = Math.round((saleDoc.totalAmount - saleDoc.paidAmount) * 100) / 100;
    if (saleDoc.pendingAmount <= 0.005) {
      saleDoc.pendingAmount = 0;
      saleDoc.paymentStatus = 'PAID';
    } else if (saleDoc.paidAmount > 0) {
      saleDoc.paymentStatus = 'PARTIAL';
    }
    await saleDoc.save();

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'CustomerPayment',
      recordId: payment._id,
      newValue: { customer, sale, amount: paid },
    });
    res.status(201).json({ success: true, payment, updatedSale: saleDoc });
  } catch (err) {
    next(err);
  }
};

// PUT /api/customer-payments/:id
const updatePayment = async (req, res, next) => {
  try {
    const payment = await CustomerPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    const old = payment.toObject();

    // Reverse old payment on the sale, apply new amount.
    const saleDoc = await LocalSale.findById(payment.sale);
    if (!saleDoc) return res.status(400).json({ success: false, message: 'Linked sale not found.' });

    const oldAmount = payment.amount;
    if (req.body.amount !== undefined && (req.body.amount === null || req.body.amount === '')) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0.' });
    }
    const newAmount = req.body.amount !== undefined
      ? parseAmount(req.body.amount, 'Payment amount', 0, 0.01)
      : oldAmount;

    const maxAllowed = saleDoc.totalAmount - saleDoc.paidAmount + oldAmount;
    if (newAmount > maxAllowed) {
      return res.status(400).json({ success: false, message: `Payment amount (₹${newAmount}) cannot exceed pending amount (₹${maxAllowed}).` });
    }

    // Adjust the sale.
    saleDoc.paidAmount = Math.round((saleDoc.paidAmount - oldAmount + newAmount) * 100) / 100;
    saleDoc.pendingAmount = Math.round((saleDoc.totalAmount - saleDoc.paidAmount) * 100) / 100;
    if (saleDoc.pendingAmount <= 0.005) { saleDoc.pendingAmount = 0; saleDoc.paymentStatus = 'PAID'; }
    else if (saleDoc.paidAmount > 0) saleDoc.paymentStatus = 'PARTIAL';
    await saleDoc.save();

    if (req.body.amount !== undefined) payment.amount = newAmount;
    if (req.body.paymentDate !== undefined) payment.paymentDate = parseDate(req.body.paymentDate, 'payment date');
    if (req.body.paymentMethod !== undefined) payment.paymentMethod = req.body.paymentMethod;
    if (req.body.notes !== undefined) payment.notes = req.body.notes;
    await payment.save();

    await logAudit(req, { action: 'UPDATE', recordType: 'CustomerPayment', recordId: payment._id, oldValue: old, newValue: { amount: newAmount } });
    res.json({ success: true, payment, updatedSale: saleDoc });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPayments, createPayment, updatePayment };