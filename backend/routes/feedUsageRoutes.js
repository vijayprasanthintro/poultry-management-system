const express = require('express');
const {
  getFeedUsage,
  getSummary,
  createFeedUsage,
  updateFeedUsage,
  deleteFeedUsage,
} = require('../controllers/feedUsageController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/summary', getSummary);
router.route('/').get(getFeedUsage).post(createFeedUsage);
router.route('/:id').put(updateFeedUsage).delete(deleteFeedUsage);

module.exports = router;