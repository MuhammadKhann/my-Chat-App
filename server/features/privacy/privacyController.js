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

module.exports = {
    updatePrivacy,
    searchUsers,
    saveSettings,
    getSettings
};
