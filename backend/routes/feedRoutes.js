const express = require('express');
const {
  getFeed,
  getFeedStock,
  createFeed,
  updateFeed,
  deleteFeed,
} = require('../controllers/feedController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/stock', getFeedStock);
router.route('/').get(getFeed).post(createFeed);
router.route('/:id').put(updateFeed).delete(deleteFeed);

module.exports = router;