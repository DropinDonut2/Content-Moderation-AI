const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
    // Primary Information
    characterId: {
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
    featured: {
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
        type: String  // URL to image
    },
    gallery: [{
        type: String  // Array of image URLs
    }],

    // Tags
    tags: [{
        type: String
    }],

    // Statistics
    statistics: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        chats: { type: Number, default: 0 }
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
        offendingSnippet: String, // Added field
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

    // System Information
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Indexes
characterSchema.index({ moderationStatus: 1 });
characterSchema.index({ user: 1 });
characterSchema.index({ createdAt: -1 });
characterSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Character', characterSchema);