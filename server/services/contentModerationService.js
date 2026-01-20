const OpenAI = require('openai');
const Policy = require('../models/Policy');

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY
});

// ADD: Field validation function (add after your imports)
const validateFields = (contentType, content) => {
    const issues = [];
    const warnings = [];

    // Title/Name check
    const name = content.name || content.title;
    if (!name || name.trim().length === 0) {
        issues.push({
            field: 'name/title',
            severity: 'error',
            message: 'Title/Name is required',
            suggestion: 'Add a descriptive title for your content'
        });
    } else if (/^(untitled|test|asdf|placeholder|new|draft)/i.test(name.trim())) {
        warnings.push({
            field: 'name/title',
            severity: 'warning',
            message: 'Title appears to be a placeholder',
            suggestion: 'Replace placeholder title with a proper name'
        });
    }

    // Description check
    const description = content.description || '';
    if (description && description.length < 50) {
        warnings.push({
            field: 'description',
            severity: 'warning',
            message: `Description is too short (${description.length} chars, minimum recommended: 50)`,
            suggestion: 'Add more detail to help users understand your content'
        });
    }

    // NSFW + Minor conflict check
    if (content.nsfw === true) {
        const allText = [
            content.description,
            content.promptDescription,
            content.exampleDialogue,
            content.plot,
            content.firstMessage
        ].filter(Boolean).join(' ').toLowerCase();

        const minorPatterns = [
            /\bage[d]?\s*:?\s*(\d|1[0-7])\b/i,
            /\b(\d|1[0-7])\s*years?\s*old\b/i,
            /\bloli\b/i,
            /\bshota\b/i,
            /\bschool\s*girl\b/i,
            /\bschool\s*boy\b/i
        ];

        for (const pattern of minorPatterns) {
            if (pattern.test(allText)) {
                issues.push({
                    field: 'nsfw',
                    severity: 'critical',
                    message: 'NSFW content appears to reference minors',
                    suggestion: 'Remove minor references or uncheck NSFW'
                });
                break;
            }
        }
    }

    // Check if content appears NSFW but not tagged
    if (!content.nsfw) {
        const allText = [
            content.description,
            content.promptDescription,
            content.exampleDialogue,
            content.plot,
            content.firstMessage
        ].filter(Boolean).join(' ').toLowerCase();

        const nsfwIndicators = [
            /\b(sex|sexual|erotic|nude|naked)\b/i,
            /\b(fuck|cock|pussy|dick)\b/i,
            /\b(moan|orgasm|climax)\b/i,
            /\b(bdsm|bondage|fetish|kink)\b/i
        ];

        if (nsfwIndicators.some(p => p.test(allText))) {
            issues.push({
                field: 'nsfw',
                severity: 'warning',
                message: 'Content appears to contain adult themes but NSFW is not checked',
                suggestion: 'Enable the NSFW tag if this content is for adults (18+)'
            });
        }
    }

    // Storyline-specific
    if (contentType === 'storyline') {
        if (!content.firstMessage || content.firstMessage.trim().length < 20) {
            warnings.push({
                field: 'firstMessage',
                severity: 'warning',
                message: 'First message is empty or very short',
                suggestion: 'Add an opening message to start the story'
            });
        }
    }

    // Character-specific
    if (contentType === 'character') {
        if (!content.exampleDialogue) {
            warnings.push({
                field: 'exampleDialogue',
                severity: 'warning',
                message: 'No example dialogue provided',
                suggestion: 'Add example dialogue to show how the character speaks'
            });
        }
    }

    return {
        isValid: !issues.some(i => i.severity === 'error' || i.severity === 'critical'),
        hasWarnings: warnings.length > 0,
        issues,
        warnings,
        all: [...issues, ...warnings]
    };
};

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
            detectedLanguage: result.detectedLanguage || 'Unknown',
            suggestionsForCreator: [
                ...(result.suggestionsForCreator || []),
                ...validation.all.map(v => ({
                    type: v.severity === 'critical' ? 'error' : v.severity,
                    field: v.field,
                    issue: v.message,
                    suggestion: v.suggestion,
                    source: 'field_validation'
                }))
            ],
            fieldValidation: validation,

            flags: {
                isNsfw: result.nsfw || false,
                hasViolence: result.categories?.some(c => c.category === 'violence' && c.flagged) || false,
                hasHateSpeech: result.categories?.some(c => c.category === 'hate_speech' && c.flagged) || false,
                needsManualReview: result.verdict !== 'safe',
                hasFieldErrors: !validation.isValid,
        hasFieldWarnings: validation.hasWarnings
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

module.exports = {
    autoModerateContent,
    buildCharacterContent,
    buildStorylineContent,
    buildPersonaContent
};