# Chat Application - Backend Architecture Guide

A comprehensive technical guide for developers to understand the backend architecture, features, and data flow of this real-time chat application.

## Table of Contents
1. [System Overview](#system-overview)
2. [Project Structure](#project-structure)
3. [Database Models](#database-models)
4. [Core Features](#core-features)
5. [Socket.IO Architecture](#socketio-architecture)
6. [API Endpoints](#api-endpoints)
7. [Authentication Flow](#authentication-flow)
8. [Real-Time Messaging](#real-time-messaging)
9. [Video/Voice Calling](#videovoice-calling)
10. [Privacy & Blocking System](#privacy--blocking-system)
11. [Social Features](#social-features)
12. [File Uploads](#file-uploads)
13. [Security & Middleware](#security--middleware)

---

## System Overview

This is a **MERN Stack** real-time chat application with the following backend technologies:

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Real-Time**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens) + Cookies + Google OAuth
- **File Storage**: Cloudinary
- **Video/Voice**: WebRTC (simple-peer library)

### Server Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         HTTP Server (Express)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ Auth Routes │ │Msg Routes   │ │User Routes  │ │Upload Routes│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Socket.IO Server                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │ Message Handler │ │  Call Handler   │ │ Presence Handler│    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   MongoDB       │
                    └─────────────────┘
```

---

## Project Structure

```
server/
├── index.js                    # Main entry point - HTTP + Socket.IO server
├── config/
│   └── db.js                   # MongoDB connection configuration
├── models/
│   ├── User.js                 # User schema (auth, privacy, social)
│   └── Message.js              # Message schema (chat, file attachments)
├── middleware/
│   ├── rateLimiters.js         # DDoS & brute-force protection
│   └── socketAuth.js           # Socket.IO JWT authentication
├── utils/
│   ├── cloudinaryConfig.js     # Cloudinary SDK configuration
│   └── onlineState.js          # Global state: online users, privacy, blocks
└── features/                   # Modular feature architecture
    ├── auth/
    │   ├── authController.js   # Register, login, logout, Google OAuth
    │   ├── authMiddleware.js   # JWT verification for HTTP routes
    │   └── authRoutes.js       # /api/auth/* endpoints
    ├── messages/
    │   ├── messageController.js # Chat history, chat list APIs
    │   ├── messageRoutes.js     # /api/messages/* endpoints
    │   └── messageSocketHandlers.js # Real-time messaging sockets
    ├── calls/
    │   └── callSocketHandlers.js  # WebRTC video/voice call signaling
    ├── privacy/
    │   ├── privacyController.js   # Privacy settings, user search, blocking
    │   └── privacyRoutes.js       # /api/users/* endpoints
    └── uploads/
        ├── uploadController.js    # Avatar & file upload logic
        └── uploadRoutes.js        # /api/uploads/* endpoints
```

---

## Database Models

### User Model (`models/User.js`)

```javascript
{
  username: String (unique, required),    // Display name
  email: String (unique, required),       // Login identifier
  password: String (required, hashed),     // bcrypt hashed
  
  // Privacy Settings (Instagram-like)
  isPrivate: Boolean (default: false),     // Legacy field
  privacyLevel: Enum [                   // Granular privacy control
    'standard',        // Normal visibility
    'hide_online',     // Appear offline to others
    'hide_read',       // Hide read receipts
    'ghost'            // Hide both online status & read receipts
  ] (default: 'standard'),
  
  // User Preferences
  avatar: String (default: ""),            // Cloudinary URL
  theme: String (default: "cosmic"),       // UI theme preference
  darkMode: Boolean (default: true),      // UI mode preference
  
  // Social Graph
  requests: [ObjectId (ref: 'User')],     // Pending friend requests
  friends: [ObjectId (ref: 'User')],      // Accepted connections
  blockedUsers: [ObjectId (ref: 'User')]  // Blocked users (isolation)
}
```

### Message Model (`models/Message.js`)

```javascript
{
  sender: ObjectId (ref: 'User', required),      // Message author
  receiver: ObjectId (ref: 'User', required),    // Recipient
  text: String (default: ""),                    // Message content
  
  // File Attachments (robust tracking)
  fileUrl: String (default: null),               // Cloudinary URL
  fileName: String (default: null),              // Original filename
  fileType: String (default: null),               // MIME type
  fileSize: Number (default: null),              // Bytes for display
  
  room: String (required),                         // Chat room ID (sorted user IDs)
  status: String (default: 'sent')                 // Message status:
                                                   // 'sent' | 'delivered' | 'seen'
}
```

**Room ID Generation**: Room IDs are created by sorting both user IDs and joining with underscore:
```javascript
const roomId = [user1Id, user2Id].sort().join("_");
// Example: "userA_userB" (alphabetical order)
```
This ensures both participants see the same room regardless of who initiates.

---

## Core Features

### 1. Authentication System

**HTTP-Based Auth Flow:**

1. **Registration** (`POST /register`)
   - Validates unique email/username
   - Hashes password with bcrypt (10 salt rounds)
   - Creates JWT token (15-day expiry)
   - Sets HTTP-only cookie with JWT
   - Returns user profile (minus password)

2. **Login** (`POST /login`)
   - Accepts email OR username as identifier
   - Validates credentials with bcrypt.compare()
   - Issues new JWT cookie
   - Returns full user profile

3. **Logout** (`POST /logout`)
   - Clears JWT cookie (sets empty value, maxAge: 0)

4. **Session Check** (`GET /api/auth/check`)
   - Validates JWT from cookie
   - Returns current user data

**Google OAuth Flow:**

1. **Google Login** (`POST /api/auth/google`)
   - Receives Google credential (ID token)
   - Verifies token with Google's OAuth2Client
   - If user exists: logs them in (JWT cookie)
   - If new user: returns `isNewUser: true` with Google info

2. **Google Register** (`POST /api/auth/google/register`)
   - Receives credential + chosen username
   - Verifies token again
   - Creates user with random password (hashed)
   - Saves Google profile picture as avatar
   - Logs user in

**Socket.IO Auth Flow:**

1. Initial connection includes cookies in handshake
2. `socketAuthMiddleware` extracts and verifies JWT
3. If valid: `socket.userId` is set, socket joins user room
4. If invalid: connection allowed but user must authenticate via `add_user` event

### 2. User Blocking & Isolation System

**Block/Unblock API:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/block/:id` | POST | Block a user |
| `/api/users/unblock/:id` | POST | Unblock a user |
| `/api/users/blocked` | GET | Get list of blocked users |

**Isolation Effects:**

When User A blocks User B:

1. **Message Blocking**: B cannot send messages to A (gets "You are blocked" system message)
2. **Call Blocking**: B cannot call A (call rejected with "User is unavailable")
3. **Online Status Invisibility**: A appears offline to B (even if A is online)
4. **Reverse Visibility**: B can still appear online to A (unless B also blocks A)

**Implementation:**

```javascript
// In-memory block cache for performance
const blockCache = new Map(); // userId -> Set of blocked user IDs

// Check if blocked before sending message
const receiverBlockedSender = blockCache.get(receiverId)?.has(senderId);
if (receiverBlockedSender) {
    // Send system message: "You are blocked"
    socket.emit("receive_message", { isSystem: true, text: "You are blocked" });
    return;
}

// Check if blocked before showing online status
const userBlockedRequestor = blockCache.get(userId)?.has(requestingUserId);
if (userBlockedRequestor) {
    // Don't show this user as online to the requestor
    continue;
}
```

### 3. Real-Time Messaging

**Socket Events (Message Flow):**

```
SENDER                                    RECEIVER
   │                                         │
   ├── send_message ────────────────────────>│
   │   {text, receiver, tempId, fileData}    │
   │   (blocked check happens here)          │
   │                                         │
   │<─ message_confirmed ─────────────────────│
   │   {tempId, dbId, status, createdAt}     │
   │                                         ├── Save to DB
   │                                         ├── receive_message
   │                                         │   (broadcast to sender's room)
   │<─ receive_message ───────────────────────│
   │   (if not blocked)                      │
   │                                         │
   ├── update_status ──────────────────────>│
   │   {msgId, status: 'seen'}               │
   │   (privacy-aware)                       │
   │                                         ├── Update DB
   │<─ status_changed ────────────────────────│
   │   {msgId, status}                       │
```

**Key Features:**
- **Block-Aware Delivery**: Messages from blocked users are dropped
- **Message Status Tracking**: `sent` → `delivered` (when receiver online) → `seen` (when read)
- **Offline Delivery**: Messages sent to offline users are marked `sent`, then auto-updated to `delivered` when user connects
- **File Attachments**: Files uploaded to Cloudinary, URL stored in message
- **Typing Indicators**: Real-time `typing_start` / `typing_stop` events (respects privacy settings)

### 4. Video/Voice Calling (WebRTC)

**Architecture: P2P WebRTC with Socket Signaling**

Uses `simple-peer` library for peer-to-peer connection:

```
CALLER                                            RECEIVER
   │                                                 │
   ├── call_user ─────────────────────────────────>│
   │   {userToCall, signalData, from, callerName,    │
   │    callType: 'video'|'voice'}                   │
   │   (blocked check happens)                       ├── Shows incoming call UI
   │                                                 │
   │<─ (if accepted) answer_call ────────────────────│
   │   {to, signal} (WebRTC answer signal)           │
   │                                                 ├── WebRTC connection established
   │   Direct P2P connection for media                 │   Direct P2P connection
   │                                                 │
   ├── end_call ──────────────────────────────────>│ (if hung up)
   │   or                                            │
   ├── decline_call ────────────────────────────────>│ (if declined)
```

**Call Types:**
- `callType: 'video'` - Video call with camera
- `callType: 'voice'` - Audio-only call

**WebRTC Signal Flow:**
1. Caller creates peer, generates `signalData` (SDP offer)
2. Emits `call_user` with signal data
3. Receiver creates peer, generates `signal` (SDP answer)
4. Emits `answer_call` with answer signal
5. ICE candidates exchanged automatically via simple-peer
6. Direct P2P connection established for media stream

### 5. Privacy System

**Privacy Levels:**

| Level | Effect on Online Status | Effect on Read Receipts |
|-------|------------------------|------------------------|
| `standard` | Visible to all (unless blocked) | Shows "seen" |
| `hide_online` | Appears offline | Shows "seen" |
| `hide_read` | Visible | Shows "delivered" only |
| `ghost` | Appears offline | Shows "delivered" only |

**Privacy + Blocking Interaction:**

Blocking takes precedence over privacy settings. If User A blocks User B:
- B cannot see A's online status regardless of A's privacy level
- B's messages to A are dropped regardless of A's privacy level

**Implementation:**

```javascript
// When user connects
if (privacyLevel === 'standard') {
    onlineUsers.set(userId, socket.id);
    // Only broadcast to users who haven't been blocked by this user
    for (const [otherUserId, otherSocketId] of onlineUsers) {
        if (!blockCache.get(userId)?.has(otherUserId)) {
            io.to(otherSocketId).emit("user_status_change", { userId, isOnline: true });
        }
    }
}

// When marking messages as seen
if (readerLevel === 'ghost') {
    finalStatus = 'sent';  // Don't update at all
} else if (readerLevel === 'hide_read') {
    finalStatus = 'delivered';  // Don't show "seen"
}
```

**Privacy Cache:** Stored in-memory (`privacyCache` Map) to avoid DB lookups on every operation.

### 6. Social Features (Friends System)

**User Model Fields:**
```javascript
{
  requests: [ObjectId],  // Users who sent friend request to this user
  friends: [ObjectId]    // Mutual connections
}
```

**Typical Flow:**
1. User A sends friend request → Added to User B's `requests`
2. User B accepts → Moved from `requests` to `friends` for both users
3. Friends can see enhanced profile info and have priority in search

**Note**: This appears in the schema but the detailed friend request API endpoints may need verification in the routes.

---

## Socket.IO Architecture

### Connection Lifecycle

```javascript
// 1. Client connects with cookies
const socket = io(BACKEND_URL, { withCredentials: true });

// 2. Server authenticates via socketAuthMiddleware
io.use(socketAuthMiddleware);

// 3. If JWT valid, auto-join user room
if (socket.userId) {
    socket.join(userId);
    console.log(`User ${userId} secured in private room`);
}

// 4. Client emits add_user for full auth and state loading
socket.emit("add_user", userId);

// 5. Server loads privacy, blocked users, broadcasts online status
socket.on("add_user", async (userId) => {
    const user = await User.findById(userId);
    privacyCache.set(userId, user.privacyLevel);
    blockCache.set(userId, new Set(user.blockedUsers));
    // Handle offline message delivery
    // Broadcast online status to non-blocked users
});
```

### Event Handlers

| Event | Direction | Purpose |
|-------|-----------|---------|
| `add_user` | C → S | Authenticate socket, load privacy/block state |
| `join_personal` | C → S | Legacy alias for add_user |
| `send_message` | C → S | Send chat message (block-aware) |
| `receive_message` | S → C | Receive chat message |
| `message_confirmed` | S → C | ACK with DB ID |
| `typing_start` / `typing_stop` | C → S | Typing indicators |
| `update_status` | C → S | Mark message as seen/delivered (privacy-aware) |
| `mark_room_seen` | C → S | Mark all messages in room as seen |
| `call_user` | C → S | Initiate WebRTC call (block-aware) |
| `answer_call` | C → S | Accept WebRTC call with answer signal |
| `end_call` | C → S | Hang up active call |
| `decline_call` | C → S | Decline incoming call |
| `user_status_change` | S → C | User online/offline (block-aware) |
| `online_users_list` | S → C | List of visible online users (respects blocks) |
| `privacy_changed` | C → S | Update privacy settings |
| `call_error` | S → C | Call rejected (blocked or unavailable) |

### Global State (`utils/onlineState.js`)

```javascript
const onlineUsers = new Map();  // userId -> socketId
const privacyCache = new Map(); // userId -> privacyLevel
const blockCache = new Map();   // userId -> Set of blocked userIds

// Helper: Get socket ID for direct messaging
// (Not exported but used internally in handlers)
```

This is **in-memory state** (not persistent). On server restart:
- All users appear offline until they reconnect
- Privacy and block caches are rebuilt from database on `add_user`

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Create new account |
| POST | `/login` | No | Authenticate user |
| POST | `/logout` | Yes | Clear session |
| GET | `/api/auth/check` | Yes | Verify session |
| POST | `/api/auth/google` | No | Google OAuth login |
| POST | `/api/auth/google/register` | No | Google OAuth + username registration |

### Messages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/messages` | Yes | All messages (admin/debug) |
| GET | `/api/messages/:room` | Yes | Messages for specific room |
| GET | `/api/chats/:userId` | Yes | Chat list for user (with unread counts) |
| DELETE | `/api/chats/:room` | Yes | Delete all messages in room |

### Users & Privacy

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/search?q=...` | Yes | Search users by username |
| PUT | `/api/users/privacy` | Yes | Update privacy level |
| PUT | `/api/users/settings` | Yes | Update theme/darkMode/privacy |
| GET | `/api/users/settings` | Yes | Get user settings |
| POST | `/api/users/block/:id` | Yes | Block a user |
| POST | `/api/users/unblock/:id` | Yes | Unblock a user |
| GET | `/api/users/blocked` | Yes | Get blocked users list |

### Uploads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/uploads/avatar` | Yes | Upload profile picture |
| POST | `/api/uploads/file` | Yes | Upload file attachment |
| GET | `/api/uploads/download` | Yes | Download file (proxy) |

---

## Authentication Flow

### JWT Cookie Flow

```
Client                          Server
  │                              │
  ├─ POST /login ───────────────>│
  │  {identifier, password}       │
  │                              │ Verify credentials
  │<─ Set-Cookie: jwt=token ──────┤ Create JWT (15 days)
  │  {user profile}              │
  │                              │
  ├─ GET /api/auth/check ───────>│
  │  Cookie: jwt=token            │ Verify JWT
  │<─ {user profile} ─────────────┤ Return user data
  │                              │
  ├─ Socket connect ────────────>│
  │  with Cookies                 │ Extract & verify JWT
  │<─ Connection established ────┤ Set socket.userId
```

### Google OAuth Flow

```
Client                          Server
  │                              │
  ├─ Google Sign-In ────────────>│
  │  (Frontend gets credential)   │
  │                              │
  ├─ POST /api/auth/google ─────>│
  │  {credential}                 │ Verify with Google
  │                              │ Check if user exists
  │<─ {isNewUser: true/false} ────┤ If new: return Google info
  │                              │ If existing: login (JWT)
  │                              │
  ├─ POST /api/auth/google/reg ─>│ (if new user)
  │  {credential, username}       │ Verify credential
  │                              │ Create user with random password
  │<─ Set-Cookie: jwt=token ──────┤ Login complete
  │  {user profile}              │
```

### Token Structure

```javascript
jwt.sign(
  { id: userId },           // Payload
  process.env.JWT_SECRET,  // Secret key
  { expiresIn: '15d' }     // 15 day expiry
)
```

### Cookie Settings

```javascript
{
  httpOnly: true,    // Not accessible via JavaScript (XSS protection)
  sameSite: "none",  // Allow cross-origin requests
  secure: true,      // HTTPS only
  maxAge: 15 days
}
```

---

## Security & Middleware

### Rate Limiting

```javascript
// Global: 1000 requests per 15 minutes per IP
const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 1000 });

// Auth: 10 login attempts per 15 minutes per IP
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });

// Uploads: 30 files per hour per IP
const uploadLimiter = rateLimit({ windowMs: 60*60*1000, max: 30 });
```

### Socket Authentication

- JWT verified from handshake cookies
- If invalid: connection allowed, user must auth via `add_user`
- Prevents unauthorized socket operations

### CORS Configuration

```javascript
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);  // Allow all
        callback(null, true);
    },
    credentials: true  // Allow cookies
}));
```

---

## Data Flow Examples

### Sending a Message (Complete Flow)

```javascript
// 1. Client sends message
socket.emit("send_message", {
    text: "Hello!",
    sender: "user1_id",
    receiver: "user2_id",
    tempId: "temp_123",
    room: "user1_user2"
});

// 2. Server checks if blocked (messageSocketHandlers.js)
const receiverBlockedSender = blockCache.get(receiverId)?.has(senderId);
if (receiverBlockedSender) {
    // Send system message: "You are blocked"
    socket.emit("receive_message", {
        isSystem: true,
        text: "You are blocked"
    });
    return;
}

// 3. Server saves to DB
const savedMessage = await new Message({...}).save();

// 4. Server confirms to sender
socket.emit("message_confirmed", {
    tempId: "temp_123",
    dbId: savedMessage._id,
    status: "sent",
    createdAt: savedMessage.createdAt
});

// 5. Server delivers to receiver (if online)
socket.to("user2_id").emit("receive_message", messagePayload);

// 6. Receiver marks as seen (privacy-aware)
socket.emit("update_status", {
    msgId: savedMessage._id,
    senderId: "user1_id",
    receiverId: "user2_id",
    status: "seen"
});

// 7. Server updates and notifies sender (respecting privacy)
if (readerPrivacy !== 'ghost' && readerPrivacy !== 'hide_read') {
    socket.to("user1_id").emit("status_changed", { msgId, status: "seen" });
}
```

### Privacy + Blocking Interaction

```javascript
// Scenario: User A (standard privacy) blocks User B

// 1. User A blocks User B via API
POST /api/users/block/:userB_id
// → blockCache.set(userA_id, Set { userB_id })

// 2. User B tries to send message to User A
socket.emit("send_message", { sender: "userB", receiver: "userA", ... });

// 3. Server checks blockCache
const isBlocked = blockCache.get("userA")?.has("userB"); // true

// 4. Message is dropped, User B receives system message
socket.emit("receive_message", {
    isSystem: true,
    text: "You are blocked"
});

// 5. User B sees User A as offline (regardless of actual status)
// Because A's online status broadcasts exclude B
```

---

## Environment Variables

```bash
# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/chat-app

# JWT
JWT_SECRET=your_super_secret_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Cloudinary (File Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
PORT=5000
NODE_ENV=production
```

---

## Development Tips

### Adding a New Feature

1. **Create Controller** (`features/myFeature/myController.js`)
2. **Create Routes** (`features/myFeature/myRoutes.js`)
3. **Add Socket Handlers** (if real-time) (`features/myFeature/mySocketHandlers.js`)
4. **Register in index.js**:
   - Import routes: `app.use('/api/myfeature', myRoutes)`
   - Import socket handler: `require('./features/myFeature/mySocketHandlers')(io, socket)`

### Debugging Socket Events

All socket handlers include detailed logging. Look for these prefixes:
- `📡 [Socket]` - Connection/auth events
- `📤 SENDING MESSAGE` - Message send flow
- `✅ MESSAGE SAVED` - Database operations
- `🚫 BLOCK` - Blocking-related events
- `📞` - Call events
- `❌` - Errors

### Common Issues

1. **Socket not receiving messages**: Check that `add_user` event was emitted after connection
2. **Messages not showing as delivered**: Verify receiver's socket is in `onlineUsers` Map
3. **Privacy not working**: Check `privacyCache` has correct value for user
4. **Blocking not working**: Verify `blockCache` is populated from DB on `add_user`
5. **CORS errors**: Ensure `credentials: true` on both client and server
6. **WebRTC calls failing**: Check STUN/TURN servers, firewall settings

---

## Deployment Notes

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `MONGO_URI` with production MongoDB
- [ ] Set strong `JWT_SECRET` (random string, 32+ chars)
- [ ] Configure Google OAuth credentials
- [ ] Configure Cloudinary credentials
- [ ] Enable CORS for your frontend domain only (currently allows all)
- [ ] Use HTTPS (required for secure cookies)
- [ ] Set up PM2 or similar process manager

### Socket.IO Scaling

For multi-server deployment, use Redis Adapter:

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(pubClient, subClient));
```

This ensures sockets can communicate across server instances.

---

## Differences from ZegoCloud Implementation

If you're migrating from or comparing to a ZegoCloud-based implementation:

| Feature | WebRTC (simple-peer) | ZegoCloud |
|---------|---------------------|-----------|
| Media Handling | P2P, browser-based | Cloud-managed |
| Signaling | Socket.IO events | Room-based tokens |
| Call Quality | Depends on network | Optimized by Zego |
| Server Load | Low (direct P2P) | Higher (relayed) |
| Browser Support | Limited | Better |

---

**End of Backend Architecture Guide**

For questions or issues, refer to the specific feature files in `server/features/` or the main server file `server/index.js`.
