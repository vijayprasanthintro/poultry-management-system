const express = require('express');
const {
  getReportSummary,
  getReportData,
  exportCsv,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/summary', getReportSummary);
router.get('/data', getReportData);
router.get('/export', exportCsv);

module.exports = router;