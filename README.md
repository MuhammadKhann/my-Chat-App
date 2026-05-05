# Chat App 💬

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7%2B-green?logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-white?logo=socket.io)](https://socket.io/)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

A real-time chat application with video/voice calling, privacy controls, and social features. Built with the MERN stack and WebRTC.

![Chat App Screenshot](https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Chat+App+Preview)

## ✨ Features

### 💬 Real-Time Messaging
- Instant message delivery with Socket.IO
- Message status tracking: `sent` → `delivered` → `seen`
- File attachments (images, documents) via Cloudinary
- Offline message queuing - messages delivered when user comes online
- Typing indicators

### 📹 Video & Voice Calls
- Peer-to-peer WebRTC calling using `simple-peer`
- **Video calls** with camera support
- **Voice calls** with audio only
- Call notifications with accept/decline
- In-call controls: mute, camera toggle, end call

### 🔒 Privacy & Security
- **Privacy Levels** (Instagram-like):
  - `standard` - Normal visibility
  - `hide_online` - Appear offline
  - `hide_read` - Hide read receipts  
  - `ghost` - Hide both online status & read receipts
- **User Blocking**: Block users to prevent messages, calls, and hide your online status
- **JWT Authentication**: Secure HTTP-only cookies
- **Rate Limiting**: DDoS and brute-force protection

### 👥 Social Features
- Friend requests and connections
- User search by username
- Online/offline status indicators
- Customizable themes and dark mode
- Profile avatars via Cloudinary

### 🔐 Authentication Options
- Email/password registration & login
- **Google Sign-In** (OAuth 2.0)
- Session persistence with JWT (15-day expiry)

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB** | Database |
| **Mongoose** | ODM for MongoDB |
| **Socket.IO** | Real-time communication |
| **WebRTC (simple-peer)** | P2P video/voice calling |
| **JWT** | Authentication |
| **Cloudinary** | File storage |
| **Google Auth Library** | OAuth integration |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI library |
| **Vite** | Build tool |
| **Socket.IO Client** | Real-time connection |
| **React OAuth Google** | Google Sign-In |
| **Lucide React** | Icons |
| **Emoji Picker React** | Emoji selection |

---

## 📁 Project Structure

```
my-chat-app/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/        # UI components (Chat, Login, etc.)
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   └── App.jsx            # Main app component
│   ├── index.html
│   └── package.json
│
├── server/                     # Node.js Backend
│   ├── index.js               # Server entry point
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Message.js         # Message schema
│   ├── middleware/
│   │   ├── rateLimiters.js    # Rate limiting
│   │   └── socketAuth.js      # Socket auth
│   ├── utils/
│   │   ├── cloudinaryConfig.js
│   │   └── onlineState.js     # Global state
│   └── features/               # Feature modules
│       ├── auth/              # Authentication
│       ├── messages/          # Chat & messaging
│       ├── calls/             # Video/voice calls
│       ├── privacy/           # Privacy & blocking
│       └── uploads/           # File uploads
│
├── .env                        # Environment variables
├── vite.config.js             # Vite configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account (for file uploads)
- Google Cloud Console project (for Google Sign-In) - optional

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/my-chat-app.git
cd my-chat-app
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd client
npm install
cd ..
```

4. **Set up environment variables**

Create a `.env` file in the root directory:

```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-app

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_characters

# Cloudinary (File Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Server
PORT=5000
NODE_ENV=development
```

5. **Start the development server**

Terminal 1 - Backend:
```bash
npm start
# or
node server/index.js
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

6. **Open in browser**
Navigate to `http://localhost:5173` (or the port Vite assigns)

---

## 📡 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Create new account | No |
| POST | `/login` | Login with email/username | No |
| POST | `/logout` | Logout user | Yes |
| GET | `/api/auth/check` | Verify session | Yes |
| POST | `/api/auth/google` | Google Sign-In | No |
| POST | `/api/auth/google/register` | Complete Google registration | No |

**Login Request:**
```json
{
  "identifier": "username_or_email",
  "password": "your_password"
}
```

**Login Response:**
```json
{
  "_id": "user_id",
  "username": "john_doe",
  "email": "john@example.com",
  "avatar": "https://...",
  "theme": "cosmic",
  "darkMode": true,
  "privacyLevel": "standard",
  "token": "jwt_token"
}
```

### Messages Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:room` | Get messages for a room |
| GET | `/api/chats/:userId` | Get user's chat list |
| DELETE | `/api/chats/:room` | Delete all messages in room |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/search?q=query` | Search users |
| PUT | `/api/users/settings` | Update settings |
| GET | `/api/users/settings` | Get settings |
| POST | `/api/users/block/:id` | Block user |
| POST | `/api/users/unblock/:id` | Unblock user |
| GET | `/api/users/blocked` | Get blocked list |

### Upload Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/uploads/avatar` | Upload profile picture |
| POST | `/api/uploads/file` | Upload file attachment |
| GET | `/api/uploads/download` | Download file |

---

## 🔌 Socket.IO Events

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add_user` | `userId` | Authenticate socket connection |
| `send_message` | `{sender, receiver, text, room}` | Send a message |
| `typing_start` | `{senderId, receiver}` | Start typing indicator |
| `typing_stop` | `{senderId, receiver}` | Stop typing indicator |
| `call_user` | `{userToCall, signalData, from, callerName, callType}` | Initiate call |
| `answer_call` | `{to, signal}` | Accept call |
| `end_call` | `{to}` | End call |
| `decline_call` | `{to}` | Decline call |
| `update_status` | `{msgId, senderId, status}` | Update message status |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `receive_message` | `message` | New message received |
| `message_confirmed` | `{tempId, dbId, status}` | Message saved confirmation |
| `status_changed` | `{msgId, status}` | Message status updated |
| `incoming_call` | `{signal, from, callerName, callType}` | Incoming call notification |
| `call_accepted` | `signal` | Call accepted by remote |
| `call_ended` | - | Call ended |
| `call_declined` | - | Call declined |
| `user_status_change` | `{userId, isOnline}` | User online/offline |
| `online_users_list` | `userIds[]` | List of online users |
| `user_typing` | `{senderId, typing}` | Typing indicator |

---

## 🔐 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT signing |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `PORT` | ❌ | Server port (default: 5000) |
| `NODE_ENV` | ❌ | Environment (development/production) |

---

## 🎨 Customization

### Themes
The app supports multiple themes. Users can select their preferred theme in settings:
- `cosmic` (default)
- `sunrise`
- `midnight`
- `ocean`
- `forest`

### Privacy Settings
Users can set their privacy level to control visibility:
1. Go to Settings → Privacy
2. Select privacy level:
   - **Standard**: Normal visibility
   - **Hide Online**: Appear offline to others
   - **Hide Read**: Don't show read receipts
   - **Ghost**: Hide both online status and read receipts

---

## 🏗️ Architecture

### Real-Time Architecture
```
Client A          Socket.IO Server          Client B
   │                    │                      │
   ├── send_message ───>│                      │
   │                    ├── save to MongoDB    │
   │                    ├── message_confirmed ─>│
   │<─ message_confirmed│                      │
   │                    ├── receive_message ───>│
   │                    │                      ├── display message
   │                    │<─ update_status ─────│
   │<─ status_changed ──│                      │
```

### WebRTC Call Flow
```
Caller                    Signaling Server                  Receiver
   │                            │                              │
   ├── call_user (offer) ───────>│                              │
   │                            ├── incoming_call ────────────>│
   │                            │                              ├── show notification
   │<────────────────────────────│<─ answer_call (answer) ─────│
   ├── WebRTC P2P connection ────│────────────────────────────>│
   │                            │                              │
   ├── end_call ───────────────>│                              │
   │                            ├── call_ended ───────────────>│
```

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Register new account
- [ ] Login with email
- [ ] Login with username
- [ ] Login with Google
- [ ] Logout and session clear
- [ ] Check auth persistence on refresh

**Messaging:**
- [ ] Send text message
- [ ] Send file attachment
- [ ] Receive messages in real-time
- [ ] Message status updates (sent → delivered → seen)
- [ ] Typing indicators
- [ ] Offline message delivery

**Calling:**
- [ ] Initiate video call
- [ ] Initiate voice call
- [ ] Accept call
- [ ] Decline call
- [ ] End call
- [ ] Mute/unmute during call

**Privacy & Blocking:**
- [ ] Change privacy level
- [ ] Block a user
- [ ] Verify blocked user can't message
- [ ] Verify blocked user can't call
- [ ] Verify blocked user sees you as offline
- [ ] Unblock user

---

## 🚢 Deployment

### Deploy to Vercel (Frontend)
```bash
cd client
vercel
```

### Deploy to Render/Railway/Heroku (Backend)
1. Push code to GitHub
2. Connect repository to platform
3. Set environment variables in dashboard
4. Deploy

### Important Deployment Notes
- Set `NODE_ENV=production`
- Configure CORS for your frontend domain
- Ensure MongoDB IP whitelist includes your server
- Set strong `JWT_SECRET` (32+ random characters)
- Use HTTPS (required for secure cookies)

---

## 📝 Code Style & Conventions

- **Backend**: CommonJS modules (`require`/`module.exports`)
- **Frontend**: ES modules (`import`/`export`)
- **Database**: MongoDB with Mongoose ODM
- **Linting**: ESLint configured for React
- **Comments**: Descriptive comments for complex logic

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- [Socket.IO](https://socket.io/) for real-time communication
- [simple-peer](https://github.com/feross/simple-peer) for WebRTC
- [Cloudinary](https://cloudinary.com/) for media storage
- [MongoDB](https://www.mongodb.com/) for database
- [React](https://react.dev/) for UI

---

## 📧 Contact

For questions or support, please open an issue on GitHub.

**Project Link:** [https://github.com/yourusername/my-chat-app](https://github.com/yourusername/my-chat-app)

---

<p align="center">Made with ❤️ using MERN Stack</p>
