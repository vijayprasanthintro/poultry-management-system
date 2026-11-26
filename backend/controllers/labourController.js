const Labour = require('../models/Labour');
const LabourExpense = require('../models/LabourExpense');
const logAudit = require('../utils/audit');
const { getDateRange, startOfDay, round2 } = require('../utils/helpers');

// ---------- Labourers ----------

// GET /api/labours?active=&role=&search=
const getLabours = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.active === 'false') filter.isActive = false;
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) filter.name = new RegExp(req.query.search, 'i');

    const labours = await Labour.find(filter).sort({ isActive: -1, name: 1 });

    const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const groups = await LabourExpense.aggregate([
      { $match: { isActive: true, labour: { $in: labours.map((l) => l._id) } } },
      { $group: { _id: '$labour', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const monthGroups = await LabourExpense.aggregate([
      { $match: { isActive: true, date: { $gte: monthStart }, labour: { $in: labours.map((l) => l._id) } } },
      { $group: { _id: '$labour', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const totalByLabour = new Map(groups.map((g) => [String(g._id), g]));
    const monthByLabour = new Map(monthGroups.map((g) => [String(g._id), g]));

    const data = labours.map((l) => {
      const t = totalByLabour.get(String(l._id));
      const m = monthByLabour.get(String(l._id));
      return {
        ...l.toObject(),
        totalExpense: t ? round2(t.total) : 0,
        expenseCount: t ? t.count : 0,
        monthExpense: m ? round2(m.total) : 0,
      };
    });

    const summary = {
      total: data.length,
      active: labours.filter((l) => l.isActive).length,
      totalExpense: round2(data.reduce((s, l) => s + l.totalExpense, 0)),
      monthExpense: round2(data.reduce((s, l) => s + l.monthExpense, 0)),
    };

    res.json({ success: true, labours: data, summary });
  } catch (err) {
    next(err);
  }
};

// POST /api/labours
const createLabour = async (req, res, next) => {
  try {
    const { name, mobile = '', role = 'Worker', dailyWage = 0, hiredDate = null, notes = '' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Labourer name is required.' });
    if (Number(dailyWage) < 0) {
      return res.status(400).json({ success: false, message: 'Daily wage must be non-negative.' });
    }
    const labour = await Labour.create({
      name,
      mobile: mobile || '',
      role: role || 'Worker',
      dailyWage: Number(dailyWage) || 0,
      hiredDate: hiredDate || null,
      notes: notes || '',
    });
    await logAudit(req, { action: 'CREATE', recordType: 'Labour', recordId: labour._id, newValue: { name: labour.name, role: labour.role } });
    res.status(201).json({ success: true, labour });
  } catch (err) {
    next(err);
  }
};

// GET /api/labours/:id
const getLabour = async (req, res, next) => {
  try {
    const labour = await Labour.findById(req.params.id);
    if (!labour) return res.status(404).json({ success: false, message: 'Labourer not found.' });

    const { start, end, label } = getDateRange(req);
    const expenses = await LabourExpense.find({ labour: labour._id, isActive: true, date: { $gte: start, $lte: end } })
      .sort({ date: -1, createdAt: -1 });

    const byCategory = {};
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const ranges = await LabourExpense.aggregate([
      { $match: { labour: labour._id, isActive: true } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          month: {
            $sum: { $cond: [{ $gte: ['$date', monthStart] }, '$amount', 0] },
          },
        },
      },
    ]);
    const totals = ranges[0] || { total: 0, count: 0, month: 0 };

    res.json({
      success: true,
      labour,
      ledger: {
        expenses,
        totalExpense: round2(totals.total),
        monthExpense: round2(totals.month),
        expenseCount: totals.count,
        byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount: round2(amount) })),
        range: label,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/labours/:id
const updateLabour = async (req, res, next) => {
  try {
    const labour = await Labour.findById(req.params.id);
    if (!labour) return res.status(404).json({ success: false, message: 'Labourer not found.' });
    const old = labour.toObject();
    const fields = ['name', 'mobile', 'role', 'dailyWage', 'hiredDate', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) labour[f] = req.body[f];
    });
    if (req.body.dailyWage !== undefined && Number(req.body.dailyWage) < 0) {
      return res.status(400).json({ success: false, message: 'Daily wage must be non-negative.' });
    }
    await labour.save();
    await logAudit(req, { action: 'UPDATE', recordType: 'Labour', recordId: labour._id, oldValue: old, newValue: req.body });
    res.json({ success: true, labour });
  } catch (err) {
    next(err);
  }
};

// PUT /api/labours/:id/toggle
const toggleLabour = async (req, res, next) => {
  try {
    const labour = await Labour.findById(req.params.id);
    if (!labour) return res.status(404).json({ success: false, message: 'Labourer not found.' });
    const old = labour.toObject();
    labour.isActive = !labour.isActive;
    await labour.save();
    await logAudit(req, { action: 'UPDATE', recordType: 'Labour', recordId: labour._id, oldValue: old, newValue: { isActive: labour.isActive } });
    res.json({ success: true, labour });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/labours/:id  (soft delete; history preserved)
const deleteLabour = async (req, res, next) => {
  try {
    const labour = await Labour.findById(req.params.id);
    if (!labour) return res.status(404).json({ success: false, message: 'Labourer not found.' });
    const old = labour.toObject();
    labour.isActive = false;
    await labour.save();
    await logAudit(req, { action: 'DELETE', recordType: 'Labour', recordId: labour._id, oldValue: old });
    res.json({ success: true, message: 'Labourer removed.' });
  } catch (err) {
    next(err);
  }
};

// ---------- Labour expenses (ledger) ----------

// GET /api/labour-expenses?range=&labour=&category=&search=
const getLabourExpenses = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const filter = { isActive: true, date: { $gte: start, $lte: end } };
    if (req.query.labour) filter.labour = req.query.labour;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) filter.purpose = new RegExp(req.query.search, 'i');

    const expenses = await LabourExpense.find(filter)
      .populate('labour', 'name mobile role isActive')
      .sort({ date: -1, createdAt: -1 });

    let totalExpense = 0;
    const byCategory = {};
    expenses.forEach((e) => {
      totalExpense += e.amount;
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    res.json({
      success: true,
      expenses,
      summary: {
        totalExpense: round2(totalExpense),
        transactionCount: expenses.length,
        byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount: round2(amount) })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/labour-expenses
const createLabourExpense = async (req, res, next) => {
  try {
    const { labour, category, purpose, amount, date = new Date(), notes = '' } = req.body;
    if (!labour) return res.status(400).json({ success: false, message: 'Select a labourer.' });
    if (!purpose) return res.status(400).json({ success: false, message: 'Enter a purpose for the expense.' });
    if (amount == null || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Enter an amount greater than zero.' });
    }
    const exists = await Labour.findById(labour);
    if (!exists) return res.status(404).json({ success: false, message: 'Labourer not found.' });
    const expense = await LabourExpense.create({
      labour,
      category: category || 'Other',
      purpose,
      amount: Number(amount),
      date,
      notes: notes || '',
    });
    await logAudit(req, { action: 'CREATE', recordType: 'LabourExpense', recordId: expense._id, newValue: { labour, category, purpose, amount: expense.amount } });
    res.status(201).json({ success: true, expense });
  } catch (err) {
    next(err);
  }
};

// PUT /api/labour-expenses/:id
const updateLabourExpense = async (req, res, next) => {
  try {
    const expense = await LabourExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Labour expense not found.' });
    const old = expense.toObject();
    const fields = ['labour', 'category', 'purpose', 'date', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) expense[f] = req.body[f];
    });
    if (req.body.amount !== undefined) {
      if (Number(req.body.amount) <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
      expense.amount = Number(req.body.amount);
    }
    await expense.save();
    await logAudit(req, { action: 'UPDATE', recordType: 'LabourExpense', recordId: expense._id, oldValue: old, newValue: req.body });
    res.json({ success: true, expense });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/labour-expenses/:id
const deleteLabourExpense = async (req, res, next) => {
  try {
    const expense = await LabourExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Labour expense not found.' });
    const old = expense.toObject();
    expense.isActive = false;
    await expense.save();
    await logAudit(req, { action: 'DELETE', recordType: 'LabourExpense', recordId: expense._id, oldValue: old });
    res.json({ success: true, message: 'Labour expense deleted.' });
  } catch (err) {
    next(err);
  }
};

const LABOUR_EXPENSE_CATEGORIES = ['Food', 'Market', 'Travel', 'Bus', 'Medicine', 'Other'];

// POST /api/labour-expenses/common
// Splits one shared expense equally across all active labourers (or a chosen subset).
const createCommonLabourExpense = async (req, res, next) => {
  try {
    const { total, category, purpose, date = new Date(), notes = '', labours } = req.body;
    if (!purpose) return res.status(400).json({ success: false, message: 'Enter a purpose for the expense.' });
    if (total == null || Number(total) <= 0) {
      return res.status(400).json({ success: false, message: 'Enter an amount greater than zero.' });
    }
    const categoryVal = LABOUR_EXPENSE_CATEGORIES.includes(category) ? category : 'Other';

    let participants;
    if (Array.isArray(labours) && labours.length) {
      participants = await Labour.find({ _id: { $in: labours }, isActive: true });
    } else {
      participants = await Labour.find({ isActive: true });
    }
    if (!participants.length) {
      return res.status(400).json({ success: false, message: 'No active labourers to split the expense across.' });
    }

    // Cent-safe equal split so all shares always sum to the original total.
    const value = Number(total);
    const cents = Math.round(value * 100);
    const n = participants.length;
    const base = Math.floor(cents / n);
    let remainder = cents - base * n;

    const commonGroup = `cg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expenseDocs = participants.map((labour, i) => ({
      labour: labour._id,
      category: categoryVal,
      purpose,
      amount: i < remainder ? (base + 1) / 100 : base / 100,
      date,
      notes: notes || '',
      source: 'common',
      commonGroup,
    }));
    await LabourExpense.insertMany(expenseDocs);
    const created = await LabourExpense.find({ commonGroup })
      .populate('labour', 'name mobile role isActive')
      .sort({ 'labour.name': 1 });

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'LabourExpense',
      recordId: commonGroup,
      newValue: { total: value, category: categoryVal, purpose, count: n, sharePerHead: round2(value / n) },
    });
    res.status(201).json({
      success: true,
      message: `Common expense split across ${n} labourers.`,
      expenses: created,
      total: value,
      count: n,
      sharePerHead: round2(value / n),
      commonGroup,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/labour-expenses/common/:group
const deleteCommonLabourExpense = async (req, res, next) => {
  try {
    const group = req.params.group;
    const result = await LabourExpense.updateMany(
      { commonGroup: group, isActive: true },
      { $set: { isActive: false } }
    );
    await logAudit(req, {
      action: 'DELETE',
      recordType: 'LabourExpense',
      recordId: group,
      oldValue: { commonGroup: group, removed: result.modifiedCount },
    });
    res.json({ success: true, message: `Common expense removed from ${result.modifiedCount} labourers.` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLabours,
  createLabour,
  getLabour,
  updateLabour,
  toggleLabour,
  deleteLabour,
  getLabourExpenses,
  createLabourExpense,
  updateLabourExpense,
  deleteLabourExpense,
  createCommonLabourExpense,
  deleteCommonLabourExpense,
};