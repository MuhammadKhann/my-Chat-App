const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { OAuth2Client } = require('google-auth-library');
const PKCEService = require('../../services/PKCEService');
const OAuthProviderService = require('../../services/OAuthProviderService');
const crypto = require('crypto');

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
            const token = generateTokenAndSetCookie(user._id, res);

            return res.status(200).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                theme: user.theme,
                darkMode: user.darkMode,
                privacyLevel: user.privacyLevel,
                token,
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
        const token = generateTokenAndSetCookie(user._id, res);

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            theme: user.theme,
            darkMode: user.darkMode,
            privacyLevel: user.privacyLevel,
            token,
            isNewUser: false
        });

    } catch (error) {
        console.error('Google Register Error:', error);
        res.status(500).json({ error: 'Failed to create account with Google' });
    }
};

// ============ PKCE OAUTH FLOW ============

// Tier 1: Initiate PKCE flow
const initiatePKCE = async (req, res) => {
    try {
        const { preferredMode = 'popup', frontendOrigin } = req.body;

        // Use frontend-provided origin, fallback to env var for backward compatibility
        const origin = frontendOrigin || process.env.FRONTEND_URL;
        if (!origin) {
            return res.status(500).json({
                success: false,
                error: 'Frontend origin not provided',
                code: 'MISSING_ORIGIN'
            });
        }

        const session = await PKCEService.createSession({
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            provider: 'google',
        });

        // Build Google OAuth URL
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri',
            preferredMode === 'popup'
                ? `${origin}/auth/callback/popup`
                : `${origin}/auth/callback`
        );
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('state', session.state);
        authUrl.searchParams.set('code_challenge', session.codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('prompt', 'select_account');
        authUrl.searchParams.set('access_type', 'offline');

        res.json({
            success: true,
            authUrl: authUrl.toString(),
            sessionId: session.sessionId,
            state: session.state,
            mode: preferredMode,
        });
    } catch (error) {
        console.error('PKCE initiation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication initialization failed',
            code: 'INIT_FAILED'
        });
    }
};

// Tier 1: Complete PKCE flow
const completePKCE = async (req, res) => {
    try {
        const { code, state, sessionId, frontendOrigin } = req.body;
        const { mode = 'redirect' } = req.query;

        // Input validation
        if (!code || !state || !sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
                code: 'MISSING_PARAMS'
            });
        }

        // Use frontend-provided origin, fallback to env var for backward compatibility
        const origin = frontendOrigin || process.env.FRONTEND_URL;
        if (!origin) {
            return res.status(500).json({
                success: false,
                error: 'Frontend origin not provided',
                code: 'MISSING_ORIGIN'
            });
        }

        // Validate session
        let session;
        try {
            session = await PKCEService.validateSession({
                sessionId,
                state,
                ipAddress: req.ip,
            });
        } catch (err) {
            return res.status(400).json({
                success: false,
                error: 'Session expired or invalid',
                code: 'INVALID_SESSION'
            });
        }

        // Exchange code for tokens
        let tokens;
        try {
            tokens = await OAuthProviderService.exchangeCodeForTokens({
                code,
                codeVerifier: session.codeVerifier,
                redirectUri: mode === 'popup'
                    ? `${origin}/auth/callback/popup`
                    : `${origin}/auth/callback`,
            });
        } catch (err) {
            console.error('Token exchange failed:', err);
            return res.status(400).json({
                success: false,
                error: 'Failed to verify with Google',
                code: 'TOKEN_EXCHANGE_FAILED'
            });
        }

        // Verify ID token
        let googleUser;
        try {
            googleUser = await OAuthProviderService.verifyIdToken(tokens.id_token);
        } catch (err) {
            console.error('ID token verification failed:', err);
            return res.status(400).json({
                success: false,
                error: 'Invalid identity token',
                code: 'INVALID_TOKEN'
            });
        }

        // Mark session as used
        await PKCEService.consumeSession(sessionId);

        // Check for existing user
        let user = await User.findOne({ email: googleUser.email });

        if (!user) {
            // New user - create temp session for username flow
            const tempToken = await PKCEService.createTempUserSession({
                email: googleUser.email,
                name: googleUser.name,
                picture: googleUser.picture,
                providerId: googleUser.sub,
                ipAddress: req.ip,
            });

            return res.json({
                success: true,
                requiresUsername: true,
                tempToken,
                profile: {
                    email: googleUser.email,
                    name: googleUser.name,
                    picture: googleUser.picture,
                },
            });
        }

        // Existing user - create session
        const authToken = generateTokenAndSetCookie(user._id, res);

        return res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                theme: user.theme,
                darkMode: user.darkMode,
                privacyLevel: user.privacyLevel,
            },
            token: authToken,
        });

    } catch (error) {
        console.error('PKCE completion failed:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            code: 'INTERNAL_ERROR',
        });
    }
};

// Complete registration with username (for new OAuth users)
const completeOAuthRegistration = async (req, res) => {
    try {
        const { tempToken, username } = req.body;

        // Validate input
        if (!tempToken || !username) {
            return res.status(400).json({
                success: false,
                error: 'Missing token or username',
                code: 'MISSING_PARAMS',
            });
        }

        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid username format',
                code: 'INVALID_USERNAME',
            });
        }

        // Check if username exists
        const existingUser = await User.findOne({
            username: username.toLowerCase()
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Username already taken',
                code: 'USERNAME_TAKEN',
            });
        }

        // Get temp session
        const tempData = await PKCEService.getTempSession(tempToken);
        if (!tempData) {
            return res.status(400).json({
                success: false,
                error: 'Session expired, please try again',
                code: 'SESSION_EXPIRED',
            });
        }

        // Check if email was registered meanwhile
        const existingEmail = await User.findOne({ email: tempData.email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered',
                code: 'EMAIL_EXISTS',
            });
        }

        // Create user
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const user = new User({
            username: username.toLowerCase(),
            email: tempData.email,
            password: hashedPassword,
            avatar: tempData.picture || '',
            isGoogleAuth: true,
            googleId: tempData.providerId,
            theme: 'cosmic',
            darkMode: true,
            privacyLevel: 'standard',
        });

        await user.save();

        // Create session
        const authToken = generateTokenAndSetCookie(user._id, res);

        res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
            },
            token: authToken,
        });

    } catch (error) {
        console.error('OAuth registration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            code: 'INTERNAL_ERROR',
        });
    }
};

module.exports = {
    generateTokenAndSetCookie,
    register,
    login,
    logout,
    checkAuth,
    googleLogin,
    googleRegister,
    // New PKCE exports
    initiatePKCE,
    completePKCE,
    completeOAuthRegistration,
};
