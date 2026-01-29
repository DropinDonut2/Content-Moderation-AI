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
        type: String
    }],

    // Tags
    tags: [{
        type: String
    }],

    // Statistics
    statistics: {
        uses: { type: Number, default: 0 }
    },

    // Moderation
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'flagged', 'rejected'],
        default: 'pending'
    },

    // =============================================
    // MODERATION RESULT - Full structure
    // =============================================
    moderationResult: {
        // AI Verdict
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

        // Categories flagged
        categories: [{
            category: { type: String },
            flagged: { type: Boolean },
            confidence: { type: Number },
            details: { type: String }
        }],

        // Policy violations
        flaggedPolicies: [{ type: String }],

        // Legacy
        offendingSnippet: { type: String },

        // NSFW detection
        nsfw: { type: Boolean },
        nsfwReason: { type: String },

        // Recommendation
        recommendedAction: { type: String },
        humanReviewPriority: { type: String },
        violationSeverity: { type: String },

        // Image Analysis
        imageAnalysis: {
            totalImages: { type: Number, default: 0 },
            flaggedImages: { type: Number, default: 0 },
            overallImageVerdict: { type: String },
            issues: [{
                imageType: { type: String },
                imageName: { type: String },
                issue: { type: String },
                severity: { type: String },
                category: { type: String },
                visualAgeAssessment: { type: String },
                statedAge: { type: String }
            }]
        },
        imagesAnalyzed: { type: Number, default: 0 },
        imagesFlagged: { type: Number, default: 0 },

        // Creator Suggestions / Feedback
        suggestions: {
            type: {
                type: String,
                enum: ['great', 'minor_improvements', 'needs_work', 'rejected']
            },
            overallFeedback: { type: String },
            specificIssues: [{
                field: { type: String },
                problem: { type: String },
                howToFix: { type: String }
            }],
            strengths: [{ type: String }],
            includeExampleLinks: { type: Boolean, default: false }
        },

        // Usage / Cost Tracking
        usage: {
            inputTokens: { type: Number },
            outputTokens: { type: Number },
            totalTokens: { type: Number },
            inputCost: { type: Number },
            outputCost: { type: Number },
            totalCost: { type: Number },
            costFormatted: { type: String }
        },

        // Timestamp
        moderatedAt: { type: Date }
    },

    // Review
    reviewedBy: {
        type: String
    },
    reviewedAt: {
        type: Date
    },
    reviewNotes: {
        type: String
    },
    rejectionReason: {
        type: String
    },

    // Flags
    flags: {
        isNsfw: { type: Boolean, default: false },
        hasViolence: { type: Boolean, default: false },
        hasHateSpeech: { type: Boolean, default: false },
        hasChildSafetyConcern: { type: Boolean, default: false },
        hasImageIssues: { type: Boolean, default: false },
        needsManualReview: { type: Boolean, default: false },
        hasFieldErrors: { type: Boolean, default: false },
        hasFieldWarnings: { type: Boolean, default: false },
        highlightedIssueCount: { type: Number, default: 0 },
        imageIssueCount: { type: Number, default: 0 },
        autoRejectedByProvider: { type: Boolean, default: false },
        flaggedByProvider: { type: Boolean, default: false }
    },

    // Suggestions for creator (legacy array format)
    suggestionsForCreator: [{
        type: { type: String },
        field: { type: String },
        issue: { type: String },
        quote: { type: String },
        suggestion: { type: String },
        source: { type: String }
    }],

    // Field validation results
    fieldValidation: {
        isValid: { type: Boolean },
        hasWarnings: { type: Boolean },
        issues: [{ type: mongoose.Schema.Types.Mixed }],
        warnings: [{ type: mongoose.Schema.Types.Mixed }],
        all: [{ type: mongoose.Schema.Types.Mixed }]
    },

    // System Information
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
personaSchema.index({ 'flags.needsManualReview': 1 });
personaSchema.index({ 'moderationResult.aiVerdict': 1 });

module.exports = mongoose.model('Persona', personaSchema);