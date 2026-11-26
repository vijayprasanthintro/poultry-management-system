const AuditLog = require('../models/AuditLog');
const { startOfDay, endOfDay, getDateRange } = require('../utils/helpers');

// GET /api/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const filter = { createdAt: { $gte: start, $lte: end } };
    if (req.query.action) filter.action = new RegExp(req.query.action, 'i');
    if (req.query.recordType) filter.recordType = new RegExp(req.query.recordType, 'i');
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAuditLogs };