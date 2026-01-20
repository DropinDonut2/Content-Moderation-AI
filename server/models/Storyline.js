const mongoose = require('mongoose');

const storylineSchema = new mongoose.Schema({
    // Basic Information
    storylineId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
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
    featured: {
        type: Boolean,
        default: false
    },
    monetized: {
        type: Boolean,
        default: false
    },
    targetAudienceGender: {
        type: String,
        enum: ['none', 'male', 'female', 'other'],
        default: 'none'
    },

    // Details
    description: {
        type: String
    },
    firstMessage: {
        type: String
    },

    // Advanced Prompts
    promptPlot: { type: String },
    plot: { type: String },
    plotSummary: { type: String },
    promptGuideline: { type: String },
    reminder: { type: String },
    changeLog: { type: String },
    rawCharacterList: { type: String },
    rawPersonaList: { type: String },

    // Related Characters
    characters: [{
        characterId: String,
        name: String,
        role: String,
        avatar: String
    }],

    // Related Personas
    personas: [{
        personaId: String,
        name: String,
        role: String
    }],

    // Character Snapshots (for JSON imports)
    characterSnapshots: [{
        type: mongoose.Schema.Types.Mixed
    }],

    // Persona Snapshots (for JSON imports)
    personaSnapshots: [{
        type: mongoose.Schema.Types.Mixed
    }],

    // Tag Snapshots (for JSON imports)
    tagSnapshots: [{
        type: mongoose.Schema.Types.Mixed
    }],

    // Media
    cover: {
        type: mongoose.Schema.Types.Mixed  // Can be string URL or object with url property
    },
    gallery: [{
        type: mongoose.Schema.Types.Mixed
    }],

    // Tags
    tags: [{
        type: String
    }],

    // Statistics
    statistics: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        plays: { type: Number, default: 0 }
    },

    // Token Estimates
    tokenEstimates: {
        total: { type: Number, default: 0 },
        firstMessage: { type: Number, default: 0 },
        context: { type: Number, default: 0 }
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
        // AI Verdict
        aiVerdict: { type: String },  // 'safe', 'flagged', 'rejected'
        aiConfidence: { type: Number },
        aiReasoning: { type: String },
        aiSummary: { type: String },

        // NEW: Highlighted Issues with field-specific quotes
        highlightedIssues: [{
            field: { type: String },      // e.g., 'plotSummary', 'firstMessage'
            quote: { type: String },       // Exact problematic text
            policy: { type: String },      // e.g., 'POL-005'
            policyTitle: { type: String }, // e.g., 'Child Safety'
            severity: { type: String },    // 'critical', 'high', 'medium', 'low'
            reason: { type: String }       // Why it violates the policy
        }],

        // NEW: Field-by-field analysis status
        fieldAnalysis: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        // Categories flagged
        categories: [{
            category: { type: String },
            flagged: { type: Boolean },
            confidence: { type: Number },
            details: { type: String }
        }],

        // Policy violations
        flaggedPolicies: [{ type: String }],

        // Legacy: Single offending snippet (for backwards compatibility)
        offendingSnippet: { type: String },

        // NSFW detection
        nsfw: { type: Boolean },
        nsfwReason: { type: String },

        // Recommendation
        recommendedAction: { type: String },  // 'approve', 'review', 'reject'
        humanReviewPriority: { type: String }, // 'low', 'medium', 'high', 'critical'

        // Timestamp
        moderatedAt: { type: Date }
    },

    // Review Information
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
        needsManualReview: { type: Boolean, default: false },
        hasFieldErrors: { type: Boolean, default: false },
        hasFieldWarnings: { type: Boolean, default: false },
        highlightedIssueCount: { type: Number, default: 0 }
    },

    // Suggestions for creator
    suggestionsForCreator: [{
        type: { type: String },     // 'error', 'warning', 'info'
        field: { type: String },
        issue: { type: String },
        quote: { type: String },
        suggestion: { type: String },
        source: { type: String }    // 'ai_moderation', 'field_validation'
    }],

    // Field validation results
    fieldValidation: {
        isValid: { type: Boolean },
        hasWarnings: { type: Boolean },
        issues: [{ type: mongoose.Schema.Types.Mixed }],
        warnings: [{ type: mongoose.Schema.Types.Mixed }],
        all: [{ type: mongoose.Schema.Types.Mixed }]
    },

    // Import source tracking
    importSource: {
        type: String  // e.g., 'json_import', 'manual', 'api'
    },

    // Change History
    changeHistory: [{
        changedAt: Date,
        changedBy: String,
        changes: String
    }],

    // System Information
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true,
    strict: false  // Allow additional fields not in schema (flexibility for new data)
});

// Indexes
storylineSchema.index({ moderationStatus: 1 });
storylineSchema.index({ user: 1 });
storylineSchema.index({ createdAt: -1 });
storylineSchema.index({ title: 'text', description: 'text' });
storylineSchema.index({ 'flags.needsManualReview': 1 });
storylineSchema.index({ 'moderationResult.aiVerdict': 1 });

module.exports = mongoose.model('Storyline', storylineSchema);