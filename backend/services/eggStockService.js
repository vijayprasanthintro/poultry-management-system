/**
 * eggStockService.js
 * ------------------
 * Materializes one EggStock record per calendar day.
 *   closingStock = openingStock + production(broken+rejected removed) + adjustments - sold
 * openingStock comes from the previous day's closingStock.
 */
const EggStock = require('../models/EggStock');
const DailyEggRecord = require('../models/DailyEggRecord');
const LocalSale = require('../models/LocalSale');
const WholesaleSale = require('../models/WholesaleSale');
const { startOfDay, endOfDay, toDateKey } = require('../utils/helpers');
const {
  recordSellableEggs,
  recordTotalEggs,
  recordSingleEggs,
  recordDoubleEggs,
  saleTotalEggs,
  saleSingleEggs,
  saleDoubleEggs,
} = require('../utils/helpers');

async function computePartsForDate(date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const [eggRecords, sales, wholesale] = await Promise.all([
    DailyEggRecord.find({ date: { $gte: dayStart, $lte: dayEnd }, isActive: true }),
    LocalSale.find({ date: { $gte: dayStart, $lte: dayEnd }, isActive: true }),
    WholesaleSale.find({ date: { $gte: dayStart, $lte: dayEnd }, isActive: true }),
  ]);
  const production = eggRecords.reduce((s, e) => s + recordSellableEggs(e), 0);
  const raw = eggRecords.reduce((s, e) => s + recordTotalEggs(e), 0);
  const single = eggRecords.reduce((s, e) => s + recordSingleEggs(e), 0);
  const dbl = eggRecords.reduce((s, e) => s + recordDoubleEggs(e), 0);
  const broken = eggRecords.reduce((s, e) => s + e.brokenEggs, 0);
  const rejected = eggRecords.reduce((s, e) => s + e.rejectedEggs, 0);
  // Wholesale "Good" eggs are sellable and reduce available stock, broken/rejected are not.
  const soldLocal = sales.reduce((s, sl) => s + saleTotalEggs(sl), 0);
  const soldWholesaleGood = wholesale
    .filter((w) => w.eggClass === 'Good')
    .reduce((s, w) => s + w.eggQuantity, 0);
  const sold = soldLocal + soldWholesaleGood;
  const soldSingle = sales.reduce((s, sl) => s + saleSingleEggs(sl), 0);
  const soldDouble = sales.reduce((s, sl) => s + saleDoubleEggs(sl), 0);
  const soldBroken = wholesale
    .filter((w) => w.eggClass === 'Broken')
    .reduce((s, w) => s + w.eggQuantity, 0);
  return {
    production,
    raw,
    single,
    dbl,
    broken,
    rejected,
    sold,
    soldSingle,
    soldDouble,
    soldBroken,
    soldLocal,
    soldWholesaleGood,
    sales,
    wholesale,
  };
}

async function getOpeningStock(date) {
  const prev = await EggStock.findOne({ isActive: true, date: { $lt: startOfDay(date) } }).sort({ date: -1 });
  return prev ? prev.closingStock : 0;
}

async function getStockRecordForDate(date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  return EggStock.findOne({ date: { $gte: dayStart, $lte: dayEnd } });
}

/**
 * Available eggs for a date BEFORE creating/editing a sale.
 * opening + production + adjustments - sold (optionally excluding a given sale).
 * `sold` includes local sales + wholesale Good-egg sales.
 */
async function getAvailableEggs(date, excludeSaleId = null, excludeWholesaleSaleId = null) {
  const parts = await computePartsForDate(date);
  const openingStock = await getOpeningStock(date);
  const record = await getStockRecordForDate(date);
  const adjustments = record ? record.adjustments : 0;
  const soldLocal = parts.sales
    .filter((s) => !excludeSaleId || String(s._id) !== String(excludeSaleId))
    .reduce((sum, s) => sum + saleTotalEggs(s), 0);
  const soldWholesaleGood = parts.wholesale
    .filter((w) => w.eggClass === 'Good' && (!excludeWholesaleSaleId || String(w._id) !== String(excludeWholesaleSaleId)))
    .reduce((sum, w) => sum + w.eggQuantity, 0);
  return openingStock + parts.production + adjustments - (soldLocal + soldWholesaleGood);
}

