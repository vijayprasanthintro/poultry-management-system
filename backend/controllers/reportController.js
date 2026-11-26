const LocalSale = require('../models/LocalSale');
const WholesaleSale = require('../models/WholesaleSale');
const CustomerPayment = require('../models/CustomerPayment');
const LabourExpense = require('../models/LabourExpense');
const DailyEggRecord = require('../models/DailyEggRecord');
const EggStock = require('../models/EggStock');
const Expense = require('../models/Expense');
const FeedUsage = require('../models/FeedUsage');
const BirdRecord = require('../models/BirdRecord');
const EggPrice = require('../models/EggPrice');
const { computeDashboard } = require('./dashboardController');
const { getDateRange, round2, toDateKey } = require('../utils/helpers');
const {
  recordSingleEggs,
  recordDoubleEggs,
  saleTotalEggs,
  saleSingleEggs,
  saleDoubleEggs,
  recordTotalEggs,
} = require('../utils/helpers');

// GET /api/reports/summary
const getReportSummary = async (req, res, next) => {
  try {
    const data = await computeDashboard(req);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/data?type=production|sales|feedUsage|feedCost|expenses|revenue|profit|stock|birds|prices|customerPayments
const getReportData = async (req, res, next) => {
  try {
    // Accept both the old UI name and the canonical model name.
    const type = req.query.type === 'payments' ? 'customerPayments' : req.query.type || 'production';
    const { start, end } = getDateRange(req);
    const setFilter = req.query.set ? { set: req.query.set } : {};

    if (type === 'production') {
      const records = await DailyEggRecord.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter })
        .populate('set', 'name')
        .sort({ date: 1 });
      res.json({ success: true, rows: records });
    } else if (type === 'sales') {
      const rows = await LocalSale.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter })
        .populate('customer', 'name mobile area')
        .populate('set', 'name')
        .sort({ date: 1 });
      const wholesaleRows = await WholesaleSale.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter })
        .populate('set', 'name')
        .sort({ date: 1 });
      const summary = rows.reduce(
        (a, s) => {
          a.customers.add(String(s.customer._id));
          a.eggs += saleTotalEggs(s);
          a.singleEggs += saleSingleEggs(s);
          a.doubleEggs += saleDoubleEggs(s);
          a.revenue += s.totalAmount;
          a.received += s.paidAmount;
          a.pending += s.pendingAmount;
          a.avgPrice = a.eggs > 0 ? (a.revenue / a.eggs) : 0;
          return a;
        },
        { customers: new Set(), eggs: 0, singleEggs: 0, doubleEggs: 0, revenue: 0, received: 0, pending: 0, avgPrice: 0 }
      );
      const wholesaleSummary = wholesaleRows.reduce(
        (a, s) => {
          a.eggs += Number(s.goodEggs || 0) + Number(s.brokenEggs || 0);
          a.revenue += Number(s.totalAmount || 0);
          a.received += Number(s.paidAmount || 0);
          a.pending += Number(s.pendingAmount || 0);
          return a;
        },
        { eggs: 0, revenue: 0, received: 0, pending: 0 }
      );
      const totalEggs = summary.eggs + wholesaleSummary.eggs;
      res.json({
        success: true,
        rows: [...rows, ...wholesaleRows],
        summary: {
          customerCount: summary.customers.size,
          eggsSold: totalEggs,
          singleEggs: summary.singleEggs,
          doubleEggs: summary.doubleEggs,
          localEggs: summary.eggs,
          wholesaleEggs: wholesaleSummary.eggs,
          totalRevenue: round2(summary.revenue + wholesaleSummary.revenue),
          localRevenue: round2(summary.revenue),
          wholesaleRevenue: round2(wholesaleSummary.revenue),
          amountReceived: round2(summary.received + wholesaleSummary.received),
          pendingAmount: round2(summary.pending + wholesaleSummary.pending),
          avgSellingPrice: totalEggs > 0 ? round2((summary.revenue + wholesaleSummary.revenue) / totalEggs) : 0,
        },
      });
    } else if (type === 'feedUsage') {
      const rows = await FeedUsage.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter })
        .populate('set', 'name')
        .sort({ date: 1 });
      const summary = rows.reduce(
        (a, u) => ({ used: a.used + Number(u.feedUsed || 0), cost: a.cost + Number(u.feedCost || 0) }),
        { used: 0, cost: 0 }
      );
      res.json({ success: true, rows, summary });
    } else if (type === 'expenses' || type === 'feedCost') {
      const rows = await Expense.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter })
        .populate('set', 'name')
        .sort({ date: 1 });
      const usages = await FeedUsage.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter });
      const labours = await LabourExpense.find({ date: { $gte: start, $lte: end }, isActive: true });
      const feedCost = usages.reduce((a, u) => a + Number(u.feedCost || 0), 0);
      const labourCost = labours.reduce((a, l) => a + Number(l.amount || 0), 0);
      const expenses = rows.reduce((a, e) => a + Number(e.amount || 0), 0);
      res.json({
        success: true,
        rows: [...rows, ...labours],
        summary: {
          expenses: round2(expenses),
          feedCost: round2(feedCost),
          labourCost: round2(labourCost),
          total: round2(expenses + feedCost + labourCost),
        },
      });
    } else if (type === 'revenue' || type === 'profit') {
      const data = await computeDashboard(req);
      res.json({ success: true, summary: data.cards });
    } else if (type === 'stock') {
      const rows = await EggStock.find({ date: { $gte: start, $lte: end }, isActive: true }).sort({ date: 1 });
      res.json({ success: true, rows });
    } else if (type === 'birds') {
      const rows = await BirdRecord.find({ date: { $gte: start, $lte: end }, isActive: true })
        .populate('set', 'name')
        .sort({ date: 1 });
      res.json({ success: true, rows });
    } else if (type === 'prices') {
      const rows = await EggPrice.find({ date: { $gte: start, $lte: end }, isActive: true }).sort({ date: 1 });
      const avg = rows.length
        ? round2(rows.reduce((a, r) => a + r.pricePerEgg, 0) / rows.length)
        : 0;
      res.json({ success: true, rows, summary: { avgPrice: avg, count: rows.length } });
    } else if (type === 'customerPayments') {
      const rows = await CustomerPayment.find({ paymentDate: { $gte: start, $lte: end }, isActive: true })
        .populate('customer', 'name mobile')
        .populate('sale', 'totalAmount')
        .sort({ paymentDate: 1 });
      const total = rows.reduce((a, p) => a + p.amount, 0);
      res.json({ success: true, rows, summary: { total: round2(total), count: rows.length } });
    } else {
      res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
    }
  } catch (err) {
    next(err);
  }
};

