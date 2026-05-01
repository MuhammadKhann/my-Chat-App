const { onlineUsers, privacyCache } = require('../../utils/onlineState');

const setupCallHandlers = (io, socket) => {
    // 1. Caller initiates the ring
    socket.on("call_user", ({ userToCall, signalData, from, callerName }) => {
        console.log(`📞 SIGNAL RECEIVED: ${callerName} is calling ${userToCall}`);

        io.to(userToCall).emit("incoming_call", {
            signal: signalData,
            from,
            callerName
        });
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
