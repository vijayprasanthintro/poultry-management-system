const FarmSettings = require('../models/FarmSettings');
const Admin = require('../models/Admin');
const PoultrySet = require('../models/PoultrySet');
const BirdRecord = require('../models/BirdRecord');
const DailyEggRecord = require('../models/DailyEggRecord');
const DeadHenRecord = require('../models/DeadHenRecord');
const EggStock = require('../models/EggStock');
const EggPrice = require('../models/EggPrice');
const Feed = require('../models/Feed');
const FeedUsage = require('../models/FeedUsage');
const Expense = require('../models/Expense');
const Labour = require('../models/Labour');
const LabourExpense = require('../models/LabourExpense');
const Customer = require('../models/Customer');
const LocalSale = require('../models/LocalSale');
const CustomerPayment = require('../models/CustomerPayment');
const AuditLog = require('../models/AuditLog');
const logAudit = require('../utils/audit');

const DEFAULTS = {
  // Farm Profile
  farmName: 'BALASUBRAMANI POULTRY',
  location: 'Namakkal, Tamil Nadu, India',
  ownerName: '',
  farmAddress: '',
  villageTown: '',
  district: '',
  state: '',
  pincode: '',
  contact: '',
  phone: '',
  email: '',
  registrationNumber: '',
  farmLogo: '',
  // Farm Preferences
  defaultSetId: '',
  defaultDashboardPeriod: 'today',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  timezone: 'Asia/Kolkata',
  weightUnit: 'KG',
  feedUnit: 'KG',
  currency: 'INR',
  eggUnit: 'Egg',
  defaultLanguage: 'en',
  defaultMortalityReason: '',
  // Hen & Mortality
  mortalityAlertThreshold: '0',
  mortalityReasons: [],
  // Egg
  defaultLocalSellingPrice: '0',
  localSellingPriceSource: 'default',
  minimumEggStock: '0',
  eggProductionTarget: '0',
  sellingUnit: 'Egg',
  // Feed
  minimumFeedStock: '0',
  defaultFeedType: '',
  // Labour & Expense
  defaultWage: '0',
  overtimeEnabled: 'false',
  // Sales & Payments
  defaultPaymentMethod: 'Cash',
  invoicePrefix: '',
  // Notifications
  notifications: {},
  // Appearance
  theme: 'light',
  density: 'comfortable',
  // Other
  notes: '',
};

const PUBLIC_KEYS = [
  'farmName',
  'location',
  'farmLogo',
  'currency',
  'eggUnit',
  'defaultLanguage',
];
const LIST_KEYS = new Set(['mortalityReasons']);
const OBJECT_KEYS = new Set(['notifications']);
const NUMBER_KEYS = new Set([
  'defaultLocalSellingPrice',
  'minimumEggStock',
  'minimumFeedStock',
  'mortalityAlertThreshold',
  'eggProductionTarget',
  'defaultWage',
]);

function serializeValue(key, value) {
  if (LIST_KEYS.has(key)) return JSON.stringify(Array.isArray(value) ? value : []);
  if (OBJECT_KEYS.has(key)) return JSON.stringify(value && typeof value === 'object' ? value : {});
  return value;
}

function deserializeValue(key, value) {
  if (value === null || value === undefined) return DEFAULTS[key];
  if (LIST_KEYS.has(key)) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  }
  if (OBJECT_KEYS.has(key)) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    return value && typeof value === 'object' ? value : {};
  }
  if (NUMBER_KEYS.has(key)) return Number(value) || 0;
  return value;
}