const csvEscape = (v) => {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const rowsToCsv = (headers, rows) => {
  const head = headers.join(',');
  const body = rows.map((r) =>
    headers.map((h) => csvEscape(r[h] != null ? r[h] : '')).join(',')
  );
  return [head, ...body].join('\r\n');
};

// GET /api/reports/export?type=...&from=&to=
const exportCsv = async (req, res, next) => {
  try {
    const type = req.query.type || 'production';
    const { start, end } = getDateRange(req);
    const setFilter = req.query.set ? { set: req.query.set } : {};
    let headers = [];
    let rows = [];
    const prefix = `${type}_${toDateKey(start)}_${toDateKey(end)}`;

    if (type === 'production') {
      headers = ['Date', 'Set', 'Hens', 'Single', 'Double', 'Total Eggs', 'Broken', 'Rejected', 'Sellable', 'Notes'];
      rows = await DailyEggRecord.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter })
        .populate('set', 'name');
      rows = rows.map((r) => ({
        Date: toDateKey(r.date),
        Set: r.set ? r.set.name : '',
        Hens: r.birds,
        Single: recordSingleEggs(r),
        Double: recordDoubleEggs(r),
        'Total Eggs': recordTotalEggs(r),
        Broken: r.brokenEggs,
        Rejected: r.rejectedEggs,
        Sellable: r.sellableEggs,
        Notes: r.notes,
      }));
    } else if (type === 'sales') {
      headers = ['Date', 'Customer', 'Mobile', 'Set', 'Single Qty', 'Double Qty', 'Eggs', 'Single Price', 'Double Price', 'Price/Egg', 'Total', 'Paid', 'Pending', 'Status', 'Method'];
      rows = await LocalSale.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter })
        .populate('customer', 'name mobile')
        .populate('set', 'name');
      rows = rows.map((s) => ({
        Date: toDateKey(s.date),
        Customer: s.customer ? s.customer.name : '',
        Mobile: s.customer ? s.customer.mobile : '',
        Set: s.set ? s.set.name : '',
        'Single Qty': saleSingleEggs(s),
        'Double Qty': saleDoubleEggs(s),
        Eggs: saleTotalEggs(s),
        'Single Price': s.singleEggPrice,
        'Double Price': s.doubleEggPrice,
        'Price/Egg': s.pricePerEgg,
        Total: s.totalAmount,
        Paid: s.paidAmount,
        Pending: s.pendingAmount,
        Status: s.paymentStatus,
        Method: s.paymentMethod,
      }));
    } else if (type === 'expenses') {
      headers = ['Date', 'Category', 'Description', 'Set', 'Amount', 'Supplier', 'Notes'];
      rows = await Expense.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter })
        .populate('set', 'name');
      rows = rows.map((e) => ({
        Date: toDateKey(e.date),
        Category: e.category,
        Description: e.description,
        Set: e.set ? e.set.name : '',
        Amount: e.amount,
        Supplier: e.supplier,
        Notes: e.notes,
      }));
    } else if (type === 'feedUsage') {
      headers = ['Date', 'Set', 'Feed', 'Start Kg', 'Added Kg', 'Used Kg', 'End Kg', 'Cost'];
      rows = await FeedUsage.find({ date: { $gte: start, $lte: end }, isActive: true, ...setFilter })
        .populate('set', 'name');
      rows = rows.map((u) => ({
        Date: toDateKey(u.date),
        Set: u.set ? u.set.name : '',
        Feed: u.feedName,
        'Start Kg': u.startingWeight,
        'Added Kg': u.feedAdded,
        'Used Kg': u.feedUsed,
        'End Kg': u.endingWeight,
        Cost: u.feedCost,
      }));
    } else if (type === 'stock') {
      headers = ['Date', 'Opening', 'Production', 'Sold', 'Broken', 'Rejected', 'Adjustments', 'Closing'];
      rows = await EggStock.find({ date: { $gte: start, $lte: end }, isActive: true });
      rows = rows.map((s) => ({
        Date: toDateKey(s.date),
        Opening: s.openingStock,
        Production: s.production,
        Sold: s.sold,
        Broken: s.broken,
        Rejected: s.rejected,
        Adjustments: s.adjustments,
        Closing: s.closingStock,
      }));
    } else if (type === 'customers') {
      headers = ['Name', 'Mobile', 'Area', 'Type', 'Total Eggs', 'Total Amount', 'Paid', 'Pending'];
      const allCustomers = await require('../models/Customer').find({ isActive: true });
      rows = await Promise.all(
        allCustomers.map(async (c) => {
          const sales = await LocalSale.find({ customer: c._id, isActive: true, date: { $gte: start, $lte: end } });
          return {
            Name: c.name,
            Mobile: c.mobile,
            Area: c.area,
            Type: c.customerType,
            'Total Eggs': sales.reduce((a, s) => a + saleTotalEggs(s), 0),
            'Total Amount': sales.reduce((a, s) => a + s.totalAmount, 0),
            Paid: sales.reduce((a, s) => a + s.paidAmount, 0),
            Pending: sales.reduce((a, s) => a + s.pendingAmount, 0),
          };
        })
      );
    } else {
      return res.status(400).json({ success: false, message: `No export for type: ${type}` });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${prefix}.csv"`);
    res.send('\uFEFF' + rowsToCsv(headers, rows));
  } catch (err) {
    next(err);
  }
};

module.exports = { getReportSummary, getReportData, exportCsv };