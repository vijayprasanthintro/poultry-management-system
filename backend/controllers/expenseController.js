const Expense = require('../models/Expense');
const logAudit = require('../utils/audit');
const { startOfDay, endOfDay, getDateRange } = require('../utils/helpers');

// GET /api/expenses
const getExpenses = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const filter = { isActive: true, date: { $gte: start, $lte: end } };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.set) filter.set = req.query.set;
    if (req.query.search) {
      filter.description = new RegExp(req.query.search, 'i');
    }
    const expenses = await Expense.find(filter)
      .populate('set', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json({ success: true, expenses });
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses
const createExpense = async (req, res, next) => {
  try {
    const { date = new Date(), category, description = '', amount, set = null, supplier = '', notes = '' } = req.body;
    if (!category) return res.status(400).json({ success: false, message: 'Expense category is required.' });
    if (amount == null || Number(amount) < 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be non-negative.' });
    }
    if (Number(amount) === 0) {
      return res.status(400).json({ success: false, message: 'Expense amount cannot be zero.' });
    }
    const expense = await Expense.create({
      date,
      category,
      description,
      amount: Number(amount),
      set: set || null,
      supplier: supplier || '',
      notes: notes || '',
    });
    await logAudit(req, { action: 'CREATE', recordType: 'Expense', recordId: expense._id, newValue: { category, amount: expense.amount } });
    res.status(201).json({ success: true, expense });
  } catch (err) {
    next(err);
  }
};

// PUT /api/expenses/:id
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    const old = expense.toObject();
    const fields = ['date', 'category', 'description', 'set', 'supplier', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) expense[f] = req.body[f];
    });
    if (req.body.amount !== undefined) {
      if (Number(req.body.amount) < 0) return res.status(400).json({ success: false, message: 'Amount cannot be negative.' });
      expense.amount = Number(req.body.amount);
    }
    await expense.save();
    await logAudit(req, { action: 'UPDATE', recordType: 'Expense', recordId: expense._id, oldValue: old, newValue: req.body });
    res.json({ success: true, expense });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    const old = expense.toObject();
    expense.isActive = false;
    await expense.save();
    await logAudit(req, { action: 'DELETE', recordType: 'Expense', recordId: expense._id, oldValue: old });
    res.json({ success: true, message: 'Expense deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense };