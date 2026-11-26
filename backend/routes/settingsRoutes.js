const express = require('express');
const {
  getSettings,
  getPublicSettings,
  updateSettings,
  getSettingsStats,
  exportSettingsData,
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/public', getPublicSettings);
router.use(protect);

router.route('/').get(getSettings).put(updateSettings);
router.get('/stats', getSettingsStats);
router.get('/export', exportSettingsData);

module.exports = router;