/* Shared small helpers used across controllers. */

/** Create an HTTP-aware error that the central error handler understands. */
const createError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/** Parse a user-supplied date. Throws a 400 error for invalid input. */
const parseDate = (value, field = 'date') => {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) throw createError(`Invalid ${field}.`);
  return d;
};

/** Parse an optional date query parameter (returns null when absent). */
const parseDateParam = (value, field = 'date') => {
  if (value === undefined || value === null || value === '') return null;
  return parseDate(value, field);
};

/** Strict non-negative integer parser for quantities/counts. */
const parseNonNegativeInteger = (value, field, defaultValue = 0, allowZero = true) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || (!allowZero && n === 0)) {
    throw createError(`${field} must be ${allowZero ? 'a non-negative' : 'a positive'} integer.`);
  }
  return n;
};

/** Strict money/quantity parser with a configurable lower bound. */
const parseAmount = (value, field, defaultValue = 0, min = 0) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) {
    throw createError(`${field} must be ${min === 0 ? 'a non-negative' : `at least ${min}`} number.`);
  }
  return round2(n);
};

/** Escape user input before using it in a case-insensitive RegExp filter. */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Convert a Date to a sortable YYYY-MM-DD local string. */
const toDateKey = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Start of local day (midnight). */
const startOfDay = (d) => {
  const dt = new Date(d instanceof Date ? d.getTime() : d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

/** End of local day (11:59:59.999). */
const endOfDay = (d) => {
  const dt = new Date(d instanceof Date ? d.getTime() : d);
  dt.setHours(23, 59, 59, 999);
  return dt;
};

/** Date range helpers based on a label: today|yesterday|7|30|month|year|custom. */
const getDateRange = (req) => {
  const { from, to, range } = req.query;
  const now = new Date();
  const fromDate = parseDateParam(from, 'from date');
  const toDate = parseDateParam(to, 'to date');
  if (fromDate && toDate && fromDate > toDate) {
    throw createError('From date cannot be after to date.');
  }
  let start;
  let end;
  let label = range || 'today';

  switch (range) {
    case 'yesterday': {
      start = startOfDay(new Date(now.getTime() - 86400000));
      end = endOfDay(new Date(now.getTime() - 86400000));
      label = 'yesterday';
      break;
    }
    case '7': {
      start = startOfDay(new Date(now.getTime() - 6 * 86400000));
      end = endOfDay(now);
      label = 'last7';
      break;
    }
    case '30': {
      start = startOfDay(new Date(now.getTime() - 29 * 86400000));
      end = endOfDay(now);
      label = 'last30';
      break;
    }
    case 'month': {
      start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      end = endOfDay(now);
      label = 'month';
      break;
    }
    case 'year': {
      start = startOfDay(new Date(now.getFullYear(), 0, 1));
      end = endOfDay(now);
      label = 'year';
      break;
    }
    default:
      if (fromDate || toDate) {
        start = fromDate ? startOfDay(fromDate) : startOfDay(new Date(0));
        end = toDate ? endOfDay(toDate) : endOfDay(now);
        label = 'custom';
      } else {
        start = startOfDay(now);
        end = endOfDay(now);
        label = 'today';
      }
  }

  return { start, end, label };
};

/** Resolve a nested value from an object using dot notation. */
const getPath = (obj, path) => {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
};

/** Extract a numeric price from an arbitrary API response. */
const extractPrice = (body, path) => {
  let value = getPath(body, path);
  if (typeof value === 'string') {
    // Allow things like "₹5.20", "5.25 /egg", "5.25 rs"
    const match = value.replace(/[^\d.]/g, '') || (value.includes('.') ? value : null);
    value = match;
  }
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

/** Round helpers. */
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const round1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;

/** Build the default date filter from a request (shared by reports). */
const defaultDateFilter = (req) => getDateRange(req);

/**
 * Egg breakdown helpers.
 * New DailyEggRecord documents store singleEggs and doubleEggs separately.
 * Legacy documents only have totalEggs (+ broken/rejected). These helpers are
 * backward compatible: legacy "single" = totalEggs - broken - rejected.
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const recordEggBreakdown = (r) => {
  const broken = num(r.brokenEggs);
  const rejected = num(r.rejectedEggs);
  const singleEggs = r.singleEggs != null ? num(r.singleEggs) : null;
  const doubleEggs = r.doubleEggs != null ? num(r.doubleEggs) : null;
  let single;
  let dbl;
  if (singleEggs !== null || doubleEggs !== null) {
    single = singleEggs !== null ? singleEggs : 0;
    dbl = doubleEggs !== null ? doubleEggs : 0;
  } else {
    const total = num(r.totalEggs);
    single = Math.max(0, total - broken - rejected);
    dbl = 0;
  }
  const totalPhysical = single + dbl + broken + rejected;
  const sellable = single + dbl;
  return { total: totalPhysical, single, dbl, broken, rejected, sellable };
};

const recordTotalEggs = (r) => recordEggBreakdown(r).total;
const recordSellableEggs = (r) => recordEggBreakdown(r).sellable;
const recordSingleEggs = (r) => recordEggBreakdown(r).single;
const recordDoubleEggs = (r) => recordEggBreakdown(r).dbl;

const SP_EVAL = (d) => (d.singleEggQuantity != null ? d.singleEggQuantity : d.eggQuantity || 0);
const DP_EVAL = (d) => (d.doubleEggQuantity != null ? d.doubleEggQuantity : 0);

const saleTotalEggs = (s) => {
  if (s.singleEggQuantity != null || s.doubleEggQuantity != null) {
    return num(s.singleEggQuantity) + num(s.doubleEggQuantity);
  }
  return num(s.eggQuantity);
};

const saleSingleEggs = (s) => SP_EVAL(s);
const saleDoubleEggs = (s) => DP_EVAL(s);

/** Effective total sale = single*qty*singlePrice + double*qty*doublePrice (legacy-safe). */
const saleTotalAmount = (s) => {
  if (s.singleEggQuantity != null || s.doubleEggQuantity != null) {
    return (
      num(s.singleEggQuantity) * num(s.singleEggPrice) +
      num(s.doubleEggQuantity) * num(s.doubleEggPrice)
    );
  }
  return num(s.eggQuantity) * num(s.pricePerEgg);
};

module.exports = {
  createError,
  parseDate,
  parseDateParam,
  parseNonNegativeInteger,
  parseAmount,
  escapeRegex,
  toDateKey,
  startOfDay,
  endOfDay,
  getDateRange,
  getPath,
  extractPrice,
  round2,
  round1,
  defaultDateFilter,
  recordEggBreakdown,
  recordTotalEggs,
  recordSellableEggs,
  recordSingleEggs,
  recordDoubleEggs,
  saleTotalEggs,
  saleSingleEggs,
  saleDoubleEggs,
  saleTotalAmount,
  num,
};