const express = require('express');
const router = express.Router();
const ModerationLog = require('../models/ModerationLog');

// GET /api/v1/logs - Get moderation history
router.get('/', async (req, res) => {
    try {
        const { verdict, reviewStatus, limit = 50, page = 1 } = req.query;

        const filter = {};
        if (verdict) filter.verdict = verdict;
        if (reviewStatus) filter.reviewStatus = reviewStatus;

        const logs = await ModerationLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('policyViolated');

        const total = await ModerationLog.countDocuments(filter);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/logs/:id - Get single log
router.get('/:id', async (req, res) => {
    try {
        const log = await ModerationLog.findById(req.params.id).populate('policyViolated');
        if (!log) {
            return res.status(404).json({ success: false, error: 'Log not found' });
        }
        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH /api/v1/logs/:id/review - Submit human review
router.patch('/:id/review', async (req, res) => {
    try {
        const { reviewStatus, reviewedBy } = req.body;

        if (!['approved', 'rejected', 'ignored'].includes(reviewStatus)) {
            return res.status(400).json({
                success: false,
                error: 'reviewStatus must be "approved", "rejected", or "ignored"'
            });
        }

        const log = await ModerationLog.findByIdAndUpdate(
            req.params.id,
            {
                reviewStatus,
                reviewedBy,
                reviewedAt: new Date()
            },
            { new: true }
        );

        if (!log) {
            return res.status(404).json({ success: false, error: 'Log not found' });
        }

        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
