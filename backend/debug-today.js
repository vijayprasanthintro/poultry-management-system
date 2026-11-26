const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const { startOfDay, endOfDay } = require('./utils/helpers');
const DailyEggRecord = require('./models/DailyEggRecord');
const LocalSale = require('./models/LocalSale');
const EggStock = require('./models/EggStock');

(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Set it in .env before running this debug script.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const s = startOfDay(new Date());
  const e = endOfDay(new Date());
  console.log('TZ offset (min):', new Date().getTimezoneOffset());
  console.log('today range', s.toISOString(), e.toISOString());
  const eggs = await DailyEggRecord.find({ date: { $gte: s, $lte: e }, isActive: true });
  const sales = await LocalSale.find({ date: { $gte: s, $lte: e }, isActive: true });
  const stocks = await EggStock.find({}).sort({ date: -1 });
  console.log('eggs found', eggs.length, eggs.map((x) => x.date.toISOString()));
  console.log('sales found', sales.length, sales.map((x) => x.date.toISOString()));
  console.log('stocks', stocks.length, stocks.map((x) => ({ d: x.date.toISOString(), close: x.closingStock })));
  const allEggs = await DailyEggRecord.find({});
  console.log('all eggs', allEggs.length, allEggs.map((x) => x.date.toISOString()));
  await mongoose.disconnect();
})();