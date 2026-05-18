const mongoose = require('mongoose');
const Message = require('../../models/Message');
const User = require('../../models/User');
const { onlineUsers, privacyCache, blockCache } = require('../../utils/onlineState');

// Helper: Get list of online users that should be visible to others
// (excludes users with hide_online or ghost privacy settings)
const getVisibleOnlineUsers = (requestingUserId) => {
    const visible = [];
    for (const [userId] of onlineUsers) {
        // Strict Isolation: If userId has blocked requestingUserId, don't show them online
        const userBlockedRequestor = blockCache.get(userId)?.has(requestingUserId);
        if (userBlockedRequestor) continue;

        const privacyLevel = privacyCache.get(userId);
        // Only show users with standard or hide_read privacy (not hide_online or ghost)
        if (!privacyLevel || privacyLevel === 'standard' || privacyLevel === 'hide_read') {
            visible.push(userId);
        }
    }
    return visible;
};

// Rate limiting maps
const editRateLimit = new Map(); // userId -> timestamps[]
const deleteRateLimit = new Map(); // userId -> timestamps[]

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const MAX_EDITS_PER_MINUTE = 5;
const MAX_DELETES_PER_MINUTE = 10;
const EDIT_TIME_LIMIT = 30 * 60_000; // 30 minutes
const DELETE_TIME_LIMIT = 10 * 60_000; // 10 minutes
const MAX_EDIT_HISTORY = 5;
const MAX_TEXT_LENGTH = 2000;

// Helper: Check rate limit
const checkRateLimit = (rateMap, userId, maxRequests) => {
    const now = Date.now();
    const timestamps = rateMap.get(userId) || [];

    // Filter out old timestamps
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);

    if (recent.length >= maxRequests) {
        return { allowed: false, retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - recent[0])) / 1000) };
    }

    recent.push(now);
    rateMap.set(userId, recent);
    return { allowed: true };
};

// Helper: Normalize text
const normalizeText = (text) => {
    if (!text) return '';
    return text.trim().normalize('NFC');
};

