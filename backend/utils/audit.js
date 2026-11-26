const AuditLog = require('../models/AuditLog');

/** Central audit helper. Usage:
 *  logAudit(req, { action, recordType, recordId, oldValue, newValue })
 */
const logAudit = async (req, { action, recordType, recordId, oldValue, newValue }) => {
  try {
    await AuditLog.create({
      admin: req.admin ? req.admin._id : undefined,
      adminName: req.admin ? req.admin.name : '',
      action,
      recordType,
      recordId: recordId ? String(recordId) : '',
      oldValue,
      newValue,
      ip: req.ip || '',
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
};

module.exports = logAudit;