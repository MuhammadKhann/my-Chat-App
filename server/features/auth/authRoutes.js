const express = require('express');
const router = express.Router();
const { register, login, logout, checkAuth } = require('./authController');
const { protectRoute } = require('./authMiddleware');
const { authLimiter } = require('../../middleware/rateLimiters');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/check', protectRoute, checkAuth);

module.exports = router;
