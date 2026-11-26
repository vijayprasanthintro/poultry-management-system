const express = require('express');
const {
  getWholesaleSales,
  getWholesaleToday,
  getBrokenStock,
  createWholesaleSale,
  updateWholesaleSale,
  deleteWholesaleSale,
} = require('../controllers/wholesaleSaleController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/today', getWholesaleToday);
router.get('/broken-available', getBrokenStock);
router.route('/').get(getWholesaleSales).post(createWholesaleSale);
router.route('/:id').put(updateWholesaleSale).delete(deleteWholesaleSale);

module.exports = router;
