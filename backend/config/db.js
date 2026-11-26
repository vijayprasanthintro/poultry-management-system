const mongoose = require('mongoose');

function getConnectionCache() {
  if (!globalThis.__poultryMongo) {
    globalThis.__poultryMongo = { conn: null, promise: null };
  }
  return globalThis.__poultryMongo;
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const message =
      'MONGODB_URI is not set. Set the MongoDB connection string in the Vercel dashboard (or in .env for local development).';
    console.error(message);
    throw new Error(message);
  }

  const cache = getConnectionCache();

  // Reuse the default connection when something else already opened it.
  if (mongoose.connection.readyState === 1) {
    cache.conn = mongoose.connection;
    return cache.conn;
  }
  if (mongoose.connection.readyState === 2) {
    cache.promise = mongoose.connection.asPromise().then((conn) => {
      cache.conn = conn;
      return conn;
    });
    return cache.promise;
  }
  if (cache.conn && cache.conn.readyState === 1) {
    return cache.conn;
  }

  // Cache the in-flight promise so concurrent serverless invocations share one connection.
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { bufferCommands: false })
      .then((conn) => {
        cache.conn = conn;
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((err) => {
        cache.conn = null;
        cache.promise = null;
        console.error(`MongoDB connection error: ${err.message}`);
        throw err;
      });
  }

  return cache.promise;
};

module.exports = connectDB;
