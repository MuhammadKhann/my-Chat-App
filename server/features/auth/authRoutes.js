const express = require('express');
const router = express.Router();
const { register, login, logout, checkAuth, googleLogin, googleRegister } = require('./authController');
const { protectRoute } = require('./authMiddleware');
const { authLimiter } = require('../../middleware/rateLimiters');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/check', protectRoute, checkAuth);

// Google Auth routes
router.post('/google', authLimiter, googleLogin);
router.post('/google/register', authLimiter, googleRegister);

module.exports = router;
