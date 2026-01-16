require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Policy = require('../models/Policy');

const defaultPolicies = [
    {
        policyId: "POL-001",
        title: "Spam, Scams, & Deceptive Practices",
        category: "spam",
        description: "Prohibits excessively posted, repetitive, or untargeted content. Includes misleading thumbnails/metadata, incentivization spam (selling engagement), comment spam, and scams (cash gifts, pyramid schemes, get-rich-quick). Also covers 3rd party content copied without permission.",
        examples: ["Promise rewards for clicks", "Misleading covers", "Pyramid schemes", "Repetitive comments"],
        severity: "medium",
        defaultAction: "flag",
        isActive: true
    },
    {
        policyId: "POL-002",
        title: "Sexual and Nudity Content",
        category: "nsfw",
        description: "Allows NSFW content for 18+ if properly tagged. Strictly prohibits: exposed genitalia for sexual gratification, sexual content involving minors (or characters appearing as minors), non-consensual content (rape/assault), incest, bestiality, and pornography in cover images. First messages must match NSFW designation.",
        examples: ["Exposed genitalia", "Child-like characters in sexual contexts", "Non-consensual acts", "Incest themes"],
        severity: "high",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-003",
        title: "External Links",
        category: "spam",
        description: "Prohibits links to: pornography, malware, phishing, unauthorized access (piracy), terrorist funding, CSAI, hate/harassment content, violence, or misleading content. Applies to clickable, obfuscated, and verbal links.",
        examples: ["Link to malware", "Link to phishing site", "Obfuscated URL to porn"],
        severity: "high",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-004",
        title: "Age-Restricted Content",
        category: "nsfw",
        description: "Content requiring age restriction includes: harmful acts minors could imitate, adult themes in family content, excessive profanity, or vulgar language. Content meant for adults but easily confused with family content must be restricted.",
        examples: ["Dangerous pranks", "Adult themes in cartoon style", "Excessive profanity"],
        severity: "medium",
        defaultAction: "flag",
        isActive: true
    },
    {
        policyId: "POL-005",
        title: "Child Safety",
        category: "illegal",
        description: "ZERO TOLERANCE. Prohibits maltreatment (physical/sexual/emotional) of minors, sexualization of minors (CSAM), and harmful acts involving minors. Characters in NSFW content must clearly appear as adults. Misleading family content with inappropriate themes (violence, sex, death) is banned.",
        examples: ["CSAM", "Sexualization of minors", "Minors in dangerous acts", "Abuse simulation"],
        severity: "critical",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-006",
        title: "Thumbnails and Images",
        category: "nsfw",
        description: "Images must NOT show: pornography, sexual acts, exposed genitalia, unwanted sexualization, violent imagery (shock/disgust), gore, or vulgar language. NSFW covers can show artistic partial nudity or suggestive poses but no graphic exposure.",
        examples: ["Gore in thumbnail", "Exposed genitalia in cover", "Pornographic imagery"],
        severity: "high",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-007",
        title: "Suicide & Self-Harm",
        category: "self_harm",
        description: "Prohibits content promoting suicide, self-harm, or eating disorders. Discussion for support/awareness is allowed, but promotion, shock value, or risk creation is banned.",
        examples: ["Pro-anorexia", "Suicide instructions", "Glorification of self-harm"],
        severity: "critical",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-008",
        title: "Harmful or Dangerous Acts",
        category: "violence",
        description: "Prohibits extremely dangerous challenges, threatening pranks, instructions to kill/harm, explosives manufacture, firearms usage instructions, hacking instructions, and phishing/cryptophishing.",
        examples: ["Bomb making instructions", "Phishing tutorials", "Dangerous viral challenges"],
        severity: "critical",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-009",
        title: "Violent or Graphic Content",
        category: "violence",
        description: "Prohibits violent physical sexual assaults, gore/torture for shock value, and animal abuse (coercion to fight, malicious mistreatment). Educational/documentary context may be exceptions but require context.",
        examples: ["Sexual assault descriptions", "Animal fighting", "Torture for shock"],
        severity: "critical",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-010",
        title: "Hate Speech & Discrimination",
        category: "hate_speech",
        description: "ZERO TOLERANCE. Prohibits content promoting hatred, violence, or discrimination based on protected characteristics (race, religion, gender, etc.). Includes slurs, dehumanization, conspiracy theories targeting groups, and genocide denial.",
        examples: ["Racial slurs", "Dehumanization", "Genocide denial"],
        severity: "critical",
        defaultAction: "reject",
        isActive: true
    },
    {
        policyId: "POL-011",
        title: "Misinformation",
        category: "misinformation",
        description: "Prohibits suppression of census participation, manipulated content (deepfakes) risking harm, elections misinformation (voter suppression, eligibility lies, interference), and medical misinformation (contradicting health authorities, treatment lies).",
        examples: ["Election date lies", "Fake cure promotion", "Deepfakes for harm"],
        severity: "high",
        defaultAction: "flag",
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
        console.log(`Inserted ${defaultPolicies.length} policies from ISEKAI ZERO guidelines`);

        console.log('Seed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedPolicies();
