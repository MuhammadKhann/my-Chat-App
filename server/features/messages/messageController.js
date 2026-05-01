const Message = require('../../models/Message');
const User = require('../../models/User');

const getAllMessages = async (req, res) => {
    try {
        const messages = await Message.find();
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch messages" });
    }
};

const getRoomMessages = async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch history" });
    }
};

const getUserChats = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("📋 FETCHING CHAT LIST for user:", userId);
        
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).sort({ createdAt: -1 });
        
        console.log(`📋 Found ${messages.length} messages`);

        const chatPartners = [];
        const seenPartners = new Set();

        for (let msg of messages) {
            const partnerId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();

            if (!seenPartners.has(partnerId)) {
                seenPartners.add(partnerId);
                const partner = await User.findById(partnerId).select("username avatar");

                const unreadCount = await Message.countDocuments({
                    room: msg.room,
                    receiver: userId,
                    status: { $ne: 'seen' }
                });

                chatPartners.push({
                    _id: partnerId,
                    username: partner.username,
                    avatar: partner.avatar,
                    lastMessage: msg.text,
                    time: msg.createdAt,
                    unreadCount: unreadCount
                });
            }
        }
        console.log(`📋 Returning ${chatPartners.length} chat partners`);
        res.json(chatPartners);
    } catch (err) {
        console.error("❌ Chat list error:", err.message);
        res.status(500).json({ error: "Failed to load chat list" });
    }
};

const deleteRoomMessages = async (req, res) => {
    try {
        const { room } = req.params;
        const result = await Message.deleteMany({ room });
        console.log(`Deleted ${result.deletedCount} messages from room: ${room}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete" });
    }
};

module.exports = {
    getAllMessages,
    getRoomMessages,
    getUserChats,
    deleteRoomMessages
};
