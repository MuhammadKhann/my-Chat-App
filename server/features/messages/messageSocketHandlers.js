const mongoose = require('mongoose');
const Message = require('../../models/Message');
const User = require('../../models/User');
const { onlineUsers, privacyCache } = require('../../utils/onlineState');

const setupMessageHandlers = (io, socket) => {
    // Handle joining personal room and loading privacy settings
    socket.on("join_personal", async (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their personal room`);

        const user = await User.findById(userId);
        if (user) {
            privacyCache.set(userId, user.privacyLevel);
        }

        const level = privacyCache.get(userId);
        if (!level || level === 'standard') {
            onlineUsers.set(userId, socket.id);
            io.emit("user_status_change", { userId, isOnline: true });
        }

        socket.emit("online_users_list", Array.from(onlineUsers.keys()));

        try {
            const pendingMessages = await Message.find({ receiver: userId, status: 'sent' });

            if (pendingMessages.length > 0) {
                await Message.updateMany(
                    { receiver: userId, status: 'sent' },
                    { $set: { status: 'delivered' } }
                );

                pendingMessages.forEach(msg => {
                    socket.to(msg.sender.toString()).emit("status_changed", {
                        msgId: msg._id,
                        status: 'delivered'
                    });
                });
            }
        } catch (error) {
            console.error("Error processing offline deliveries:", error);
        }
    });

    // Legacy: frontend emits "add_user" instead of "join_personal"
    socket.on("add_user", async (userId) => {
        console.log(`📥 ADD_USER EVENT RECEIVED for: ${userId}`);
        try {
            socket.join(userId);
            console.log(`✅ User ${userId} joined room`);

            const user = await User.findById(userId);
            if (user) {
                privacyCache.set(userId, user.privacyLevel);
                console.log(`✅ User ${userId} privacy level: ${user.privacyLevel}`);
            } else {
                console.log(`⚠️ User ${userId} not found in DB`);
            }

            const level = privacyCache.get(userId);
            console.log(`📊 Privacy level for ${userId}: ${level}`);
            
            if (!level || level === 'standard') {
                onlineUsers.set(userId, socket.id);
                io.emit("user_status_change", { userId, isOnline: true });
                console.log(`✅ User ${userId} added to onlineUsers, socket: ${socket.id}`);
            } else {
                console.log(`🔒 User ${userId} not added (privacy: ${level})`);
            }

            console.log(`📊 Total online users: ${onlineUsers.size}`);
            socket.emit("online_users_list", Array.from(onlineUsers.keys()));

            const pendingMessages = await Message.find({ receiver: userId, status: 'sent' });
            console.log(`📨 ${pendingMessages.length} pending messages for ${userId}`);

            if (pendingMessages.length > 0) {
                await Message.updateMany(
                    { receiver: userId, status: 'sent' },
                    { $set: { status: 'delivered' } }
                );

                pendingMessages.forEach(msg => {
                    socket.to(msg.sender.toString()).emit("status_changed", {
                        msgId: msg._id,
                        status: 'delivered'
                    });
                });
            }
        } catch (error) {
            console.error("❌ Error in add_user handler:", error.message);
        }
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
        try {
            if (!data.sender || !data.receiver) {
                console.error("❌ CRITICAL: Missing sender or receiver ID", { sender: data.sender, receiver: data.receiver });
                socket.emit("send_error", { error: "Invalid sender or receiver" });
                return;
            }

            let senderId, receiverId;

            try {
                senderId = typeof data.sender === 'string'
                    ? new mongoose.Types.ObjectId(data.sender)
                    : data.sender;

                receiverId = typeof data.receiver === 'string'
                    ? new mongoose.Types.ObjectId(data.receiver)
                    : data.receiver;
            } catch (idError) {
                console.error("❌ ObjectId conversion failed:", idError.message);
                socket.emit("send_error", { error: "Invalid user ID format" });
                return;
            }

            const calculatedRoom = [senderId.toString(), receiverId.toString()].sort().join("_");
            const room = data.room || calculatedRoom;

            if (!room) {
                console.error("❌ CRITICAL: Could not determine room ID");
                socket.emit("send_error", { error: "Could not create chat room" });
                return;
            }

            console.log("📤 SENDING MESSAGE:", {
                from: senderId.toString(),
                to: receiverId.toString(),
                room: room,
                text: data.text?.substring(0, 50) || "(no text)",
                hasFile: !!data.fileUrl
            });

            const newMessage = new Message({
                sender: senderId,
                receiver: receiverId,
                text: data.text || "",
                fileUrl: data.fileUrl || null,
                fileName: data.fileName || null,
                fileType: data.fileType || null,
                fileSize: data.fileSize || null,
                room: room,
                status: "sent"
            });

            const savedMessage = await newMessage.save();

            console.log("✅ MESSAGE SAVED TO DB:", savedMessage._id);

            socket.emit("message_confirmed", {
                tempId: data.tempId,
                dbId: savedMessage._id,
                status: savedMessage.status,
                createdAt: savedMessage.createdAt
            });

            const senderUser = await User.findById(senderId).select("username");
            const messagePayload = savedMessage.toObject();
            messagePayload.senderUsername = senderUser?.username || "Unknown";
            
            // Debug: Check if receiver is online
            const receiverSocketId = onlineUsers.get(receiverId.toString());
            console.log("📊 RECEIVER STATUS:", {
                receiverId: receiverId.toString(),
                isOnline: !!receiverSocketId,
                socketId: receiverSocketId,
                onlineUsersCount: onlineUsers.size
            });
            
            socket.to(receiverId.toString()).emit("receive_message", messagePayload);
            console.log("📩 MESSAGE EMITTED to receiver's room:", receiverId.toString());

        } catch (error) {
            console.error("❌ Real-time Save Error:", error.message);
            console.error("   Full Stack:", error.stack);
            socket.emit("send_error", { error: "Failed to save message. Please try again." });
        }
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
        const level = privacyCache.get(data.senderId);
        if (!level || level === 'standard') {
            socket.to(data.receiver).emit("user_typing", {
                senderId: data.senderId,
                typing: true
            });
        }
    });

    socket.on("typing_stop", (data) => {
        socket.to(data.receiver).emit("user_typing", {
            senderId: data.senderId,
            typing: false
        });
    });

    // Handle message status updates
    socket.on("update_status", async ({ msgId, senderId, status, receiverId }) => {
        try {
            if (!msgId || !senderId || !receiverId || !status) return;

            const readerLevel = privacyCache.get(receiverId) || 'standard';
            let finalStatus = status;

            if (readerLevel === 'ghost') {
                finalStatus = 'sent';
            } else if (readerLevel === 'hide_read' && status === 'seen') {
                finalStatus = 'delivered';
            }

            if (finalStatus !== 'sent') {
                const msg = await Message.findOne({
                    _id: msgId,
                    sender: senderId,
                    receiver: receiverId
                }).select("status");

                if (!msg) return;

                const rank = { sent: 0, delivered: 1, seen: 2 };
                const currentRank = rank[msg.status] ?? 0;
                const nextRank = rank[finalStatus] ?? 0;
                if (nextRank <= currentRank) return;

                await Message.findByIdAndUpdate(msgId, { status: finalStatus });
                socket.to(senderId).emit("status_changed", { msgId, status: finalStatus });
            }
        } catch (err) {
            console.error("Status update error:", err);
        }
    });

    // Handle marking room as seen
    socket.on("mark_room_seen", async ({ room, userId, partnerId }) => {
        try {
            const readerLevel = privacyCache.get(userId) || 'standard';
            let finalStatus = 'seen';

            if (readerLevel === 'ghost') finalStatus = 'sent';
            else if (readerLevel === 'hide_read') finalStatus = 'delivered';

            if (finalStatus !== 'sent') {
                const filter = finalStatus === 'delivered'
                    ? { room, receiver: userId, status: 'sent' }
                    : { room, receiver: userId, status: { $ne: 'seen' } };

                await Message.updateMany(filter, { status: finalStatus });
                socket.to(partnerId).emit("room_marked_seen", { finalStatus });
            }
        } catch (err) {
            console.error("Error marking room seen:", err);
        }
    });
};

module.exports = setupMessageHandlers;
