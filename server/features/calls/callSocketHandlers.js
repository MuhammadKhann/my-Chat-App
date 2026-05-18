const { onlineUsers, privacyCache, blockCache } = require('../../utils/onlineState');

const setupCallHandlers = (io, socket) => {
    // 1. Caller initiates the ring
    socket.on("call_user", ({ userToCall, signalData, from, callerName, callType }) => {
        const callerId = (socket.userId || from)?.toString();
        const targetId = userToCall?.toString();

        console.log(`📞 CALL REQUEST: ${callerName} (${callerId}) → ${targetId} [Type: ${callType || 'video'}]`);

        if (!callerId || !targetId) {
            socket.emit("call_error", { error: "Invalid caller or receiver" });
            return;
        }

        // Prevent calling self
        if (callerId === targetId) {
            console.log(`❌ REJECTED: User trying to call themselves`);
            socket.emit("call_error", { error: "Cannot call yourself" });
            return;
        }

        // Isolation: Check if caller has blocked the target
        if (blockCache.get(callerId)?.has(targetId)) {
            console.log(`🚫 BLOCK: ${callerId} blocked ${targetId}. Call rejected.`);
            socket.emit("call_error", { error: "You blocked this user. Unblock them to call." });
            return;
        }

        // Isolation: Check if target has blocked the caller
        if (blockCache.get(targetId)?.has(callerId)) {
            console.log(`🚫 BLOCK: ${targetId} blocked ${callerId}. Call rejected.`);
            // Silently fail or send error? Let's send a generic error to match isolation.
            socket.emit("call_error", { error: "User is unavailable" });
            return;
        }

        // Debug: Check rooms
        const rooms = Array.from(socket.rooms);
        console.log(`📞 Caller socket rooms:`, rooms);
        console.log(`📞 Target user online:`, onlineUsers.has(targetId));

        io.to(targetId).emit("incoming_call", {
            signal: signalData,
            from: callerId,
            callerName,
            callType: callType || 'video'
        });
        console.log(`📞 EMITTED incoming_call to room: ${targetId}`);
    });

    // 2. Receiver clicks "Answer"
    socket.on("answer_call", ({ to, signal }) => {
        const from = socket.userId?.toString();
        const targetId = to?.toString();
        if (!from || !targetId) return;
        if (blockCache.get(from)?.has(targetId) || blockCache.get(targetId)?.has(from)) return;
        io.to(targetId).emit("call_accepted", { signal, from });
    });

    // 3. Either party clicks "Hang Up"
    socket.on("end_call", ({ to }) => {
        const from = socket.userId?.toString();
        const targetId = to?.toString();
        if (!from || !targetId) return;
        if (blockCache.get(from)?.has(targetId) || blockCache.get(targetId)?.has(from)) return;
        io.to(targetId).emit("call_ended", { from });
    });

    // 4. Receiver explicitly clicks "Decline"
    socket.on("decline_call", ({ to }) => {
        const from = socket.userId?.toString();
        const targetId = to?.toString();
        if (!from || !targetId) return;
        if (blockCache.get(from)?.has(targetId) || blockCache.get(targetId)?.has(from)) return;
        io.to(targetId).emit("call_declined", { from });
    });

    // Handle privacy changes
    socket.on("privacy_changed", ({ userId, privacyLevel }) => {
        privacyCache.set(userId, privacyLevel);

        if (privacyLevel !== 'standard') {
            if (onlineUsers.has(userId)) {
                onlineUsers.delete(userId);
                io.emit("user_status_change", { userId, isOnline: false });
            }
        } else {
            onlineUsers.set(userId, socket.id);
            io.emit("user_status_change", { userId, isOnline: true });
        }
    });

    // Handle disconnects
    socket.on("disconnect", () => {
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                io.emit("user_status_change", { userId, isOnline: false });
                break;
            }
        }
    });
};

module.exports = setupCallHandlers;
