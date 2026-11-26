const express = require('express');
const {
  getCurrent,
  refreshNow,
  getPrices,
  createPrice,
  updatePrice,
} = require('../controllers/eggPriceController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/current', getCurrent);
router.get('/refresh', refreshNow);
router.route('/').get(getPrices).post(createPrice);
router.route('/:id').put(updatePrice);

module.exports = router;