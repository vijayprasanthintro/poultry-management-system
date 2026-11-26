const express = require('express');
const { getAuditLogs } = require('../controllers/auditLogController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', getAuditLogs);

module.exports = router;