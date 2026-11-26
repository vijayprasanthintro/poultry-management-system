const express = require('express');
const {
  getSets,
  createSet,
  getSet,
  updateSet,
  deleteSet,
} = require('../controllers/poultrySetController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getSets).post(createSet);
router.route('/:id').get(getSet).put(updateSet).delete(deleteSet);

module.exports = router;