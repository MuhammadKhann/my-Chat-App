const jwt = require('jsonwebtoken');

const socketAuthMiddleware = (socket, next) => {
    try {
        // 1. Manually grab the cookie from the handshake headers
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) {
            console.error("❌ Socket auth: No cookie header in handshake");
            return next(new Error("Authentication error"));
        }

        // 2. Extract the 'jwt' value from the cookie string
        const jwtCookie = cookieHeader.split(';').find(c => c.trim().startsWith('jwt='));
        if (!jwtCookie) return next(new Error("Authentication error"));
        const token = jwtCookie.trim().split('=')[1];

        if (!token) return next(new Error("Authentication error"));

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
