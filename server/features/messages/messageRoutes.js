const express = require('express');
const router = express.Router();
const { protectRoute } = require('../auth/authMiddleware');
const {
    getAllMessages,
    getRoomMessages,
    getUserChats,
    deleteRoomMessages
} = require('./messageController');

router.get('/', protectRoute, getAllMessages);
router.get('/:room', protectRoute, getRoomMessages);
router.delete('/delete/:room', protectRoute, deleteRoomMessages);

module.exports = router;
