const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/poultry');
  const { computeDashboard } = require('./controllers/dashboardController');
  const fakeReq = { query: { range: 'today' } };
  const data = await computeDashboard(fakeReq);
  console.log('range:', data.range, data.start.toISOString(), data.end.toISOString());
  console.log('cards:', JSON.stringify(data.cards, null, 1));
  await mongoose.disconnect();
})();