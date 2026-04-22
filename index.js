require('dotenv').config();
const express = require('express');
const http = require('http');
const { Readable } = require('stream');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Import your Database Models
const Message = require("./models/Message");
const User = require("./models/User"); // Added User model

const app = express();

// --- ENTERPRISE SECURITY MIDDLEWARE ---
app.use(cors({
    origin: "http://localhost:5173", // Exact Vite dev-server URL
    credentials: true                // Required for cookies to flow cross-origin
}));
app.use(express.json());
app.use(cookieParser());             // Allows Express to read incoming secure cookies

// --- ENTERPRISE JWT & COOKIE ENGINE ---
const generateTokenAndSetCookie = (userId, res) => {
    // 1. Create a signed token containing the user's ID
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '15d' // Token valid for 15 days
    });

    // 2. Set the token as a secure cookie in the response
    res.cookie("jwt", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in milliseconds
        httpOnly: true,     // Prevents JavaScript (XSS) from reading the cookie
        sameSite: "strict", // Prevents CSRF (Cross-Site Request Forgery) attacks
        secure: process.env.NODE_ENV !== "development", // Only sends over HTTPS in production
    });

    return token;
};

// --- ENTERPRISE AUTH MIDDLEWARE (The Security Guard) ---
const protectRoute = async (req, res, next) => {
    try {
        // 1. Grab the token from the secure cookie
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No Token Provided" });
        }

        // 2. Decode and verify the token signature
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized: Invalid Token" });
        }

        // 3. Find the user in the DB (excluding password)
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // 4. Attach the user object to the request so the next function can use it
        req.user = user;
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// --- CHECK AUTH ROUTE ---
app.get("/api/auth/check", protectRoute, (req, res) => {
    // If it passed the protectRoute, req.user is now populated
    res.status(200).json(req.user);
});

const server = http.createServer(app);

// --- 1. INITIALIZE SOCKET.IO ---
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- SET UP STORAGE ENGINE ---
// --- UPDATED: OPEN DOOR STORAGE CONFIG ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'nexus_chat_uploads',
        // 1. REMOVE 'allowed_formats' entirely to stop the "Unknown format" error
        // allowed_formats: ['jpg', 'png', ...], 

        // 2. ENSURE this is set to 'auto' so it handles PDFs and Images differently
        resource_type: 'auto'
    },
});

// Enforce a strict 10MB limit to prevent server memory crashes
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 Megabytes
});

// --- 2. DATABASE CONNECTION ---
// --- BULLETPROOF MONGODB CONNECTION ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // 1. Force IPv4 (This is the magic bullet for the EAI_AGAIN error)
      family: 4, 
      
      // 2. How long to wait for a connection before failing (10 seconds)
      serverSelectionTimeoutMS: 10000, 
      
      // 3. How long a socket stays open if there is network silence (45 seconds)
      socketTimeoutMS: 45000, 
    });
    console.log("✅ MongoDB Connected Successfully!");
  } catch (err) {
    console.error("❌ Critical MongoDB Connection Error:", err);
    // Exit the process with failure so process managers (like PM2) can restart it
    process.exit(1); 
  }
};

// Listen for random network drops after initial connection
mongoose.connection.on('error', err => {
  console.error("⚠️ MongoDB Network Error after initial connection:", err);
});

connectDB();

// --- 3. AUTHENTICATION ROUTES ---

// Registration Route
app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check for email duplication
        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ error: "This email is already registered. Try signing in instead." });

        // Check for username duplication
        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ error: "This username is already taken. Try another username." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        // --- NEW: Generate token and set cookie ---
        generateTokenAndSetCookie(newUser._id, res);

        // Send the response (Exclude the password for security)
        res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email
        });
    } catch (err) {
        // --- NEW: SURGICAL ERROR INTERCEPTION ---
        // 11000 is MongoDB's official code for "Duplicate Key"
        if (err.code === 11000) {
            // Check which field triggered the duplicate error
            const duplicatedField = Object.keys(err.keyValue)[0];

            if (duplicatedField === 'email') {
                return res.status(400).json({ error: "An account with this email already exists." });
            }
            if (duplicatedField === 'username') {
                return res.status(400).json({ error: "This username is already taken. Please choose another." });
            }
        }

        // Fallback for any other random server errors
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Server error during registration." });
    }
});

