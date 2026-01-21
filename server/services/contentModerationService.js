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

<<<<<<< Updated upstream
=======
// ============================================
// IMPROVED AI MODERATION WITH FIELD HIGHLIGHTING
// ============================================

const moderationTool = {
    type: "function",
    function: {
        name: "submit_moderation_result",
        description: "Submit the final verdict and analysis of the content moderation.",
        parameters: {
            type: "object",
            properties: {
                verdict: {
                    type: "string",
                    enum: ["safe", "flagged", "rejected"],
                    description: "The overall safety verdict."
                },
                confidence: {
                    type: "number",
                    description: "Confidence score between 0.0 and 1.0"
                },
                summary: {
                    type: "string",
                    description: "A concise summary of the moderation findings (max 100 chars)."
                },
                highlightedIssues: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            field: { type: "string" },
                            quote: { type: "string" },
                            policy: { type: "string" },
                            policyTitle: { type: "string" },
                            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                            reason: { type: "string" }
                        },
                        required: ["field", "quote", "policy", "severity", "reason"]
                    }
                },
                fieldAnalysis: {
                    type: "object",
                    additionalProperties: {
                        type: "object",
                        properties: {
                            status: { type: "string", enum: ["safe", "flagged"] },
                            issueCount: { type: "number" }
                        }
                    }
                },
                nsfw: { type: "boolean" },
                nsfwReason: { type: "string" },
                categories: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            category: { type: "string" },
                            flagged: { type: "boolean" },
                            confidence: { type: "number" }
                        },
                        required: ["category", "flagged"]
                    }
                },
                flaggedPolicies: {
                    type: "array",
                    items: { type: "string" }
                },
                recommendedAction: {
                    type: "string",
                    enum: ["approve", "review", "reject"]
                },
                humanReviewPriority: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"]
                },
                reasoning: { type: "string" }
            },
            required: ["verdict", "confidence", "summary", "highlightedIssues", "nsfw", "recommendedAction", "reasoning"]
        }
    }
};

// ============================================
// IMPROVED AI MODERATION WITH FIELD HIGHLIGHTING
// ============================================

