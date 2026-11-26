const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const logAudit = require('../utils/audit');

const requireJwtSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    const err = new Error('JWT_SECRET is missing or too short. Set it in the backend .env file (at least 16 characters).');
    err.status = 500;
    throw err;
  }
  return process.env.JWT_SECRET;
};

const signToken = (id, version = 0) =>
  jwt.sign({ id, v: version }, requireJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password.' });
    }
    const admin = await Admin.findOne({ username: String(username).toLowerCase() }).select('+password');
    if (!admin || !(await admin.matchPassword(password))) {
      await logAudit(req, {
        action: 'LOGIN_ATTEMPT',
        recordType: 'Admin',
        newValue: { username, success: false },
      });
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }
    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'This account is deactivated.' });
    }
    admin.password = undefined;
    const token = signToken(admin._id, admin.tokenVersion);
    await logAudit(req, {
      action: 'LOGIN',
      recordType: 'Admin',
      recordId: admin._id,
      newValue: { username: admin.username },
    });
    res.json({ success: true, token, admin });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    res.json({ success: true, admin });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/me
const updateMe = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
    const old = { name: admin.name, email: admin.email, phone: admin.phone };
    if (name) admin.name = name;
    if (email !== undefined) admin.email = email;
    if (phone !== undefined) admin.phone = phone;
    if (req.body.password) {
      if (!req.body.oldPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to change password.' });
      }
      const matches = await admin.matchPassword(req.body.oldPassword);
      if (!matches) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      if (req.body.password.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      admin.password = req.body.password;
    }
    await admin.save();
    admin.password = undefined;
    await logAudit(req, {
      action: 'UPDATE_PROFILE',
      recordType: 'Admin',
      recordId: admin._id,
      oldValue: old,
      newValue: { name: admin.name, email: admin.email, phone: admin.phone },
    });
    res.json({ success: true, admin });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/session-status  (used to check token validity cheaply)
const sessionStatus = (req, res) => {
  res.json({ success: true, valid: true });
};

// POST /api/auth/logout-all  (revoke all sessions incl. the current device)
const logoutAllDevices = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
    const oldVersion = admin.tokenVersion || 0;
    admin.tokenVersion = oldVersion + 1;
    await admin.save();
    const token = signToken(admin._id, admin.tokenVersion);
    await logAudit(req, {
      action: 'LOGOUT_ALL',
      recordType: 'Admin',
      recordId: admin._id,
      oldValue: { tokenVersion: oldVersion },
      newValue: { tokenVersion: admin.tokenVersion },
    });
    res.json({ success: true, token, message: 'All other sessions have been revoked.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout — revoke the current admin's sessions server-side.
const logout = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (admin) {
      admin.tokenVersion = (admin.tokenVersion || 0) + 1;
      await admin.save();
    }
    await logAudit(req, {
      action: 'LOGOUT',
      recordType: 'Admin',
      recordId: req.admin._id,
      newValue: { username: req.admin.username },
    });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, updateMe, sessionStatus, logoutAllDevices, logout };