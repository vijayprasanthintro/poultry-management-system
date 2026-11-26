const PoultrySet = require('../models/PoultrySet');
const DeadHenRecord = require('../models/DeadHenRecord');
const DailyEggRecord = require('../models/DailyEggRecord');
const EggStock = require('../models/EggStock');
const LocalSale = require('../models/LocalSale');
const WholesaleSale = require('../models/WholesaleSale');
const Expense = require('../models/Expense');
const FeedUsage = require('../models/FeedUsage');
const Labour = require('../models/Labour');
const LabourExpense = require('../models/LabourExpense');
const FarmSettings = require('../models/FarmSettings');
const { getCurrentPrice } = require('../services/eggPriceService');
const { getAvailableFeedKg } = require('../controllers/feedUsageController');
const { getAvailableEggs } = require('../services/eggStockService');
const { computeHenStats } = require('./deadHenController');
const {
  getDateRange, startOfDay, endOfDay, round2, toDateKey,
  recordEggBreakdown, recordSellableEggs, recordSingleEggs, recordDoubleEggs,
  saleTotalEggs, saleSingleEggs, saleDoubleEggs,
} = require('../utils/helpers');

/**
 * Compute the full dashboard/stats payload for a date range.
 * Shared by GET /api/dashboard and parts of /api/reports.
 */
