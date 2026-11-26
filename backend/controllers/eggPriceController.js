const EggPrice = require('../models/EggPrice');
const FarmSettings = require('../models/FarmSettings');
const logAudit = require('../utils/audit');
const { getCurrentPrice } = require('../services/eggPriceService');
const { startOfDay, endOfDay } = require('../utils/helpers');

const getDefaultLocalPrice = async () => {
  const doc = await FarmSettings.findOne({ key: 'defaultLocalSellingPrice' });
  return doc && Number(doc.value) > 0 ? Number(doc.value) : 0;
};

// GET /api/egg-prices/current
const getCurrent = async (req, res, next) => {
  try {
    const result = await getCurrentPrice();
    const localPrice = await getDefaultLocalPrice();
    res.json({ success: true, ...result, localSellingPrice: localPrice });
  } catch (err) {
    next(err);
  }
};

// GET /api/egg-prices/refresh — force a new fetch attempt from the API
const refreshNow = async (req, res, next) => {
  try {
    const result = await getCurrentPrice();
    const localPrice = await getDefaultLocalPrice();
    res.json({ success: true, ...result, localSellingPrice: localPrice });
  } catch (err) {
    next(err);
  }
};

// GET /api/egg-prices  (query: from, to, range)
const getPrices = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    } else if (req.query.range === 'month') {
      const now = new Date();
      filter.date = { $gte: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), $lte: endOfDay(now) };
    }
    const prices = await EggPrice.find(filter).sort({ date: -1, createdAt: -1 });
    res.json({ success: true, prices });
  } catch (err) {
    next(err);
  }
};

// POST /api/egg-prices — always treated as MANUAL (human override)
const createPrice = async (req, res, next) => {
  try {
    const { date = new Date(), pricePerEgg, localSellingPrice, source = 'MANUAL', notes = '' } = req.body;
    if (pricePerEgg == null || Number(pricePerEgg) < 0) {
      return res.status(400).json({ success: false, message: 'A valid non-negative egg price is required.' });
    }

    const price = await EggPrice.create({
      date,
      pricePerEgg: Number(pricePerEgg),
      localSellingPrice: localSellingPrice != null ? Number(localSellingPrice) : await getDefaultLocalPrice(),
      source: source === 'API' ? 'MANUAL' : source, // API prices are only stored by the service
      location: req.body.location || 'Namakkal',
      notes,
    });

    if (localSellingPrice != null && Number(localSellingPrice) > 0) {
      await FarmSettings.findOneAndUpdate(
        { key: 'defaultLocalSellingPrice' },
        { $set: { value: String(Number(localSellingPrice)) } },
        { upsert: true }
      );
    }

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'EggPrice',
      recordId: price._id,
      newValue: { pricePerEgg: Number(pricePerEgg), localSellingPrice, source: 'MANUAL' },
    });
    res.status(201).json({ success: true, price });
  } catch (err) {
    next(err);
  }
};

// PUT /api/egg-prices/:id
const updatePrice = async (req, res, next) => {
  try {
    const price = await EggPrice.findById(req.params.id);
    if (!price) return res.status(404).json({ success: false, message: 'Egg price record not found.' });
    const old = price.toObject();
    const { pricePerEgg, localSellingPrice, notes, date } = req.body;
    if (pricePerEgg !== undefined) {
      if (Number(pricePerEgg) < 0) return res.status(400).json({ success: false, message: 'Price cannot be negative.' });
      price.pricePerEgg = Number(pricePerEgg);
      price.source = 'MANUAL';
    }
    if (localSellingPrice !== undefined && Number(localSellingPrice) >= 0) {
      price.localSellingPrice = Number(localSellingPrice);
    }
    if (notes !== undefined) price.notes = notes;
    if (date !== undefined) price.date = date;
    await price.save();

    if (localSellingPrice !== undefined && Number(localSellingPrice) > 0) {
      await FarmSettings.findOneAndUpdate(
        { key: 'defaultLocalSellingPrice' },
        { $set: { value: String(Number(localSellingPrice)) } },
        { upsert: true }
      );
    }

    await logAudit(req, {
      action: 'UPDATE',
      recordType: 'EggPrice',
      recordId: price._id,
      oldValue: old,
      newValue: req.body,
    });
    res.json({ success: true, price });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCurrent, refreshNow, getPrices, createPrice, updatePrice };