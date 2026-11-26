const EggStock = require('../models/EggStock');
const logAudit = require('../utils/audit');
const {
  getStockRecordForDate,
  getAvailableEggs,
  getOpeningStock,
  computePartsForDate,
  refreshEggStockForDate,
  refreshEggStockFrom,
} = require('../services/eggStockService');
const { startOfDay, getDateRange, parseDate } = require('../utils/helpers');

// GET /api/egg-stock  (query: from, to, range) — daily stock records
const getEggStock = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const records = await EggStock.find({ date: { $gte: start, $lte: end }, isActive: true }).sort({ date: 1 });
    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
};

// GET /api/egg-stock/latest — current stock snapshot
const getLatestStock = async (req, res, next) => {
  try {
    const latest = await EggStock.findOne({ isActive: true }).sort({ date: -1 });
    const available = await getAvailableEggs(new Date());
    res.json({
      success: true,
      stock: latest,
      availableToday: Math.max(0, available),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/egg-stock/adjust  (body: date, amount, reason)
const adjustStock = async (req, res, next) => {
  try {
    const { date = new Date(), amount, reason } = req.body;
    const adjustment = Number(amount);
    if (!Number.isFinite(adjustment) || !Number.isInteger(adjustment) || adjustment === 0) {
      return res.status(400).json({ success: false, message: 'Adjustment amount must be a non-zero whole number.' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'An adjustment reason is required.' });
    }

    const dayStart = startOfDay(parseDate(date));
    let previousAdjustments = 0;
    const existing = await getStockRecordForDate(dayStart);
    if (existing) {
      previousAdjustments = existing.adjustments || 0;
    } else {
      await refreshEggStockForDate(dayStart);
    }
    const rec = await getStockRecordForDate(dayStart);
    const nextAdjustments = Math.round(previousAdjustments + adjustment);
    const [parts, openingStock] = await Promise.all([computePartsForDate(dayStart), getOpeningStock(dayStart)]);
    const projectedClosing = openingStock + parts.production + nextAdjustments - parts.sold;
    if (projectedClosing < 0) {
      return res.status(400).json({
        success: false,
        message: `Adjustment would make closing stock negative. Maximum available adjustment: ${Math.round(parts.sold + previousAdjustments - openingStock - parts.production)}.`,
      });
    }

    rec.adjustments = nextAdjustments;
    rec.adjustmentReason = String(reason).trim();
    await rec.save();

    const refreshed = await refreshEggStockFrom(dayStart);

    await logAudit(req, {
      action: 'STOCK_ADJUST',
      recordType: 'EggStock',
      recordId: refreshed._id,
      oldValue: { adjustments: previousAdjustments },
      newValue: { adjustments: rec.adjustments, reason },
    });
    res.json({ success: true, stock: refreshed });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEggStock, getLatestStock, adjustStock };