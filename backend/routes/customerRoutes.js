const express = require('express');
const {
  getCustomers,
  createCustomer,
  getCustomer,
  getCustomerLedger,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getCustomers).post(createCustomer);
router.route('/:id/ledger').get(getCustomerLedger);
router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);

module.exports = router;