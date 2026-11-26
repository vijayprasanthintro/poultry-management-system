const WholesaleSale = require('../models/WholesaleSale');
const { getDateRange, round2, startOfDay, endOfDay, parseDate, parseNonNegativeInteger, parseAmount, escapeRegex, createError } = require('../utils/helpers');
const { getAvailableEggs, getBrokenAvailable, refreshEggStockFrom } = require('../services/eggStockService');
const logAudit = require('../utils/audit');

// GET /api/wholesale-sales  (query: range, eggClass, buyer, search)
const getWholesaleSales = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const filter = { date: { $gte: start, $lte: end }, isActive: true };
    if (req.query.eggClass) filter.eggClass = req.query.eggClass;
    if (req.query.buyer) filter.buyer = new RegExp(escapeRegex(req.query.buyer), 'i');
    if (req.query.search) filter.buyer = new RegExp(escapeRegex(req.query.search), 'i');

    const sales = await WholesaleSale.find(filter).sort({ date: -1, createdAt: -1 });

    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let goodQty = 0;
    let brokenQty = 0;
    let count = 0;
    const buyers = new Set();

    sales.forEach((s) => {
      totalAmount += s.totalAmount;
      paidAmount += s.paidAmount;
      pendingAmount += s.pendingAmount;
      count += 1;
      buyers.add(String(s.buyer));
      if (s.eggClass === 'Broken') brokenQty += s.eggQuantity;
      else goodQty += s.eggQuantity;
    });

    res.json({
      success: true,
      sales,
      summary: {
        count,
        totalAmount: round2(totalAmount),
        paidAmount: round2(paidAmount),
        pendingAmount: round2(pendingAmount),
        goodQty,
        brokenQty,
        buyers: buyers.size,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/wholesale-sales/today — broken eggs sold + revenue for "today"
const getWholesaleToday = async (req, res, next) => {
  try {
    const dayStart = startOfDay(new Date());
    const dayEnd = endOfDay(new Date());
    const today = await WholesaleSale.find({
      date: { $gte: dayStart, $lte: dayEnd },
      isActive: true,
    });
    const brokenQty = today
      .filter((s) => s.eggClass === 'Broken')
      .reduce((sum, s) => sum + s.eggQuantity, 0);
    const goodQty = today
      .filter((s) => s.eggClass === 'Good')
      .reduce((sum, s) => sum + s.eggQuantity, 0);
    const revenue = today.reduce((sum, s) => sum + s.totalAmount, 0);
    const received = today.reduce((sum, s) => sum + s.paidAmount, 0);
    const broken = await getBrokenAvailable(new Date());
    res.json({
      success: true,
      today: {
        brokenQty,
        goodQty,
        soldCount: today.length,
        revenue: round2(revenue),
        received: round2(received),
        pending: round2(revenue - received),
        producedBroken: broken.producedBroken,
        soldBroken: broken.soldBroken,
        brokenAvailable: broken.available,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/wholesale-sales/broken-available?date=YYYY-MM-DD
const getBrokenStock = async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const result = await getBrokenAvailable(date);
    res.json({ success: true, ...result, date: req.query.date || null });
  } catch (err) {
    next(err);
  }
};

// POST /api/wholesale-sales
const createWholesaleSale = async (req, res, next) => {
  try {
    const {
      date = new Date(),
      buyer,
      eggClass = 'Good',
      eggQuantity,
      pricePerEgg,
      paidAmount = 0,
      paymentStatus = 'PENDING',
      paymentMethod = '',
      notes = '',
    } = req.body;

    if (!buyer || !String(buyer).trim()) {
      return res.status(400).json({ success: false, message: 'Enter the buyer/feeder name.' });
    }
    if (!['Good', 'Broken'].includes(eggClass)) {
      return res.status(400).json({ success: false, message: 'Egg class must be Good or Broken.' });
    }

    const qty = parseNonNegativeInteger(eggQuantity, 'Egg quantity', 0, false);
    const price = parseAmount(pricePerEgg, 'Price per egg');
    const totalAmount = round2(qty * price);
    const paid = Math.min(parseAmount(paidAmount, 'Paid amount'), totalAmount);

    const saleDate = parseDate(date);
    if (eggClass === 'Good') {
      const available = await getAvailableEggs(saleDate);
      if (qty > available) {
        return res.status(400).json({
          success: false,
          message: `INSUFFICIENT EGG STOCK. Available (good eggs): ${available}. Requested: ${qty}.`,
        });
      }
    } else {
      const broken = await getBrokenAvailable(saleDate);
      if (qty > broken.available) {
        return res.status(400).json({
          success: false,
          message: `INSUFFICIENT BROKEN EGGS. Broken produced: ${broken.producedBroken}. Already sold: ${broken.soldBroken}. Available: ${broken.available}. Requested: ${qty}.`,
        });
      }
    }

    let status = paymentStatus;
    if (paid >= totalAmount && totalAmount > 0) status = 'PAID';
    else if (paid > 0) status = 'PARTIAL';
    const pendingAmount = round2(Math.max(0, totalAmount - paid));

    const sale = await WholesaleSale.create({
      date,
      buyer: buyer.trim(),
      eggClass,
      eggQuantity: qty,
      pricePerEgg: price,
      totalAmount,
      paidAmount: round2(paid),
      pendingAmount,
      paymentStatus: status,
      paymentMethod,
      notes,
    });

    await refreshEggStockFrom(saleDate);

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'WholesaleSale',
      recordId: sale._id,
      newValue: { date, buyer: sale.buyer, eggClass: sale.eggClass, qty, totalAmount, paid, pendingAmount },
    });
    res.status(201).json({ success: true, sale });
  } catch (err) {
    next(err);
  }
};

// PUT /api/wholesale-sales/:id
const updateWholesaleSale = async (req, res, next) => {
  try {
    const sale = await WholesaleSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Wholesale sale not found.' });
    const oldValue = sale.toObject();
    const { buyer, eggClass, eggQuantity, pricePerEgg, paidAmount, paymentStatus, paymentMethod, date, notes } = req.body;

    if (buyer !== undefined) {
      if (!String(buyer).trim()) return res.status(400).json({ success: false, message: 'Enter the buyer/feeder name.' });
      sale.buyer = String(buyer).trim();
    }
    if (eggClass !== undefined) {
      if (!['Good', 'Broken'].includes(eggClass)) {
        return res.status(400).json({ success: false, message: 'Egg class must be Good or Broken.' });
      }
      sale.eggClass = eggClass;
    }
    if (eggQuantity !== undefined) sale.eggQuantity = parseNonNegativeInteger(eggQuantity, 'Egg quantity', 0, false);
    if (pricePerEgg !== undefined) sale.pricePerEgg = parseAmount(pricePerEgg, 'Price per egg');
    const nextDate = date !== undefined ? parseDate(date) : sale.date;
    sale.date = nextDate;

    sale.totalAmount = round2(sale.eggQuantity * sale.pricePerEgg);
    const paid = paidAmount !== undefined ? parseAmount(paidAmount, 'Paid amount') : sale.paidAmount;
    sale.paidAmount = Math.min(round2(paid), sale.totalAmount);
    sale.pendingAmount = round2(Math.max(0, sale.totalAmount - sale.paidAmount));
    let status = paymentStatus !== undefined ? paymentStatus : sale.paymentStatus;
    if (sale.paidAmount >= sale.totalAmount && sale.totalAmount > 0) status = 'PAID';
    else if (sale.paidAmount > 0) status = 'PARTIAL';
    sale.paymentStatus = status;
    if (paymentMethod !== undefined) sale.paymentMethod = paymentMethod;
    if (notes !== undefined) sale.notes = notes;

    // Re-validate egg availability against the updated values (excluding this sale).
    const saleDate = nextDate;
    if (sale.eggClass === 'Good') {
      const available = await getAvailableEggs(saleDate, null, sale._id);
      if (sale.eggQuantity > available) {
        return res.status(400).json({
          success: false,
          message: `INSUFFICIENT EGG STOCK. Available (good eggs): ${available}. Requested: ${sale.eggQuantity}.`,
        });
      }
    } else {
      const broken = await getBrokenAvailable(saleDate, sale._id);
      if (sale.eggQuantity > broken.available) {
        return res.status(400).json({
          success: false,
          message: `INSUFFICIENT BROKEN EGGS. Broken produced: ${broken.producedBroken}. Already sold: ${broken.soldBroken}. Available: ${broken.available}. Requested: ${sale.eggQuantity}.`,
        });
      }
    }

    await sale.save();
    await refreshEggStockFrom(new Date(Math.min(oldValue.date.getTime(), saleDate.getTime())));
    await logAudit(req, {
      action: 'UPDATE',
      recordType: 'WholesaleSale',
      recordId: sale._id,
      oldValue,
      newValue: sale.toObject(),
    });
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/wholesale-sales/:id
const deleteWholesaleSale = async (req, res, next) => {
  try {
    const sale = await WholesaleSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Wholesale sale not found.' });
    const oldValue = sale.toObject();
    sale.isActive = false;
    await sale.save();
    await refreshEggStockForDate(new Date(sale.date));
    await logAudit(req, {
      action: 'DELETE',
      recordType: 'WholesaleSale',
      recordId: sale._id,
      oldValue,
    });
    res.json({ success: true, message: 'Wholesale sale deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWholesaleSales,
  getWholesaleToday,
  getBrokenStock,
  createWholesaleSale,
  updateWholesaleSale,
  deleteWholesaleSale,
};
