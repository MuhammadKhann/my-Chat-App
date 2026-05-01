const express = require('express');
const router = express.Router();
const { protectRoute } = require('../auth/authMiddleware');
const { updatePrivacy, searchUsers, saveSettings, getSettings } = require('./privacyController');

router.put('/', protectRoute, updatePrivacy);
router.get('/users/search', protectRoute, searchUsers);
router.put('/settings', protectRoute, saveSettings);
router.get('/settings', protectRoute, getSettings);

module.exports = router;
