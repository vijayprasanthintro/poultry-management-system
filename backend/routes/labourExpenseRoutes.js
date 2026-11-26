const express = require('express');
const {
  getLabourExpenses,
  createLabourExpense,
  updateLabourExpense,
  deleteLabourExpense,
  createCommonLabourExpense,
  deleteCommonLabourExpense,
} = require('../controllers/labourController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getLabourExpenses).post(createLabourExpense);
router.post('/common', createCommonLabourExpense);
router.delete('/common/:group', deleteCommonLabourExpense);
router.route('/:id').put(updateLabourExpense).delete(deleteLabourExpense);

module.exports = router;