async function computeDashboard(req) {
  const { start, end, label } = getDateRange(req);

  const [sets, eggRecords, stocks, sales, wholesaleSales, expenses, usages, labourExpenses, priceResult] = await Promise.all([
    PoultrySet.find({ isActive: true }).sort({ createdAt: 1 }),
    DailyEggRecord.find({ date: { $gte: start, $lte: end }, isActive: true }),
    EggStock.find({ isActive: true }).sort({ date: -1 }).limit(2),
    LocalSale.find({ date: { $gte: start, $lte: end }, isActive: true }),
    WholesaleSale.find({ date: { $gte: start, $lte: end }, isActive: true }),
    Expense.find({ date: { $gte: start, $lte: end }, isActive: true }),
    FeedUsage.find({ date: { $gte: start, $lte: end }, isActive: true }),
    LabourExpense.find({ date: { $gte: start, $lte: end }, isActive: true }),
    getCurrentPrice(),
  ]);

  // Hens (all birds are hens — single Total Hens = sum of set birdCounts)
  const totalHens = sets.reduce((s, set) => s + Number(set.birdCount || 0), 0);

  // Egg stats
  const totalEggs = eggRecords.reduce((s, e) => s + recordEggBreakdown(e).total, 0);
  const sellableEggs = eggRecords.reduce((s, e) => s + recordSellableEggs(e), 0);
  const singleEggs = eggRecords.reduce((s, e) => s + recordSingleEggs(e), 0);
  const doubleEggs = eggRecords.reduce((s, e) => s + recordDoubleEggs(e), 0);
  const brokenEggs = eggRecords.reduce((s, e) => s + e.brokenEggs, 0);
  const rejectedEggs = eggRecords.reduce((s, e) => s + e.rejectedEggs, 0);

  // Egg stock (remaining = closing of the latest day within the range)
  const rangeStocks = stocks.filter((s) => s.date >= start && s.date <= end);
  const latestStock = rangeStocks[0] || stocks[0] || null;
  const remainingEggs = latestStock ? latestStock.closingStock : 0;
  const liveAvailable = await getAvailableEggs(new Date());
  const currentAvailable = Math.max(0, liveAvailable);

  // Sales
  const eggsSold = sales.reduce((s, sl) => s + saleTotalEggs(sl), 0);
  const soldSingle = sales.reduce((s, sl) => s + saleSingleEggs(sl), 0);
  const soldDouble = sales.reduce((s, sl) => s + saleDoubleEggs(sl), 0);
  const wholesaleEggsSold = wholesaleSales
    .filter((w) => w.eggClass === 'Good')
    .reduce((s, w) => s + w.eggQuantity, 0);
  const localRevenue = sales.reduce((s, sl) => s + sl.totalAmount, 0);
  const wholesaleRevenue = wholesaleSales.reduce((s, w) => s + w.totalAmount, 0);
  const salesRevenue = round2(localRevenue + wholesaleRevenue);
  const amountReceived = round2(
    sales.reduce((s, sl) => s + sl.paidAmount, 0) +
    wholesaleSales.reduce((s, w) => s + w.paidAmount, 0)
  );
  const pendingAmount = round2(
    sales.reduce((s, sl) => s + sl.pendingAmount, 0) +
    wholesaleSales.reduce((s, w) => s + w.pendingAmount, 0)
  );
  const customerCount = new Set(sales.map((sl) => String(sl.customer))).size;

  // Labour
  const labourCount = await Labour.countDocuments({ isActive: true });
  const labourExpense = labourExpenses.reduce((s, e) => s + e.amount, 0);

  // Expenses — all recorded costs: direct expenses + feed consumed + labour ledger.
  const expensesAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const feedCost = usages.reduce((s, u) => s + Number(u.feedCost || 0), 0);
  const totalExpenses = round2(expensesAmount + feedCost + labourExpense);
  const feedUsed = usages.reduce((s, u) => s + Number(u.feedUsed || 0), 0);

  // Feed remaining (current)
  const feedRemaining = await getAvailableFeedKg();
  const minFeedDoc = await FarmSettings.findOne({ key: 'minimumFeedStock' });
  const minFeed = minFeedDoc && Number(minFeedDoc.value) > 0 ? Number(minFeedDoc.value) : 0;
  const lowFeed = feedRemaining <= minFeed;

  // Min egg stock setting
  const minEggDoc = await FarmSettings.findOne({ key: 'minimumEggStock' });
  const minEgg = minEggDoc && Number(minEggDoc.value) > 0 ? Number(minEggDoc.value) : 0;
  const lowEgg = remainingEggs <= minEgg;

  // Hen mortality statistics
  const henStats = await computeHenStats();
  const setHens = sets.map((s) => {
    const hs = (henStats.sets || []).find((x) => String(x.setId) === String(s._id));
    return {
      id: s._id,
      name: s.name,
      birdCount: s.birdCount,
      status: s.status,
      deadHens: hs ? hs.totalDeadHens : 0,
      liveHens: hs ? hs.liveHens : Number(s.birdCount || 0),
      todayDeaths: hs ? hs.todayDeadHens : 0,
    };
  });
  const recentMortality = await DeadHenRecord.find({ isActive: true })
    .populate('set', 'name')
    .sort({ date: -1, createdAt: -1 })
    .limit(6);

  // Mortality alert threshold (configurable in Settings)
  const mortalityAlertDoc = await FarmSettings.findOne({ key: 'mortalityAlertThreshold' });
  const mortalityAlertThreshold = mortalityAlertDoc && Number(mortalityAlertDoc.value) > 0 ? Number(mortalityAlertDoc.value) : 0;
  const highMortality = mortalityAlertThreshold > 0 && henStats.todayDeadHens > mortalityAlertThreshold;

  // Revenue / Profit
  const totalRevenue = salesRevenue;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? round2((netProfit / totalRevenue) * 100) : 0;

  // Production metrics
  const avgBirds =
    eggRecords.length > 0 ? eggRecords.reduce((s, e) => s + e.birds, 0) / eggRecords.length : totalHens || 1;
  const productionRate = avgBirds > 0 ? round2((totalEggs / avgBirds) * 100) : 0;
  const avgEggsPerHen = totalHens > 0 ? round2(totalEggs / totalHens) : 0;

  // Per-egg economics (cost analysis)
  const costPerEgg = totalEggs > 0 ? round2(totalExpenses / totalEggs) : 0;
  const profitPerEgg = totalEggs > 0 ? round2(netProfit / totalEggs) : 0;
  const revenuePerEgg = totalEggs > 0 ? round2(totalRevenue / totalEggs) : 0;

  return {
    range: label,
    start,
    end,
    cards: {
      totalHens,
      setHens,
      recentMortality,
      totalEggs,
      singleEggs,
      doubleEggs,
      sellableEggs,
      brokenEggs,
      rejectedEggs,
      eggsSold,
      soldSingle,
      soldDouble,
      wholesaleEggsSold,
      totalEggsSold: eggsSold + wholesaleEggsSold,
      remainingEggs,
      currentAvailable,
      localRevenue,
      wholesaleRevenue,
      salesRevenue,
      amountReceived,
      pendingAmount,
      feedUsed,
      feedRemaining,
      expensesAmount,
      feedCost,
      totalExpenses,
      totalRevenue,
      netProfit,
      profitMargin,
      productionRate,
      avgEggsPerHen,
      costPerEgg,
      profitPerEgg,
      revenuePerEgg,
      customerCount,
      lowFeed,
      lowEgg,
      minFeed,
      minEgg,
      ...henStats,
      mortalityAlertThreshold,
      highMortality,
      labourCount,
      totalLabours: labourCount,
      labourExpense,
    },
    eggPrice: {
      pricePerEgg: priceResult.price,
      source: priceResult.source,
      updated: priceResult.date,
      localSellingPrice:
        priceResult.localSellingPrice == null ? await getLocalPrice() : priceResult.localSellingPrice,
      location: priceResult.location,
      notes: priceResult.notes,
      apiError: priceResult.apiError,
    },
    charts: {
      mortality: henStats.deathTrend || [],
      eggProduction: await eggProductionSeries(start, end),
      localSales: await localSalesSeries(start, end),
      expenses: await expensesSeries(start, end),
      feedUsage: await feedUsageSeries(start, end),
      labourExpenses: await labourExpenseSeries(start, end),
      labourBreakdown: await labourCategoryBreakdown(start, end),
    },
  };
}

