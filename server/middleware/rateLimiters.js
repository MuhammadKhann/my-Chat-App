const rateLimit = require('express-rate-limit');

// 1. Global Limiter: Protects against general DDoS attacks
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,                // Limit each IP to 1000 requests per window
    message: { error: "Too many requests from this IP, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. Auth Limiter: Strictly prevents brute-force password attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                  // Limit each IP to 10 login/register attempts per 15 minutes
    message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. Upload Limiter: Prevents Cloudinary storage spam/abuse
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 Hour
    max: 30,                  // Limit each IP to 30 file uploads per hour
    message: { error: "Upload limit reached. Please try again in an hour." },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    globalLimiter,
    authLimiter,
    uploadLimiter
};
