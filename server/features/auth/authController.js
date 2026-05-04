const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateTokenAndSetCookie = (userId, res) => {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '15d'
    });

    res.cookie("jwt", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "none",
        secure: true,
    });

    return token;
};

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ error: "This email is already registered. Try signing in instead." });

        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ error: "This username is already taken. Try another username." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        const token = generateTokenAndSetCookie(newUser._id, res);

        res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            avatar: newUser.avatar,
            theme: newUser.theme,
            darkMode: newUser.darkMode,
            privacyLevel: newUser.privacyLevel,
            token: token // Include token for header-based auth fallback
        });
    } catch (err) {
        if (err.code === 11000) {
            const duplicatedField = Object.keys(err.keyValue)[0];
            if (duplicatedField === 'email') {
                return res.status(400).json({ error: "An account with this email already exists." });
            }
            if (duplicatedField === 'username') {
                return res.status(400).json({ error: "This username is already taken. Please choose another." });
            }
        }
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Server error during registration." });
    }
};

const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = generateTokenAndSetCookie(user._id, res);

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            theme: user.theme,
            darkMode: user.darkMode,
            privacyLevel: user.privacyLevel,
            token: token // Include token for header-based auth fallback
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const logout = (req, res) => {
    try {
        res.cookie("jwt", "", {
            maxAge: 0,
            httpOnly: true,
            sameSite: "none",
            secure: true
        });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout Error:", err);
        res.status(500).json({ error: "Internal Server Error during logout" });
    }
};

const checkAuth = (req, res) => {
    res.status(200).json(req.user);
};

// Google Login - Step 1: Verify token and check if user exists
const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ error: 'Google credential is required' });
        }

        // Verify the token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
            // User exists - log them in
            generateTokenAndSetCookie(user._id, res);

            return res.status(200).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                theme: user.theme,
                darkMode: user.darkMode,
                privacyLevel: user.privacyLevel,
                isNewUser: false
            });
        }

        // User doesn't exist - return info for username creation
        return res.status(200).json({
            email,
            name,
            picture,
            googleId,
            isNewUser: true,
            message: 'Username required'
        });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
};

// Google Register - Step 2: Create new user with username
const googleRegister = async (req, res) => {
    try {
        const { credential, username, email, name, picture } = req.body;

        if (!credential || !username) {
            return res.status(400).json({ error: 'Google credential and username are required' });
        }

        // Verify the token again
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email: googleEmail } = payload;

        // Verify email matches
        if (googleEmail !== email) {
            return res.status(400).json({ error: 'Email mismatch' });
        }

        // Check if username is already taken
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'This username is already taken. Try another username.' });
        }

        // Check if email is already registered
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ error: 'This email is already registered. Try signing in instead.' });
        }

        // Generate random password for Google users
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.genSalt(10).then(salt => bcrypt.hash(randomPassword, salt));

        // Create new user
        const user = new User({
            username: username.toLowerCase(),
            email,
            password: hashedPassword,
            avatar: picture || '',
            isPrivate: false,
            privacyLevel: 'standard',
            theme: 'cosmic',
            darkMode: true,
            requests: [],
            friends: [],
            blockedUsers: []
        });

        await user.save();

        // Generate token and log them in
        generateTokenAndSetCookie(user._id, res);

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            theme: user.theme,
            darkMode: user.darkMode,
            privacyLevel: user.privacyLevel,
            isNewUser: false
        });

    } catch (error) {
        console.error('Google Register Error:', error);
        res.status(500).json({ error: 'Failed to create account with Google' });
    }
};

module.exports = {
    generateTokenAndSetCookie,
    register,
    login,
    logout,
    checkAuth,
    googleLogin,
    googleRegister
};
