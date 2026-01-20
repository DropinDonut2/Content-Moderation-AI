require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Route imports
const moderateRoutes = require('./routes/moderate');
const policyRoutes = require('./routes/policies');
const logRoutes = require('./routes/logs');
const analyticsRoutes = require('./routes/analytics');
const contentRoutes = require('./routes/content');
const policyImportRoutes = require('./routes/policyImport');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(' Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log(' Client disconnected:', socket.id);
    });
});

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

const mongoose = require('mongoose'); // Ensure mongoose is imported
// Routes
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

app.use('/api/v1/moderate', moderateRoutes);
app.use('/api/v1/policies', policyRoutes);
app.use('/api/v1/logs', logRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/policies/import', policyImportRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 5000;

// Use server.listen instead of app.listen
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.io ready for connections`);
});