const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    checkAuth,
    googleLogin,
    googleRegister,
    initiatePKCE,
    completePKCE,
    completeOAuthRegistration
} = require('./authController');
const { protectRoute } = require('./authMiddleware');
const { authLimiter } = require('../../middleware/rateLimiters');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/check', protectRoute, checkAuth);

// Legacy Google Auth routes (kept for backwards compatibility)
router.post('/google', authLimiter, googleLogin);
router.post('/google/register', authLimiter, googleRegister);

// New PKCE OAuth routes
router.post('/pkce/initiate', authLimiter, initiatePKCE);
router.post('/pkce/complete', authLimiter, completePKCE);
router.post('/oauth/complete-registration', authLimiter, completeOAuthRegistration);

module.exports = router;
