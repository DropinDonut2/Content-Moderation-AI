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

    // Advanced Prompts (New)
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

    // Media
    cover: {
        type: String  // URL to cover image
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

    // Moderation
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'flagged', 'rejected'],
        default: 'pending'
    },
    moderationResult: {
        categories: [{
            category: String,
            flagged: Boolean,
            confidence: Number
        }],
        aiVerdict: String,
        aiReasoning: String,
        aiConfidence: Number,
        moderatedAt: Date
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
        needsManualReview: { type: Boolean, default: false }
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
    timestamps: true
});

// Indexes
storylineSchema.index({ moderationStatus: 1 });
storylineSchema.index({ user: 1 });
storylineSchema.index({ createdAt: -1 });
storylineSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Storyline', storylineSchema);