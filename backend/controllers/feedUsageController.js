const FeedUsage = require('../models/FeedUsage');
const FeedService = require('../services/feedStockService');
const Feed = require('../models/Feed');
const FarmSettings = require('../models/FarmSettings');
const logAudit = require('../utils/audit');
const { startOfDay, endOfDay, getDateRange, parseDate, parseAmount } = require('../utils/helpers');

/** Convert a usage quantity into kilograms for stock/cost calculations. */
const toKg = (value, unit, bagWeightKg = 0) => {
  const n = Number(value) || 0;
  if (unit === 'GRAMS') return n / 1000;
  if (unit === 'BAGS') return n * (Number(bagWeightKg) || 0);
  return n;
};

/** Compute current available feed stock in KG. */

async function getAvailableFeedKg(setId = null) {
  const filter = { isActive: true };
  if (setId) filter.set = setId;
  const [feeds, usages] = await Promise.all([
    Feed.find(filter),
    FeedUsage.find({ isActive: true, ...(setId ? { set: setId } : {}) }),
  ]);
  const purchased = feeds.reduce((s, f) => s + FeedService.weightInKg(f), 0);
  const used = usages.reduce((s, u) => s + Number(u.feedUsed || 0), 0);
  return Math.max(0, purchased - used);
}

async function getMinStock() {
  const doc = await FarmSettings.findOne({ key: 'minimumFeedStock' });
  return doc && Number(doc.value) > 0 ? Number(doc.value) : 50;
}

// GET /api/feed-usage
const getFeedUsage = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const filter = { isActive: true, date: { $gte: start, $lte: end } };
    if (req.query.set) filter.set = req.query.set;
    const records = await FeedUsage.find(filter)
      .populate('set', 'name')
      .populate('feed', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
};

