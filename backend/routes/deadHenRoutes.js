const express = require('express');
const {
  getDeadHenRecords,
  getDeadHenStats,
  createDeadHenRecord,
  updateDeadHenRecord,
  deleteDeadHenRecord,
} = require('../controllers/deadHenController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getDeadHenRecords).post(createDeadHenRecord);
router.get('/dashboard-stats', getDeadHenStats);
router.route('/:id').put(updateDeadHenRecord).delete(deleteDeadHenRecord);

module.exports = router;