const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
    contentId: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        required: true,
        enum: ['post', 'comment', 'message', 'character', 'storyline', 'persona', 'bot']
    },
    userId: {
        type: String
    },
    context: {
        type: mongoose.Schema.Types.Mixed
    },
    verdict: {
        type: String,
        required: true,
        enum: ['safe', 'flagged', 'rejected']
    },
    category: {
        type: String,
        enum: ['hate_speech', 'harassment', 'spam', 'nsfw', 'violence', 'misinformation', 'self_harm', 'illegal', null]
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    policyViolated: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Policy'
    },
    offendingSnippet: {
        type: String,
        default: null
    },
    policyDetails: {
        policyId: String,
        title: String,
        description: String
    },
    reasoning: {
        type: String
    },
    aiModel: {
        type: String,
        required: true
    },
    aiResponseTime: {
        type: Number
    },
    reviewStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'overridden', 'ignored'],
        default: 'pending'
    },
    reviewedBy: {
        type: String
    },
    reviewedAt: {
        type: Date
    },
    reviewNotes: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient querying
moderationLogSchema.index({ verdict: 1, reviewStatus: 1 });
moderationLogSchema.index({ createdAt: -1 });
moderationLogSchema.index({ contentId: 1 });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);