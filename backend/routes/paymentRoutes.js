const express = require('express');
const {
  getPayments,
  createPayment,
  updatePayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getPayments).post(createPayment);
router.route('/:id').put(updatePayment);

module.exports = router;