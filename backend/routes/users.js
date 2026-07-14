const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, updateUserProfile } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected Routes
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);

module.exports = router;
