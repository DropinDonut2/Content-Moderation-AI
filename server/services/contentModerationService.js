const OpenAI = require('openai');
const Policy = require('../models/Policy');

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY
});

/**
 * Auto-moderate content (Character, Storyline, or Persona)
 * Returns AI analysis without making final decision
 */
const autoModerateContent = async (contentType, content) => {
    try {
        // Get active policies
        const policies = await Policy.find({ isActive: true });

        // Build content string based on type
        let contentToAnalyze = '';

        switch (contentType) {
            case 'character':
                contentToAnalyze = buildCharacterContent(content);
                break;
            case 'storyline':
                contentToAnalyze = buildStorylineContent(content);
                break;
            case 'persona':
                contentToAnalyze = buildPersonaContent(content);
                break;
            default:
                contentToAnalyze = JSON.stringify(content);
        }

        // Build policy context
        const policyContext = policies.map(p =>
            `- ${p.policyId}: ${p.title} (${p.category}, ${p.severity}) - ${p.description}`
        ).join('\n');

        const prompt = `You are a content moderation AI. Analyze the following ${contentType} submission for policy violations.

## Active Policies:
${policyContext}

## Content to Analyze:
${contentToAnalyze}

## Your Task:
1. Analyze the content for any policy violations
2. Check for: hate speech, harassment, NSFW content, violence, spam, misinformation, self-harm references, illegal content
3. Determine if the content needs human review

Respond in JSON format:
{
    "verdict": "safe" | "flagged" | "rejected",
    "confidence": 0.0-1.0,
    "activeSnippet": "EXACT QUOTE of the most offensive sentence/phrase (REQUIRED if flagged, max 100 chars)",
    "reasoning": "Brief explanation of your analysis",
    "summary": "One-line summary for quick human review",
    "categories": [
        { "category": "category_name", "flagged": true/false, "confidence": 0.0-1.0, "details": "specific concern" }
    ],
    "flaggedPolicies": ["POL-XXX"],
    "nsfw": true/false,
    "nsfwReason": "reason if nsfw",
    "recommendedAction": "approve" | "review" | "reject",
    "humanReviewPriority": "low" | "medium" | "high" | "critical"
}`;

        const response = await openai.chat.completions.create({
            model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
            messages: [
                { role: 'system', content: 'You are a content moderation assistant. Always respond with valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1
        });

        const responseText = response.choices[0].message.content;

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        console.log("------------------------------------------------__");
        console.log("AI RAW JSON:", jsonMatch[0]);
        console.log("------------------------------------------------__");

        const result = JSON.parse(jsonMatch[0]);

        return {
            success: true,
            moderationResult: {
                aiVerdict: result.verdict,
                aiConfidence: result.confidence,
                aiReasoning: result.reasoning,
                aiSummary: result.summary,
                categories: result.categories || [],
                flaggedPolicies: result.flaggedPolicies || [],
                offendingSnippet: result.activeSnippet || null, // Added field
                nsfw: result.nsfw || false,
                nsfwReason: result.nsfwReason || null,
                recommendedAction: result.recommendedAction,
                humanReviewPriority: result.humanReviewPriority,
                moderatedAt: new Date()
            },
            flags: {
                isNsfw: result.nsfw || false,
                hasViolence: result.categories?.some(c => c.category === 'violence' && c.flagged) || false,
                hasHateSpeech: result.categories?.some(c => c.category === 'hate_speech' && c.flagged) || false,
                needsManualReview: result.verdict !== 'safe'
            }
        };

    } catch (error) {
        console.error('Auto-moderation error:', error);

        // Return a safe default that requires human review
        return {
            success: false,
            error: error.message,
            moderationResult: {
                aiVerdict: 'flagged',
                aiConfidence: 0,
                aiReasoning: 'Auto-moderation failed. Requires manual review.',
                aiSummary: 'AI analysis unavailable - needs human review',
                categories: [],
                recommendedAction: 'review',
                humanReviewPriority: 'high',
                moderatedAt: new Date()
            },
            flags: {
                needsManualReview: true
            }
        };
    }
};

/**
 * Build content string for character analysis
 */
const buildCharacterContent = (char) => {
    return `
CHARACTER NAME: ${char.name || 'N/A'}
USER: ${char.user || 'N/A'}
VISIBILITY: ${char.visibility || 'N/A'}
MARKED AS NSFW: ${char.nsfw ? 'Yes' : 'No'}

DESCRIPTION:
${char.description || 'No description'}

DESCRIPTION SUMMARY:
${char.descriptionSummary || 'No summary'}

PROMPT DESCRIPTION:
${char.promptDescription || 'No prompt description'}

EXAMPLE DIALOGUE:
${char.exampleDialogue || 'No example dialogue'}

TAGS: ${char.tags?.join(', ') || 'None'}
`.trim();
};

/**
 * Build content string for storyline analysis
 */
const buildStorylineContent = (story) => {
    const charNames = story.characters?.map(c => c.name).join(', ') || 'None';

    return `
STORYLINE TITLE: ${story.title || 'N/A'}
USER: ${story.user || 'N/A'}
VISIBILITY: ${story.visibility || 'N/A'}
MARKED AS NSFW: ${story.nsfw ? 'Yes' : 'No'}
MONETIZED: ${story.monetized ? 'Yes' : 'No'}

DESCRIPTION:
${story.description || 'No description'}

PLOT SUMMARY:
${story.plotSummary || 'No summary'}

PLOT:
${story.plot || 'No plot'}

PROMPT PLOT:
${story.promptPlot || 'No prompt plot'}

FIRST MESSAGE:
${story.firstMessage || 'No first message'}

CHARACTER LIST (RAW):
${story.rawCharacterList || charNames}

PERSONA LIST (RAW):
${story.rawPersonaList || 'None'}

GUIDELINES:
${story.promptGuideline || 'None'}

REMINDER:
${story.reminder || 'None'}

TAGS: ${story.tags?.join(', ') || 'None'}
`.trim();
};

/**
 * Build content string for persona analysis
 */
const buildPersonaContent = (persona) => {
    return `
PERSONA NAME: ${persona.name || 'N/A'}
USER: ${persona.user || 'N/A'}
VISIBILITY: ${persona.visibility || 'N/A'}
MARKED AS NSFW: ${persona.nsfw ? 'Yes' : 'No'}

DESCRIPTION:
${persona.description || 'No description'}

DESCRIPTION SUMMARY:
${persona.descriptionSummary || 'No summary'}

PROMPT DESCRIPTION:
${persona.promptDescription || 'No prompt description'}

EXAMPLE DIALOGUE:
${persona.exampleDialogue || 'No example dialogue'}

TAGS: ${persona.tags?.join(', ') || 'None'}
`.trim();
};

/**
 * Build content string from full Isekai Zero-style JSON import
 * Extracts all relevant fields for comprehensive moderation
 */
const buildFullJsonContent = (json) => {
    // Handle wrapper if present (e.g., { code, status, data })
    const data = json.data || json;

    let content = '';

    // === STORYLINE METADATA ===
    content += `=== STORYLINE ===\n`;
    content += `TITLE: ${data.title || 'N/A'}\n`;
    content += `STATUS: ${data.status || 'N/A'}\n`;
    content += `NSFW FLAG: ${data.nsfw ? 'Yes' : 'No'}\n`;

    if (data.cover?.url) {
        content += `COVER IMAGE: ${data.cover.url}\n`;
    }

    // Storyline-level tags
    if (data.tagSnapshots && data.tagSnapshots.length > 0) {
        const tagNames = data.tagSnapshots
            .filter(t => !t.deleted)
            .map(t => `${t.name}${t.nsfw ? ' (NSFW)' : ''}`)
            .join(', ');
        content += `TAGS: ${tagNames}\n`;
    }

    content += '\n';

    // === STORYLINE TEXT CONTENT ===
    if (data.description) {
        content += `DESCRIPTION:\n${data.description}\n\n`;
    }

    if (data.plot) {
        const plot = data.plot.length > 5000
            ? data.plot.substring(0, 5000) + '... [TRUNCATED]'
            : data.plot;
        content += `PLOT:\n${plot}\n\n`;
    }

    if (data.plotSummary) {
        content += `PLOT SUMMARY:\n${data.plotSummary}\n\n`;
    }

    if (data.firstMessage) {
        const firstMsg = data.firstMessage.length > 2000
            ? data.firstMessage.substring(0, 2000) + '... [TRUNCATED]'
            : data.firstMessage;
        content += `FIRST MESSAGE:\n${firstMsg}\n\n`;
    }

    if (data.promptPlot) {
        const promptPlot = data.promptPlot.length > 3000
            ? data.promptPlot.substring(0, 3000) + '... [TRUNCATED]'
            : data.promptPlot;
        content += `PROMPT PLOT:\n${promptPlot}\n\n`;
    }

    if (data.promptGuideline) {
        content += `PROMPT GUIDELINE:\n${data.promptGuideline}\n\n`;
    }

    if (data.reminder) {
        content += `REMINDER:\n${data.reminder}\n\n`;
    }

    // === CHARACTER SNAPSHOTS ===
    if (data.characterSnapshots && data.characterSnapshots.length > 0) {
        content += `=== CHARACTERS (${data.characterSnapshots.length}) ===\n\n`;

        data.characterSnapshots.forEach((char, idx) => {
            content += `--- CHARACTER ${idx + 1}: ${char.name || 'Unnamed'} ---\n`;
            content += `STATUS: ${char.status || 'N/A'}\n`;
            content += `NSFW: ${char.nsfw ? 'Yes' : 'No'}\n`;
            content += `VISIBILITY: ${char.visibility || 'N/A'}\n`;

            if (char.cover?.url) {
                content += `AVATAR: ${char.cover.url}\n`;
            }

            if (char.descriptionSummary) {
                content += `SUMMARY: ${char.descriptionSummary}\n`;
            }

            if (char.description) {
                // Truncate very long descriptions to prevent token overflow
                const desc = char.description.length > 3000
                    ? char.description.substring(0, 3000) + '... [TRUNCATED]'
                    : char.description;
                content += `DESCRIPTION:\n${desc}\n`;
            }

            // Character tags
            if (char.tagSnapshots && char.tagSnapshots.length > 0) {
                const charTags = char.tagSnapshots
                    .filter(t => !t.deleted)
                    .map(t => t.name)
                    .join(', ');
                content += `TAGS: ${charTags}\n`;
            }

            content += '\n';
        });
    }

    // === PERSONA SNAPSHOTS ===
    if (data.personaSnapshots && data.personaSnapshots.length > 0) {
        content += `=== PERSONAS (${data.personaSnapshots.length}) ===\n\n`;

        data.personaSnapshots.forEach((persona, idx) => {
            content += `--- PERSONA ${idx + 1}: ${persona.name || 'Unnamed'} ---\n`;
            content += `STATUS: ${persona.status || 'N/A'}\n`;
            content += `NSFW: ${persona.nsfw ? 'Yes' : 'No'}\n`;

            if (persona.cover?.url) {
                content += `AVATAR: ${persona.cover.url}\n`;
            }

            if (persona.descriptionSummary) {
                content += `SUMMARY: ${persona.descriptionSummary}\n`;
            }

            if (persona.description) {
                const desc = persona.description.length > 2000
                    ? persona.description.substring(0, 2000) + '... [TRUNCATED]'
                    : persona.description;
                content += `DESCRIPTION:\n${desc}\n`;
            }

            if (persona.tagSnapshots && persona.tagSnapshots.length > 0) {
                const personaTags = persona.tagSnapshots
                    .filter(t => !t.deleted)
                    .map(t => t.name)
                    .join(', ');
                content += `TAGS: ${personaTags}\n`;
            }

            content += '\n';
        });
    }

    return content.trim();
};

/**
 * Extract all image URLs from the JSON for multimodal analysis
 */
const extractImageUrls = (json) => {
    const data = json.data || json;
    const images = [];

    // Storyline cover
    if (data.cover?.url) {
        images.push({ type: 'storyline_cover', url: data.cover.url });
    }

    // Character covers/avatars
    if (data.characterSnapshots) {
        data.characterSnapshots.forEach((char, idx) => {
            if (char.cover?.url) {
                images.push({
                    type: 'character_avatar',
                    name: char.name || `Character ${idx + 1}`,
                    url: char.cover.url
                });
            }
        });
    }

    // Persona covers
    if (data.personaSnapshots) {
        data.personaSnapshots.forEach((persona, idx) => {
            if (persona.cover?.url) {
                images.push({
                    type: 'persona_avatar',
                    name: persona.name || `Persona ${idx + 1}`,
                    url: persona.cover.url
                });
            }
        });
    }

    return images;
};

/**
 * Auto-moderate full JSON import with optional multimodal image analysis
 * This now uses the SAME moderation logic as manual entry for consistency
 */
const autoModerateFullJson = async (jsonContent, options = { includeImages: true }) => {
    try {
        const data = jsonContent.data || jsonContent;

        console.log("🔍 Moderating full JSON import...");
        console.log(`   - Title: ${data.title || 'Untitled'}`);
        console.log(`   - Characters: ${data.characterSnapshots?.length || 0}`);
        console.log(`   - Personas: ${data.personaSnapshots?.length || 0}`);

        // Convert JSON data to storyline format that matches manual entry
        // This ensures the SAME fields are analyzed
        const storylineData = {
            title: data.title || 'Imported Storyline',
            user: data.creatorUsername || data._userId || 'json_import',
            visibility: data.visibility || 'hidden',
            nsfw: data.nsfw || false,
            monetized: data.monetized || false,

            // Main text content
            description: data.description || '',
            plot: data.plot || '',
            plotSummary: data.plotSummary || '',
            promptPlot: data.promptPlot || '',
            firstMessage: data.firstMessage || '',
            promptGuideline: data.promptGuideline || '',
            reminder: data.reminder || '',

            // Build character list from snapshots
            rawCharacterList: data.characterSnapshots
                ?.filter(c => !c.deleted)
                ?.map(c => {
                    let charInfo = `${c.name}`;
                    if (c.description) {
                        // Include full description for analysis
                        charInfo += `:\n${c.description}`;
                    }
                    if (c.descriptionSummary) {
                        charInfo += `\nSummary: ${c.descriptionSummary}`;
                    }
                    return charInfo;
                })
                ?.join('\n\n---\n\n') || '',

            // Build persona list from snapshots
            rawPersonaList: data.personaSnapshots
                ?.filter(p => !p.deleted)
                ?.map(p => {
                    let personaInfo = `${p.name}`;
                    if (p.description) {
                        personaInfo += `:\n${p.description}`;
                    }
                    return personaInfo;
                })
                ?.join('\n\n---\n\n') || '',

            // Tags from snapshots
            tags: data.tagSnapshots
                ?.filter(t => !t.deleted)
                ?.map(t => t.name) || []
        };

        console.log(`   - Description length: ${storylineData.description?.length || 0}`);
        console.log(`   - Plot length: ${storylineData.plot?.length || 0}`);
        console.log(`   - Character text length: ${storylineData.rawCharacterList?.length || 0}`);

        // Use the SAME moderation function as manual entry!
        const moderationResult = await autoModerateContent('storyline', storylineData);

        // Add image analysis if enabled and there are images
        if (options.includeImages) {
            const images = extractImageUrls(jsonContent);
            if (images.length > 0) {
                console.log(`   - Images found: ${images.length} (will analyze separately if needed)`);
                // Add image metadata to the result
                moderationResult.meta = {
                    ...(moderationResult.meta || {}),
                    imagesFound: images.length,
                    imageUrls: images.slice(0, 5).map(i => ({ type: i.type, name: i.name }))
                };
            }
        }

        return moderationResult;

    } catch (error) {
        console.error('Full JSON moderation error:', error);

        return {
            success: false,
            error: error.message,
            moderationResult: {
                aiVerdict: 'flagged',
                aiConfidence: 0,
                aiReasoning: `Auto-moderation failed: ${error.message}. Requires manual review.`,
                aiSummary: 'AI analysis failed - needs human review',
                categories: [],
                recommendedAction: 'review',
                humanReviewPriority: 'high',
                moderatedAt: new Date()
            },
            flags: {
                needsManualReview: true
            }
        };
    }
};

module.exports = {
    autoModerateContent,
    autoModerateFullJson,
    buildCharacterContent,
    buildStorylineContent,
    buildPersonaContent,
    buildFullJsonContent,
    extractImageUrls
};