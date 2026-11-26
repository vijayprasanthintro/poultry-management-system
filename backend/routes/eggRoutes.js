const express = require('express');
const {
  getEggRecords,
  getTodaySummary,
  createEggRecord,
  getEggRecord,
  updateEggRecord,
  deleteEggRecord,
} = require('../controllers/eggController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/today-summary', getTodaySummary);
router.route('/').get(getEggRecords).post(createEggRecord);
router.route('/:id').get(getEggRecord).put(updateEggRecord).delete(deleteEggRecord);

module.exports = router;