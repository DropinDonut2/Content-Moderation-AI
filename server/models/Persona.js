const mongoose = require('mongoose');

const personaSchema = new mongoose.Schema({
    // Primary Information
    personaId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    languageCode: {
        type: String,
        default: 'en'
    },
    advancedMode: {
        type: Boolean,
        default: false
    },
    secretMode: {
        type: Boolean,
        default: false
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'hidden'],
        default: 'hidden'
    },
    nsfw: {
        type: Boolean,
        default: false
    },

    // Details
    description: {
        type: String
    },
    descriptionSummary: {
        type: String
    },
    promptDescription: {
        type: String
    },
    exampleDialogue: {
        type: String
    },

    // Media
    avatar: {
        type: String
    },
    cover: {
        type: mongoose.Schema.Types.Mixed
    },
    gallery: [{
        type: mongoose.Schema.Types.Mixed
    }],

    // Tags
    tags: [{
        type: String
    }],
    tagSnapshots: [{
        type: mongoose.Schema.Types.Mixed
    }],

    // Statistics
    statistics: {
        uses: { type: Number, default: 0 }
    },

    // Moderation Status
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'flagged', 'rejected'],
        default: 'pending'
    },

    // =============================================
    // MODERATION RESULT - Updated with new fields
    // =============================================
    moderationResult: {
        aiVerdict: { type: String },
        aiConfidence: { type: Number },
        aiReasoning: { type: String },
        aiSummary: { type: String },

        // Highlighted Issues
        highlightedIssues: [{
            field: { type: String },
            quote: { type: String },
            policy: { type: String },
            policyTitle: { type: String },
            severity: { type: String },
            reason: { type: String }
        }],

        fieldAnalysis: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        categories: [{
            category: { type: String },
            flagged: { type: Boolean },
            confidence: { type: Number },
            details: { type: String }
        }],

        flaggedPolicies: [{ type: String }],
        offendingSnippet: { type: String },
        nsfw: { type: Boolean },
        nsfwReason: { type: String },
        recommendedAction: { type: String },
        humanReviewPriority: { type: String },
        moderatedAt: { type: Date }
    },

    // Review
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    rejectionReason: { type: String },

    // Flags
    flags: {
        isNsfw: { type: Boolean, default: false },
        hasViolence: { type: Boolean, default: false },
        hasHateSpeech: { type: Boolean, default: false },
        hasChildSafetyConcern: { type: Boolean, default: false },
        needsManualReview: { type: Boolean, default: false },
        hasFieldErrors: { type: Boolean, default: false },
        hasFieldWarnings: { type: Boolean, default: false },
        highlightedIssueCount: { type: Number, default: 0 }
    },

    suggestionsForCreator: [{
        type: { type: String },
        field: { type: String },
        issue: { type: String },
        quote: { type: String },
        suggestion: { type: String },
        source: { type: String }
    }],

    fieldValidation: {
        type: mongoose.Schema.Types.Mixed
    },

    importSource: { type: String },

    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true,
    strict: false
});

// Indexes
personaSchema.index({ moderationStatus: 1 });
personaSchema.index({ user: 1 });
personaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Persona', personaSchema);