/**
 * Broken eggs available for a date: produced (broken) minus broken eggs already
 * sold wholesale to feeders. Optionally ignores one wholesale sale (for edits).
 */
async function getBrokenAvailable(date, excludeWholesaleSaleId = null) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const [records, soldBrokenDocs] = await Promise.all([
    DailyEggRecord.find({ date: { $gte: dayStart, $lte: dayEnd }, isActive: true }),
    WholesaleSale.find({ date: { $gte: dayStart, $lte: dayEnd }, isActive: true, eggClass: 'Broken' }),
  ]);
  const producedBroken = records.reduce((s, e) => s + (Number(e.brokenEggs) || 0), 0);
  const soldBroken = soldBrokenDocs
    .filter((w) => !excludeWholesaleSaleId || String(w._id) !== String(excludeWholesaleSaleId))
    .reduce((s, w) => s + (Number(w.eggQuantity) || 0), 0);
  return {
    producedBroken,
    soldBroken,
    available: Math.max(0, producedBroken - soldBroken),
  };
}

/** Recompute and upsert the EggStock record for a date from live data. */
async function refreshEggStockForDate(date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const parts = await computePartsForDate(dayStart);
  const openingStock = await getOpeningStock(dayStart);
  const existing = await getStockRecordForDate(dayStart);
  const adjustments = existing ? existing.adjustments : 0;
  const adjustmentReason = existing ? existing.adjustmentReason || '' : '';
  const rawClosing = openingStock + parts.production + adjustments - parts.sold;
  if (rawClosing < 0) {
    console.warn(`[EGG STOCK] Negative stock prevented on ${toDateKey(dayStart)} (${rawClosing}); stored as 0.`);
  }
  const closingStock = Math.max(0, rawClosing);

  const record = await EggStock.findOneAndUpdate(
    { date: { $gte: dayStart, $lte: dayEnd } },
    {
      $set: {
        date: dayStart,
        openingStock,
        production: parts.production,
        sold: parts.sold,
        broken: parts.broken,
        rejected: parts.rejected,
        adjustments,
        adjustmentReason,
        closingStock,
        isActive: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return record;
}

/**
 * Recompute a date and every later date that has stock/production/sales data.
 * Opening stock is the previous day's closing stock, so a historical edit must
 * cascade forward or later days would show stale figures.
 */
async function refreshEggStockFrom(date) {
  const from = startOfDay(date);
  const [stocks, records, localSales, wholesaleSales] = await Promise.all([
    EggStock.find({ date: { $gte: from } }).select('date'),
    DailyEggRecord.find({ date: { $gte: from } }).select('date'),
    LocalSale.find({ date: { $gte: from } }).select('date'),
    WholesaleSale.find({ date: { $gte: from } }).select('date'),
  ]);
  const days = new Set([toDateKey(from)]);
  [stocks, records, localSales, wholesaleSales].forEach((docs) => {
    docs.forEach((doc) => {
      if (doc.date && doc.date >= from) days.add(toDateKey(doc.date));
    });
  });
  let first = null;
  for (const key of [...days].sort()) {
    const refreshed = await refreshEggStockForDate(new Date(`${key}T00:00:00`));
    if (key === toDateKey(from)) first = refreshed;
  }
  return first;
}

module.exports = {
  computePartsForDate,
  getOpeningStock,
  getStockRecordForDate,
  getAvailableEggs,
  getBrokenAvailable,
  refreshEggStockForDate,
  refreshEggStockFrom,
};