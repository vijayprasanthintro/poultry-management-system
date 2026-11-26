const DeadHenRecord = require('../models/DeadHenRecord');
const PoultrySet = require('../models/PoultrySet');
const logAudit = require('../utils/audit');
const { startOfDay, endOfDay } = require('../utils/helpers');

/**
 * Hen statistics derived entirely from MongoDB data (never hardcoded):
 *  - totalHens     = Total Hens = sum of birdCount across active poultry sets
 *                   (all birds in this farm ARE hens — one single hen count)
 *  - totalDeadHens = sum of all active daily dead-hen records
 *  - liveHens      = totalHens - totalDeadHens (never allowed to go negative)
 *  - todayDeadHens = dead-hen record(s) for today's date
 *  - sets          = per-set breakdown of the same values
 *  - deathTrend    = last-7-days dead-hen chart series
 */
async function computeHenStats() {
  const [sets, records] = await Promise.all([
    PoultrySet.find({ isActive: true }),
    DeadHenRecord.find({ isActive: true }).populate('set', 'name'),
  ]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const totalHens = sets.reduce((s, set) => s + setInitialHens(set), 0);
  const totalDeadHens = records.reduce((s, r) => s + Number(r.deadHens || 0), 0);
  const liveHens = Math.max(0, totalHens - totalDeadHens);

  const todayRecords = records.filter((r) => r.date >= todayStart && r.date <= todayEnd);
  const todayDeadHens = todayRecords.reduce((s, r) => s + Number(r.deadHens || 0), 0);

  const setsStats = sets.map((set) => {
    const setRecords = records.filter((r) => r.set && String(r.set._id || r.set) === String(set._id));
    const setTotalHens = setInitialHens(set);
    const setTotalDead = setRecords.reduce((s, r) => s + Number(r.deadHens || 0), 0);
    const setLive = Math.max(0, setTotalHens - setTotalDead);
    const setToday = setRecords
      .filter((r) => r.date >= todayStart && r.date <= todayEnd)
      .reduce((s, r) => s + Number(r.deadHens || 0), 0);
    return {
      setId: set._id,
      name: set.name,
      totalHens: setTotalHens,
      totalDeadHens: setTotalDead,
      liveHens: setLive,
      todayDeadHens: setToday,
    };
  });

  const deathTrend = last7Days().map((d) => ({
    date: d.toDateKey(),
    deadHens: records
      .filter((r) => r.date >= d.start && r.date <= d.end)
      .reduce((s, r) => s + Number(r.deadHens || 0), 0),
  }));

  return {
    totalHens,
    totalDeadHens,
    liveHens,
    todayDeadHens,
    sets: setsStats,
    deathTrend,
  };
}

/** Last 7 days (oldest → newest) with start/end-of-day bounds. */
function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      start: startOfDay(d),
      end: endOfDay(d),
      toDateKey: () => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      },
    });
  }
  return days;
}

/** Initial hens for a poultry set (current flock size = birdCount, i.e. all birds are hens). */
function setInitialHens(set) {
  return Number(set.birdCount || set.startingBirdCount || 0);
}

