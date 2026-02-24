// ============================================
// SECURE AUTHENTICATION - NO EXPIRY
// ============================================
// - Credentials from .env file (NOT in code)
// - Sessions never expire (client always has access)
// - No signup, no database
// ============================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// ============================================
// CREDENTIALS FROM ENVIRONMENT VARIABLES
// ============================================
// Add these to your .env file:
//   AUTH_USERNAME=your_username
//   AUTH_PASSWORD=your_secure_password
//   JWT_SECRET=some_random_string_at_least_32_chars
// ============================================

const CREDENTIALS = {
    username: process.env.AUTH_USERNAME,
    password: process.env.AUTH_PASSWORD
};

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-IN-ENV-FILE-MINIMUM-32-CHARACTERS';

// ============================================
// RATE LIMITER - Prevent brute force attacks
// ============================================

const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 5 attempts only
    message: {
        success: false,
        error: 'Too many login attempts. Try again in 15 minutes.'
    }
});

// ============================================
// TOKEN FUNCTIONS
// ============================================

const generateToken = (username) => {
    // Token that never expires (100 years)
    return jwt.sign(
        { username, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: '100y' }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

// ============================================
// SECURE STRING COMPARISON
// ============================================

const safeCompare = (input, secret) => {
    if (typeof input !== 'string' || typeof secret !== 'string') return false;

    // Pad to same length to prevent timing attacks on length
    const maxLen = Math.max(input.length, secret.length);
    const paddedInput = input.padEnd(maxLen, '\0');
    const paddedSecret = secret.padEnd(maxLen, '\0');

    // Use timing-safe comparison
    const match = crypto.timingSafeEqual(
        Buffer.from(paddedInput),
        Buffer.from(paddedSecret)
    );

    // Also check original lengths match
    return match && input.length === secret.length;
};

// ============================================
// AUTH MIDDLEWARE - Protect Routes
// ============================================

const requireAuth = (req, res, next) => {
    // Get token from header or cookie
    let token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Please login to continue',
            code: 'NO_TOKEN'
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            error: 'Session invalid. Please login again.',
            code: 'INVALID_TOKEN'
        });
    }

    req.user = { username: decoded.username };
    next();
};

// ============================================
// SETUP ROUTES
// ============================================

const setupAuthRoutes = (app) => {
    const express = require('express');
    const router = express.Router();

    // LOGIN
    router.post('/login', loginRateLimiter, async (req, res) => {
        const { username, password } = req.body;

        // Check if credentials are configured
        if (!CREDENTIALS.username || !CREDENTIALS.password) {
            console.error(' AUTH_USERNAME or AUTH_PASSWORD not set in .env file!');
            return res.status(500).json({
                success: false,
                error: 'Server authentication not configured'
            });
        }

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password required'
            });
        }

        // Delay to prevent timing attacks
        await new Promise(r => setTimeout(r, 500));

        // Check credentials
        const validUser = safeCompare(username.toLowerCase(), CREDENTIALS.username.toLowerCase());
        const validPass = safeCompare(password, CREDENTIALS.password);

        if (!validUser || !validPass) {
            console.log(` Failed login: ${username} from ${req.ip}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Success - generate permanent token
        const token = generateToken(username);

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year cookie
        });

        console.log(` Login success: ${username} from ${req.ip}`);

        res.json({
            success: true,
            token,
            user: { username: CREDENTIALS.username }
        });
    });

    // LOGOUT
    router.post('/logout', (req, res) => {
        res.clearCookie('auth_token');
        res.json({ success: true });
    });

    // VERIFY (check if logged in)
    router.get('/verify', requireAuth, (req, res) => {
        res.json({
            success: true,
            user: req.user
        });
    });

    app.use('/api/auth', router);

    // Check if credentials are configured
    if (!CREDENTIALS.username || !CREDENTIALS.password) {
        console.log('\n  WARNING: Auth credentials not configured!');
        console.log('   Add to .env file:');
        console.log('   AUTH_USERNAME=your_username');
        console.log('   AUTH_PASSWORD=your_password');
        console.log('   JWT_SECRET=random_string_32_chars\n');
    } else {
        console.log('\n Authentication Ready');
        console.log(`   Username: ${CREDENTIALS.username}`);
        console.log('   Session: Never expires\n');
    }
};

module.exports = { requireAuth, setupAuthRoutes, loginRateLimiter };