// GET /api/feed-usage/summary — today's usage + current stock + low stock alert
const getSummary = async (req, res, next) => {
  try {
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const todayUsage = await FeedUsage.find({ date: { $gte: dayStart, $lte: dayEnd }, isActive: true });
    const usedToday = todayUsage.reduce((s, u) => s + Number(u.feedUsed || 0), 0);
    const availableKg = await getAvailableFeedKg();
    const minStock = await getMinStock();
    res.json({
      success: true,
      summary: {
        usedToday,
        availableKg,
        minimumStock: minStock,
        lowStock: availableKg <= minStock,
        recordCount: todayUsage.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/feed-usage
const createFeedUsage = async (req, res, next) => {
  try {
    const {
      date = new Date(), set, feed, feedName = '', startingWeight = 0, feedAdded = 0,
      feedUsed, endingWeight, unit = 'KG', isAdjustment = false, notes = '',
    } = req.body;

    if (set == null) return res.status(400).json({ success: false, message: 'Poultry set is required.' });
    const usageDate = parseDate(date);
    const used = parseAmount(feedUsed, 'Feed used');
    const startW = parseAmount(startingWeight, 'Starting weight');
    const added = parseAmount(feedAdded, 'Feed added');
    const bagWeight = parseAmount(req.body.bagWeightKg, 'Bag weight');
    if (unit === 'BAGS' && bagWeight <= 0) {
      return res.status(400).json({ success: false, message: 'Bag weight must be greater than zero for BAGS.' });
    }

    // Load price per kg (from the linked feed record or a manual entry).
    let pricePerKg = 0;
    if (feed) {
      const feedDoc = await Feed.findById(feed);
      if (feedDoc) {
        pricePerKg = Number(feedDoc.pricePerKg) || 0;
        if (!feedName) feedName = feedDoc.name;
      }
    }
    if (req.body.pricePerKg !== undefined) pricePerKg = parseAmount(req.body.pricePerKg, 'Price per kg');

    const usedKg = toKg(used, unit, bagWeight);

    // Stock guard (unless explicitly an authorized adjustment).
    if (!isAdjustment) {
      const available = await getAvailableFeedKg();
      if (usedKg > available) {
        return res.status(400).json({
          success: false,
          message: `Feed stock is too low. Available: ${Math.round(available * 100) / 100} KG. Try a lower value or make an authorized adjustment.`,
        });
      }
    }

    const endW =
      endingWeight !== undefined && endingWeight !== null && endingWeight !== ''
        ? parseAmount(endingWeight, 'Ending weight')
        : unit === 'BAGS'
          ? startW + added - used
          : startW + added - used;

    const record = await FeedUsage.create({
      date: usageDate,
      set,
      feed: feed || undefined,
      feedName,
      pricePerKg,
      startingWeight: startW,
      feedAdded: added,
      feedUsed: used,
      endingWeight: Math.max(0, endW),
      unit,
      bagWeightKg: bagWeight,
      feedCost: Math.round(usedKg * pricePerKg * 100) / 100,
      isAdjustment: Boolean(isAdjustment),
      notes,
    });

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'FeedUsage',
      recordId: record._id,
      newValue: { date: usageDate, set, feedUsed: used, unit, feedCost: record.feedCost },
    });
    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

// PUT /api/feed-usage/:id
const updateFeedUsage = async (req, res, next) => {
  try {
    const record = await FeedUsage.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Feed usage record not found.' });
    const old = record.toObject();

    if (req.body.feedUsed !== undefined) record.feedUsed = parseAmount(req.body.feedUsed, 'Feed used');
    if (req.body.startingWeight !== undefined) record.startingWeight = parseAmount(req.body.startingWeight, 'Starting weight');
    if (req.body.feedAdded !== undefined) record.feedAdded = parseAmount(req.body.feedAdded, 'Feed added');
    if (req.body.date !== undefined) record.date = parseDate(req.body.date);
    if (req.body.set !== undefined) record.set = req.body.set;
    if (req.body.unit !== undefined) record.unit = req.body.unit;
    if (req.body.bagWeightKg !== undefined) record.bagWeightKg = parseAmount(req.body.bagWeightKg, 'Bag weight');
    if (record.unit === 'BAGS' && record.bagWeightKg <= 0) {
      return res.status(400).json({ success: false, message: 'Bag weight must be greater than zero for BAGS.' });
    }
    if (req.body.pricePerKg !== undefined) record.pricePerKg = parseAmount(req.body.pricePerKg, 'Price per kg');
    if (req.body.feedName !== undefined) record.feedName = req.body.feedName;
    if (req.body.notes !== undefined) record.notes = req.body.notes;

    const usedKg = toKg(record.feedUsed, record.unit, record.bagWeightKg);
    const oldUsedKg = toKg(old.feedUsed, old.unit, old.bagWeightKg);

    // Compare against stock WITH this record removed, otherwise a small edit
    // to an existing usage is incorrectly rejected.
    if (!record.isAdjustment) {
      const available = (await getAvailableFeedKg()) + oldUsedKg;
      if (usedKg > available) {
        return res.status(400).json({
          success: false,
          message: `Feed stock is too low. Available: ${Math.round(available * 100) / 100} KG.`,
        });
      }
    }

    record.endingWeight =
      req.body.endingWeight !== undefined
        ? parseAmount(req.body.endingWeight, 'Ending weight')
        : Math.max(0, record.startingWeight + record.feedAdded - record.feedUsed);
    record.feedCost = Math.round(usedKg * record.pricePerKg * 100) / 100;

    await record.save();
    await logAudit(req, {
      action: 'UPDATE',
      recordType: 'FeedUsage',
      recordId: record._id,
      oldValue: old,
      newValue: { feedUsed: record.feedUsed, feedCost: record.feedCost },
    });
    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/feed-usage/:id
const deleteFeedUsage = async (req, res, next) => {
  try {
    const record = await FeedUsage.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Feed usage record not found.' });
    const old = record.toObject();
    record.isActive = false;
    await record.save();
    await logAudit(req, { action: 'DELETE', recordType: 'FeedUsage', recordId: record._id, oldValue: old });
    res.json({ success: true, message: 'Feed usage record deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFeedUsage, getSummary, createFeedUsage, updateFeedUsage, deleteFeedUsage, getAvailableFeedKg, getMinStock };