/** Validate a dead-hen value: must be a positive integer. */
function isValidDeadHens(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

/** Shared date parsing; returns a Date or null. */
function parseDate(value) {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /api/dead-hens  (optional ?set= filter; newest records first)
const getDeadHenRecords = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.set) filter.set = req.query.set;
    const records = await DeadHenRecord.find(filter)
      .populate('set', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
};

// GET /api/dead-hens/dashboard-stats
const getDeadHenStats = async (req, res, next) => {
  try {
    const stats = await computeHenStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    next(err);
  }
};

// POST /api/dead-hens
const createDeadHenRecord = async (req, res, next) => {
  try {
    const { set, date = new Date(), deadHens, reason = '', notes = '' } = req.body;

    if (!set) return res.status(400).json({ success: false, message: 'Poultry set is required.' });
    const poultrySet = await PoultrySet.findById(set);
    if (!poultrySet) return res.status(400).json({ success: false, message: 'Poultry set not found.' });

    const parsedDate = parseDate(date);
    if (!parsedDate) return res.status(400).json({ success: false, message: 'Invalid date.' });
    if (!isValidDeadHens(deadHens)) {
      return res.status(400).json({ success: false, message: 'Dead hens must be a positive integer.' });
    }

    // One active record per set per date.
    const existing = await DeadHenRecord.findOne({
      set,
      date: { $gte: startOfDay(parsedDate), $lte: endOfDay(parsedDate) },
      isActive: true,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A dead-hen record already exists for ${poultrySet.name} on this date. Edit it instead.`,
      });
    }

    // Dead hens cannot exceed the available live hens for this set.
    const stats = await computeHenStats();
    const setStat = stats.sets.find((s) => String(s.setId) === String(set));
    const availableForSet = setStat ? setStat.liveHens : setInitialHens(poultrySet);
    if (Number(deadHens) > availableForSet) {
      return res.status(400).json({
        success: false,
        message: `Dead hens for ${poultrySet.name} cannot exceed available live hens. Available: ${availableForSet}.`,
      });
    }

    const record = await DeadHenRecord.create({
      set,
      date: parsedDate,
      deadHens: Number(deadHens),
      reason,
      notes,
    });

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'DeadHenRecord',
      recordId: record._id,
      newValue: { set: poultrySet.name, date: parsedDate, deadHens: Number(deadHens), reason, notes },
    });
    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

// PUT /api/dead-hens/:id
const updateDeadHenRecord = async (req, res, next) => {
  try {
    const record = await DeadHenRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Dead-hen record not found.' });

    const old = record.toObject();
    const { set, date, deadHens, reason, notes } = req.body;

    const nextSetId = set !== undefined ? set : record.set;
    let poultrySet = null;
    if (set !== undefined) {
      poultrySet = await PoultrySet.findById(set);
      if (!poultrySet) return res.status(400).json({ success: false, message: 'Poultry set not found.' });
    }

    const nextDate = date !== undefined ? parseDate(date) : record.date;
    if (nextDate === null) return res.status(400).json({ success: false, message: 'Invalid date.' });

    const nextDeadHens = deadHens !== undefined ? Number(deadHens) : record.deadHens;
    if (!isValidDeadHens(nextDeadHens)) {
      return res.status(400).json({ success: false, message: 'Dead hens must be a positive integer.' });
    }

    // Prevent duplicates when the date or set changes.
    const existing = await DeadHenRecord.findOne({
      _id: { $ne: record._id },
      set: nextSetId,
      date: { $gte: startOfDay(nextDate), $lte: endOfDay(nextDate) },
      isActive: true,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A dead-hen record already exists for this set on this date. Edit it instead.',
      });
    }

    // Editing must correctly recalculate totals — live hens for the target set can never go negative.
    const stats = await computeHenStats();
    const setStat = stats.sets.find((s) => String(s.setId) === String(nextSetId));
    const setHens = setStat
      ? setStat.totalHens
      : setInitialHens(poultrySet || {});
    let setDeadNow = setStat ? setStat.totalDeadHens : 0;
    if (String(record.set) === String(nextSetId)) {
      // This record currently counts toward the target set, so exclude it.
      setDeadNow -= Number(record.deadHens || 0);
    }
    const availableLive = Math.max(0, setHens - setDeadNow);
    if (nextDeadHens > availableLive) {
      return res.status(400).json({
        success: false,
        message: `Dead hens cannot exceed available live hens for this set. Available: ${availableLive}.`,
      });
    }

    record.set = nextSetId;
    record.date = nextDate;
    record.deadHens = nextDeadHens;
    if (reason !== undefined) record.reason = reason;
    if (notes !== undefined) record.notes = notes;

    await record.save();

    await logAudit(req, {
      action: 'UPDATE',
      recordType: 'DeadHenRecord',
      recordId: record._id,
      oldValue: old,
      newValue: { set: record.set, date: record.date, deadHens: record.deadHens, reason: record.reason, notes: record.notes },
    });
    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/dead-hens/:id
const deleteDeadHenRecord = async (req, res, next) => {
  try {
    const record = await DeadHenRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Dead-hen record not found.' });
    const old = record.toObject();
    record.isActive = false;
    await record.save();
    await logAudit(req, {
      action: 'DELETE',
      recordType: 'DeadHenRecord',
      recordId: record._id,
      oldValue: old,
    });
    res.json({ success: true, message: 'Dead-hen record deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  computeHenStats,
  getDeadHenRecords,
  getDeadHenStats,
  createDeadHenRecord,
  updateDeadHenRecord,
  deleteDeadHenRecord,
};