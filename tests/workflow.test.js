const test = require('node:test');
const assert = require('node:assert/strict');
// Reuse the backend's installed Mongoose rather than adding a root dependency.
const mongoose = require('../backend/node_modules/mongoose');

// Safety: force an isolated database before the app (and dotenv) is loaded.
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/poultry_test';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough';
process.env.JWT_EXPIRES_IN = '1h';

const dbName = new URL(process.env.MONGODB_URI).pathname.replace(/^\//, '');
if (dbName !== 'poultry_test') {
  throw new Error(`Refusing to run tests against database "${dbName}". Only poultry_test is allowed.`);
}

const { app, startServer } = require('../backend/server');
const Admin = require('../backend/models/Admin');
const PoultrySet = require('../backend/models/PoultrySet');
const Customer = require('../backend/models/Customer');

let server;
let baseUrl;
let token;
let setId;
let customerId;

const api = async (path, { method = 'GET', body, auth = true } = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
};

test.before(async () => {
  server = await startServer();
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Only the dedicated test database is touched here.
  await mongoose.connection.db.dropDatabase();

  await Admin.create({
    name: 'Workflow Test Admin',
    username: 'workflowtest',
    email: 'workflow@test.local',
    password: 'Test@12345',
  });
  const set = await PoultrySet.create({
    name: 'TEST SET',
    birdCount: 100,
    startingBirdCount: 100,
    status: 'ACTIVE',
  });
  const customer = await Customer.create({ name: 'Test Customer', mobile: '9000000000' });
  setId = String(set._id);
  customerId = String(customer._id);
});

test.after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('health endpoint responds publicly', async () => {
  const { status, data } = await api('/api/health', { auth: false });
  assert.equal(status, 200);
  assert.equal(data.success, true);
});

test('public settings expose login branding without requiring authentication', async () => {
  const { status, data } = await api('/api/settings/public', { auth: false });
  assert.equal(status, 200);
  assert.equal(data.settings.farmName, 'BALASUBRAMANI POULTRY');
  assert.equal(Object.prototype.hasOwnProperty.call(data.settings, 'defaultWage'), false);
});

test('login rejects bad credentials and issues a JWT for valid credentials', async () => {
  const bad = await api('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { username: 'workflowtest', password: 'wrong-password' },
  });
  assert.equal(bad.status, 401);

  const good = await api('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { username: 'workflowtest', password: 'Test@12345' },
  });
  assert.equal(good.status, 200);
  assert.equal(good.data.success, true);
  assert.ok(good.data.token);
  token = good.data.token;
});

test('protected routes reject missing tokens', async () => {
  const { status } = await api('/api/auth/me', { auth: false });
  assert.equal(status, 401);
});

test('egg production creates stock and rejects duplicate set/date entries', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    set: setId,
    date: today,
    birds: 100,
    singleEggs: 900,
    doubleEggs: 100,
    brokenEggs: 20,
    rejectedEggs: 10,
  };
  const created = await api('/api/eggs', { method: 'POST', body: payload });
  assert.equal(created.status, 201, created.data.message);
  assert.equal(created.data.record.totalEggs, 1030);
  assert.equal(created.data.record.sellableEggs, 1000);

  const duplicate = await api('/api/eggs', { method: 'POST', body: payload });
  assert.equal(duplicate.status, 400);
});

test('local sale validates stock, calculates totals, and updates payments', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const oversell = await api('/api/local-sales', {
    method: 'POST',
    body: { date: today, customer: customerId, set: setId, eggQuantity: 5000, pricePerEgg: 5, paidAmount: 0 },
  });
  assert.equal(oversell.status, 400);
  assert.match(oversell.data.message, /INSUFFICIENT EGG STOCK/);

  const sale = await api('/api/local-sales', {
    method: 'POST',
    body: { date: today, customer: customerId, set: setId, eggQuantity: 100, pricePerEgg: 5, paidAmount: 200 },
  });
  assert.equal(sale.status, 201, sale.data.message);
  assert.equal(sale.data.sale.totalAmount, 500);
  assert.equal(sale.data.sale.paidAmount, 200);
  assert.equal(sale.data.sale.pendingAmount, 300);
  assert.equal(sale.data.sale.paymentStatus, 'PARTIAL');
  global.testSaleId = String(sale.data.sale._id);
});

test('customer payment clears pending balance and rejects overpayment', async () => {
  const payment = await api('/api/customer-payments', {
    method: 'POST',
    body: { customer: customerId, sale: global.testSaleId, amount: 300, paymentMethod: 'Cash' },
  });
  assert.equal(payment.status, 201, payment.data.message);
  assert.equal(payment.data.updatedSale.pendingAmount, 0);
  assert.equal(payment.data.updatedSale.paymentStatus, 'PAID');

  const overpayment = await api('/api/customer-payments', {
    method: 'POST',
    body: { customer: customerId, sale: global.testSaleId, amount: 1 },
  });
  assert.equal(overpayment.status, 400);
});

test('dashboard and reports include sales, payments, and stock totals', async () => {
  const dashboard = await api('/api/dashboard?range=today');
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.data.cards.salesRevenue, 500);
  assert.equal(dashboard.data.cards.pendingAmount, 0);

  const payments = await api('/api/reports/data?type=customerPayments&range=today');
  assert.equal(payments.status, 200);
  assert.equal(payments.data.summary.total, 300);
  assert.equal(payments.data.summary.count, 1);

  const legacyAlias = await api('/api/reports/data?type=payments&range=today');
  assert.equal(legacyAlias.status, 200);
  assert.equal(legacyAlias.data.summary.total, 300);

  const salesReport = await api('/api/reports/data?type=sales&range=today');
  assert.equal(salesReport.status, 200);
  assert.equal(salesReport.data.summary.totalRevenue, 500);
});

test('settings update accepts a payload and logout invalidates the token', async () => {
  const settings = await api('/api/settings', {
    method: 'PUT',
    body: { farmName: 'Workflow Test Farm' },
  });
  assert.equal(settings.status, 200, settings.data.message);

  const logout = await api('/api/auth/logout', { method: 'POST' });
  assert.equal(logout.status, 200);
  const afterLogout = await api('/api/auth/me');
  assert.equal(afterLogout.status, 401);
});
