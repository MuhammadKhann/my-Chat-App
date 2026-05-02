require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { globalLimiter } = require('./middleware/rateLimiters');
const socketAuthMiddleware = require('./middleware/socketAuth');
const { protectRoute } = require('./features/auth/authMiddleware');

// Feature Routes
const authRoutes = require('./features/auth/authRoutes');
const messageRoutes = require('./features/messages/messageRoutes');
const uploadRoutes = require('./features/uploads/uploadRoutes');
const privacyRoutes = require('./features/privacy/privacyRoutes');
const chatRoutes = require('./features/messages/messageRoutes');

// Socket Handlers
const setupMessageHandlers = require('./features/messages/messageSocketHandlers');
const setupCallHandlers = require('./features/calls/callSocketHandlers');

const app = express();

// CORS Configuration
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);

// Rate Limiting
app.use(globalLimiter);

// Database Connection
connectDB();

// Routes - New API structure
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/users/privacy', privacyRoutes);
app.use('/api/users/settings', privacyRoutes);
app.use('/api/chats', chatRoutes);

// Legacy routes for backward compatibility
app.use('/chats', chatRoutes);
app.use('/messages', messageRoutes);
app.use('/users/search', privacyRoutes);
app.use('/upload', uploadRoutes);
app.use('/download', uploadRoutes);

// Direct search route (frontend calls this directly)
const { searchUsers } = require('./features/privacy/privacyController');
app.get('/users/search', protectRoute, searchUsers);

// Legacy auth endpoints (frontend calls these directly)
const { register, login, logout, checkAuth } = require('./features/auth/authController');
const { authLimiter } = require('./middleware/rateLimiters');
app.post('/register', authLimiter, register);
app.post('/login', authLimiter, login);
app.post('/logout', logout);
app.post('/api/logout', logout);
app.get('/api/auth/check', protectRoute, checkAuth);

const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {
            // Allow all origins in production
            callback(null, true);
        },
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Cookie", "Authorization"]
    },
    transports: ['websocket', 'polling'], // Prioritize websocket
    allowEIO3: true, // Support older clients if any
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Socket Authentication Middleware
io.use(socketAuthMiddleware);

// Socket Connection Handler
io.on("connection", (socket) => {
    const userId = socket.userId;

    if (userId) {
        socket.join(userId.toString());
        console.log(`✅ User ${userId} secured in private room`);
    }

    // Setup feature handlers
    setupMessageHandlers(io, socket);
    setupCallHandlers(io, socket);
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
