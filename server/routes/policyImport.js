const express = require('express');
const router = express.Router();
const multer = require('multer');
const policyImportService = require('../services/policyImportService');

// Configure multer for file uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/html', 'text/markdown', 'text/plain', 'application/json'];
        const allowedExtensions = ['.html', '.htm', '.md', '.markdown', '.json', '.txt'];
        
        const ext = '.' + file.originalname.split('.').pop().toLowerCase();
        if (allowedExtensions.includes(ext) || allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Supported: HTML, Markdown, JSON, TXT'));
        }
    }
});

// ============================================
// IMPORT ENDPOINTS
// ============================================

/**
 * POST /api/v1/policies/import/url
 * Import policies from a URL (e.g., docs.isekai.world)
 */
router.post('/url', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }

        console.log(`📥 Importing policies from URL: ${url}`);
        const result = await policyImportService.importFromUrl(url);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Return preview of parsed policies
        res.json({
            success: true,
            message: `Found ${result.count} policies`,
            source: result.source,
            preview: policyImportService.previewPolicies(result.policies),
            policies: result.policies // Full policies for saving
        });

    } catch (error) {
        console.error('URL import error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/policies/import/html
 * Import policies from pasted HTML content
 */
router.post('/html', async (req, res) => {
    try {
        const { html } = req.body;
        
        if (!html) {
            return res.status(400).json({
                success: false,
                error: 'HTML content is required'
            });
        }

        console.log(`📥 Importing policies from pasted HTML (${html.length} chars)`);
        const result = policyImportService.importFromHtml(html);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            message: `Found ${result.count} policies`,
            source: result.source,
            preview: policyImportService.previewPolicies(result.policies),
            policies: result.policies
        });

    } catch (error) {
        console.error('HTML import error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/policies/import/file
 * Import policies from uploaded file (HTML, Markdown, JSON)
 */
router.post('/file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'File is required'
            });
        }

        const fileContent = req.file.buffer.toString('utf-8');
        const filename = req.file.originalname;

        console.log(`📥 Importing policies from file: ${filename} (${fileContent.length} chars)`);
        const result = policyImportService.importFromFile(fileContent, filename);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            message: `Found ${result.count} policies from ${filename}`,
            source: result.source,
            preview: policyImportService.previewPolicies(result.policies),
            policies: result.policies
        });

    } catch (error) {
        console.error('File import error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/policies/import/save
 * Save imported policies to database
 * Body: { policies: [...], mode: 'replace' | 'merge' | 'append' }
 */
router.post('/save', async (req, res) => {
    try {
        const { policies, mode = 'merge' } = req.body;
        
        if (!policies || !Array.isArray(policies) || policies.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Policies array is required'
            });
        }

        if (!['replace', 'merge', 'append'].includes(mode)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mode. Use: replace, merge, or append'
            });
        }

        console.log(`💾 Saving ${policies.length} policies (mode: ${mode})`);
        const result = await policyImportService.savePolicies(policies, mode);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json({
            success: true,
            message: `Policies saved successfully`,
            stats: result.stats,
            mode: result.mode
        });

    } catch (error) {
        console.error('Save policies error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/policies/import/preview
 * Preview policies without saving (for validation)
 */
router.post('/preview', (req, res) => {
    try {
        const { policies } = req.body;
        
        if (!policies || !Array.isArray(policies)) {
            return res.status(400).json({
                success: false,
                error: 'Policies array is required'
            });
        }

        const preview = policyImportService.previewPolicies(policies);

        res.json({
            success: true,
            count: preview.length,
            preview
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
