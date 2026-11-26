const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
const mongoose = require('mongoose');
const { startOfDay, endOfDay } = require('./backend/utils/helpers');
const DailyEggRecord = require('./backend/models/DailyEggRecord');
const LocalSale = require('./backend/models/LocalSale');
const EggStock = require('./backend/models/EggStock');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/poultry');
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
  await mongoose.disconnect();
})();