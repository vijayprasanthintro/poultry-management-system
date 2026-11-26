const Feed = require('../models/Feed');
const logAudit = require('../utils/audit');
const { parseAmount, parseNonNegativeInteger, escapeRegex } = require('../utils/helpers');
const { weightInKg } = require('../services/feedStockService');

// GET /api/feed
const getFeed = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.set) filter.set = req.query.set;
    if (req.query.name) filter.name = new RegExp(escapeRegex(req.query.name), 'i');
    const feeds = await Feed.find(filter)
      .populate('set', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, feeds });
  } catch (err) {
    next(err);
  }
};

// GET /api/feed/stock — total feed stock summary (all purchases minus usage)
const getFeedStock = async (req, res, next) => {
  try {
    const FeedUsage = require('../models/FeedUsage');
    const [feedDocs, usageDocs] = await Promise.all([
      Feed.find({ isActive: true }),
      FeedUsage.find({ isActive: true }),
    ]);
    const purchasedKg = feedDocs.reduce((s, f) => s + weightInKg(f), 0);
    const usedKg = usageDocs.reduce((s, u) => s + u.feedUsed, 0);
    const availableKg = Math.max(0, purchasedKg - usedKg);
    const FeedSetting = require('../models/FarmSettings');
    const minDoc = await FeedSetting.findOne({ key: 'minimumFeedStock' });
    const minStock = minDoc && Number(minDoc.value) > 0 ? Number(minDoc.value) : 0;
    res.json({
      success: true,
      stock: {
        purchasedKg,
        usedKg,
        availableKg,
        minimumStock: minStock,
        lowStock: availableKg <= minStock,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/feed
const createFeed = async (req, res, next) => {
  try {
    const {
      name, feedType, quantity = 0, weight = 0, unit = 'KG', bagWeightKg = 0,
      pricePerKg = 0, supplier, purchaseDate, expiryDate, set, notes,
    } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Feed name is required.' });
    const qty = parseNonNegativeInteger(quantity, 'Quantity', 1);
    const kgWeight = parseAmount(weight, 'Weight', 0);
    const perBag = parseAmount(bagWeightKg, 'Bag weight', 0);
    const price = parseAmount(pricePerKg, 'Price per kg', 0);

    const feed = await Feed.create({
      name: String(name).trim(),
      feedType: feedType || 'Layer Mash',
      quantity: qty,
      weight: kgWeight,
      unit,
      bagWeightKg: perBag,
      pricePerKg: price,
      totalCost: Math.round(price * weightInKg({ unit, quantity: qty, weight: kgWeight, bagWeightKg: perBag }) * 100) / 100,
      supplier: supplier || '',
      purchaseDate,
      expiryDate,
      set: set || null,
      notes: notes || '',
    });

    await logAudit(req, { action: 'CREATE', recordType: 'Feed', recordId: feed._id, newValue: { name, weight: feed.weight, quantity: feed.quantity } });
    res.status(201).json({ success: true, feed });
  } catch (err) {
    next(err);
  }
};

// PUT /api/feed/:id
const updateFeed = async (req, res, next) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ success: false, message: 'Feed record not found.' });
    const old = feed.toObject();
    const fields = ['name', 'feedType', 'unit', 'supplier', 'purchaseDate', 'expiryDate', 'set', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) feed[f] = req.body[f];
    });
    if (req.body.quantity !== undefined) feed.quantity = parseNonNegativeInteger(req.body.quantity, 'Quantity', 1);
    if (req.body.weight !== undefined) feed.weight = parseAmount(req.body.weight, 'Weight');
    if (req.body.bagWeightKg !== undefined) feed.bagWeightKg = parseAmount(req.body.bagWeightKg, 'Bag weight');
    if (req.body.pricePerKg !== undefined) feed.pricePerKg = parseAmount(req.body.pricePerKg, 'Price per kg');
    if (req.body.name !== undefined && !String(req.body.name).trim()) {
      return res.status(400).json({ success: false, message: 'Feed name is required.' });
    }
    feed.totalCost = Math.round(Number(feed.pricePerKg) * weightInKg(feed) * 100) / 100;
    await feed.save();
    await logAudit(req, { action: 'UPDATE', recordType: 'Feed', recordId: feed._id, oldValue: old, newValue: req.body });
    res.json({ success: true, feed });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/feed/:id
const deleteFeed = async (req, res, next) => {
  try {
    const feed = await Feed.findById(req.params.id);
    if (!feed) return res.status(404).json({ success: false, message: 'Feed record not found.' });
    const old = feed.toObject();
    feed.isActive = false;
    await feed.save();
    await logAudit(req, { action: 'DELETE', recordType: 'Feed', recordId: feed._id, oldValue: old });
    res.json({ success: true, message: 'Feed record deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFeed, getFeedStock, createFeed, updateFeed, deleteFeed, weightInKg };