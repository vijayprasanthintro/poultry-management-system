const DailyEggRecord = require('../models/DailyEggRecord');
const PoultrySet = require('../models/PoultrySet');
const logAudit = require('../utils/audit');
const { startOfDay, endOfDay, parseDate, parseDateParam, parseNonNegativeInteger, createError } = require('../utils/helpers');
const { refreshEggStockFrom, computePartsForDate } = require('../services/eggStockService');
const { isValidObjectId } = require('mongoose');

// GET /api/eggs  (query: set, from, to, range)
const getEggRecords = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.set) filter.set = req.query.set;
    const fromDate = parseDateParam(req.query.from, 'from date');
    const toDate = parseDateParam(req.query.to, 'to date');
    if (fromDate || toDate) {
      if (fromDate && toDate && fromDate > toDate) throw createError('From date cannot be after to date.');
      filter.date = {};
      if (fromDate) filter.date.$gte = startOfDay(fromDate);
      if (toDate) filter.date.$lte = endOfDay(toDate);
    } else if (req.query.range === '7') {
      const now = new Date();
      filter.date = { $gte: startOfDay(new Date(now.getTime() - 6 * 86400000)), $lte: endOfDay(now) };
    }
    const records = await DailyEggRecord.find(filter)
      .populate('set', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
};

// GET /api/eggs/today-summary  (returns today's production summary by set)
const getTodaySummary = async (req, res, next) => {
  try {
    const today = new Date();
    const parts = await computePartsForDate(today);
    res.json({
      success: true,
      summary: {
        production: parts.production,
        totalEggs: parts.raw,
        single: parts.single,
        dbl: parts.dbl,
        broken: parts.broken,
        rejected: parts.rejected,
        sold: parts.sold,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/eggs
const createEggRecord = async (req, res, next) => {
  try {
    const {
      set, date = new Date(), birds,
      singleEggs = 0, doubleEggs = 0, brokenEggs = 0, rejectedEggs = 0,
      notes = '',
    } = req.body;

    if (!set || !isValidObjectId(set)) {
      return res.status(400).json({ success: false, message: 'A valid poultry set is required.' });
    }
    const poultrySet = await PoultrySet.findById(set);
    if (!poultrySet || !poultrySet.isActive) {
      return res.status(400).json({ success: false, message: 'Poultry set not found or inactive.' });
    }

    const parsedDate = parseDate(date);
    const single = parseNonNegativeInteger(singleEggs, 'Single eggs');
    const dbl = parseNonNegativeInteger(doubleEggs, 'Double eggs');
    const broken = parseNonNegativeInteger(brokenEggs, 'Broken eggs');
    const rejected = parseNonNegativeInteger(rejectedEggs, 'Rejected eggs');
    const birdCount = parseNonNegativeInteger(birds, 'Birds', poultrySet.birdCount);

    // Physical egg count = single + double + broken + rejected
    const totalEggs = single + dbl + broken + rejected;
    // Sellable whole eggs = single + double (broken/rejected not sellable as whole eggs)
    const sellableEggs = single + dbl;

    // One active record per set per day.
    const dayStart = startOfDay(parsedDate);
    const dayEnd = endOfDay(parsedDate);
    const existing = await DailyEggRecord.findOne({
      set,
      date: { $gte: dayStart, $lte: dayEnd },
      isActive: true,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An egg record already exists for this set on this date. Edit it instead.',
      });
    }

    const record = await DailyEggRecord.create({
      set,
      date: parsedDate,
      birds: birdCount,
      singleEggs: single,
      doubleEggs: dbl,
      totalEggs,
      brokenEggs: broken,
      rejectedEggs: rejected,
      sellableEggs,
      notes,
    });

    await refreshEggStockFrom(parsedDate);

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'DailyEggRecord',
      recordId: record._id,
      newValue: {
        set: poultrySet.name, date,
        singleEggs: single, doubleEggs: dbl, brokenEggs: broken, rejectedEggs: rejected,
        totalEggs, sellableEggs,
      },
    });
    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

// GET /api/eggs/:id
const getEggRecord = async (req, res, next) => {
  try {
    const record = await DailyEggRecord.findById(req.params.id).populate('set', 'name');
    if (!record) return res.status(404).json({ success: false, message: 'Egg record not found.' });
    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

// PUT /api/eggs/:id
const updateEggRecord = async (req, res, next) => {
  try {
    const record = await DailyEggRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Egg record not found.' });

    const old = record.toObject();
    const { singleEggs, doubleEggs, brokenEggs, rejectedEggs, notes } = req.body;

    const single = parseNonNegativeInteger(singleEggs, 'Single eggs', record.singleEggs || 0);
    const dbl = parseNonNegativeInteger(doubleEggs, 'Double eggs', record.doubleEggs || 0);
    const be = parseNonNegativeInteger(brokenEggs, 'Broken eggs', record.brokenEggs || 0);
    const re = parseNonNegativeInteger(rejectedEggs, 'Rejected eggs', record.rejectedEggs || 0);
    const nextDate = req.body.date !== undefined ? parseDate(req.body.date) : record.date;
    const birdCount = parseNonNegativeInteger(req.body.birds, 'Birds', record.birds);

    const duplicate = await DailyEggRecord.findOne({
      _id: { $ne: record._id },
      set: record.set,
      date: { $gte: startOfDay(nextDate), $lte: endOfDay(nextDate) },
      isActive: true,
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'An egg record already exists for this set on this date. Edit that record instead.',
      });
    }

    const totalEggs = single + dbl + be + re;

    record.singleEggs = single;
    record.doubleEggs = dbl;
    record.totalEggs = totalEggs;
    record.brokenEggs = be;
    record.rejectedEggs = re;
    record.sellableEggs = single + dbl;
    record.birds = birdCount;
    record.date = nextDate;
    if (notes !== undefined) record.notes = notes;

    await record.save();
    await refreshEggStockFrom(new Date(Math.min(old.date.getTime(), record.date.getTime())));

    await logAudit(req, {
      action: 'UPDATE',
      recordType: 'DailyEggRecord',
      recordId: record._id,
      oldValue: old,
      newValue: {
        singleEggs: single, doubleEggs: dbl, brokenEggs: be, rejectedEggs: re,
        totalEggs, sellableEggs: record.sellableEggs,
      },
    });
    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/eggs/:id
const deleteEggRecord = async (req, res, next) => {
  try {
    const record = await DailyEggRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Egg record not found.' });
    const old = record.toObject();
    record.isActive = false;
    await record.save();
    await refreshEggStockFrom(record.date);
    await logAudit(req, {
      action: 'DELETE',
      recordType: 'DailyEggRecord',
      recordId: record._id,
      oldValue: old,
    });
    res.json({ success: true, message: 'Egg record deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEggRecords, getTodaySummary, createEggRecord, getEggRecord, updateEggRecord, deleteEggRecord };