require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Policy = require('../models/Policy');

const defaultPolicies = [
    {
        policyId: "POL-001",
        title: "Hate Speech",
        category: "hate_speech",
        description: "Content that promotes hatred, discrimination, or violence against individuals or groups based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics.",
        examples: ["Racial slurs", "Dehumanizing language", "Calls for violence against groups"],
        severity: "critical",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-002",
        title: "Harassment",
        category: "harassment",
        description: "Content that targets individuals with abuse, threats, intimidation, or unwanted contact intended to harm, frighten, or distress.",
        examples: ["Personal attacks", "Threats", "Doxxing", "Stalking behavior"],
        severity: "high",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-003",
        title: "Spam",
        category: "spam",
        description: "Unsolicited, repetitive, or promotional content that disrupts normal platform use.",
        examples: ["Repeated messages", "Promotional links", "Scams", "Phishing"],
        severity: "medium",
        defaultAction: "flag",
        isActive: true
    },
    {
        policyId: "POL-004",
        title: "Adult Content",
        category: "nsfw",
        description: "Sexually explicit content, nudity, or content intended to arouse.",
        examples: ["Pornography", "Explicit descriptions", "Sexual solicitation"],
        severity: "high",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-005",
        title: "Violence",
        category: "violence",
        description: "Graphic depictions of violence, gore, or content that glorifies harm to people or animals.",
        examples: ["Gore", "Torture", "Animal abuse", "Weapons instructions"],
        severity: "critical",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-006",
        title: "Misinformation",
        category: "misinformation",
        description: "Demonstrably false information that could cause real-world harm.",
        examples: ["Medical misinformation", "Election fraud claims", "Dangerous hoaxes"],
        severity: "high",
        defaultAction: "flag",
        isActive: true
    },
    {
        policyId: "POL-007",
        title: "Self-Harm",
        category: "self_harm",
        description: "Content that promotes, glorifies, or provides instructions for self-harm or suicide.",
        examples: ["Suicide methods", "Pro-anorexia content", "Self-injury encouragement"],
        severity: "critical",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-008",
        title: "Illegal Activity",
        category: "illegal",
        description: "Content related to illegal activities or that facilitates breaking the law.",
        examples: ["Drug sales", "Fraud instructions", "Illegal weapons"],
        severity: "critical",
        defaultAction: "reject",
        isActive: true
    }
];

const seedPolicies = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/content-moderation');
        console.log('Connected to MongoDB');

        // Clear existing policies
        await Policy.deleteMany({});
        console.log('Cleared existing policies');

        // Insert default policies
        await Policy.insertMany(defaultPolicies);
        console.log(`Inserted ${defaultPolicies.length} default policies`);

        console.log('Seed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedPolicies();
