const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protectRoute } = require('../auth/authMiddleware');
const { uploadLimiter } = require('../../middleware/rateLimiters');
const { uploadAvatar, uploadFile, downloadFile } = require('./uploadController');

const uploadAvatarMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadFileMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/avatar', protectRoute, uploadAvatarMemory.single('avatar'), uploadAvatar);
router.post('/file', uploadLimiter, uploadFileMemory.single('file'), uploadFile);
router.get('/download', downloadFile);

module.exports = router;
