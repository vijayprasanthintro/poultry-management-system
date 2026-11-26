const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    adminName: { type: String, default: '', trim: true },
    action: { type: String, required: true, trim: true },
    recordType: { type: String, required: true, trim: true },
    recordId: { type: String, default: '' },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ recordType: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);