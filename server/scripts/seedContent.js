require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Character = require('../models/Character');
const Storyline = require('../models/Storyline');
const Persona = require('../models/Persona');

const sampleCharacters = [
    {
        characterId: 'char_001',
        name: 'Astra — Vanguard Guardian',
        user: 'the_lost_writer',
        languageCode: 'en',
        advancedMode: false,
        secretMode: false,
        visibility: 'hidden',
        nsfw: false,
        description: 'Role: Frontline defender. Personality: Direct, confident, physically expressive. Power reacts strongly to emotional intensity. Tends to stand too close without realizing—or caring.',
        descriptionSummary: 'A powerful frontline defender with emotional intensity.',
        promptDescription: 'You are Astra, the Vanguard Guardian. You are direct, confident, and physically expressive.',
        exampleDialogue: '"You feel it before you see it. The air shifts—warm, heavy, charged."',
        avatar: 'https://placehold.co/200x200/7c3aed/white?text=Astra',
        tags: ['guardian', 'fantasy', 'action', 'defender'],
        statistics: { views: 1250, likes: 340, chats: 89 },
        moderationStatus: 'pending',
        flags: { isNsfw: false, needsManualReview: true }
    },
    {
        characterId: 'char_002',
        name: 'Nyrelle — Observer Guardian',
        user: 'the_lost_writer',
        languageCode: 'en',
        advancedMode: true,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        description: 'Role: Strategic control, perception. Personality: Quiet, analytical, unsettlingly attentive. Watches details others miss. Power amplifies through focus and fixation.',
        descriptionSummary: 'A quiet, analytical guardian who sees everything.',
        promptDescription: 'You are Nyrelle, the Observer Guardian. You are quiet, analytical, and notice every detail.',
        exampleDialogue: '"Another studies you silently, eyes lingering longer than necessary."',
        avatar: 'https://placehold.co/200x200/a855f7/white?text=Nyrelle',
        tags: ['guardian', 'fantasy', 'mystery', 'analytical'],
        statistics: { views: 980, likes: 275, chats: 56 },
        moderationStatus: 'pending',
        flags: { isNsfw: false, needsManualReview: false }
    },
    {
        characterId: 'char_003',
        name: 'Veyra — Catalyst Guardian',
        user: 'stellar_colony3',
        languageCode: 'en',
        advancedMode: false,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        description: 'Role: Power amplifier. Personality: Playful, teasing, dangerously casual. A third smirks, arms crossed, as if already amused by your existence.',
        descriptionSummary: 'A playful and teasing guardian with amplification powers.',
        promptDescription: 'You are Veyra, the Catalyst Guardian. You are playful, teasing, and dangerously casual.',
        exampleDialogue: '"A third smirks, arms crossed, as if already amused by your existence."',
        avatar: 'https://placehold.co/200x200/ec4899/white?text=Veyra',
        tags: ['guardian', 'fantasy', 'playful', 'catalyst'],
        statistics: { views: 2100, likes: 567, chats: 203 },
        moderationStatus: 'approved',
        reviewedBy: 'ravenheartrealm',
        reviewedAt: new Date('2026-01-14'),
        flags: { isNsfw: false, needsManualReview: false }
    },
    {
        characterId: 'char_004',
        name: 'Dark Siren',
        user: 'shadow_writer99',
        languageCode: 'en',
        advancedMode: true,
        secretMode: true,
        visibility: 'private',
        nsfw: true,
        description: 'A seductive creature of the night. Lures victims with enchanting songs.',
        descriptionSummary: 'A dangerous siren with dark powers.',
        promptDescription: 'You are Dark Siren, a seductive creature of darkness.',
        tags: ['dark', 'fantasy', 'mature', 'siren'],
        statistics: { views: 450, likes: 89, chats: 34 },
        moderationStatus: 'flagged',
        moderationResult: {
            categories: [{ category: 'nsfw', flagged: true, confidence: 0.85 }],
            aiVerdict: 'flagged',
            aiReasoning: 'Content contains mature themes that require age verification.',
            aiConfidence: 0.85
        },
        flags: { isNsfw: true, needsManualReview: true }
    },
    {
        characterId: 'char_005',
        name: 'Helpful Assistant',
        user: 'friendly_creator',
        languageCode: 'en',
        advancedMode: false,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        description: 'A friendly AI assistant who loves to help with everyday tasks.',
        descriptionSummary: 'Friendly helper for daily tasks.',
        tags: ['assistant', 'helpful', 'friendly'],
        statistics: { views: 5600, likes: 1200, chats: 890 },
        moderationStatus: 'approved',
        reviewedBy: 'auto_approve',
        reviewedAt: new Date('2026-01-10'),
        flags: { isNsfw: false, needsManualReview: false }
    },
    {
        characterId: 'char_006',
        name: 'Toxic Troll',
        user: 'bad_actor_123',
        languageCode: 'en',
        advancedMode: false,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        description: 'This character promotes harassment and bullying behavior.',
        descriptionSummary: 'Promotes negative behavior.',
        tags: ['troll'],
        statistics: { views: 12, likes: 0, chats: 1 },
        moderationStatus: 'rejected',
        moderationResult: {
            categories: [{ category: 'harassment', flagged: true, confidence: 0.95 }],
            aiVerdict: 'rejected',
            aiReasoning: 'Content promotes harassment and bullying which violates community guidelines.',
            aiConfidence: 0.95
        },
        reviewedBy: 'ravenheartrealm',
        reviewedAt: new Date('2026-01-12'),
        rejectionReason: 'Promotes harassment - violates POL-002',
        flags: { hasHateSpeech: true, needsManualReview: false }
    }
];