async function getLocalPrice() {
  const doc = await FarmSettings.findOne({ key: 'defaultLocalSellingPrice' });
  return doc && Number(doc.value) > 0 ? Number(doc.value) : 0;
}

async function eggProductionSeries(start, end) {
  const records = await DailyEggRecord.find({ date: { $gte: start, $lte: end }, isActive: true })
    .populate('set', 'name')
    .sort({ date: 1 });
  const byDay = {};
  records.forEach((r) => {
    const key = toDateKey(r.date);
    if (!byDay[key]) byDay[key] = { date: key, total: 0, sellable: 0, single: 0, double: 0, broken: 0, sets: {} };
    byDay[key].total += recordEggBreakdown(r).total;
    byDay[key].sellable += recordSellableEggs(r);
    byDay[key].single += recordSingleEggs(r);
    byDay[key].double += recordDoubleEggs(r);
    byDay[key].broken += r.brokenEggs;
    const setName = r.set ? r.set.name : 'Unknown';
    byDay[key].sets[setName] = (byDay[key].sets[setName] || 0) + r.totalEggs;
  });
  return Object.values(byDay);
}

async function localSalesSeries(start, end) {
  const sales = await LocalSale.find({ date: { $gte: start, $lte: end }, isActive: true }).sort({ date: 1 });
  const byDay = {};
  sales.forEach((s) => {
    const key = toDateKey(s.date);
    if (!byDay[key]) byDay[key] = { date: key, eggs: 0, single: 0, double: 0, revenue: 0, received: 0, pending: 0 };
    byDay[key].eggs += saleTotalEggs(s);
    byDay[key].single += saleSingleEggs(s);
    byDay[key].double += saleDoubleEggs(s);
    byDay[key].revenue += s.totalAmount;
    byDay[key].received += s.paidAmount;
    byDay[key].pending += s.pendingAmount;
  });
  return Object.values(byDay).map((d) => ({
    ...d,
    revenue: round2(d.revenue),
    received: round2(d.received),
    pending: round2(d.pending),
  }));
}

async function expensesSeries(start, end) {
  const expenses = await Expense.find({ date: { $gte: start, $lte: end }, isActive: true }).sort({ date: 1 });
  const byDay = {};
  expenses.forEach((e) => {
    const key = toDateKey(e.date);
    byDay[key] = (byDay[key] || 0) + e.amount;
  });
  return Object.entries(byDay).map(([date, amount]) => ({ date, amount: round2(amount) }));
}

async function feedUsageSeries(start, end) {
  const usages = await FeedUsage.find({ date: { $gte: start, $lte: end }, isActive: true }).sort({ date: 1 });
  const byDay = {};
  usages.forEach((u) => {
    const key = toDateKey(u.date);
    if (!byDay[key]) byDay[key] = { date: key, used: 0, cost: 0 };
    byDay[key].used += Number(u.feedUsed || 0);
    byDay[key].cost += Number(u.feedCost || 0);
  });
  return Object.values(byDay).map((d) => ({ ...d, cost: round2(d.cost) }));
}

async function labourExpenseSeries(start, end) {
  const expenses = await LabourExpense.find({ date: { $gte: start, $lte: end }, isActive: true }).sort({ date: 1 });
  const byDay = {};
  expenses.forEach((e) => {
    const key = toDateKey(e.date);
    byDay[key] = (byDay[key] || 0) + e.amount;
  });
  return Object.entries(byDay).map(([date, amount]) => ({ date, amount: round2(amount) }));
}

async function labourCategoryBreakdown(start, end) {
  const groups = await LabourExpense.aggregate([
    { $match: { isActive: true, date: { $gte: start, $lte: end } } },
    { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { amount: -1 } },
  ]);
  return groups.map((g) => ({ category: g._id, amount: round2(g.amount), count: g.count }));
}

// GET /api/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const data = await computeDashboard(req);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, computeDashboard };