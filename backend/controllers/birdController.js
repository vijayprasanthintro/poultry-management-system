const BirdRecord = require('../models/BirdRecord');
const PoultrySet = require('../models/PoultrySet');
const logAudit = require('../utils/audit');
const { startOfDay, endOfDay, parseDate, parseNonNegativeInteger } = require('../utils/helpers');
const { isValidObjectId } = require('mongoose');

/** Calculate currentBirds and return the previous record for a set on or before a date. */
async function computeCurrentBirds(setId, date, excludeId = null) {
  const dayStart = startOfDay(date);
  const filters = { set: setId };
  const latest = await BirdRecord.find({ set: setId, isActive: true })
    .sort({ date: -1, createdAt: -1 })
    .limit(2);
  let openingBirds = 0;
  for (const rec of latest) {
    if (excludeId && String(rec._id) === String(excludeId)) continue;
    openingBirds = rec.currentBirds;
    break;
  }
  // For a brand new record on a later date, opening = latest currentBirds.
  return openingBirds;
}

// GET /api/birds  (query: set, from, to)
const getBirdRecords = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.set) filter.set = req.query.set;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    }
    const records = await BirdRecord.find(filter)
      .populate('set', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
};

// POST /api/birds
const createBirdRecord = async (req, res, next) => {
  try {
    const { set, date = new Date(), newBirds = 0, mortality = 0, soldBirds = 0, notes = '' } = req.body;

    if (!set || !isValidObjectId(set)) return res.status(400).json({ success: false, message: 'A valid poultry set is required.' });
    const poultrySet = await PoultrySet.findById(set);
    if (!poultrySet) return res.status(400).json({ success: false, message: 'Poultry set not found.' });

    const parsedDate = parseDate(date);
    const nb = parseNonNegativeInteger(newBirds, 'New birds');
    const mo = parseNonNegativeInteger(mortality, 'Mortality');
    const so = parseNonNegativeInteger(soldBirds, 'Sold birds');

    // Find opening birds = latest currentBirds for the set (before or on date).
    const prev = await BirdRecord.findOne({
      set,
      date: { $lte: endOfDay(parsedDate) },
      isActive: true,
    }).sort({ date: -1, createdAt: -1 });

    // Also consider the latest set birdCount as fallback baseline.
    const openingBirds = prev ? prev.currentBirds : poultrySet.birdCount;

    const currentBirds = openingBirds + nb - mo - so;
    if (currentBirds < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current birds cannot be negative. Check mortality/sold values.',
      });
    }

    const record = await BirdRecord.create({
      set,
      date: parsedDate,
      openingBirds,
      newBirds: nb,
      mortality: mo,
      soldBirds: so,
      currentBirds,
      notes,
    });

    // Keep the set in sync only when this is genuinely the latest record.
    // Back-dated entries must not overwrite the current flock size.
    const latest = await BirdRecord.findOne({ set, isActive: true }).sort({ date: -1, createdAt: -1 });
    if (String(latest._id) === String(record._id)) {
      poultrySet.birdCount = currentBirds;
      await poultrySet.save();
    }

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'BirdRecord',
      recordId: record._id,
      newValue: { set, openingBirds, newBirds, mortality, soldBirds, currentBirds },
    });
    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

// PUT /api/birds/:id
const updateBirdRecord = async (req, res, next) => {
  try {
    const record = await BirdRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Bird record not found.' });

    const old = record.toObject();
    const { date, newBirds, mortality, soldBirds, notes } = req.body;
    const nextDate = date !== undefined ? parseDate(date) : record.date;

    const nb = parseNonNegativeInteger(newBirds, 'New birds', record.newBirds);
    const mo = parseNonNegativeInteger(mortality, 'Mortality', record.mortality);
    const so = parseNonNegativeInteger(soldBirds, 'Sold birds', record.soldBirds);

    // Opening birds are derived from the preceding record, never trusted from
    // the client. Exclude this record so edits cannot compound its own count.
    const prev = await BirdRecord.findOne({
      set: record.set,
      _id: { $ne: record._id },
      date: { $lte: endOfDay(nextDate) },
      isActive: true,
    }).sort({ date: -1, createdAt: -1 });
    const poultrySet = await PoultrySet.findById(record.set);
    const openingBirds = prev ? prev.currentBirds : (poultrySet ? poultrySet.startingBirdCount : 0);

    const currentBirds = openingBirds + nb - mo - so;
    if (currentBirds < 0) {
      return res.status(400).json({ success: false, message: 'Current birds cannot be negative.' });
    }

    record.date = nextDate;
    record.openingBirds = openingBirds;
    record.newBirds = nb;
    record.mortality = mo;
    record.soldBirds = so;
    record.currentBirds = currentBirds;
    if (notes !== undefined) record.notes = notes;

    await record.save();

    // Re-sync the set birdCount with the latest record for that set.
    const latest = await BirdRecord.findOne({ set: record.set, isActive: true })
      .sort({ date: -1, createdAt: -1 });
    if (latest) {
      const poultrySet = await PoultrySet.findById(record.set);
      if (poultrySet) {
        poultrySet.birdCount = latest.currentBirds;
        await poultrySet.save();
      }
    }

    await logAudit(req, {
      action: 'UPDATE',
      recordType: 'BirdRecord',
      recordId: record._id,
      oldValue: old,
      newValue: { openingBirds, newBirds: nb, mortality: mo, soldBirds: so, currentBirds },
    });
    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/birds/:id
const deleteBirdRecord = async (req, res, next) => {
  try {
    const record = await BirdRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Bird record not found.' });
    const old = record.toObject();
    record.isActive = false;
    await record.save();

    // Restore the set's bird count from the newest remaining record.
    const latest = await BirdRecord.findOne({ set: record.set, isActive: true }).sort({ date: -1, createdAt: -1 });
    const poultrySet = await PoultrySet.findById(record.set);
    if (poultrySet) {
      poultrySet.birdCount = latest ? latest.currentBirds : poultrySet.startingBirdCount;
      await poultrySet.save();
    }

    await logAudit(req, {
      action: 'DELETE',
      recordType: 'BirdRecord',
      recordId: record._id,
      oldValue: old,
    });
    res.json({ success: true, message: 'Bird record deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBirdRecords, createBirdRecord, updateBirdRecord, deleteBirdRecord, computeCurrentBirds };