const Policy = require('../models/Policy');

/**
 * Get all active policies
 */
const getAllPolicies = async (activeOnly = true) => {
    const filter = activeOnly ? { isActive: true } : {};
    return await Policy.find(filter).sort({ policyId: 1 });
};

/**
 * Get policy by ID (MongoDB _id or policyId)
 */
const getPolicyById = async (id) => {
    // Try MongoDB ObjectId first, then policyId
    let policy = await Policy.findById(id).catch(() => null);
    if (!policy) {
        policy = await Policy.findOne({ policyId: id });
    }
    return policy;
};

/**
 * Create a new policy
 */
const createPolicy = async (policyData) => {
    const policy = new Policy(policyData);
    return await policy.save();
};

/**
 * Update an existing policy
 */
const updatePolicy = async (id, updateData) => {
    let policy = await Policy.findByIdAndUpdate(id, updateData, { new: true }).catch(() => null);
    if (!policy) {
        policy = await Policy.findOneAndUpdate({ policyId: id }, updateData, { new: true });
    }
    return policy;
};

/**
 * Delete a policy
 */
const deletePolicy = async (id) => {
    let policy = await Policy.findByIdAndDelete(id).catch(() => null);
    if (!policy) {
        policy = await Policy.findOneAndDelete({ policyId: id });
    }
    return policy;
};

module.exports = {
    getAllPolicies,
    getPolicyById,
    createPolicy,
    updatePolicy,
    deletePolicy,
    // File-based operations
    getPolicyFileContent: async () => {
        try {
            const path = require('path');
            const fs = require('fs');
            const policyPath = path.join(__dirname, '../../content-creation-policy.txt');
            if (!fs.existsSync(policyPath)) return '';
            return fs.readFileSync(policyPath, 'utf8');
        } catch (error) {
            console.error('Error reading policy file:', error);
            throw error;
        }
    },
    savePolicyFileContent: async (content) => {
        try {
            const path = require('path');
            const fs = require('fs');
            const policyPath = path.join(__dirname, '../../content-creation-policy.txt');
            fs.writeFileSync(policyPath, content, 'utf8');
            return true;
        } catch (error) {
            console.error('Error saving policy file:', error);
            throw error;
        }
    }
};
