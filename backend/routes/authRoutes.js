const express = require('express');
const { login, getMe, updateMe, sessionStatus, logoutAllDevices, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAllDevices);
router.get('/session-status', protect, sessionStatus);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

module.exports = router;