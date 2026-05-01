const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

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

        generateTokenAndSetCookie(newUser._id, res);

        res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            avatar: newUser.avatar,
            theme: newUser.theme,
            darkMode: newUser.darkMode,
            privacyLevel: newUser.privacyLevel
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

        generateTokenAndSetCookie(user._id, res);

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            theme: user.theme,
            darkMode: user.darkMode,
            privacyLevel: user.privacyLevel
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

module.exports = {
    generateTokenAndSetCookie,
    register,
    login,
    logout,
    checkAuth
};
