// Global state management for online users and privacy cache

const onlineUsers = new Map(); // Maps userId to their current socket ID
const privacyCache = new Map(); // Stores: userId -> privacyLevel
const blockCache = new Map();   // Stores: userId -> Set of blocked user IDs

module.exports = {
    onlineUsers,
    privacyCache,
    blockCache
};
