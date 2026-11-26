const LocalSale = require('../models/LocalSale');
const Customer = require('../models/Customer');
const PoultrySet = require('../models/PoultrySet');
const { getAvailableEggs, refreshEggStockFrom } = require('../services/eggStockService');
const { getDateRange, saleTotalEggs, parseDate, parseAmount } = require('../utils/helpers');
const { isValidObjectId } = require('mongoose');
const logAudit = require('../utils/audit');

/** Resolve the single/double egg quantity + price breakdown for a create/update payload. */
function resolveSaleInput(body) {
  const hasSplit =
    body.singleEggQuantity != null ||
    body.doubleEggQuantity != null ||
    body.singleEggPrice != null ||
    body.doubleEggPrice != null;
  const singleQty = body.singleEggQuantity != null ? Number(body.singleEggQuantity) || 0 : null;
  const dblQty = body.doubleEggQuantity != null ? Number(body.doubleEggQuantity) || 0 : null;
  const singlePrice = body.singleEggPrice != null ? Number(body.singleEggPrice) || 0 : null;
  const dblPrice = body.doubleEggPrice != null ? Number(body.doubleEggPrice) || 0 : null;

  if (!hasSplit) {
    const qty = Number(body.eggQuantity) || 0;
    const price = Number(body.pricePerEgg) || 0;
    return {
      split: false,
      singleQty: qty,
      dblQty: 0,
      singlePrice: price,
      dblPrice: 0,
      totalQty: qty,
      totalAmount: Math.round(qty * price * 100) / 100,
    };
  }

  const singleQ = singleQty != null ? singleQty : 0;
  const dblQ = dblQty != null ? dblQty : 0;
  const singleP = singlePrice != null ? singlePrice : 0;
  const dblP = dblPrice != null ? dblPrice : 0;
  return {
    split: true,
    singleQty: singleQ,
    dblQty: dblQ,
    singlePrice: singleP,
    dblPrice: dblP,
    totalQty: singleQ + dblQ,
    totalAmount: Math.round((singleQ * singleP + dblQ * dblP) * 100) / 100,
  };
}

const getSales = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const filter = { isActive: true, date: { $gte: start, $lte: end } };
    if (req.query.customer) filter.customer = req.query.customer;
    if (req.query.set) filter.set = req.query.set;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.method) filter.paymentMethod = req.query.method;
    const sales = await LocalSale.find(filter)
      .populate('customer', 'name mobile area')
      .populate('set', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json({ success: true, sales });
  } catch (err) {
    next(err);
  }
};

// POST /api/local-sales
const createSale = async (req, res, next) => {
  try {
    const {
      date = new Date(), customer, set,
      paidAmount = 0, paymentStatus: pStatus, paymentMethod = '', notes = '',
    } = req.body;

    if (!customer || !isValidObjectId(customer)) {
      return res.status(400).json({ success: false, message: 'A valid customer is required.' });
    }
    const saleDate = parseDate(date);
    const priceFields = ['pricePerEgg', 'singleEggPrice', 'doubleEggPrice'];
    if (priceFields.some((f) => req.body[f] !== undefined && !Number.isFinite(Number(req.body[f])))) {
      return res.status(400).json({ success: false, message: 'Enter a valid price per egg.' });
    }

    const input = resolveSaleInput(req.body);
    if (input.totalQty <= 0) {
      return res.status(400).json({ success: false, message: 'Egg quantity must be greater than 0.' });
    }
    if (input.split) {
      if (input.singleQty < 0 || input.dblQty < 0 || input.singlePrice < 0 || input.dblPrice < 0) {
        return res.status(400).json({ success: false, message: 'Egg quantities and prices cannot be negative.' });
      }
    } else if (input.singlePrice < 0) {
      return res.status(400).json({ success: false, message: 'Price per egg cannot be negative.' });
    }
    const paidRequested = parseAmount(paidAmount, 'Paid amount');

    // Stock guard (physical sellable eggs available).
    const available = await getAvailableEggs(saleDate);
    if (input.totalQty > available) {
      return res.status(400).json({
        success: false,
        message: `INSUFFICIENT EGG STOCK. Available: ${available}. Requested: ${input.totalQty}.`,
      });
    }

    const cust = await Customer.findById(customer);
    if (!cust) return res.status(400).json({ success: false, message: 'Customer not found.' });
    if (set) {
      if (!isValidObjectId(set)) return res.status(400).json({ success: false, message: 'Invalid poultry set.' });
      const poultrySet = await PoultrySet.findById(set);
      if (!poultrySet) return res.status(400).json({ success: false, message: 'Poultry set not found.' });
    }

    const totalAmount = input.totalAmount;
    const paidAmt = Math.min(paidRequested, totalAmount);
    const pendingAmount = totalAmount - paidAmt;
    let status = pStatus;
    if (!status) {
      if (paidAmt >= totalAmount) status = 'PAID';
      else if (paidAmt > 0) status = 'PARTIAL';
      else status = 'PENDING';
    }

    const sale = await LocalSale.create({
      date: saleDate,
      customer,
      set: set || null,
      singleEggQuantity: input.singleQty,
      doubleEggQuantity: input.dblQty,
      singleEggPrice: input.singlePrice,
      doubleEggPrice: input.dblPrice,
      eggQuantity: input.totalQty,
      pricePerEgg: input.totalQty > 0 ? Math.round((input.totalAmount / input.totalQty) * 100) / 100 : 0,
      totalAmount,
      paidAmount: paidAmt,
      pendingAmount,
      paymentStatus: status,
      paymentMethod,
      notes: notes || '',
    });

    await refreshEggStockFrom(saleDate);

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'LocalSale',
      recordId: sale._id,
      newValue: {
        customer: cust.name,
        singleEggQuantity: input.singleQty,
        doubleEggQuantity: input.dblQty,
        totalEggQuantity: input.totalQty,
        singleEggPrice: input.singlePrice,
        doubleEggPrice: input.dblPrice,
        totalAmount,
        paidAmount: paidAmt,
        pendingAmount,
      },
    });
    res.status(201).json({ success: true, sale });
  } catch (err) {
    next(err);
  }
};

