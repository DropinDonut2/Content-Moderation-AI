const express = require('express');
const router = express.Router();
const { analyzeImageBatch, getSupportedModels } = require('../services/modelTestService');

// GET /api/v1/model-test/models - list of supported models
router.get('/models', (req, res) => {
    res.json({
        success: true,
        models: getSupportedModels()
    });
});

// POST /api/v1/model-test/analyze - run a batch of images through a model
router.post('/analyze', async (req, res) => {
    try {
        const { images, model, batchIndex = 0 } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: images (must be a non-empty array)'
            });
        }

        if (images.length > 10) {
            return res.status(400).json({
                success: false,
                error: 'Too many images in a single batch. Maximum is 10 per request.'
            });
        }

        // Validate each image has required fields
        for (const img of images) {
            if (!img.id || !img.name || !img.base64) {
                return res.status(400).json({
                    success: false,
                    error: 'Each image must have: id, name, base64'
                });
            }
            // Enforce base64 data URL format
            if (!img.base64.startsWith('data:image/')) {
                return res.status(400).json({
                    success: false,
                    error: `Image "${img.name}" base64 must be a data URL (data:image/...;base64,...)`
                });
            }
        }

        console.log(`[ModelTest] Analyzing batch ${batchIndex}: ${images.length} image(s) with model ${model || 'default'}`);

        const result = await analyzeImageBatch(images, model, batchIndex);

        res.json(result);

    } catch (error) {
        console.error('[ModelTest] Route error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
