# Gemini Chat App

## Overview
Gemini is a full-stack real-time chat application that combines a modern React/Vite frontend with an Express/MongoDB backend. The project supports authenticated messaging, file uploads, Cloudinary media handling, user privacy controls, and peer-to-peer call signaling using Socket.IO.

## Key Features
- User registration, login, and authenticated sessions
- Real-time chat via Socket.IO
- Message persistence with MongoDB
- Secure file uploads and downloads via Cloudinary
- Privacy and user settings routes
- Peer-to-peer call signaling for audio/video interactions
- Rate limiting and secure cookie handling

## Architecture
- Frontend: `client/`
  - Built with React and Vite
  - Uses `socket.io-client` for real-time updates
  - Includes reusable components for chat UI, avatars, media preview, themes, and privacy controls
- Backend: `server/`
  - Built with Express and Node.js
  - Uses MongoDB via Mongoose
  - Provides REST API routes for auth, messages, uploads, and privacy
  - Uses Socket.IO for chat and call event handling

## Folder Structure
- `client/` – frontend source and configuration
- `server/` – backend server code
- `server/config/` – database and environment configuration
- `server/features/` – feature-specific route controllers and socket handlers
- `server/middleware/` – authentication, rate limiting, and socket middleware
- `server/models/` – Mongoose schemas for users and messages
- `server/utils/` – Cloudinary and online state helpers

## Environment Variables
Create a `.env` file in the project root with the following values:

MONGO_URI=mongodb+srv://muhammadbinnasirpro2811_db_user:1234567890@cluster0.2lqqieg.mongodb.net/chatApp?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=deedt55os
CLOUDINARY_API_KEY=414338878577869
CLOUDINARY_API_SECRET=YeZ5gsU4SZM1gsb2tqM2ykr7tcY
JWT_SECRET=chat_app_super_secret_enterprise_key_2026


> Do not commit sensitive credentials to source control.

## Installation
Install dependencies for both the root project and the client.

```bash
npm install
cd client
npm install
```

## Running Locally
1. Start the backend server from the project root:
   ```bash
   npm start
   ```
2. Start the frontend dev server:
   ```bash
   cd client
   npm run dev
   ```

## Deployment Notes
- The backend listens on `process.env.PORT || 5000`
- Backend is deployed on Azure App Services
- Frontend is deployed on Vercel
- CORS is configured to accept requests from any origin for this project
- Socket.IO is configured with `websocket` and `polling` transports
- Cloudinary is used for secure upload and download of media files

## Development Workflow
- Frontend dev: `cd client && npm run dev`
- Backend dev: `npm start`
- Frontend production build: `cd client && npm run build`
- Add ESLint support via `npm run lint` in `client/`

## Recommended Improvements
- Add frontend and backend automated tests
- Harden CORS policy for production deployment
- Introduce a production-ready process manager for the backend
- Separate environment config for staging and production

## Notes
- Backend is live on Azure App Services
- Frontend is live on Vercel
- I added the deployment details and polished the environment variable guidance

## Contact
For collaboration or troubleshooting, inspect the backend routes in `server/index.js` and the frontend logic in `client/src/`.

> If you want, I can also add the exact Azure App Services and Vercel URLs or any additional production config details.
