const jwt = require('jsonwebtoken');
const User = require('../../models/User');

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

module.exports = { protectRoute };
