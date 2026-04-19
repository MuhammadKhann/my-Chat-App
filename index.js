require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Needed for password security
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Import your Database Models
const Message = require("./models/Message");
const User = require("./models/User"); // Added User model

const app = express();
app.use(cors());
app.use(express.json()); // Essential to read JSON data from your frontend

const server = http.createServer(app);

// --- 1. INITIALIZE SOCKET.IO ---
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- SET UP STORAGE ENGINE ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nexus_chat_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'pdf', 'docx', 'txt', 'csv'],
    resource_type: 'auto' 
  },
});

// Enforce a strict 10MB limit to prevent server memory crashes
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 Megabytes
});

// --- 2. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// --- 3. AUTHENTICATION ROUTES ---

// Registration Route
app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        res.json({ msg: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login Route (Added here)
app.post("/login", async (req, res) => {
    try {
        const { identifier, password } = req.body; // 'identifier' can be email OR username

        // Find user where either email or username matches the identifier
        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        res.json({
            id: user._id,
            username: user.username,
            email: user.email
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TRACK ONLINE USERS ---
const onlineUsers = new Map(); // Maps userId to their current socket ID

// --- 4. REAL-TIME LOGIC (Socket.io) ---
io.on("connection", (socket) => {
    // 1. Every user joins their own personal room on login
    socket.on("join_personal", async (userId) => {
        socket.join(userId);

        // 1. Add user to the online list and tell everyone
        onlineUsers.set(userId, socket.id);
        io.emit("user_status_change", { userId, isOnline: true });

        // 2. Send the newly logged-in user the current list of online people
        socket.emit("online_users_list", Array.from(onlineUsers.keys()));

        try {
            // --- OFFLINE CATCH-UP LOGIC ---
            // Find all messages sent to this user while they were offline (status: 'sent')
            const pendingMessages = await Message.find({ receiver: userId, status: 'sent' });

            if (pendingMessages.length > 0) {
                // Update all of those pending messages to 'delivered' in the database
                await Message.updateMany(
                    { receiver: userId, status: 'sent' },
                    { $set: { status: 'delivered' } }
                );

                // Notify the original senders so their single ticks instantly turn into double ticks
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

    // 2. Send Message directly to the receiver's personal room
    socket.on("send_message", async (data) => {
        try {
            // SECURITY CHECK: Don't allow completely empty ghost messages
            if (!data.text && !data.fileUrl) return;

            const newMessage = new Message({
                sender: data.sender || data.senderId,
                receiver: data.receiver || data.receiverId,
                text: data.text || "",
                fileUrl: data.fileUrl || null,
                fileName: data.fileName || null,
                fileType: data.fileType || null,
                fileSize: data.fileSize || null,
                room: data.room,
                status: 'sent'
            });
            await newMessage.save();

            // 1. Confirm directly to Sender (Updates their tick to single gray)
            socket.emit("message_confirmed", { tempId: data.tempId, dbId: newMessage._id });

            // 2. Broadcast to Receiver's personal room
            socket.to(data.receiver || data.receiverId).emit("receive_message", newMessage);
        } catch (error) {
            console.error("Failed to process socket message:", error);
        }
    });

    // 3. Status Handshake (Delivered / Seen)
    socket.on("update_status", async ({ msgId, senderId, status }) => {
        try {
            await Message.findByIdAndUpdate(msgId, { status });
            socket.to(senderId).emit("status_changed", { msgId, status });
        } catch (err) {
            console.error("Status update error:", err);
        }
    });

    // 4. Mark whole chat as seen when opened
    socket.on("mark_room_seen", async ({ room, userId, partnerId }) => {
        try {
            await Message.updateMany(
                { room, receiver: userId, status: { $ne: 'seen' } },
                { status: 'seen' }
            );
            socket.to(partnerId).emit("room_marked_seen");
        } catch (err) {
            console.error("Error marking room seen:", err);
        }
    });

    // --- NEW: HANDLE DISCONNECTS ---
    socket.on("disconnect", () => {
        // Find which user just lost connection/closed the tab
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                // Tell everyone this user went offline
                io.emit("user_status_change", { userId, isOnline: false });
                break;
            }
        }
    });
});

// --- FILE UPLOAD ROUTE ---
// --- BULLETPROOF UPLOAD ROUTE ---
app.post("/upload", (req, res) => {
    // We execute multer manually to catch internal size/format errors
    upload.single('file')(req, res, function (err) {
        
        // A. Handle Multer-specific errors (like File Too Large)
        if (err instanceof multer.MulterError) {
            console.error(`Multer Error: ${err.message}`);
            return res.status(400).json({ error: `Upload failed: ${err.message}` });
        } 
        // B. Handle Cloudinary or Network errors
        else if (err) {
            console.error(`Cloudinary Error:`, err);
            return res.status(500).json({ error: "Server error during file transfer." });
        }

        // C. Handle empty requests
        if (!req.file) {
            return res.status(400).json({ error: "No file was provided." });
        }

        // D. Success! Return full metadata
        res.status(200).json({ 
            fileUrl: req.file.path, 
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size // Sending size back to frontend
        });
    });
});

// --- 5. CHAT HISTORY ROUTE ---
app.get("/messages", async (req, res) => {
    try {
        const messages = await Message.find();
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch messages" });
    }
});
// --- USER SEARCH ROUTE ---
app.get("/users/search", async (req, res) => {
    try {
        const query = req.query.q;
        console.log("Search received for:", query); // Check your terminal for this!

        if (!query) return res.json([]);

        // Broaden the search: This looks for any username starting with the letters
        const users = await User.find({
            username: { $regex: "^" + query, $options: "i" }
        }).select("username _id");

        console.log("Users found:", users.length);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
});


// --- ROUTE TO GET PRIVATE CHAT HISTORY ---
app.get("/messages/:room", async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch history" });
    }
});

// --- GET ALL ACTIVE CHATS FOR A USER ---
app.get("/chats/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).sort({ createdAt: -1 });

        const chatPartners = [];
        const seenPartners = new Set();

        for (let msg of messages) {
            const partnerId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
            
            if (!seenPartners.has(partnerId)) {
                seenPartners.add(partnerId);
                const partner = await User.findById(partnerId).select("username");
                
                // --- NEW: Count unread messages from this specific partner ---
                const unreadCount = await Message.countDocuments({
                    room: msg.room,
                    receiver: userId,
                    status: { $ne: 'seen' }
                });

                chatPartners.push({
                    _id: partnerId,
                    username: partner.username,
                    lastMessage: msg.text,
                    time: msg.createdAt,
                    unreadCount: unreadCount // Send this to the frontend
                });
            }
        }
        res.json(chatPartners);
    } catch (err) {
        res.status(500).json({ error: "Failed to load chat list" });
    }
});

// --- UPDATED DELETE ROUTE ---
app.delete("/messages/delete/:room", async (req, res) => {
    try {
        const { room } = req.params;
        const result = await Message.deleteMany({ room });
        console.log(`Deleted ${result.deletedCount} messages from room: ${room}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

// --- 6. START SERVER ---
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});