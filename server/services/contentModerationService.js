const OpenAI = require('openai');
const Policy = require('../models/Policy');

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY
});

// ============================================
// FIELD VALIDATION (Pre-AI checks)
// ============================================

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

// ============================================
// IMPROVED AI MODERATION WITH FIELD HIGHLIGHTING
// ============================================

/**
 * Auto-moderate content with field-specific highlighting
 * Returns detailed analysis with exact quotes from each problematic field
 */
const autoModerateContent = async (contentType, content) => {
    try {
        // Run field validation first
        const validation = validateFields(contentType, content);
        if (validation.issues.length > 0 || validation.warnings.length > 0) {
            console.log('📋 Field validation results:', validation.all.length, 'issues/warnings');
        }

        // Get active policies
        const policies = await Policy.find({ isActive: true });

        // Build content string based on type
        let contentToAnalyze = '';
        let fieldsToAnalyze = {};

        switch (contentType) {
            case 'character':
                contentToAnalyze = buildCharacterContent(content);
                fieldsToAnalyze = extractCharacterFields(content);
                break;
            case 'storyline':
                contentToAnalyze = buildStorylineContent(content);
                fieldsToAnalyze = extractStorylineFields(content);
                break;
            case 'persona':
                contentToAnalyze = buildPersonaContent(content);
                fieldsToAnalyze = extractPersonaFields(content);
                break;
            default:
                contentToAnalyze = JSON.stringify(content);
                fieldsToAnalyze = { raw: JSON.stringify(content) };
        }

        // Build policy context with clear examples
        const policyContext = policies.map(p =>
            `- ${p.policyId}: ${p.title} (${p.severity.toUpperCase()}) - ${p.description}`
        ).join('\n');

        // Build field-by-field content for clearer analysis
        const fieldBreakdown = Object.entries(fieldsToAnalyze)
            .filter(([_, value]) => value && value.trim())
            .map(([field, value]) => `[FIELD: ${field}]\n${value}`)
            .join('\n\n---\n\n');

        // =====================================================
        // IMPROVED PROMPT WITH FIELD-SPECIFIC HIGHLIGHTING
        // =====================================================
        const prompt = `You are an expert content moderator for ISEKAI ZERO, a roleplay/storytelling platform. 
Your job is to analyze content and identify SPECIFIC text segments that may violate policies.

## POLICIES TO CHECK:
${policyContext}

## CONTENT TO ANALYZE (Field by Field):
${fieldBreakdown}

## YOUR TASK:
1. Read each field carefully: firstMessage, promptPlot, plot, plotSummary, description, etc.
2. Find ANY text segments that may violate the policies above
3. For EACH problematic segment, quote it EXACTLY and explain which policy it violates
4. Be thorough - check for: minors in sexual content, extreme violence, hate speech, self-harm, illegal activities

## RESPONSE FORMAT (JSON):
{
    "verdict": "safe" | "flagged" | "rejected",
    "confidence": 0.0-1.0,
    "summary": "One-line summary for moderators (max 100 chars)",
    
    "highlightedIssues": [
        {
            "field": "The exact field name where issue was found (e.g., firstMessage, plot, promptPlot)",
            "quote": "EXACT text from that field that is problematic (max 150 chars)",
            "policy": "POL-XXX",
            "policyTitle": "Policy name",
            "severity": "critical" | "high" | "medium" | "low",
            "reason": "Why this violates the policy (be specific)"
        }
    ],
    
    "fieldAnalysis": {
        "firstMessage": { "status": "safe" | "flagged", "issueCount": 0 },
        "promptPlot": { "status": "safe" | "flagged", "issueCount": 0 },
        "plot": { "status": "safe" | "flagged", "issueCount": 0 },
        "plotSummary": { "status": "safe" | "flagged", "issueCount": 0 },
        "description": { "status": "safe" | "flagged", "issueCount": 0 },
        "characterDescriptions": { "status": "safe" | "flagged", "issueCount": 0 },
        "personaDescriptions": { "status": "safe" | "flagged", "issueCount": 0 }
    },
    
    "nsfw": true | false,
    "nsfwReason": "Reason if NSFW detected",
    
    "categories": [
        { "category": "violence|nsfw|hate_speech|self_harm|illegal|spam|misinformation", "flagged": true/false, "confidence": 0.0-1.0 }
    ],
    
    "flaggedPolicies": ["POL-XXX", "POL-YYY"],
    
    "recommendedAction": "approve" | "review" | "reject",
    "humanReviewPriority": "low" | "medium" | "high" | "critical",
    
    "reasoning": "Detailed explanation of your analysis (2-3 sentences)"
}

IMPORTANT RULES:
- If content is SAFE, return empty highlightedIssues array []
- If content is FLAGGED/REJECTED, you MUST include at least one highlightedIssue with exact quote
- For "quote" field: copy the EXACT problematic text, don't paraphrase
- For child safety violations (POL-005), severity is ALWAYS "critical"
- Be thorough - check ALL fields, not just the title

JSON FORMATTING RULES (CRITICAL):
- Use ONLY straight double quotes (") for JSON syntax
- NEVER use curly/smart quotes (" " ' ')
- If the quoted text contains double quotes, replace them with single quotes (')
  Example: If original is: She said "hello"
  Write as: "quote": "She said 'hello'"
- Keep all JSON on valid syntax - test mentally that it would parse

Respond with ONLY valid JSON, no other text.`;

        console.log('🤖 Sending to AI for analysis...');
        console.log(`   Content type: ${contentType}`);
        console.log(`   Fields to analyze: ${Object.keys(fieldsToAnalyze).join(', ')}`);

        const response = await openai.chat.completions.create({
            model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
            messages: [
                { 
                    role: 'system', 
                    content: 'You are a content moderation AI. Always respond with valid JSON only. Use straight quotes (") not curly quotes (" "). No markdown, no explanation, just pure JSON.' 
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 2000
        });

        const responseText = response.choices[0].message.content;

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response - no JSON found');
        }

        console.log("================================================");
        console.log("🤖 AI RAW RESPONSE:");
        console.log(jsonMatch[0]);
        console.log("================================================");

        // SIMPLE FIX: Convert smart/curly quotes directly to SINGLE quotes
        // This way "Mommy" becomes 'Mommy' which is safe inside JSON strings
        let sanitizedJson = jsonMatch[0]
            // Replace smart/curly DOUBLE quotes with SINGLE quotes (safe inside strings)
            .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, "'")
            // Replace smart/curly single quotes with straight single quotes
            .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
            // Replace en-dash and em-dash with regular hyphen
            .replace(/[\u2013\u2014]/g, '-')
            // Remove any BOM or zero-width characters
            .replace(/[\uFEFF\u200B\u200C\u200D]/g, '')
            // Remove control characters (newlines/tabs inside strings are OK, but not others)
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

        console.log("================================================");
        console.log("🔧 SANITIZED JSON (first 500 chars):");
        console.log(sanitizedJson.substring(0, 500));
        console.log("================================================");

        let result;
        try {
            result = JSON.parse(sanitizedJson);
            console.log("✓ JSON parsed successfully");
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError.message);
            
            // Log the problematic area
            const posMatch = parseError.message.match(/position (\d+)/);
            if (posMatch) {
                const pos = parseInt(posMatch[1]);
                console.error('Context around error (position ' + pos + '):');
                const start = Math.max(0, pos - 40);
                const end = Math.min(sanitizedJson.length, pos + 40);
                console.error('...' + sanitizedJson.substring(start, pos) + '【ERROR HERE】' + sanitizedJson.substring(pos, end) + '...');
            }
            
            // Last resort: try to extract key fields with regex
            console.error('Attempting minimal extraction...');
            
            const verdictMatch = sanitizedJson.match(/"verdict"\s*:\s*"(safe|flagged|rejected)"/i);
            const confidenceMatch = sanitizedJson.match(/"confidence"\s*:\s*([\d.]+)/);
            const summaryMatch = sanitizedJson.match(/"summary"\s*:\s*"([^"]{1,300})"/);
            const reasoningMatch = sanitizedJson.match(/"reasoning"\s*:\s*"([^"]{1,800})"/);
            const nsfwMatch = sanitizedJson.match(/"nsfw"\s*:\s*(true|false)/i);
            const actionMatch = sanitizedJson.match(/"recommendedAction"\s*:\s*"(approve|review|reject)"/i);
            const priorityMatch = sanitizedJson.match(/"humanReviewPriority"\s*:\s*"(low|medium|high|critical)"/i);
            
            // Try to extract flaggedPolicies
            const policiesMatch = sanitizedJson.match(/"flaggedPolicies"\s*:\s*\[([^\]]*)\]/);
            let flaggedPolicies = [];
            if (policiesMatch) {
                const policiesStr = policiesMatch[1];
                const policyIds = policiesStr.match(/POL-\d{3}/g);
                if (policyIds) flaggedPolicies = policyIds;
            }
            
            if (verdictMatch) {
                console.log('✓ Extracted minimal data from malformed JSON');
                result = {
                    verdict: verdictMatch[1],
                    confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
                    summary: summaryMatch ? summaryMatch[1] : 'AI response had formatting issues - review needed',
                    reasoning: reasoningMatch ? reasoningMatch[1] : 'Full AI analysis could not be parsed due to formatting issues. Please review manually.',
                    highlightedIssues: [],
                    fieldAnalysis: {},
                    categories: [],
                    flaggedPolicies: flaggedPolicies,
                    nsfw: nsfwMatch ? nsfwMatch[1] === 'true' : false,
                    recommendedAction: actionMatch ? actionMatch[1] : 'review',
                    humanReviewPriority: priorityMatch ? priorityMatch[1] : 'high'
                };
            } else {
                throw new Error(`Failed to parse AI response: ${parseError.message}`);
            }
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

        return {
            success: true,
            moderationResult: {
                aiVerdict: result.verdict,
                aiConfidence: result.confidence,
                aiReasoning: result.reasoning,
                aiSummary: result.summary,
                
                // NEW: Field-specific highlighted issues
                highlightedIssues: highlightedIssues,
                fieldAnalysis: result.fieldAnalysis || {},
                
                // Legacy fields for backwards compatibility
                categories: result.categories || [],
                flaggedPolicies: result.flaggedPolicies || [],
                offendingSnippet: highlightedIssues[0]?.quote || null,
                
                nsfw: result.nsfw || false,
                nsfwReason: result.nsfwReason || null,
                recommendedAction: result.recommendedAction,
                humanReviewPriority: result.humanReviewPriority,
                moderatedAt: new Date()
            },
            
            // Suggestions for creator
            suggestionsForCreator: [
                // Convert highlighted issues to suggestions
                ...highlightedIssues.map(issue => ({
                    type: issue.severity === 'critical' ? 'error' : 'warning',
                    field: issue.field,
                    issue: `Potential ${issue.policyTitle || issue.policy} violation`,
                    quote: issue.quote,
                    suggestion: issue.reason,
                    source: 'ai_moderation'
                })),
                // Add field validation issues
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
                hasChildSafetyConcern: result.flaggedPolicies?.includes('POL-005') || false,
                needsManualReview: result.verdict !== 'safe',
                hasFieldErrors: !validation.isValid,
                hasFieldWarnings: validation.hasWarnings,
                highlightedIssueCount: highlightedIssues.length
            }
        };

    } catch (error) {
        console.error('Auto-moderation error:', error);

        return {
            success: false,
            error: error.message,
            moderationResult: {
                aiVerdict: 'flagged',
                aiConfidence: 0,
                aiReasoning: `Auto-moderation failed: ${error.message}. Requires manual review.`,
                aiSummary: 'AI analysis failed - needs human review',
                highlightedIssues: [],
                fieldAnalysis: {},
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

// ============================================
// FIELD EXTRACTION HELPERS
// ============================================

/**
 * Extract individual fields from storyline for analysis
 */
const extractStorylineFields = (story) => {
    return {
        title: story.title || '',
        description: story.description || '',
        plotSummary: story.plotSummary || '',
        plot: story.plot || '',
        promptPlot: story.promptPlot || '',
        firstMessage: story.firstMessage || '',
        promptGuideline: story.promptGuideline || '',
        reminder: story.reminder || '',
        characterDescriptions: story.rawCharacterList || '',
        personaDescriptions: story.rawPersonaList || '',
        tags: (story.tags || []).join(', ')
    };
};

/**
 * Extract individual fields from character for analysis
 */
const extractCharacterFields = (char) => {
    return {
        name: char.name || '',
        description: char.description || '',
        descriptionSummary: char.descriptionSummary || '',
        promptDescription: char.promptDescription || '',
        exampleDialogue: char.exampleDialogue || '',
        tags: (char.tags || []).join(', ')
    };
};

/**
 * Extract individual fields from persona for analysis
 */
const extractPersonaFields = (persona) => {
    return {
        name: persona.name || '',
        description: persona.description || '',
        descriptionSummary: persona.descriptionSummary || '',
        tags: (persona.tags || []).join(', ')
    };
};

// ============================================
// CONTENT BUILDERS (For full text analysis)
// ============================================

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
    let content = `
=== STORYLINE METADATA ===
TITLE: ${story.title || 'N/A'}
USER: ${story.user || 'N/A'}
VISIBILITY: ${story.visibility || 'N/A'}
MARKED AS NSFW: ${story.nsfw ? 'Yes' : 'No'}
MONETIZED: ${story.monetized ? 'Yes' : 'No'}

=== MAIN CONTENT FIELDS ===

[FIELD: description]
${story.description || 'No description'}

[FIELD: plotSummary]
${story.plotSummary || 'No plot summary'}

[FIELD: plot]
${story.plot || 'No plot'}

[FIELD: promptPlot]
${story.promptPlot || 'No prompt plot'}

[FIELD: firstMessage]
${story.firstMessage || 'No first message'}

[FIELD: promptGuideline]
${story.promptGuideline || 'None'}

[FIELD: reminder]
${story.reminder || 'None'}

TAGS: ${story.tags?.join(', ') || 'None'}
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

TAGS: ${persona.tags?.join(', ') || 'None'}
`.trim();
};

/**
 * Build full JSON content string (for JSON imports)
 */
const buildFullJsonContent = (data) => {
    return buildStorylineContent({
        title: data.title,
        user: data.creatorUsername || data._userId,
        visibility: data.visibility,
        nsfw: data.nsfw,
        monetized: data.monetized,
        description: data.description,
        plotSummary: data.plotSummary,
        plot: data.plot,
        promptPlot: data.promptPlot,
        firstMessage: data.firstMessage,
        promptGuideline: data.promptGuideline,
        reminder: data.reminder,
        tags: data.tagSnapshots?.filter(t => !t.deleted).map(t => t.name) || [],
        characterSnapshots: data.characterSnapshots,
        personaSnapshots: data.personaSnapshots
    });
};

/**
 * Extract all image URLs from the JSON for multimodal analysis
 */
const extractImageUrls = (json) => {
    const data = json.data || json;
    const images = [];

    if (data.cover?.url) {
        images.push({ type: 'storyline_cover', url: data.cover.url });
    }

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
 * Auto-moderate full JSON import
 */
const autoModerateFullJson = async (jsonContent, options = { includeImages: true }) => {
    try {
        const data = jsonContent.data || jsonContent;

        console.log("🔍 Moderating full JSON import...");
        console.log(`   - Title: ${data.title || 'Untitled'}`);
        console.log(`   - Characters: ${data.characterSnapshots?.length || 0}`);
        console.log(`   - Personas: ${data.personaSnapshots?.length || 0}`);

        // Convert to storyline format
        const storylineData = {
            title: data.title || 'Imported Storyline',
            user: data.creatorUsername || data._userId || 'json_import',
            visibility: data.visibility || 'hidden',
            nsfw: data.nsfw || false,
            monetized: data.monetized || false,
            description: data.description || '',
            plot: data.plot || '',
            plotSummary: data.plotSummary || '',
            promptPlot: data.promptPlot || '',
            firstMessage: data.firstMessage || '',
            promptGuideline: data.promptGuideline || '',
            reminder: data.reminder || '',
            characterSnapshots: data.characterSnapshots,
            personaSnapshots: data.personaSnapshots,
            tags: data.tagSnapshots?.filter(t => !t.deleted).map(t => t.name) || []
        };

        // Use the main moderation function
        const moderationResult = await autoModerateContent('storyline', storylineData);

        // Add image metadata
        if (options.includeImages) {
            const images = extractImageUrls(jsonContent);
            if (images.length > 0) {
                console.log(`   - Images found: ${images.length}`);
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
                highlightedIssues: [],
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
    validateFields,
    buildCharacterContent,
    buildStorylineContent,
    buildPersonaContent,
    buildFullJsonContent,
    extractImageUrls,
    extractStorylineFields,
    extractCharacterFields,
    extractPersonaFields
};