>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
## YOUR TASK:
1. Read each field carefully: firstMessage, promptPlot, plot, plotSummary, description, etc.
2. Find ANY text segments that may violate the policies above
3. Call the 'submit_moderation_result' tool with your detailed analysis info.
`;

        console.log('🤖 Sending to AI for analysis...');
        console.log(`   Content type: ${contentType}`);
        console.log(`   Fields to analyze: ${Object.keys(fieldsToAnalyze).join(', ')}`);
>>>>>>> Stashed changes

        const response = await openai.chat.completions.create({
            model: process.env.AI_MODEL || 'anthropic/claude-4.5-sonnet',
            messages: [
<<<<<<< Updated upstream
                { role: 'system', content: 'You are a content moderation assistant. Always respond with valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1
=======
                {
                    role: 'system',
                    content: 'You are a content moderation AI. usage of the submit_moderation_result tool is mandatory.'
                },
                { role: 'user', content: prompt }
            ],
            tools: [moderationTool],
            // force the tool call
            tool_choice: { type: "function", function: { name: "submit_moderation_result" } },
            temperature: 0.1,
            max_tokens: 4000
>>>>>>> Stashed changes
        });

        // --------------------------------------------------------
        // TOOL CALL PARSING
        // --------------------------------------------------------

<<<<<<< Updated upstream
        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        console.log("------------------------------------------------__");
        console.log("AI RAW JSON:", jsonMatch[0]);
        console.log("------------------------------------------------__");

        const result = JSON.parse(jsonMatch[0]);
=======
        const toolCall = response.choices[0].message.tool_calls?.[0];

        let result;

        if (toolCall && toolCall.function && toolCall.function.name === 'submit_moderation_result') {
            try {
                result = JSON.parse(toolCall.function.arguments);
                console.log("✓ Structured output (tool call) received and parsed");
                console.log(`   Verdict: ${result.verdict}, Confidence: ${result.confidence}`);
            } catch (parseError) {
                console.error("Tool arguments parsing failed:", parseError);
                console.error("Raw arguments:", toolCall.function.arguments);
                throw new Error("AI produced invalid JSON in tool arguments");
            }
        } else {
            console.error("AI failed to call tool. Response content:", response.choices[0].message.content);
            throw new Error("AI did not use the structured output tool");
        }

        // Process highlighted issues for display
        const highlightedIssues = (result.highlightedIssues || []).map(issue => ({
            field: issue.field || 'unknown',
            quote: issue.quote || '',
            policy: issue.policy || 'N/A',
            policyTitle: issue.policyTitle || '',
            severity: issue.severity || 'medium',
            reason: issue.reason || ''
        }));
>>>>>>> Stashed changes

        return {
            success: true,
            moderationResult: {
                aiVerdict: result.verdict,
                aiConfidence: result.confidence,
                aiReasoning: result.reasoning,
                aiSummary: result.summary,
<<<<<<< Updated upstream
                categories: result.categories || [],
                flaggedPolicies: result.flaggedPolicies || [],
                offendingSnippet: result.activeSnippet || null, // Added field
=======

                // NEW: Field-specific highlighted issues
                highlightedIssues: highlightedIssues,
                fieldAnalysis: result.fieldAnalysis || {},

                // Legacy fields for backwards compatibility
                categories: result.categories || [],
                flaggedPolicies: result.flaggedPolicies || [],
                offendingSnippet: highlightedIssues[0]?.quote || null,

>>>>>>> Stashed changes
                nsfw: result.nsfw || false,
                nsfwReason: result.nsfwReason || null,
                recommendedAction: result.recommendedAction,
                humanReviewPriority: result.humanReviewPriority,
                moderatedAt: new Date()
            },
<<<<<<< Updated upstream
            detectedLanguage: result.detectedLanguage || 'Unknown',
=======

            // Suggestions for creator
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
`.trim();
=======
`;

    // Add character content if available
    let characterContent = '';

    // Check for rawCharacterList (pre-built string)
    if (story.rawCharacterList && story.rawCharacterList.trim()) {
        characterContent = story.rawCharacterList;
    }
    // Check for characterSnapshots (array of objects)
    else if (story.characterSnapshots && story.characterSnapshots.length > 0) {
        characterContent = story.characterSnapshots
            .filter(c => !c.deleted)
            .map((char, idx) => {
                let charInfo = `--- CHARACTER ${idx + 1}: ${char.name || 'Unnamed'} ---\n`;
                charInfo += `NSFW: ${char.nsfw ? 'Yes' : 'No'}\n`;
                if (char.descriptionSummary) {
                    charInfo += `SUMMARY: ${char.descriptionSummary}\n`;
                }
                if (char.description) {
                    const desc = char.description.length > 2000
                        ? char.description.substring(0, 2000) + '... [TRUNCATED]'
                        : char.description;
                    charInfo += `DESCRIPTION:\n${desc}\n`;
                }
                if (char.tagSnapshots && char.tagSnapshots.length > 0) {
                    const tags = char.tagSnapshots.filter(t => !t.deleted).map(t => t.name).join(', ');
                    charInfo += `TAGS: ${tags}\n`;
                }
                return charInfo;
            })
            .join('\n');
    }
    // Check for characters array (might be objects or IDs)
    else if (story.characters && story.characters.length > 0) {
        characterContent = story.characters.map((char, idx) => {
            if (typeof char === 'string') return `Character ID: ${char}`;
            let charInfo = `--- CHARACTER ${idx + 1}: ${char.name || 'Unnamed'} ---\n`;
            if (char.description) charInfo += `DESCRIPTION: ${char.description.substring(0, 1000)}\n`;
            return charInfo;
        }).join('\n');
    }

    if (characterContent) {
        content += `\n=== CHARACTERS ===\n[FIELD: characterDescriptions]\n${characterContent}\n`;
    }

    // Add persona content if available
    let personaContent = '';

    if (story.rawPersonaList && story.rawPersonaList.trim()) {
        personaContent = story.rawPersonaList;
    }
    else if (story.personaSnapshots && story.personaSnapshots.length > 0) {
        personaContent = story.personaSnapshots
            .filter(p => !p.deleted)
            .map((persona, idx) => {
                let personaInfo = `--- PERSONA ${idx + 1}: ${persona.name || 'Unnamed'} ---\n`;
                personaInfo += `NSFW: ${persona.nsfw ? 'Yes' : 'No'}\n`;
                if (persona.descriptionSummary) {
                    personaInfo += `SUMMARY: ${persona.descriptionSummary}\n`;
                }
                if (persona.description) {
                    const desc = persona.description.length > 2000
                        ? persona.description.substring(0, 2000) + '... [TRUNCATED]'
                        : persona.description;
                    personaInfo += `DESCRIPTION:\n${desc}\n`;
                }
                return personaInfo;
            })
            .join('\n');
    }
    else if (story.personas && story.personas.length > 0) {
        personaContent = story.personas.map((persona, idx) => {
            if (typeof persona === 'string') return `Persona ID: ${persona}`;
            let personaInfo = `--- PERSONA ${idx + 1}: ${persona.name || 'Unnamed'} ---\n`;
            if (persona.description) personaInfo += `DESCRIPTION: ${persona.description.substring(0, 1000)}\n`;
            return personaInfo;
        }).join('\n');
    }

    if (personaContent) {
        content += `\n=== PERSONAS ===\n[FIELD: personaDescriptions]\n${personaContent}\n`;
    }

    return content.trim();
>>>>>>> Stashed changes
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