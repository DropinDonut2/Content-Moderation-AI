const express = require('express');
const router = express.Router();
const moderationService = require('../services/moderationService');

// POST /api/v1/moderate - Analyze content
router.post('/', async (req, res) => {
    try {
        const { content, contentId, contentType, userId, context } = req.body;

        if (!content || !contentId || !contentType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: content, contentId, contentType'
            });
        }

        const result = await moderationService.moderateContent({
            content,
            contentId,
            contentType,
            userId,
            context
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Moderation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