const setupMessageHandlers = (io, socket) => {
    // Handle joining personal room and loading privacy settings
    socket.on("join_personal", async (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their personal room`);

        const user = await User.findById(userId);
        if (user) {
            privacyCache.set(userId, user.privacyLevel);
            if (user.blockedUsers && user.blockedUsers.length > 0) {
                blockCache.set(userId, new Set(user.blockedUsers.map(id => id.toString())));
            }
        }

        const level = privacyCache.get(userId);
        if (!level || level === 'standard') {
            onlineUsers.set(userId, socket.id);
            // Notify others, but respect isolation
            for (const [otherUserId, otherSocketId] of onlineUsers) {
                if (otherUserId === userId) continue;
                // If userId has blocked otherUserId, don't notify them
                if (blockCache.get(userId)?.has(otherUserId)) continue;
                
                io.to(otherSocketId).emit("user_status_change", { userId, isOnline: true });
            }
        }

        socket.emit("online_users_list", getVisibleOnlineUsers(userId));

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
                if (user.blockedUsers && user.blockedUsers.length > 0) {
                    blockCache.set(userId, new Set(user.blockedUsers.map(id => id.toString())));
                }
                console.log(`✅ User ${userId} privacy level: ${user.privacyLevel}`);
            } else {
                console.log(`⚠️ User ${userId} not found in DB`);
            }

            const level = privacyCache.get(userId);
            console.log(`📊 Privacy level for ${userId}: ${level}`);
            
            if (!level || level === 'standard') {
                onlineUsers.set(userId, socket.id);
                // Notify others, but respect isolation
                for (const [otherUserId, otherSocketId] of onlineUsers) {
                    if (otherUserId === userId) continue;
                    if (blockCache.get(userId)?.has(otherUserId)) continue;
                    io.to(otherSocketId).emit("user_status_change", { userId, isOnline: true });
                }
                console.log(`✅ User ${userId} added to onlineUsers, socket: ${socket.id}`);
            } else {
                console.log(`🔒 User ${userId} not added (privacy: ${level})`);
            }

            console.log(`📊 Total online users: ${onlineUsers.size}`);
            socket.emit("online_users_list", getVisibleOnlineUsers(userId));

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

            // --- BLOCK ISOLATION ---
            const senderBlockedReceiver = blockCache.get(senderId.toString())?.has(receiverId.toString());
            if (senderBlockedReceiver) {
                console.log(`🚫 BLOCK: ${senderId} blocked ${receiverId}. Message dropped.`);
                socket.emit("send_error", {
                    tempId: data.tempId,
                    error: "You blocked this user. Unblock them to send messages."
                });
                return;
            }

            const receiverBlockedSender = blockCache.get(receiverId.toString())?.has(senderId.toString());
            if (receiverBlockedSender) {
                console.log(`🚫 BLOCK: ${receiverId} blocked ${senderId}. Message dropped.`);
                socket.emit("send_error", {
                    tempId: data.tempId,
                    error: "Message could not be delivered."
                });
                return;
            }
            // -----------------------

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

            let replyToId = null;

            // Validate and process replyTo if provided
            if (data.replyTo) {
                try {
                    const parentMsg = await Message.findById(data.replyTo);
                    if (parentMsg) {
                        // Verify parent is in the same room
                        if (parentMsg.room === room) {
                            replyToId = parentMsg._id;
                        } else {
                            console.log("⚠️ Reply to message from different room ignored");
                        }
                    } else {
                        console.log("⚠️ Parent message not found, reply link removed");
                    }
                } catch (err) {
                    console.log("⚠️ Invalid replyTo ID format:", err.message);
                }
            }

            const newMessage = new Message({
                sender: senderId,
                receiver: receiverId,
                text: data.text || "",
                fileUrl: data.fileUrl || null,
                fileName: data.fileName || null,
                fileType: data.fileType || null,
                fileSize: data.fileSize || null,
                room: room,
                status: "sent",
                replyTo: replyToId
            });

            const savedMessage = await newMessage.save();

            // Increment replyCount on parent if this is a valid reply
            if (replyToId) {
                await Message.findByIdAndUpdate(replyToId, { $inc: { replyCount: 1 } });
            }

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
        // Isolation check
        if (blockCache.get(data.receiver)?.has(data.senderId)) return;
        if (blockCache.get(data.senderId)?.has(data.receiver)) return;

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

            // Isolation: If receiver blocked sender, sender shouldn't get status updates
            if (blockCache.get(receiverId)?.has(senderId)) return;

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
            // Isolation check
            if (blockCache.get(userId)?.has(partnerId)) return;

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

    // ─── Delete for Me ────────────────────────────────────────────────────────
    socket.on("delete_for_me", async ({ msgId, userId }) => {
        try {
            // Rate limit check
            const rateCheck = checkRateLimit(deleteRateLimit, userId, MAX_DELETES_PER_MINUTE);
            if (!rateCheck.allowed) {
                socket.emit("delete_error", { msgId, error: "Too many requests. Please wait.", retryAfter: rateCheck.retryAfter });
                return;
            }

            // Find message
            const msg = await Message.findById(msgId);
            if (!msg) {
                socket.emit("delete_error", { msgId, error: "Message not found" });
                return;
            }

            // Check if user is sender
            if (msg.sender.toString() !== userId) {
                socket.emit("delete_error", { msgId, error: "You can only delete your own messages" });
                return;
            }

            // Idempotent: already deleted by sender
            if (msg.deletedBySender) {
                socket.emit("delete_confirmed", { msgId, success: true, forMe: true });
                return;
            }

            // Mark as deleted by sender
            await Message.findByIdAndUpdate(msgId, {
                deletedBySender: true,
                deletedBy: userId,
                deletedAt: new Date(),
                $inc: { _version: 1 }
            });

            socket.emit("delete_confirmed", { msgId, success: true, forMe: true });

        } catch (err) {
            console.error("Delete for me error:", err);
            socket.emit("delete_error", { msgId, error: "Failed to delete message" });
        }
    });

    // ─── Delete for Everyone ───────────────────────────────────────────────────
    socket.on("delete_for_everyone", async ({ msgId, userId }) => {
        try {
            // Rate limit check
            const rateCheck = checkRateLimit(deleteRateLimit, userId, MAX_DELETES_PER_MINUTE);
            if (!rateCheck.allowed) {
                socket.emit("delete_error", { msgId, error: "Too many requests. Please wait.", retryAfter: rateCheck.retryAfter });
                return;
            }

            // Find message
            const msg = await Message.findById(msgId);
            if (!msg) {
                socket.emit("delete_error", { msgId, error: "Message not found" });
                return;
            }

            // Check if user is sender
            if (msg.sender.toString() !== userId) {
                socket.emit("delete_error", { msgId, error: "You can only delete your own messages" });
                return;
            }

            // Idempotent: already deleted for everyone
            if (msg.deletedForEveryone) {
                socket.emit("delete_confirmed", { msgId, success: true, forEveryone: true });
                return;
            }

            // No time limit for delete for everyone

            // Save original text if not already saved
            const update = {
                deletedForEveryone: true,
                deletedBy: userId,
                deletedAt: new Date(),
                originalText: msg.originalText || msg.text,
                $inc: { _version: 1 }
            };

            await Message.findByIdAndUpdate(msgId, update);

            // Notify receiver
            socket.to(msg.receiver.toString()).emit("message_deleted", {
                msgId,
                deletedForEveryone: true,
                deletedAt: new Date()
            });

            socket.emit("delete_confirmed", { msgId, success: true, forEveryone: true });

        } catch (err) {
            console.error("Delete for everyone error:", err);
            socket.emit("delete_error", { msgId, error: "Failed to delete message" });
        }
    });

    // ─── Edit Message ─────────────────────────────────────────────────────────
    socket.on("edit_message", async ({ msgId, userId, text, _version }) => {
        try {
            // Rate limit check
            const rateCheck = checkRateLimit(editRateLimit, userId, MAX_EDITS_PER_MINUTE);
            if (!rateCheck.allowed) {
                socket.emit("edit_error", { msgId, error: "Too many requests. Please wait.", retryAfter: rateCheck.retryAfter });
                return;
            }

            // Normalize text
            const normalizedText = normalizeText(text);

            // Validate text
            if (!normalizedText) {
                socket.emit("edit_error", { msgId, error: "Please enter some text" });
                return;
            }

            if (normalizedText.length > MAX_TEXT_LENGTH) {
                socket.emit("edit_error", { msgId, error: `Message must be under ${MAX_TEXT_LENGTH} characters` });
                return;
            }

            // Find message
            const msg = await Message.findById(msgId);
            if (!msg) {
                socket.emit("edit_error", { msgId, error: "Message not found" });
                return;
            }

            // Check if user is sender
            if (msg.sender.toString() !== userId) {
                socket.emit("edit_error", { msgId, error: "You can only edit your own messages" });
                return;
            }

            // Check if already deleted for everyone
            if (msg.deletedForEveryone) {
                socket.emit("edit_error", { msgId, error: "Message not found" });
                return;
            }

            // Check time limit
            const messageAge = Date.now() - new Date(msg.createdAt).getTime();
            if (messageAge > EDIT_TIME_LIMIT) {
                socket.emit("edit_error", { msgId, error: "Time expired. You can only edit messages within 30 minutes." });
                return;
            }

            // Check for file attachment
            if (msg.fileUrl) {
                socket.emit("edit_error", { msgId, error: "Messages with files cannot be edited" });
                return;
            }

            // Check for no changes
            if (msg.text === normalizedText) {
                socket.emit("edit_error", { msgId, error: "No changes were made" });
                return;
            }

            // Optimistic locking check
            if (_version !== undefined && msg._version !== _version) {
                socket.emit("edit_error", { msgId, error: "Message was modified by another user. Please refresh and try again." });
                return;
            }

            // Build edit history entry
            const historyEntry = {
                text: msg.text,
                editedAt: msg.editedAt || msg.createdAt,
                editedBy: msg.editedBy || msg.sender
            };

            // Prepare edit history - keep last 5 entries
            let newHistory = [...(msg.editHistory || []), historyEntry];
            if (newHistory.length > MAX_EDIT_HISTORY) {
                newHistory = newHistory.slice(-MAX_EDIT_HISTORY);
            }

            // Update message
            const updatedMsg = await Message.findByIdAndUpdate(msgId, {
                text: normalizedText,
                isEdited: true,
                editedAt: new Date(),
                editedBy: userId,
                editCount: (msg.editCount || 0) + 1,
                editHistory: newHistory,
                $inc: { _version: 1 }
            }, { new: true });

            // Notify receiver
            socket.to(msg.receiver.toString()).emit("message_edited", {
                msgId,
                newText: normalizedText,
                isEdited: true,
                editedAt: updatedMsg.editedAt,
                _version: updatedMsg._version
            });

            socket.emit("edit_confirmed", {
                msgId,
                success: true,
                updatedMsg: {
                    _id: updatedMsg._id,
                    text: updatedMsg.text,
                    isEdited: updatedMsg.isEdited,
                    editedAt: updatedMsg.editedAt,
                    editCount: updatedMsg.editCount,
                    _version: updatedMsg._version
                }
            });

        } catch (err) {
            console.error("Edit message error:", err);
            socket.emit("edit_error", { msgId, error: "Failed to edit message" });
        }
    });

    // ─── Get Edit History ──────────────────────────────────────────────────────
    socket.on("get_edit_history", async ({ msgId }) => {
        try {
            const msg = await Message.findById(msgId).select("editHistory isEdited");
            if (!msg) {
                socket.emit("edit_history", { msgId, history: [], error: "Message not found" });
                return;
            }

            socket.emit("edit_history", {
                msgId,
                history: msg.editHistory || [],
                isEdited: msg.isEdited
            });

        } catch (err) {
            console.error("Get edit history error:", err);
            socket.emit("edit_history", { msgId, history: [], error: "Failed to fetch history" });
        }
    });
};

module.exports = setupMessageHandlers;
