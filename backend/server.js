const fs = require('fs');
const path = require('path');
// Root .env is convenient for the one-command developer experience; the
// backend .env (if present) takes precedence because dotenv does not override
// values that are already set.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin/health-check requests with no Origin header.
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS.'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Brute-force protection for the only public endpoint.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', loginLimiter);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BALASUBRAMANI POULTRY API is running.', time: new Date() });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/poultry-sets', require('./routes/poultrySetRoutes'));
app.use('/api/birds', require('./routes/birdRoutes'));
app.use('/api/eggs', require('./routes/eggRoutes'));
app.use('/api/egg-stock', require('./routes/eggStockRoutes'));
app.use('/api/egg-prices', require('./routes/eggPriceRoutes'));
app.use('/api/feed', require('./routes/feedRoutes'));
app.use('/api/feed-usage', require('./routes/feedUsageRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/labours', require('./routes/labourRoutes'));
app.use('/api/labour-expenses', require('./routes/labourExpenseRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/local-sales', require('./routes/localSaleRoutes'));
app.use('/api/wholesale-sales', require('./routes/wholesaleSaleRoutes'));
app.use('/api/customer-payments', require('./routes/paymentRoutes'));
app.use('/api/dead-hens', require('./routes/deadHenRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// In production the same Express process serves the built React app.
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT !== undefined ? Number(process.env.PORT) : 5000;

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET is missing or too short. Set it in .env (at least 16 characters).');
  }
  await connectDB();
  const server = app.listen(PORT, () => {
    const actualPort = server.address().port;
    console.log(`BALASUBRAMANI POULTRY API running on http://localhost:${actualPort}`);
  });
  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { app, startServer };