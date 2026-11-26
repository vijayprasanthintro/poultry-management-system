const express = require('express');
const {
  getEggStock,
  getLatestStock,
  adjustStock,
} = require('../controllers/eggStockController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/latest', getLatestStock);
router.post('/adjust', adjustStock);
router.get('/', getEggStock);

module.exports = router;