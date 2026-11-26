const Customer = require('../models/Customer');
const LocalSale = require('../models/LocalSale');
const CustomerPayment = require('../models/CustomerPayment');
const logAudit = require('../utils/audit');
const { saleTotalEggs, saleSingleEggs, saleDoubleEggs } = require('../utils/helpers');

// GET /api/customers
const getCustomers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.active === 'false') filter.isActive = false;
    const { search } = req.query;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { mobile: new RegExp(search, 'i') },
        { area: new RegExp(search, 'i') },
      ];
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, customers });
  } catch (err) {
    next(err);
  }
};

// POST /api/customers
const createCustomer = async (req, res, next) => {
  try {
    const { name, mobile = '', address = '', area = '', customerType = 'Regular Customer', defaultPrice = 0, notes = '' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Customer name is required.' });
    if (Number(defaultPrice) < 0) return res.status(400).json({ success: false, message: 'Default price cannot be negative.' });
    const customer = await Customer.create({ name, mobile, address, area, customerType, defaultPrice, notes });
    await logAudit(req, { action: 'CREATE', recordType: 'Customer', recordId: customer._id, newValue: { name, mobile, area } });
    res.status(201).json({ success: true, customer });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id
const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, customer });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id/ledger
const getCustomerLedger = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const [sales, payments] = await Promise.all([
      LocalSale.find({ customer: customer._id, isActive: true }).sort({ date: -1, createdAt: -1 }),
      CustomerPayment.find({ customer: customer._id, isActive: true })
        .sort({ paymentDate: -1, createdAt: -1 })
        .populate('sale', 'totalAmount date'),
    ]);

    const totals = sales.reduce(
      (acc, s) => {
        acc.eggs += saleTotalEggs(s);
        acc.singleEggs += saleSingleEggs(s);
        acc.doubleEggs += saleDoubleEggs(s);
        acc.amount += s.totalAmount;
        acc.paid += s.paidAmount;
        acc.pending += s.pendingAmount;
        return acc;
      },
      { eggs: 0, singleEggs: 0, doubleEggs: 0, amount: 0, paid: 0, pending: 0 }
    );

    res.json({ success: true, customer, sales, payments, totals });
  } catch (err) {
    next(err);
  }
};

// PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    const old = customer.toObject();
    const fields = ['name', 'mobile', 'address', 'area', 'customerType', 'defaultPrice', 'notes', 'isActive'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) customer[f] = req.body[f];
    });
    if (Number(customer.defaultPrice) < 0) return res.status(400).json({ success: false, message: 'Default price cannot be negative.' });
    await customer.save();
    await logAudit(req, { action: 'UPDATE', recordType: 'Customer', recordId: customer._id, oldValue: old, newValue: req.body });
    res.json({ success: true, customer });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/customers/:id
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    const old = customer.toObject();
    customer.isActive = false;
    await customer.save();
    await logAudit(req, { action: 'DELETE', recordType: 'Customer', recordId: customer._id, oldValue: old });
    res.json({ success: true, message: 'Customer deactivated.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCustomers, createCustomer, getCustomer, getCustomerLedger, updateCustomer, deleteCustomer };