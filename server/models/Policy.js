const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    policyId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'hate_speech',
            'harassment',
            'spam',
            'nsfw',
            'violence',
            'misinformation',
            'self_harm',
            'illegal',
            'child_safety',
            'terrorism',
            'sexual_content',
            'cultural_sensitivity'
        ]
    },
    description: {
        type: String,
        required: true
    },
    examples: [{
        type: String
    }],
    severity: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high', 'critical']
    },
    defaultAction: {
        type: String,
        required: true,
        enum: ['flag', 'reject', 'immediate_ban']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Track where this policy came from
    source: {
        type: String,
        enum: ['manual', 'seed', 'isekai_docs_import', 'json_import', 'url_import', 'file_import'],
        default: 'manual'
    },
    // URL if imported from web
    sourceUrl: {
        type: String
    },
    // When the policy was last synced with source
    lastSyncedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes
policySchema.index({ isActive: 1, severity: -1 });
policySchema.index({ category: 1 });
policySchema.index({ source: 1 });

module.exports = mongoose.model('Policy', policySchema);