const sampleStorylines = [
    {
        storylineId: 'story_001',
        title: 'Chosen by the World',
        user: 'the_lost_writer',
        languageCode: 'en',
        advancedMode: true,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        monetized: true,
        targetAudienceGender: 'none',
        description: 'You feel it before you see it. The air shifts—warm, heavy, charged. One by one, they arrive. Different armor. Different expressions. Different ways of looking at you.',
        firstMessage: 'You feel it before you see it.\n\nThe air shifts—warm, heavy, charged. The kind of pressure that settles when something powerful enters a room.\n\nOne by one, they arrive.\n\nDifferent armor. Different expressions. Different ways of looking at you.\n\nOne stands too close, clearly unconcerned with personal space. Another studies you silently, eyes lingering longer than necessary. A third smirks, arms crossed, as if already amused by your existence.',
        characters: [
            { characterId: 'char_001', name: 'Astra — Vanguard Guardian', role: 'Frontline defender', avatar: 'https://placehold.co/80x80/7c3aed/white?text=A' },
            { characterId: 'char_002', name: 'Nyrelle — Observer Guardian', role: 'Strategic control', avatar: 'https://placehold.co/80x80/a855f7/white?text=N' },
            { characterId: 'char_003', name: 'Veyra — Catalyst Guardian', role: 'Power amplifier', avatar: 'https://placehold.co/80x80/ec4899/white?text=V' }
        ],
        cover: 'https://placehold.co/400x300/1a1a2e/white?text=Chosen+by+the+World',
        tags: ['fantasy', 'action', 'guardians', 'adventure'],
        statistics: { views: 3400, likes: 890, plays: 567 },
        tokenEstimates: { total: 2500, firstMessage: 180, context: 1200 },
        moderationStatus: 'approved',
        reviewedBy: 'ravenheartrealm',
        reviewedAt: new Date('2026-01-15T13:49:20'),
        version: 2,
        flags: { isNsfw: false, needsManualReview: false }
    },
    {
        storylineId: 'story_002',
        title: 'Midnight Academy',
        user: 'stellar_colony3',
        languageCode: 'en',
        advancedMode: false,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        monetized: false,
        description: 'Welcome to Midnight Academy, where supernatural beings learn to control their powers.',
        firstMessage: 'The iron gates creak open as you approach. Midnight Academy looms before you, its Gothic spires piercing the starless sky.',
        characters: [],
        cover: 'https://placehold.co/400x300/16213e/white?text=Midnight+Academy',
        tags: ['school', 'supernatural', 'mystery'],
        statistics: { views: 1200, likes: 340, plays: 189 },
        tokenEstimates: { total: 1800, firstMessage: 120, context: 900 },
        moderationStatus: 'pending',
        flags: { isNsfw: false, needsManualReview: true }
    },
    {
        storylineId: 'story_003',
        title: 'Forbidden Romance',
        user: 'romance_writer',
        languageCode: 'en',
        advancedMode: true,
        secretMode: true,
        visibility: 'private',
        nsfw: true,
        monetized: false,
        description: 'A mature romance story between forbidden lovers.',
        firstMessage: 'The candlelight flickers as you enter the chamber...',
        characters: [],
        cover: 'https://placehold.co/400x300/dc3545/white?text=18%2B',
        tags: ['romance', 'mature', 'drama'],
        statistics: { views: 890, likes: 234, plays: 156 },
        moderationStatus: 'flagged',
        moderationResult: {
            categories: [{ category: 'nsfw', flagged: true, confidence: 0.92 }],
            aiVerdict: 'flagged',
            aiReasoning: 'Content contains adult themes requiring age verification.',
            aiConfidence: 0.92
        },
        flags: { isNsfw: true, needsManualReview: true }
    },
    {
        storylineId: 'story_004',
        title: 'Space Explorer',
        user: 'sci_fi_fan',
        languageCode: 'en',
        advancedMode: false,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        description: 'Explore the galaxy as a starship captain.',
        firstMessage: 'Captain on the bridge! Your crew salutes as you take your seat.',
        characters: [],
        tags: ['sci-fi', 'adventure', 'space'],
        statistics: { views: 2300, likes: 567, plays: 345 },
        moderationStatus: 'pending',
        flags: { isNsfw: false, needsManualReview: false }
    }
];

