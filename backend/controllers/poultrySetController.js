const PoultrySet = require('../models/PoultrySet');
const logAudit = require('../utils/audit');

// GET /api/poultry-sets
const getSets = async (req, res, next) => {
  try {
    const sets = await PoultrySet.find().sort({ createdAt: 1 });
    res.json({ success: true, sets });
  } catch (err) {
    next(err);
  }
};

// POST /api/poultry-sets
const createSet = async (req, res, next) => {
  try {
    const {
      name, birdCount = 0, breed = '', startingDate, house = '',
      age = 0, status = 'ACTIVE', notes = '',
    } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Set name is required.' });
    if (birdCount < 0) return res.status(400).json({ success: false, message: 'Bird count cannot be negative.' });

    const set = await PoultrySet.create({
      name,
      birdCount,
      startingBirdCount: birdCount,
      breed,
      startingDate: startingDate || new Date(),
      house,
      age,
      status,
      notes,
    });

    await logAudit(req, {
      action: 'CREATE',
      recordType: 'PoultrySet',
      recordId: set._id,
      newValue: { name: set.name, birdCount },
    });
    res.status(201).json({ success: true, set });
  } catch (err) {
    next(err);
  }
};

// GET /api/poultry-sets/:id
const getSet = async (req, res, next) => {
  try {
    const set = await PoultrySet.findById(req.params.id);
    if (!set) return res.status(404).json({ success: false, message: 'Poultry set not found.' });
    res.json({ success: true, set });
  } catch (err) {
    next(err);
  }
};

// PUT /api/poultry-sets/:id
const updateSet = async (req, res, next) => {
  try {
    const set = await PoultrySet.findById(req.params.id);
    if (!set) return res.status(404).json({ success: false, message: 'Poultry set not found.' });

    const old = set.toObject();
    const { name, birdCount, breed, startingDate, house, age, status, notes, startingBirdCount } = req.body;
    if (name !== undefined) set.name = name;
    if (birdCount !== undefined) {
      if (birdCount < 0) return res.status(400).json({ success: false, message: 'Bird count cannot be negative.' });
      set.birdCount = birdCount;
    }
    if (startingBirdCount !== undefined) {
      if (startingBirdCount < 0) return res.status(400).json({ success: false, message: 'Starting bird count cannot be negative.' });
      set.startingBirdCount = startingBirdCount;
    }
    if (breed !== undefined) set.breed = breed;
    if (startingDate !== undefined) set.startingDate = startingDate;
    if (house !== undefined) set.house = house;
    if (age !== undefined) set.age = age;
    if (status !== undefined) set.status = status;
    if (notes !== undefined) set.notes = notes;
    if (status === 'INACTIVE') set.isActive = false;
    else if (status === 'ACTIVE') set.isActive = true;

    await set.save();
    await logAudit(req, {
      action: 'UPDATE',
      recordType: 'PoultrySet',
      recordId: set._id,
      oldValue: old,
      newValue: req.body,
    });
    res.json({ success: true, set });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/poultry-sets/:id
const deleteSet = async (req, res, next) => {
  try {
    const set = await PoultrySet.findById(req.params.id);
    if (!set) return res.status(404).json({ success: false, message: 'Poultry set not found.' });

    const old = set.toObject();
    set.isActive = false;
    set.status = 'INACTIVE';
    await set.save();

    await logAudit(req, {
      action: 'DELETE',
      recordType: 'PoultrySet',
      recordId: set._id,
      oldValue: old,
    });
    res.json({ success: true, message: 'Poultry set deactivated.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSets, createSet, getSet, updateSet, deleteSet };