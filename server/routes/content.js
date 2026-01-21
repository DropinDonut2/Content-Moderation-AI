const express = require('express');
const router = express.Router();
const Character = require('../models/Character');
const Storyline = require('../models/Storyline');
const Persona = require('../models/Persona');
const { autoModerateContent, autoModerateFullJson, buildFullJsonContent, extractImageUrls } = require('../services/contentModerationService');

// ============ CHARACTERS ============

// GET /api/v1/content/characters
router.get('/characters', async (req, res) => {
    try {
        const { status, nsfw, user, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status && status !== 'all') filter.moderationStatus = status;
        if (nsfw !== undefined && nsfw !== '') filter.nsfw = nsfw === 'true';
        if (user) filter.user = user;

        const characters = await Character.find(filter)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await Character.countDocuments(filter);

        res.json({
            success: true,
            data: characters,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/content/characters/:id
router.get('/characters/:id', async (req, res) => {
    try {
        const character = await Character.findOne({ characterId: req.params.id }) || await Character.findById(req.params.id);
        if (!character) return res.status(404).json({ success: false, error: 'Character not found' });
        res.json({ success: true, data: character });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/content/characters - Create with auto-moderation
router.post('/characters', async (req, res) => {
    try {
        const characterData = req.body;
        console.log('🤖 Auto-moderating new character:', characterData.name);
        const moderationResult = await autoModerateContent('character', characterData);

        const character = new Character({
            ...characterData,
            moderationStatus: 'pending',
            moderationResult: moderationResult.moderationResult,
            flags: { ...characterData.flags, ...moderationResult.flags }
        });
        await character.save();

        if (req.app.get('io')) req.app.get('io').emit('newContent', { type: 'character', data: character });
        res.status(201).json({ success: true, data: character, moderation: moderationResult.moderationResult });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/content/characters/:id/moderate - Re-run AI moderation
router.post('/characters/:id/moderate', async (req, res) => {
    try {
        const character = await Character.findOne({ characterId: req.params.id }) || await Character.findById(req.params.id);
        if (!character) return res.status(404).json({ success: false, error: 'Character not found' });

        const moderationResult = await autoModerateContent('character', character.toObject());
        character.moderationResult = moderationResult.moderationResult;
        character.flags = { ...character.flags, ...moderationResult.flags };
        await character.save();

        res.json({ success: true, data: character, moderation: moderationResult.moderationResult });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH /api/v1/content/characters/:id/review - Human review
router.patch('/characters/:id/review', async (req, res) => {
    try {
        const { status, reviewedBy, reviewNotes, rejectionReason } = req.body;
        if (!['approved', 'flagged', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const updateData = {
            moderationStatus: status,
            reviewedBy,
            reviewedAt: new Date(),
            reviewNotes,
            'flags.needsManualReview': false
        };
        if (status === 'rejected' && rejectionReason) updateData.rejectionReason = rejectionReason;

        const character = await Character.findOneAndUpdate(
            { characterId: req.params.id }, updateData, { new: true }
        ) || await Character.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!character) return res.status(404).json({ success: false, error: 'Character not found' });
        if (req.app.get('io')) req.app.get('io').emit('contentReviewed', { type: 'character', data: character });
        res.json({ success: true, data: character });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ STORYLINES ============

router.get('/storylines', async (req, res) => {
    try {
        const { status, nsfw, user, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status && status !== 'all') filter.moderationStatus = status;
        if (nsfw !== undefined && nsfw !== '') filter.nsfw = nsfw === 'true';
        if (user) filter.user = user;

        const storylines = await Storyline.find(filter)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await Storyline.countDocuments(filter);
        res.json({
            success: true,
            data: storylines,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/storylines/:id', async (req, res) => {
    try {
        const storyline = await Storyline.findOne({ storylineId: req.params.id }) || await Storyline.findById(req.params.id);
        if (!storyline) return res.status(404).json({ success: false, error: 'Storyline not found' });
        res.json({ success: true, data: storyline });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/storylines', async (req, res) => {
    try {
        const storylineData = req.body;
        console.log('🤖 Auto-moderating new storyline:', storylineData.title);
        const moderationResult = await autoModerateContent('storyline', storylineData);

        const storyline = new Storyline({
            ...storylineData,
            moderationStatus: 'pending',
            moderationResult: moderationResult.moderationResult,
            flags: { ...storylineData.flags, ...moderationResult.flags }
        });
        await storyline.save();

        if (req.app.get('io')) req.app.get('io').emit('newContent', { type: 'storyline', data: storyline });
        res.status(201).json({ success: true, data: storyline, moderation: moderationResult.moderationResult });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/storylines/:id/moderate', async (req, res) => {
    try {
        const storyline = await Storyline.findOne({ storylineId: req.params.id }) || await Storyline.findById(req.params.id);
        if (!storyline) return res.status(404).json({ success: false, error: 'Storyline not found' });

        const storyData = storyline.toObject();
        console.log('═══════════════════════════════════════════════════');
        console.log(' STORYLINE DATA BEING MODERATED:');
        console.log('═══════════════════════════════════════════════════');
        console.log('Title:', storyData.title);
        console.log('Has personaSnapshots:', !!storyData.personaSnapshots);
        console.log('Persona count:', storyData.personaSnapshots?.length || 0);
        console.log('Has characterSnapshots:', !!storyData.characterSnapshots);
        console.log('Character count:', storyData.characterSnapshots?.length || 0);
        console.log('Plot length:', storyData.plot?.length || 0);
        console.log('FirstMessage length:', storyData.firstMessage?.length || 0);
        console.log('All keys:', Object.keys(storyData));
        console.log('═══════════════════════════════════════════════════');

        const moderationResult = await autoModerateContent('storyline', storyline.toObject());
        storyline.moderationResult = moderationResult.moderationResult;
        storyline.flags = { ...storyline.flags, ...moderationResult.flags };
        await storyline.save();

        res.json({ success: true, data: storyline, moderation: moderationResult.moderationResult });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/storylines/:id/review', async (req, res) => {
    try {
        const { status, reviewedBy, reviewNotes, rejectionReason } = req.body;
        if (!['approved', 'flagged', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const updateData = {
            moderationStatus: status,
            reviewedBy,
            reviewedAt: new Date(),
            reviewNotes,
            'flags.needsManualReview': false
        };
        if (status === 'rejected' && rejectionReason) updateData.rejectionReason = rejectionReason;

        const storyline = await Storyline.findOneAndUpdate(
            { storylineId: req.params.id }, updateData, { new: true }
        ) || await Storyline.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!storyline) return res.status(404).json({ success: false, error: 'Storyline not found' });
        if (req.app.get('io')) req.app.get('io').emit('contentReviewed', { type: 'storyline', data: storyline });
        res.json({ success: true, data: storyline });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ PERSONAS ============

router.get('/personas', async (req, res) => {
    try {
        const { status, nsfw, user, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status && status !== 'all') filter.moderationStatus = status;
        if (nsfw !== undefined && nsfw !== '') filter.nsfw = nsfw === 'true';
        if (user) filter.user = user;

        const personas = await Persona.find(filter)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await Persona.countDocuments(filter);
        res.json({
            success: true,
            data: personas,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/personas/:id', async (req, res) => {
    try {
        const persona = await Persona.findOne({ personaId: req.params.id }) || await Persona.findById(req.params.id);
        if (!persona) return res.status(404).json({ success: false, error: 'Persona not found' });
        res.json({ success: true, data: persona });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/personas', async (req, res) => {
    try {
        const personaData = req.body;
        console.log('🤖 Auto-moderating new persona:', personaData.name);
        const moderationResult = await autoModerateContent('persona', personaData);

        const persona = new Persona({
            ...personaData,
            moderationStatus: 'pending',
            moderationResult: moderationResult.moderationResult,
            flags: { ...personaData.flags, ...moderationResult.flags }
        });
        await persona.save();

        if (req.app.get('io')) req.app.get('io').emit('newContent', { type: 'persona', data: persona });
        res.status(201).json({ success: true, data: persona, moderation: moderationResult.moderationResult });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/personas/:id/moderate', async (req, res) => {
    try {
        const persona = await Persona.findOne({ personaId: req.params.id }) || await Persona.findById(req.params.id);
        if (!persona) return res.status(404).json({ success: false, error: 'Persona not found' });

        const moderationResult = await autoModerateContent('persona', persona.toObject());
        persona.moderationResult = moderationResult.moderationResult;
        persona.flags = { ...persona.flags, ...moderationResult.flags };
        await persona.save();

        res.json({ success: true, data: persona, moderation: moderationResult.moderationResult });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/personas/:id/review', async (req, res) => {
    try {
        const { status, reviewedBy, reviewNotes, rejectionReason } = req.body;
        if (!['approved', 'flagged', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const updateData = {
            moderationStatus: status,
            reviewedBy,
            reviewedAt: new Date(),
            reviewNotes,
            'flags.needsManualReview': false
        };
        if (status === 'rejected' && rejectionReason) updateData.rejectionReason = rejectionReason;

        const persona = await Persona.findOneAndUpdate(
            { personaId: req.params.id }, updateData, { new: true }
        ) || await Persona.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!persona) return res.status(404).json({ success: false, error: 'Persona not found' });
        if (req.app.get('io')) req.app.get('io').emit('contentReviewed', { type: 'persona', data: persona });
        res.json({ success: true, data: persona });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ BULK MODERATE ============

router.post('/moderate-all-pending', async (req, res) => {
    try {
        const results = { characters: { processed: 0, errors: 0 }, storylines: { processed: 0, errors: 0 }, personas: { processed: 0, errors: 0 } };

        const pendingChars = await Character.find({ moderationStatus: 'pending', 'moderationResult.aiVerdict': { $exists: false } });
        const pendingStories = await Storyline.find({ moderationStatus: 'pending', 'moderationResult.aiVerdict': { $exists: false } });
        const pendingPersonas = await Persona.find({ moderationStatus: 'pending', 'moderationResult.aiVerdict': { $exists: false } });

        for (const char of pendingChars) {
            try {
                const modResult = await autoModerateContent('character', char.toObject());
                char.moderationResult = modResult.moderationResult;
                char.flags = { ...char.flags, ...modResult.flags };
                await char.save();
                results.characters.processed++;
            } catch (e) { results.characters.errors++; }
        }

        for (const story of pendingStories) {
            try {
                const modResult = await autoModerateContent('storyline', story.toObject());
                story.moderationResult = modResult.moderationResult;
                story.flags = { ...story.flags, ...modResult.flags };
                await story.save();
                results.storylines.processed++;
            } catch (e) { results.storylines.errors++; }
        }

        for (const persona of pendingPersonas) {
            try {
                const modResult = await autoModerateContent('persona', persona.toObject());
                persona.moderationResult = modResult.moderationResult;
                persona.flags = { ...persona.flags, ...modResult.flags };
                await persona.save();
                results.personas.processed++;
            } catch (e) { results.personas.errors++; }
        }

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ STATS ============

router.get('/stats', async (req, res) => {
    try {
        const [charStats, storyStats, personaStats] = await Promise.all([
            Character.aggregate([{ $group: { _id: '$moderationStatus', count: { $sum: 1 } } }]),
            Storyline.aggregate([{ $group: { _id: '$moderationStatus', count: { $sum: 1 } } }]),
            Persona.aggregate([{ $group: { _id: '$moderationStatus', count: { $sum: 1 } } }])
        ]);

        const formatStats = (stats) => {
            const result = { pending: 0, approved: 0, flagged: 0, rejected: 0, total: 0 };
            stats.forEach(s => { result[s._id] = s.count; result.total += s.count; });
            return result;
        };

        res.json({ success: true, data: { characters: formatStats(charStats), storylines: formatStats(storyStats), personas: formatStats(personaStats) } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ JSON IMPORT ============

// POST /api/v1/content/import-json - Import and moderate full JSON (Isekai Zero format)
router.post('/import-json', async (req, res) => {
    try {
        const jsonData = req.body;
        const data = jsonData.data || jsonData;

        // Detect Type
        const isCharacter = (data.name && !data.title);

        // Validate JSON has required structure
        if (!isCharacter && (!data.title && !data.characterSnapshots)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid JSON format. Expected Data with "name" (Character) or "title"/"characterSnapshots" (Storyline).'
            });
        }

        const typeLabel = isCharacter ? 'Character' : 'Storyline';
        const mainTitle = isCharacter ? (data.name || 'Unnamed Character') : (data.title || 'Untitled Story');

        console.log(`📥 Importing JSON ${typeLabel}:`, mainTitle);

        if (!isCharacter) {
            console.log(`   - Characters: ${data.characterSnapshots?.length || 0}`);
            console.log(`   - Personas: ${data.personaSnapshots?.length || 0}`);
        } else {
            console.log(`   - Media Count: ${data.media?.length || 0}`);
        }

        // Check for images
        const images = extractImageUrls(jsonData);
        console.log(`   - Images found: ${images.length}`);

        // Run full JSON moderation with multimodal support
        const includeImages = req.query.includeImages !== 'false';
        console.log('🤖 Starting AI moderation...');
        const moderationResult = await autoModerateFullJson(jsonData, { includeImages });
        console.log('✅ AI moderation complete:', moderationResult.success ? 'SUCCESS' : 'FAILED');

        if (!moderationResult.success) {
            console.error('❌ Moderation error:', moderationResult.error);
        }

        let savedContent;

        if (isCharacter) {
            // === SAVE AS CHARACTER ===
            savedContent = new Character({
                characterId: data._id || `import_char_${Date.now()}`,
                name: data.name,
                user: data.creatorUsername || data._userId || 'json_import',
                nsfw: data.nsfw || false,
                visibility: data.visibility || 'hidden',

                // Character specific fields
                description: data.description || '',
                descriptionSummary: data.descriptionSummary || '',
                promptDescription: data.promptDescription || '',
                exampleDialogue: data.exampleDialogue || '',
                firstMessage: data.firstMessage || '',

                // Media / Cover
                cover: data.cover?.url || null,
                avatar: data.avatar || null, // Some formats use avatar

                // Tags
                tags: (data.tags || data._tagIds || []).map(t => {
                    if (typeof t === 'string') return t;
                    if (typeof t === 'object' && t !== null) return t.name || t._id || String(t);
                    return String(t);
                }),

                importSource: 'json_import',
                moderationStatus: 'pending',
                moderationResult: moderationResult.moderationResult,
                flags: { ...moderationResult.flags }
            });
        } else {
            // === SAVE AS STORYLINE ===
            const tagNames = data.tagSnapshots
                ?.filter(t => !t.deleted)
                ?.map(t => t.name) || [];

            savedContent = new Storyline({
                storylineId: data._id || `import_story_${Date.now()}`,
                title: data.title || 'Imported Storyline',
                user: data.creatorUsername || data._userId || 'json_import',
                nsfw: data.nsfw || false,
                visibility: data.visibility || 'hidden',

                // Store cover URL
                cover: data.cover?.url || null,

                // Text Content
                description: data.description || '',
                plot: data.plot || '',
                plotSummary: data.plotSummary || '',
                firstMessage: data.firstMessage || '',
                promptPlot: data.promptPlot || '',
                promptGuideline: data.promptGuideline || '',
                reminder: data.reminder || '',

                // Snapshots
                characterSnapshots: data.characterSnapshots || [],
                personaSnapshots: data.personaSnapshots || [],
                tagSnapshots: data.tagSnapshots || [],
                tags: tagNames,

                importSource: 'json_import',
                moderationStatus: 'pending',
                moderationResult: moderationResult.moderationResult,
                flags: { ...moderationResult.flags }
            });
        }

        await savedContent.save();

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').emit('newContent', {
                type: isCharacter ? 'character' : 'storyline',
                source: 'json_import',
                data: savedContent
            });
        }

        res.status(201).json({
            success: true,
            data: savedContent,
            moderation: moderationResult.moderationResult,
            meta: moderationResult.meta || {},
            preview: {
                title: mainTitle,
                type: isCharacter ? 'character' : 'storyline',
                characterCount: isCharacter ? 0 : (data.characterSnapshots?.length || 0),
                personaCount: isCharacter ? 0 : (data.personaSnapshots?.length || 0),
                tagCount: data.tagSnapshots?.length || (data.tags?.length || 0),
                imageCount: images.length,
                imagesAnalyzed: moderationResult.meta?.imagesAnalyzed || 0
            }
        });

    } catch (error) {
        console.error('JSON Import error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/content/preview-json - Preview JSON without saving
router.post('/preview-json', async (req, res) => {
    try {
        const jsonData = req.body;
        const data = jsonData.data || jsonData;

        // Detect Type
        const isCharacter = (data.name && !data.title);

        // Extract preview info
        const images = extractImageUrls(jsonData);

        let tagNames = [];
        let characterPreviews = [];
        let estimatedTextLength = 0;

        if (isCharacter) {
            tagNames = (data.tags || []).map(t => {
                if (typeof t === 'string') return { name: t, type: 'tag', nsfw: false };
                if (typeof t === 'object' && t !== null) return { name: t.name || t.id || 'Unknown', type: t.type || 'tag', nsfw: t.nsfw || t.nsfw || false };
                return { name: String(t), type: 'tag', nsfw: false };
            });
            // For character, we can estimate text from bio/description
            estimatedTextLength = (data.description || '').length + (data.descriptionSummary || '').length;
        } else {
            const textPreview = buildFullJsonContent(jsonData);
            estimatedTextLength = textPreview.length;

            tagNames = data.tagSnapshots
                ?.filter(t => !t.deleted)
                ?.map(t => ({ name: t.name, type: t.type, nsfw: t.nsfw || false })) || [];

            characterPreviews = data.characterSnapshots?.map(c => ({
                name: c.name,
                nsfw: c.nsfw || false,
                status: c.status,
                hasDescription: !!c.description,
                descriptionLength: c.description?.length || 0,
                tagCount: c.tagSnapshots?.length || 0,
                hasAvatar: !!c.cover?.url
            })) || [];
        }

        res.json({
            success: true,
            preview: {
                title: isCharacter ? (data.name || 'Unnamed Character') : (data.title || 'Untitled'),
                type: isCharacter ? 'character' : 'storyline',
                status: data.status,
                nsfw: data.nsfw || false,
                hasCover: !!data.cover?.url,
                coverUrl: data.cover?.url || null,
                characterCount: isCharacter ? 0 : (data.characterSnapshots?.length || 0),
                personaCount: isCharacter ? 0 : (data.personaSnapshots?.length || 0),
                tagCount: isCharacter ? (data.tags?.length || 0) : tagNames.length,
                imageCount: images.length,
                estimatedTextLength: estimatedTextLength,
                tags: tagNames.slice(0, 20),
                characters: characterPreviews
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;