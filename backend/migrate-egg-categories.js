/* ============================================================
   Migration: split egg categories (single / double / broken / rejected)
   Run:  node migrate-egg-categories.js   (from /server)

   - Backfills DailyEggRecord.singleEggs / .doubleEggs for legacy
     records that only stored totalEggs.
     Legacy rule: Double Eggs were not tracked -> single = total - broken - rejected
   - Backfills LocalSale single/double quantities + prices for legacy
     records that only stored a combined eggQuantity + pricePerEgg.
   - Refreshes all EggStock records so production/sold/stock match.
   - Does NOT modify any manually-entered data beyond the rules above.
   ============================================================ */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const DailyEggRecord = require('./models/DailyEggRecord');
const LocalSale = require('./models/LocalSale');
const { refreshEggStockForDate } = require('./services/eggStockService');

async function migrate() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/poultry';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const eggStats = await DailyEggRecord.find({ isActive: true });
  let eggUpdated = 0;
  for (const r of eggStats) {
    if (r.singleEggs != null && r.doubleEggs != null) continue;
    const broken = Number(r.brokenEggs) || 0;
    const rejected = Number(r.rejectedEggs) || 0;
    const single = Math.max(0, (Number(r.totalEggs) || 0) - broken - rejected);
    r.singleEggs = single;
    r.doubleEggs = 0;
    r.sellableEggs = single;
    await r.save();
    eggUpdated++;
  }
  console.log(`DailyEggRecord: backfilled ${eggUpdated} legacy record(s).`);

  const sales = await LocalSale.find({ isActive: true });
  let saleUpdated = 0;
  for (const s of sales) {
    if (s.singleEggQuantity != null && s.doubleEggQuantity != null) continue;
    const qty = Number(s.eggQuantity) || 0;
    const price = Number(s.pricePerEgg) || 0;
    s.singleEggQuantity = qty;
    s.doubleEggQuantity = 0;
    s.singleEggPrice = price;
    s.doubleEggPrice = 0;
    await s.save();
    saleUpdated++;
  }
  console.log(`LocalSale: backfilled ${saleUpdated} legacy sale(s).`);

  // Refresh stock for all dates that have either egg records or sales.
  const dates = new Set();
  (await DailyEggRecord.find({ isActive: true }).select('date')).forEach((d) => dates.add(d.date.toDateString()));
  (await LocalSale.find({ isActive: true }).select('date')).forEach((d) => dates.add(d.date.toDateString()));
  for (const ds of dates) {
    await refreshEggStockForDate(new Date(ds));
  }
  console.log(`EggStock: refreshed ${dates.size} day(s).`);

  console.log('Migration complete.');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});