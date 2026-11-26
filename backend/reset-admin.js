/* Reset an existing admin password without printing the password.
 *
 * Reads ADMIN_USERNAME and ADMIN_PASSWORD from the environment (or local .env
 * files loaded below). The Admin model's pre-save hook hashes the password with
 * bcrypt exactly like the rest of the app.
 */
const path = require('path');

const dotenvModule = require('dotenv');
const dotenv = dotenvModule.default || dotenvModule;
// Absolute paths keep this script working from any folder. override:false keeps
// values already provided by the caller (or Vercel) authoritative.
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: false });
dotenv.config({ path: path.join(__dirname, '.env'), override: false });

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Admin = require('./models/Admin');

async function resetAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in the environment.');
  }
  if (String(password).length < 6) {
    throw new Error('ADMIN_PASSWORD must be at least 6 characters.');
  }

  await connectDB();

  const normalizedUsername = String(username).trim().toLowerCase();
  const admin = await Admin.findOne({ username: normalizedUsername });
  if (!admin) {
    throw new Error('No admin found for that username.');
  }

  // The Admin pre-save hook bcrypt-hashes this value before persistence.
  admin.password = String(password);
  await admin.save();

  console.log('Admin password updated successfully.');
}

(async () => {
  try {
    await resetAdmin();
  } catch (err) {
    console.error(`Reset failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
  }
})();