// GET /api/settings
const getSettings = async (req, res, next) => {
  try {
    const docs = await FarmSettings.find();
    const settings = { ...DEFAULTS };
    docs.forEach((d) => {
      settings[d.key] = deserializeValue(d.key, d.value);
    });
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
};

// GET /api/settings/public - branding needed on the unauthenticated login screen.
const getPublicSettings = async (req, res, next) => {
  try {
    const docs = await FarmSettings.find({ key: { $in: PUBLIC_KEYS } });
    const settings = PUBLIC_KEYS.reduce((acc, key) => {
      acc[key] = DEFAULTS[key];
      return acc;
    }, {});
    docs.forEach((d) => {
      settings[d.key] = deserializeValue(d.key, d.value);
    });
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings  (body: { farmName, location, ... })
const updateSettings = async (req, res, next) => {
  try {
    const entries = Object.entries(req.body || {});
    if (!entries.length) return res.status(400).json({ success: false, message: 'No settings provided.' });

    const before = {};
    const changes = [];
    for (const [key, value] of entries) {
      if (!(key in DEFAULTS)) continue;
      const stored = serializeValue(key, value);
      const existing = await FarmSettings.findOne({ key });
      before[key] = existing ? deserializeValue(key, existing.value) : DEFAULTS[key];
      if (existing) {
        existing.value = stored;
        await existing.save();
      } else {
        await FarmSettings.create({ key, value: stored });
      }
      changes.push({ key, old: before[key], new: deserializeValue(key, stored) });
    }

    await logAudit(req, {
      action: 'UPDATE_SETTINGS',
      recordType: 'FarmSettings',
      oldValue: before,
      newValue: req.body,
    });
    res.json({ success: true, message: 'Settings updated.', changes });
  } catch (err) {
    next(err);
  }
};

// GET /api/settings/stats  (database counts for Data Management)
const getSettingsStats = async (req, res, next) => {
  try {
    const defs = [
      ['Admin', Admin],
      ['PoultrySet', PoultrySet],
      ['BirdRecord', BirdRecord],
      ['DailyEggRecord', DailyEggRecord],
      ['DeadHenRecord', DeadHenRecord],
      ['EggStock', EggStock],
      ['EggPrice', EggPrice],
      ['Feed', Feed],
      ['FeedUsage', FeedUsage],
      ['Expense', Expense],
      ['Labour', Labour],
      ['LabourExpense', LabourExpense],
      ['Customer', Customer],
      ['LocalSale', LocalSale],
      ['CustomerPayment', CustomerPayment],
      ['AuditLog', AuditLog],
    ];
    const counts = await Promise.all(
      defs.map(async ([label, Model]) => {
        const total = await Model.countDocuments();
        const active = await Model.countDocuments({ isActive: true });
        return { label, total, active };
      })
    );
    const activeSets = await PoultrySet.find({ isActive: true });
    const totalHens = activeSets.reduce((s, set) => s + Number(set.birdCount || 0), 0);
    const mortalityCount = await DeadHenRecord.countDocuments({ isActive: true });
    res.json({
      success: true,
      counts,
      derived: {
        activeSets: activeSets.length,
        totalHens,
        activeMortalityRecords: mortalityCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/settings/export  (read-only JSON backup of all collections)
const exportSettingsData = async (req, res, next) => {
  try {
    const defs = [
      ['poultrysets', PoultrySet],
      ['birds', BirdRecord],
      ['dailyeggrecords', DailyEggRecord],
      ['deadhenrecords', DeadHenRecord],
      ['eggstocks', EggStock],
      ['eggPrices', EggPrice],
      ['feeds', Feed],
      ['feedusages', FeedUsage],
      ['expenses', Expense],
      ['labours', Labour],
      ['labourexpenses', LabourExpense],
      ['customers', Customer],
      ['localsales', LocalSale],
      ['payments', CustomerPayment],
      ['farmsettings', FarmSettings],
    ];
    const data = {};
    await Promise.all(
      defs.map(async ([key, Model]) => {
        data[key] = await Model.find({}).lean();
      })
    );
    const exportedAt = new Date().toISOString();
    res.json({ success: true, exportedAt, app: 'balasubramani-poultry', data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  getPublicSettings,
  updateSettings,
  getSettingsStats,
  exportSettingsData,
  DEFAULTS,
};