// GET /api/local-sales/:id
const getSale = async (req, res, next) => {
  try {
    const sale = await LocalSale.findById(req.params.id)
      .populate('customer', 'name mobile area')
      .populate('set', 'name');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
};

// PUT /api/local-sales/:id
const updateSale = async (req, res, next) => {
  try {
    const sale = await LocalSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });

    const old = sale.toObject();
    const nextDate = req.body.date !== undefined ? parseDate(req.body.date) : sale.date;
    const touchQty = ['eggQuantity', 'singleEggQuantity', 'doubleEggQuantity'].some((k) => req.body[k] !== undefined);
    const touchPrice = ['pricePerEgg', 'singleEggPrice', 'doubleEggPrice'].some((k) => req.body[k] !== undefined);
    const dateChanged = nextDate.getTime() !== sale.date.getTime();
    const priceFields = ['pricePerEgg', 'singleEggPrice', 'doubleEggPrice'];
    if (priceFields.some((f) => req.body[f] !== undefined && !Number.isFinite(Number(req.body[f])))) {
      return res.status(400).json({ success: false, message: 'Enter a valid price per egg.' });
    }

    const next = { ...sale.toObject(), ...req.body };
    const input = resolveSaleInput(next);

    // Stock must be rechecked when quantity OR sale date changes. The current
    // sale is excluded from availability, so adding its quantity back would
    // allow overselling.
    if (touchQty || touchPrice || dateChanged) {
      if (input.totalQty <= 0) {
        return res.status(400).json({ success: false, message: 'Egg quantity must be greater than 0.' });
      }
      if (input.singleQty < 0 || input.dblQty < 0 || input.singlePrice < 0 || input.dblPrice < 0) {
        return res.status(400).json({ success: false, message: 'Egg quantities and prices cannot be negative.' });
      }
      const available = await getAvailableEggs(nextDate, sale._id);
      if (input.totalQty > available) {
        return res.status(400).json({
          success: false,
          message: `INSUFFICIENT EGG STOCK. Available: ${available}. Requested: ${input.totalQty}.`,
        });
      }
      sale.singleEggQuantity = input.singleQty;
      sale.doubleEggQuantity = input.dblQty;
      sale.singleEggPrice = input.singlePrice;
      sale.doubleEggPrice = input.dblPrice;
      sale.eggQuantity = input.totalQty;
      sale.totalAmount = input.totalAmount;
      sale.pricePerEgg = input.totalQty > 0 ? Math.round((input.totalAmount / input.totalQty) * 100) / 100 : 0;
    }

    if (req.body.customer !== undefined) {
      if (!isValidObjectId(req.body.customer)) return res.status(400).json({ success: false, message: 'Invalid customer.' });
      const customer = await Customer.findById(req.body.customer);
      if (!customer) return res.status(400).json({ success: false, message: 'Customer not found.' });
      sale.customer = req.body.customer;
    }
    if (req.body.set !== undefined) sale.set = req.body.set || null;
    sale.date = nextDate;
    if (req.body.paymentMethod !== undefined) sale.paymentMethod = req.body.paymentMethod;

    const paidRequested = req.body.paidAmount !== undefined
      ? parseAmount(req.body.paidAmount, 'Paid amount')
      : sale.paidAmount;
    sale.paidAmount = Math.min(paidRequested, sale.totalAmount);
    sale.pendingAmount = Math.max(0, Math.round((sale.totalAmount - sale.paidAmount) * 100) / 100);

    // Re-derive payment status if not explicitly overridden.
    if (req.body.paymentStatus) {
      sale.paymentStatus = req.body.paymentStatus;
    } else {
      if (sale.paidAmount >= sale.totalAmount) sale.paymentStatus = 'PAID';
      else if (sale.paidAmount > 0) sale.paymentStatus = 'PARTIAL';
      else sale.paymentStatus = 'PENDING';
    }
    if (req.body.notes !== undefined) sale.notes = req.body.notes;

    await sale.save();
    await refreshEggStockFrom(new Date(Math.min(old.date.getTime(), sale.date.getTime())));

    await logAudit(req, {
      action: 'UPDATE',
      recordType: 'LocalSale',
      recordId: sale._id,
      oldValue: old,
      newValue: {
        singleEggQuantity: sale.singleEggQuantity,
        doubleEggQuantity: sale.doubleEggQuantity,
        singleEggPrice: sale.singleEggPrice,
        doubleEggPrice: sale.doubleEggPrice,
        totalEggQuantity: sale.eggQuantity,
        paidAmount: sale.paidAmount,
        pendingAmount: sale.pendingAmount,
        paymentStatus: sale.paymentStatus,
      },
    });
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/local-sales/:id
const deleteSale = async (req, res, next) => {
  try {
    const sale = await LocalSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
    const old = sale.toObject();
    sale.isActive = false;
    await sale.save();
    await refreshEggStockFrom(sale.date);
    await logAudit(req, { action: 'DELETE', recordType: 'LocalSale', recordId: sale._id, oldValue: old });
    res.json({ success: true, message: 'Sale deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSales, createSale, getSale, updateSale, deleteSale };