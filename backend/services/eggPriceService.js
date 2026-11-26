/**
 * eggPriceService.js
 * ------------------
 * Configurable market/reference egg-price service for Namakkal / Tamil Nadu.
 *
 * Behavior:
 *  1. If EGG_PRICE_API_URL is configured, try to fetch a current price.
 *  2. Validate the response; extract pricePerEgg via EGG_PRICE_API_PRICE_PATH.
 *  3. Store the fetched price in MongoDB with source 'API'.
 *  4. On failure: NEVER invent a price. Fall back to the LAST_KNOWN price
 *     already stored in MongoDB and mark it clearly as outdated.
 *  5. The admin can always enter/save a MANUAL price through the API.
 */
const EggPrice = require('../models/EggPrice');
const { extractPrice, getPath } = require('../utils/helpers');

const isConfigured = () => Boolean(process.env.EGG_PRICE_API_URL);

async function fetchFromApi() {
  if (!isConfigured()) {
    const err = new Error('No EGG_PRICE_API_URL configured.');
    err.code = 'NO_CONFIG';
    throw err;
  }

  const url = process.env.EGG_PRICE_API_URL;
  const headers = { Accept: 'application/json' };
  const apiKey = process.env.EGG_PRICE_API_KEY;
  const keyHeader = process.env.EGG_PRICE_API_KEY_HEADER || 'x-api-key';
  if (apiKey) headers[keyHeader] = apiKey;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) {
      const err = new Error(`Egg price API responded with status ${res.status}.`);
      err.code = 'HTTP_STATUS';
      throw err;
    }
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('xml')) {
      // Minimal XML price extraction helper (see below).
      body = { __xml: text };
    } else {
      try {
        body = JSON.parse(text);
      } catch (e) {
        body = text;
      }
    }

    let price = null;
    if (body && body.__xml) {
      price = extractXmlPrice(body.__xml);
    } else {
      const path = process.env.EGG_PRICE_API_PRICE_PATH || 'price';
      price = typeof body === 'object' ? extractPrice(body, path) : extractPrice({ price: text }, 'price');
    }

    if (price == null || !(price > 0)) {
      const err = new Error('Egg price API response did not contain a valid price.');
      err.code = 'BAD_RESPONSE';
      throw err;
    }
    return { pricePerEgg: Math.round(price * 100) / 100, raw: body };
  } catch (err) {
    clearTimeout(timer);
    if (err.code) throw err;
    const wrapped = new Error(`Unable to reach egg price API: ${err.message}`);
    wrapped.code = 'NETWORK';
    throw wrapped;
  }
}

function extractXmlPrice(xml) {
  // Simplistic fallback: look for <price>5.20</price> or "price="5.20"" patterns.
  const regex = /<price[^>]*>([\d.]+)<\/price>/i;
  const match = xml.match(regex);
  if (match) {
    const num = Number(match[1]);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return null;
}

/**
 * Get the current egg price (API -> LAST_KNOWN fallback).
 * Returns { price, source, date, location, notes, apiError }
 */
async function getCurrentPrice() {
  if (isConfigured()) {
    try {
      const { pricePerEgg } = await fetchFromApi();
      const saved = await EggPrice.create({
        date: new Date(),
        pricePerEgg,
        source: 'API',
        location: 'Namakkal (API)',
        notes: 'Fetched from configured API source',
      });
      return {
        price: saved.pricePerEgg,
        source: 'API',
        date: saved.date,
        location: saved.location,
        id: saved._id,
      };
    } catch (apiError) {
      const lastKnown = await EggPrice.findOne({ isActive: true }).sort({ date: -1 });
      if (lastKnown) {
        return {
          price: lastKnown.pricePerEgg,
          source: 'LAST_KNOWN',
          date: lastKnown.date,
          location: lastKnown.location,
          apiError: apiError.message,
          notes: 'Shows last known price because the API could not be reached. It may be outdated.',
        };
      }
      return {
        price: null,
        source: 'NONE',
        date: null,
        apiError: apiError.message,
        notes: 'Unable to fetch market egg price. Please enter the price manually.',
      };
    }
  }

  const lastKnown = await EggPrice.findOne({ isActive: true }).sort({ date: -1 });
  if (lastKnown) {
    return {
      price: lastKnown.pricePerEgg,
      source: 'LAST_KNOWN',
      date: lastKnown.date,
      location: lastKnown.location,
      notes: 'No API configured. Showing last known stored price.',
    };
  }
  return {
    price: null,
    source: 'NONE',
    date: null,
    notes: 'No price available yet. Please enter today\u2019s price manually.',
  };
}

module.exports = { getCurrentPrice, fetchFromApi, isConfigured, extractPrice, getPath };