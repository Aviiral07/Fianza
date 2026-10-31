const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getCurrentUser);

module.exports = router;
