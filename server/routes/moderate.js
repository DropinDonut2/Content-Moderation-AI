const express = require('express');
const router = express.Router();
const { autoModerateContent } = require('../services/contentModerationService');

// POST /api/v1/moderate - Analyze content
router.post('/', async (req, res) => {
    try {
        const { content, contentId, contentType, userId, context } = req.body;

        if (!content || !contentType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: content, contentType'
            });
        }

        // Prepare content for the new service (it expects an object)
        let contentData = content;
        if (typeof content === 'string') {
            // Wrap simple string content into an object structure generic enough for analysis
            contentData = {
                description: content,
                // Pass context if available as part of the analysis text
                context: context || ''
            };
        }

        // Use the new, better service (Claude 4.5 Sonnet + Tool Calling)
        const result = await autoModerateContent(contentType, contentData);

        // Enhance result with metadata that the old endpoint might expect (or for logging)
        const responseData = {
            ...result,
            contentId,
            userId,
            moderatedAt: new Date()
        };

        res.json({
            success: true,
            data: responseData
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
