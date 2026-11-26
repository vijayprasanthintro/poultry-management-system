/* ============================================================
   SEED SCRIPT  (optional, demo/initial data)
   Run:  npm run seed  (from the project root)
   Creates:
     - Admin (configured through ADMIN_USERNAME / ADMIN_PASSWORD)
     - Poultry Set 1 and Set 2 + starting bird records
     - Demo egg production for the last 3 days
     - Demo egg prices (marked as MANUAL demo data)
     - A couple of demo customers + sales + payments
   All demo values are clearly labeled as DEMO DATA.
   ============================================================ */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const Admin = require('./models/Admin');
const PoultrySet = require('./models/PoultrySet');
const BirdRecord = require('./models/BirdRecord');
const DailyEggRecord = require('./models/DailyEggRecord');
const EggPrice = require('./models/EggPrice');
const Customer = require('./models/Customer');
const LocalSale = require('./models/LocalSale');
const CustomerPayment = require('./models/CustomerPayment');
const Labour = require('./models/Labour');
const LabourExpense = require('./models/LabourExpense');
const FarmSettings = require('./models/FarmSettings');
const { startOfDay } = require('./utils/helpers');

const daysAgo = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

// Guard: never re-run demo seed if real farm data already exists.
const hasRealData = async () => {
  const sets = await PoultrySet.countDocuments();
  const sales = await LocalSale.countDocuments();
  return sets > 0 || sales > 0;
};

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Set it in .env or the Vercel dashboard before seeding.');
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  if (await hasRealData()) {
    console.log('WARNING: Real farm data already exists. Demo seed skipped to protect your data.');
    console.log('To force a demo reseed, delete all collections first.');
    await mongoose.disconnect();
    return;
  }

  console.log('Seeding demo data...');

  // ---- Admin ----
  const admin = await Admin.create({
    name: process.env.ADMIN_NAME || 'BALA SUBRAMANI',
    username: (process.env.ADMIN_USERNAME || 'bala').toLowerCase(),
    email: process.env.ADMIN_EMAIL || 'admin@balasubramanipoultry.com',
    password: process.env.ADMIN_PASSWORD || 'Bala@1234', // hashed automatically by the model's pre-save hook
  });

  // ---- Farm settings ----
  const settings = {
    farmName: 'BALASUBRAMANI POULTRY',
    location: 'Namakkal, Tamil Nadu, India',
    currency: 'INR',
    eggUnit: 'Egg',
    contact: '',
    phone: '',
    defaultLocalSellingPrice: '5.50',
    minimumEggStock: '200',
    minimumFeedStock: '100',
  };
  await FarmSettings.insertMany(Object.entries(settings).map(([key, value]) => ({ key, value })));

  // ---- Poultry sets ----
  const set1 = await PoultrySet.create({
    name: 'SET 1',
    birdCount: 500,
    startingBirdCount: 500,
    breed: 'BV-300 White Leghorn',
    startingDate: daysAgo(150),
    house: 'House A',
    age: 150,
    status: 'ACTIVE',
    notes: 'DEMO DATA - Sample layer flock.',
  });
  const set2 = await PoultrySet.create({
    name: 'SET 2',
    birdCount: 600,
    startingBirdCount: 600,
    breed: 'BV-300 White Leghorn',
    startingDate: daysAgo(120),
    house: 'House B',
    age: 120,
    status: 'ACTIVE',
    notes: 'DEMO DATA - Sample layer flock.',
  });

  await BirdRecord.create([
    { set: set1._id, date: daysAgo(150), openingBirds: 0, newBirds: 500, mortality: 0, soldBirds: 0, currentBirds: 500, notes: 'DEMO DATA - Set 1 started.' },
    { set: set2._id, date: daysAgo(120), openingBirds: 0, newBirds: 600, mortality: 0, soldBirds: 0, currentBirds: 600, notes: 'DEMO DATA - Set 2 started.' },
  ]);

  // ---- Demo egg production for last 3 days ----
  const prod = [
    { set: set1, rate: 0.48 },
    { set: set2, rate: 0.50 },
  ];
  for (let day = 2; day >= 0; day--) {
    for (const p of prod) {
      const total = Math.round(p.set.birdCount * p.rate);
      const dbl = Math.floor(total * 0.05);
      const single = total - dbl;
      const broken = Math.floor(total * 0.01);
      const rejected = Math.floor(total * 0.005);
      await DailyEggRecord.create({
        set: p.set._id,
        date: daysAgo(day),
        birds: p.set.birdCount,
        singleEggs: single,
        doubleEggs: dbl,
        totalEggs: total,
        brokenEggs: broken,
        rejectedEggs: rejected,
        sellableEggs: single + dbl,
        notes: 'DEMO DATA',
      });
    }
  }

  // ---- Demo egg prices ----
  await EggPrice.create([
    { date: daysAgo(2), pricePerEgg: 5.1, localSellingPrice: 5.4, source: 'MANUAL', location: 'Namakkal', notes: 'DEMO DATA' },
    { date: daysAgo(1), pricePerEgg: 5.2, localSellingPrice: 5.5, source: 'MANUAL', location: 'Namakkal', notes: 'DEMO DATA (Last known)' },
  ]);

  // ---- Demo customers + sales + payments ----
  const c1 = await Customer.create({ name: 'Kumar Store', mobile: '9876543210', address: 'Main Road', area: 'Namakkal', customerType: 'Shop', defaultPrice: 5.5, notes: 'DEMO DATA' });
  const c2 = await Customer.create({ name: 'Meena Household', mobile: '9876543211', address: 'Thirunagar', area: 'Namakkal', customerType: 'Household', defaultPrice: 5.5, notes: 'DEMO DATA' });

  const sale1 = await LocalSale.create({
    date: daysAgo(1),
    customer: c1._id,
    set: null,
    singleEggQuantity: 180,
    doubleEggQuantity: 20,
    singleEggPrice: 5.5,
    doubleEggPrice: 7,
    eggQuantity: 200,
    pricePerEgg: 5.65,
    totalAmount: 1130,
    paidAmount: 1130,
    pendingAmount: 0,
    paymentStatus: 'PAID',
    paymentMethod: 'UPI',
    notes: 'DEMO DATA',
  });

  const sale2 = await LocalSale.create({
    date: daysAgo(1),
    customer: c2._id,
    set: null,
    singleEggQuantity: 30,
    doubleEggQuantity: 0,
    singleEggPrice: 5.5,
    doubleEggPrice: 7,
    eggQuantity: 30,
    pricePerEgg: 5.5,
    totalAmount: 165,
    paidAmount: 100,
    pendingAmount: 65,
    paymentStatus: 'PARTIAL',
    paymentMethod: 'Cash',
    notes: 'DEMO DATA',
  });

  const sale3 = await LocalSale.create({
    date: daysAgo(0),
    customer: c1._id,
    set: null,
    singleEggQuantity: 90,
    doubleEggQuantity: 10,
    singleEggPrice: 5.5,
    doubleEggPrice: 7,
    eggQuantity: 100,
    pricePerEgg: 5.65,
    totalAmount: 565,
    paidAmount: 0,
    pendingAmount: 565,
    paymentStatus: 'PENDING',
    paymentMethod: '',
    notes: 'DEMO DATA',
  });

  await CustomerPayment.create({
    customer: c1._id,
    sale: sale1._id,
    amount: 1100,
    paymentDate: daysAgo(1),
    paymentMethod: 'UPI',
    notes: 'DEMO DATA',
  });

  void sale2;
  void sale3;

  // ---- Demo labourers + labour expenses (per-labourer ledger) ----
  const worker1 = await Labour.create({ name: 'Ravi Kumar', mobile: '9000000001', role: 'Worker', dailyWage: 500, hiredDate: daysAgo(200), notes: 'DEMO DATA' });
  const worker2 = await Labour.create({ name: 'Murugan', mobile: '9000000002', role: 'Worker', dailyWage: 450, hiredDate: daysAgo(160), notes: 'DEMO DATA' });
  const cleaner = await Labour.create({ name: 'Lakshmi', mobile: '9000000003', role: 'Cleaner', dailyWage: 350, hiredDate: daysAgo(90), notes: 'DEMO DATA' });
  const supervisor = await Labour.create({ name: 'Senthil', mobile: '9000000004', role: 'Supervisor', dailyWage: 700, hiredDate: daysAgo(120), notes: 'DEMO DATA' });

  const labourExpenses = [
    { labour: worker1, category: 'Food', purpose: 'Lunch', amount: 150, date: daysAgo(2) },
    { labour: worker1, category: 'Travel', purpose: 'Market trip', amount: 120, date: daysAgo(1) },
    { labour: worker1, category: 'Food', purpose: 'Lunch', amount: 150, date: daysAgo(0) },
    { labour: worker2, category: 'Food', purpose: 'Breakfast', amount: 80, date: daysAgo(3) },
    { labour: worker2, category: 'Medicine', purpose: 'Pain balm', amount: 60, date: daysAgo(1) },
    { labour: worker2, category: 'Food', purpose: 'Lunch', amount: 140, date: daysAgo(0) },
    { labour: cleaner, category: 'Bus', purpose: 'Bus fare', amount: 40, date: daysAgo(2) },
    { labour: cleaner, category: 'Food', purpose: 'Dinner', amount: 100, date: daysAgo(0) },
    { labour: supervisor, category: 'Travel', purpose: 'Vet visit', amount: 250, date: daysAgo(3) },
    { labour: supervisor, category: 'Food', purpose: 'Lunch', amount: 160, date: daysAgo(1) },
    { labour: supervisor, category: 'Market', purpose: 'Seed purchase', amount: 300, date: daysAgo(0) },
  ];
  await LabourExpense.create(labourExpenses.map((e) => ({ labour: e.labour._id, category: e.category, purpose: e.purpose, amount: e.amount, date: e.date, notes: 'DEMO DATA' })));

  // Materialize egg stock for the demo days so remaining stock shows correctly.
  const { refreshEggStockForDate } = require('./services/eggStockService');
  for (let day = 2; day >= 0; day--) {
    await refreshEggStockForDate(daysAgo(day));
  }

  console.log('Demo seed complete.');
  console.log('---------------------------------------------');
  console.log('Admin login:');
  console.log(`  Username: ${admin.username}`);
  console.log('  Password: configured via ADMIN_PASSWORD (not shown).');
  console.log('All records above are labeled DEMO DATA.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});