const express = require('express');
const {
  getLabours,
  createLabour,
  getLabour,
  updateLabour,
  toggleLabour,
  deleteLabour,
} = require('../controllers/labourController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getLabours).post(createLabour);
router.route('/:id/toggle').put(toggleLabour);
router.route('/:id').get(getLabour).put(updateLabour).delete(deleteLabour);

module.exports = router;