const samplePersonas = [
    {
        personaId: 'persona_001',
        name: 'Alex - The Explorer',
        user: 'the_lost_writer',
        languageCode: 'en',
        advancedMode: false,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        description: 'A curious adventurer who loves discovering new places and meeting new people.',
        descriptionSummary: 'Curious adventurer',
        tags: ['explorer', 'adventurer', 'curious'],
        statistics: { uses: 450 },
        moderationStatus: 'approved',
        reviewedBy: 'auto_approve',
        reviewedAt: new Date('2026-01-10'),
        flags: { isNsfw: false, needsManualReview: false }
    },
    {
        personaId: 'persona_002',
        name: 'Shadow Blade',
        user: 'dark_knight_99',
        languageCode: 'en',
        advancedMode: true,
        secretMode: false,
        visibility: 'hidden',
        nsfw: false,
        description: 'A mysterious assassin with a troubled past.',
        descriptionSummary: 'Mysterious assassin',
        tags: ['assassin', 'dark', 'mystery'],
        statistics: { uses: 234 },
        moderationStatus: 'pending',
        flags: { isNsfw: false, needsManualReview: true }
    },
    {
        personaId: 'persona_003',
        name: 'Princess Luna',
        user: 'fairy_tale_lover',
        languageCode: 'en',
        advancedMode: false,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        description: 'A kind and gentle princess who rules with compassion.',
        descriptionSummary: 'Kind princess',
        tags: ['princess', 'fantasy', 'kind'],
        statistics: { uses: 890 },
        moderationStatus: 'approved',
        flags: { isNsfw: false, needsManualReview: false }
    },
    {
        personaId: 'persona_004',
        name: 'Toxic Personality',
        user: 'bad_actor_456',
        languageCode: 'en',
        advancedMode: false,
        secretMode: false,
        visibility: 'public',
        nsfw: false,
        description: 'A persona designed to spread hate and negativity.',
        tags: ['toxic'],
        statistics: { uses: 5 },
        moderationStatus: 'rejected',
        moderationResult: {
            categories: [{ category: 'hate_speech', flagged: true, confidence: 0.88 }],
            aiVerdict: 'rejected',
            aiReasoning: 'Content promotes hate speech.',
            aiConfidence: 0.88
        },
        reviewedBy: 'mod_admin',
        reviewedAt: new Date('2026-01-11'),
        rejectionReason: 'Promotes hate speech - violates POL-001',
        flags: { hasHateSpeech: true }
    }
];

const seedContent = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/content-moderation');
        console.log('Connected to MongoDB');

        // Clear existing data
        await Character.deleteMany({});
        await Storyline.deleteMany({});
        await Persona.deleteMany({});
        console.log('Cleared existing content data');

        // Insert sample data
        await Character.insertMany(sampleCharacters);
        console.log(`✓ Inserted ${sampleCharacters.length} characters`);

        await Storyline.insertMany(sampleStorylines);
        console.log(`✓ Inserted ${sampleStorylines.length} storylines`);

        await Persona.insertMany(samplePersonas);
        console.log(`✓ Inserted ${samplePersonas.length} personas`);

        console.log('\nContent seed completed successfully!');
        
        // Summary
        console.log('\nSummary:');
        console.log(`   Characters: ${sampleCharacters.length} (${sampleCharacters.filter(c => c.moderationStatus === 'pending').length} pending)`);
        console.log(`   Storylines: ${sampleStorylines.length} (${sampleStorylines.filter(s => s.moderationStatus === 'pending').length} pending)`);
        console.log(`   Personas: ${samplePersonas.length} (${samplePersonas.filter(p => p.moderationStatus === 'pending').length} pending)`);

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedContent();