// Global state management for online users and privacy cache

const onlineUsers = new Map(); // Maps userId to their current socket ID
const privacyCache = new Map(); // Stores: userId -> privacyLevel

module.exports = {
    onlineUsers,
    privacyCache
};
