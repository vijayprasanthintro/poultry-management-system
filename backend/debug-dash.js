const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Set it in .env before running this debug script.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const { computeDashboard } = require('./controllers/dashboardController');
  const fakeReq = { query: { range: 'today' } };
  const data = await computeDashboard(fakeReq);
  console.log('range:', data.range, data.start.toISOString(), data.end.toISOString());
  console.log('cards:', JSON.stringify(data.cards, null, 1));
  await mongoose.disconnect();
})();