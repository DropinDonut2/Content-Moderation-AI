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
        enum: ['hate_speech', 'harassment', 'spam', 'nsfw', 'violence', 'misinformation', 'self_harm', 'illegal']
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
        enum: ['flag', 'reject']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Policy', policySchema);
