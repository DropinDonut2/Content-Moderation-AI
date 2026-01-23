const express = require('express');
const router = express.Router();
const policyService = require('../services/policyService');

// GET /api/v1/policies/file - Get policy file content
router.get('/file', async (req, res) => {
    try {
        const content = await policyService.getPolicyFileContent();
        res.json({ success: true, data: content });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/v1/policies/file - Update policy file content
router.put('/file', async (req, res) => {
    try {
        const { content } = req.body;
        if (content === undefined) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }
        await policyService.savePolicyFileContent(content);
        res.json({ success: true, message: 'Policy file updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/policies - List all policies
router.get('/', async (req, res) => {
    try {
        const policies = await policyService.getAllPolicies();
        res.json({ success: true, data: policies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/policies/:id - Get single policy
router.get('/:id', async (req, res) => {
    try {
        const policy = await policyService.getPolicyById(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Policy not found' });
        }
        res.json({ success: true, data: policy });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/policies - Create policy
router.post('/', async (req, res) => {
    try {
        const policy = await policyService.createPolicy(req.body);
        res.status(201).json({ success: true, data: policy });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT /api/v1/policies/:id - Update policy
router.put('/:id', async (req, res) => {
    try {
        const policy = await policyService.updatePolicy(req.params.id, req.body);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Policy not found' });
        }
        res.json({ success: true, data: policy });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE /api/v1/policies/:id - Delete policy
router.delete('/:id', async (req, res) => {
    try {
        const policy = await policyService.deletePolicy(req.params.id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Policy not found' });
        }
        res.json({ success: true, data: { message: 'Policy deleted' } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