// Login Route — issues a signed JWT cookie on success
app.post("/login", async (req, res) => {
    try {
        const { identifier, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        // --- NEW: Generate token and set cookie ---
        generateTokenAndSetCookie(user._id, res);

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ENTERPRISE SECURE LOGOUT ROUTE ---
app.post("/api/logout", (req, res) => {
    try {
        // We "clear" the cookie by sending a response that overwrites 
        // the 'jwt' cookie with an empty string and sets its expiration to 0.
        res.cookie("jwt", "", { 
            maxAge: 0,
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV !== "development"
        });

        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout Error:", err);
        res.status(500).json({ error: "Internal Server Error during logout" });
    }
});

// --- TRACK ONLINE USERS ---
const onlineUsers = new Map(); // Maps userId to their current socket ID

// --- SECURE SOCKET IDENTITY CHECK ---
io.use((socket, next) => {
  try {
    // 1. Manually grab the cookie from the handshake headers
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return next(new Error("Authentication error"));

    // 2. Extract the 'jwt' value from the cookie string
    const token = cookieHeader.split(';').find(c => c.trim().startsWith('jwt=')).split('=')[1];
    
    if (!token) return next(new Error("Authentication error"));

    // 3. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id; // Attach the real User ID to the socket
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

// --- 4. REAL-TIME LOGIC (Socket.io) ---
io.on("connection", (socket) => {
  // Use the SECURE ID we just extracted in the middleware
  const userId = socket.userId; 
  
  if (userId) {
    socket.join(userId.toString());
    console.log(`✅ User ${userId} secured in private room`);
  }
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
    // --- BULLETPROOF MESSAGE HANDLER WITH FALLBACK LOGIC ---
    socket.on("send_message", async (data) => {
        try {
            // ✅ SAFETY CHECK 1: Ensure sender and receiver IDs are valid
            if (!data.sender || !data.receiver) {
                console.error("❌ CRITICAL: Missing sender or receiver ID", { sender: data.sender, receiver: data.receiver });
                socket.emit("send_error", { error: "Invalid sender or receiver" });
                return;
            }

            // ✅ SAFETY CHECK 2: Validate IDs are proper strings or ObjectIds
            let senderId, receiverId;

            try {
                // Convert string IDs to proper MongoDB ObjectId format
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

            // ✅ SAFETY CHECK 3: Calculate room ID as FALLBACK if not provided
            // This ensures we NEVER have an undefined room field
            const calculatedRoom = [senderId.toString(), receiverId.toString()].sort().join("_");
            const room = data.room || calculatedRoom;

            if (!room) {
                console.error("❌ CRITICAL: Could not determine room ID");
                socket.emit("send_error", { error: "Could not create chat room" });
                return;
            }

            // ✅ VERBOSE LOGGING: Track exactly what's being saved
            console.log("📤 SENDING MESSAGE:", {
                from: senderId.toString(),
                to: receiverId.toString(),
                room: room,
                text: data.text?.substring(0, 50) || "(no text)",
                hasFile: !!data.fileUrl
            });

            // 1. Save to Database FIRST - with ALL required fields
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

            // 2. Confirm back to the SENDER: replace temp ID with real DB _id
            socket.emit("message_confirmed", {
                tempId: data.tempId,
                dbId: savedMessage._id,
                status: savedMessage.status,
                createdAt: savedMessage.createdAt
            });

            // 3. Send to receiver's personal room (where they joined on login)
            socket.to(receiverId.toString()).emit("receive_message", savedMessage);
            console.log("📩 MESSAGE EMITTED to receiver's room:", receiverId.toString());
            
        } catch (error) {
            console.error("❌ Real-time Save Error:", error.message);
            console.error("   Full Stack:", error.stack);
            socket.emit("send_error", { error: "Failed to save message. Please try again." });
        }
    });

    // --- 1. TYPING INDICATOR RELAY ---
    socket.on("typing_start", (data) => {
        // Broadcast specifically to the person they are chatting with
        socket.to(data.receiver).emit("user_typing", { 
            senderId: data.senderId, 
            typing: true 
        });
    });

    socket.on("typing_stop", (data) => {
        socket.to(data.receiver).emit("user_typing", { 
            senderId: data.senderId, 
            typing: false 
        });
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
    upload.single('file')(req, res, function (err) {
        if (err) {
            console.error("--- UPLOAD ERROR LOGGED ---");
            console.error(err); // This will show the real error in terminal
            return res.status(400).json({
                error: err.message || "File type not supported by Cloudinary"
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file received" });
        }

        // Success!
        res.json({
            fileUrl: req.file.path,
            fileName: req.file.originalname,
            fileType: req.file.mimetype
        });
    });
});

// --- SECURE DOWNLOAD PROXY (WITH ANTI-BOT DISGUISE) ---
app.get("/download", async (req, res) => {
    try {
        const fileUrl = req.query.url;
        const fileName = req.query.filename || 'document.pdf';

        if (!fileUrl) return res.status(400).send("No file URL provided.");

        // 1. DISGUISE NODE.JS AS A BROWSER
        const response = await fetch(fileUrl, {
            headers: {
                // This tells Cloudinary: "I am a normal Windows Chrome Browser, let me in!"
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        // 2. LOG EXACT CDN ERRORS
        if (!response.ok) {
            console.error(`🚨 CDN Blocked Request: ${response.status} ${response.statusText}`);
            console.error(`🚨 Attempted URL: ${fileUrl}`);
            return res.status(response.status).send(`Failed to fetch from Cloudinary. Status: ${response.status}`);
        }

        const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_\s()]/g, "").trim();

        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');

        Readable.fromWeb(response.body).pipe(res);

    } catch (err) {
        console.error("Proxy Download Error:", err);
        res.status(500).send("Server failed to process the download.");
    }
});

// --- 5. CHAT HISTORY ROUTE ---
app.get("/messages", protectRoute, async (req, res) => {
    try {
        const messages = await Message.find();
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch messages" });
    }
});
// --- USER SEARCH ROUTE ---
app.get("/users/search", protectRoute, async (req, res) => {
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
app.get("/messages/:room", protectRoute, async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch history" });
    }
});

// --- GET ALL ACTIVE CHATS FOR A USER ---
app.get("/chats/:userId", protectRoute, async (req, res) => {
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
app.delete("/messages/delete/:room", protectRoute, async (req, res) => {
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