const express = require('express');
const router = express.Router();
const { protectRoute } = require('../auth/authMiddleware');
const { updatePrivacy, searchUsers, saveSettings, getSettings, blockUser, unblockUser, getBlockedUsers } = require('./privacyController');

router.put('/', protectRoute, updatePrivacy);
router.get('/users/search', protectRoute, searchUsers);
router.put('/settings', protectRoute, saveSettings);
router.get('/settings', protectRoute, getSettings);

router.post('/block/:id', protectRoute, blockUser);
router.post('/unblock/:id', protectRoute, unblockUser);
router.get('/blocked', protectRoute, getBlockedUsers);

module.exports = router;
