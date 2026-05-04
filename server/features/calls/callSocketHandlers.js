const { onlineUsers, privacyCache, blockCache } = require('../../utils/onlineState');

const setupCallHandlers = (io, socket) => {
    // 1. Caller initiates the ring
    socket.on("call_user", ({ userToCall, signalData, from, callerName, callType }) => {
        console.log(`📞 CALL REQUEST: ${callerName} (${from}) → ${userToCall} [Type: ${callType || 'video'}]`);

        // Isolation: Check if target has blocked the caller
        if (blockCache.get(userToCall)?.has(from)) {
            console.log(`🚫 BLOCK: ${userToCall} blocked ${from}. Call rejected.`);
            // Silently fail or send error? Let's send a generic error to match isolation.
            socket.emit("call_error", { error: "User is unavailable" });
            return;
        }

        // Debug: Check rooms
        const rooms = Array.from(socket.rooms);
        console.log(`📞 Caller socket rooms:`, rooms);
        console.log(`📞 Target user online:`, onlineUsers.has(userToCall));

        // Prevent calling self
        if (from === userToCall) {
            console.log(`❌ REJECTED: User trying to call themselves`);
            socket.emit("call_error", { error: "Cannot call yourself" });
            return;
        }

        io.to(userToCall).emit("incoming_call", {
            signal: signalData,
            from,
            callerName,
            callType: callType || 'video'
        });
        console.log(`📞 EMITTED incoming_call to room: ${userToCall}`);
    });

    // 2. Receiver clicks "Answer"
    socket.on("answer_call", ({ to, signal }) => {
        io.to(to).emit("call_accepted", signal);
    });

    // 3. Either party clicks "Hang Up"
    socket.on("end_call", ({ to }) => {
        io.to(to).emit("call_ended");
    });

    // 4. Receiver explicitly clicks "Decline"
    socket.on("decline_call", ({ to }) => {
        io.to(to).emit("call_declined");
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
