const jwt = require('jsonwebtoken');

const socketAuthMiddleware = (socket, next) => {
    try {
        let token = null;

        // 1. Check for token in handshake.auth (modern Socket.io approach)
        if (socket.handshake.auth && socket.handshake.auth.token) {
            token = socket.handshake.auth.token;
        }

        // 2. Fallback: Manually grab the cookie from the handshake headers
        if (!token && socket.handshake.headers.cookie) {
            const cookieHeader = socket.handshake.headers.cookie;
            const jwtCookie = cookieHeader.split(';').find(c => c.trim().startsWith('jwt='));
            if (jwtCookie) {
                token = jwtCookie.trim().split('=')[1];
            }
        }

        if (!token) {
            console.error("❌ Socket auth: No token or cookie found");
            return next(new Error("Authentication error"));
        }

        // 3. Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id; // Attach the real User ID to the socket
        next();
    } catch (err) {
        console.error("❌ Socket auth error:", err.message);
        next(new Error("Authentication error"));
    }
};

module.exports = socketAuthMiddleware;
