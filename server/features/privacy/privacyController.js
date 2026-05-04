const User = require('../../models/User');

const updatePrivacy = async (req, res) => {
    try {
        const { privacyLevel } = req.body;

        const validLevels = ['standard', 'hide_online', 'hide_read', 'ghost'];
        if (!validLevels.includes(privacyLevel)) {
            return res.status(400).json({ error: "Invalid privacy level." });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { privacyLevel },
            { returnDocument: 'after' }
        ).select("-password");

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Privacy Update Error:", error);
        res.status(500).json({ error: "Failed to update privacy settings." });
    }
};

const searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        console.log("Search received for:", query);

        if (!query) return res.json([]);

        const users = await User.find({
            username: { $regex: "^" + query, $options: "i" }
        }).select("username _id avatar");

        console.log("Users found:", users.length);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
};

const saveSettings = async (req, res) => {
    try {
        const { privacyLevel, theme, darkMode } = req.body;
        const updates = {};

        if (privacyLevel !== undefined) {
            const validLevels = ['standard', 'hide_online', 'hide_read', 'ghost'];
            if (!validLevels.includes(privacyLevel)) {
                return res.status(400).json({ error: "Invalid privacy level." });
            }
            updates.privacyLevel = privacyLevel;
        }

        if (theme !== undefined) updates.theme = theme;
        if (darkMode !== undefined) updates.darkMode = darkMode;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { returnDocument: 'after' }
        ).select("-password");

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Settings Update Error:", error);
        res.status(500).json({ error: "Failed to update settings." });
    }
};

const getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("privacyLevel theme darkMode -_id");
        res.status(200).json(user);
    } catch (error) {
        console.error("Settings Get Error:", error);
        res.status(500).json({ error: "Failed to get settings." });
    }
};

const { blockCache, onlineUsers, privacyCache } = require('../../utils/onlineState');

const blockUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        if (targetId === req.user.id) {
            return res.status(400).json({ error: "You cannot block yourself." });
        }

        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { blockedUsers: targetId }
        });

        // Update block cache
        const blockedSet = blockCache.get(req.user.id) || new Set();
        blockedSet.add(targetId);
        blockCache.set(req.user.id, blockedSet);

        // Notify the target user that the blocker is now "offline" to them
        if (req.io) {
            req.io.to(targetId).emit("user_status_change", { userId: req.user.id, isOnline: false });
        }

        res.status(200).json({ message: "User blocked successfully." });
    } catch (error) {
        console.error("Block User Error:", error);
        res.status(500).json({ error: "Failed to block user." });
    }
};

const unblockUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { blockedUsers: targetId }
        });

        // Update block cache
        const blockedSet = blockCache.get(req.user.id);
        if (blockedSet) {
            blockedSet.delete(targetId);
            if (blockedSet.size === 0) blockCache.delete(req.user.id);
            else blockCache.set(req.user.id, blockedSet);
        }

        // If the blocker is currently online and their privacy allows it, 
        // notify the target user that they are now "online"
        if (req.io && onlineUsers.has(req.user.id)) {
            const level = privacyCache.get(req.user.id);
            if (!level || level === 'standard' || level === 'hide_read') {
                req.io.to(targetId).emit("user_status_change", { userId: req.user.id, isOnline: true });
            }
        }

        res.status(200).json({ message: "User unblocked successfully." });
    } catch (error) {
        console.error("Unblock User Error:", error);
        res.status(500).json({ error: "Failed to unblock user." });
    }
};

const getBlockedUsers = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("blockedUsers");
        res.status(200).json(user.blockedUsers || []);
    } catch (error) {
        console.error("Get Blocked Users Error:", error);
        res.status(500).json({ error: "Failed to fetch blocked users." });
    }
};

module.exports = {
    updatePrivacy,
    searchUsers,
    saveSettings,
    getSettings,
    blockUser,
    unblockUser,
    getBlockedUsers
};
