require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

// Auth import
const { setupAuthRoutes, requireAuth } = require('./auth/authMiddleware');

// Route imports
const moderateRoutes = require('./routes/moderate');
const policyRoutes = require('./routes/policies');
const logRoutes = require('./routes/logs');
const analyticsRoutes = require('./routes/analytics');
const contentRoutes = require('./routes/content');
const policyImportRoutes = require('./routes/policyImport');
const modelTestRoutes = require('./routes/modelTest');

// ============================================
// CREATE APP FIRST! (before using app.use)
// ============================================
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST", "PATCH", "DELETE"],
        credentials: true
    }
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Connect to database
connectDB();

// ============================================
// MIDDLEWARE (must be AFTER app is created)
// ============================================
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// ============================================
// AUTH ROUTES (public - no protection)
// ============================================
setupAuthRoutes(app);

// ============================================
// DEBUG ROUTES (public)
// ============================================
app.get('/api/debug/info', async (req, res) => {
    try {
        const count = await mongoose.connection.collection('moderationlogs').countDocuments();
        const uri = process.env.MONGODB_URI || 'undefined';
        const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
        res.json({
            count,
            maskedUri,
            dbName: mongoose.connection.name,
            latestLog: await mongoose.connection.collection('moderationlogs').findOne({}, { sort: { _id: -1 } })
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// PROTECTED ROUTES (require login)
// ============================================
app.use('/api/v1/moderate', requireAuth, moderateRoutes);
app.use('/api/v1/policies', requireAuth, policyRoutes);
app.use('/api/v1/logs', requireAuth, logRoutes);
app.use('/api/v1/analytics', requireAuth, analyticsRoutes);
app.use('/api/v1/content', requireAuth, contentRoutes);
app.use('/api/v1/policies/import', requireAuth, policyImportRoutes);
app.use('/api/content', requireAuth, contentRoutes);
app.use('/api/v1/model-test', requireAuth, modelTestRoutes);

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: err.message });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
    console.log(` Socket.io ready for connections`);
});