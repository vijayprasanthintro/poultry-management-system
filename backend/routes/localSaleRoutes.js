const express = require('express');
const {
  getSales,
  createSale,
  getSale,
  updateSale,
  deleteSale,
} = require('../controllers/localSaleController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getSales).post(createSale);
router.route('/:id').get(getSale).put(updateSale).delete(deleteSale);

module.exports = router;