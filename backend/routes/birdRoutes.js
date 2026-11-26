const express = require('express');
const {
  getBirdRecords,
  createBirdRecord,
  updateBirdRecord,
  deleteBirdRecord,
} = require('../controllers/birdController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getBirdRecords).post(createBirdRecord);
router.route('/:id').put(updateBirdRecord).delete(deleteBirdRecord);

module.exports = router;