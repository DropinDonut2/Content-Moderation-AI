const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

// GET /api/v1/analytics/overview - Summary metrics
router.get('/overview', async (req, res) => {
    try {
        const overview = await analyticsService.getOverview();
        res.json({ success: true, data: overview });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/analytics/timeseries - Data for charts
router.get('/timeseries', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const timeSeries = await analyticsService.getTimeSeries(days);
        res.json({ success: true, data: timeSeries });
    } catch (error) {
        console.error('Analytics timeseries error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/analytics/categories - Category distribution
router.get('/categories', async (req, res) => {
    try {
        const categories = await analyticsService.getCategoryDistribution();
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Analytics categories error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
