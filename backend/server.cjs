const fs = require('fs');
const path = require('path');

// Some packages expose an ESM-facing default export that CommonJS resolves as
// an object with `default` (and sometimes a named export). Normalize before use.
const dotenvModule = require('dotenv');
const dotenv = dotenvModule.default || dotenvModule;
// Load local .env files by absolute path so this works from any folder.
// override:false keeps values already provided by Vercel authoritative.
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: false });
dotenv.config({ path: path.join(__dirname, '.env'), override: false });

const expressModule = require('express');
const express = expressModule.default || expressModule;
const corsModule = require('cors');
const cors = corsModule.default || corsModule;
// express-rate-limit has shipped different CommonJS shapes: some builds export
// the middleware directly, others export { rateLimit, default }. Normalize it
// and fail fast with the installed version if neither shape is callable.
const getRateLimitVersion = () => {
  try {
    // Modern packages do not export ./package.json, so resolve the main entry
    // and walk up to the package root instead of requiring the subpath.
    const entry = require.resolve('express-rate-limit');
    let dir = path.dirname(entry);
    while (dir && dir !== path.parse(dir).root) {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'express-rate-limit') return pkg.version;
      }
      dir = path.dirname(dir);
    }
  } catch (_) {
    // Fall through to the version pinned in this package's manifest.
  }
  try {
    return require('./package.json').dependencies['express-rate-limit'] || 'unknown';
  } catch (_) {
    return 'unknown';
  }
};

const rlMod = require('express-rate-limit');
const rateLimit = typeof rlMod === 'function' ? rlMod : (rlMod.rateLimit || rlMod.default);
if (typeof rateLimit !== 'function') {
  throw new Error(
    `express-rate-limit did not export a callable middleware (installed version: ${getRateLimitVersion()}). ` +
      'Pin express-rate-limit to 7.x in backend/package.json and reinstall dependencies.'
  );
}
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Vercel terminates TLS and supplies X-Forwarded-For. Rate limiting must trust it.
app.set('trust proxy', 1);

const DEFAULT_ORIGINS = [
  'https://poultry-monitor-system.vercel.app',
  'http://localhost:5173',
];

const extraOrigins = [process.env.CLIENT_URL, process.env.CORS_ORIGIN]
  .flatMap((value) => (value || '').split(','))
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...extraOrigins])];

const normalizeOrigin = (origin) => origin.replace(/\/+$/, '');

const corsOptions = {
  origin: (origin, callback) => {
    // No Origin means same-origin, a health check, or a non-browser client.
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS.'));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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

// Await the cached MongoDB connection before any DB-backed route runs.
const ensureDbReady = async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (err) {
    return next(err);
  }
};
app.use('/api', ensureDbReady);

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

// In local production the same Express process can serve the built React app.
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
  await connectDB();
  const server = app.listen(PORT, () => {
    const actualPort = server.address().port;
    console.log(`BALASUBRAMANI POULTRY API running on http://localhost:${actualPort}`);
  });
  return server;
}

// Vercel imports this module as the serverless app; it must not bind a port.
if (require.main === module && !process.env.VERCEL) {
  startServer().catch((err) => {
    console.error(`Failed to start server: ${err.message}`);
    process.exitCode = 1;
  });
}

// Vercel Express loads this file as the app's CommonJS default export.
module.exports = app;
module.exports.app = app;
module.exports.startServer = startServer;
module.exports.connectDB = connectDB;
