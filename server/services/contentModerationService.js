// ============================================
// CONTENT MODERATION SERVICE (WITH IMAGE MODERATION)
// ============================================
// 
// This service handles AI-powered content moderation for ISEKAI ZERO
// 
// FEATURES:
// - Context-based text analysis
// - IMAGE MODERATION (using Claude 4.5 Sonnet vision)
// - 5-step analysis process
// - Combination-based violation detection
// - NSFW tag awareness
// 
// METHODS USED:
// - Method 1: Prompt Engineering (context and instructions)
// - Method 3: Tool Use (structured output via function calling)
// - Multimodal: Text + Images sent together
// ============================================

const OpenAI = require('openai');
const Policy = require('../models/Policy');

// ============================================
// OPENROUTER CLIENT SETUP
// ============================================

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

    const description = content.description || '';
    if (description && description.length < 50) {
        warnings.push({
            field: 'description',
            severity: 'warning',
            message: `Description is too short (${description.length} chars, minimum recommended: 50)`,
            suggestion: 'Add more detail to help users understand your content'
        });
    }

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
// TOOL DEFINITION (With Image Analysis Fields)
// ============================================

const moderationTool = {
    type: "function",
    function: {
        name: "submit_moderation_result",
        description: "Submit the final content moderation analysis for both TEXT and IMAGES.",
        parameters: {
            type: "object",
            properties: {
                verdict: {
                    type: "string",
                    enum: ["safe", "flagged", "rejected"],
                    description: "Overall verdict for ALL content (text + images)"
                },
                confidence: {
                    type: "number",
                    description: "Confidence in verdict (0.0-1.0)"
                },
                summary: {
                    type: "string",
                    description: "Brief one-line summary in natural language (max 100 chars). No formatting or labels."
                },
                highlightedIssues: {
                    type: "array",
                    description: "Text-based issues found. Empty array if safe.",
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
                // ============================================
                // IMAGE ANALYSIS FIELDS
                // ============================================
                imageAnalysis: {
                    type: "object",
                    description: "Analysis of all images in the content",
                    properties: {
                        totalImages: {
                            type: "number",
                            description: "Total number of images analyzed"
                        },
                        flaggedImages: {
                            type: "number",
                            description: "Number of images with issues"
                        },
                        overallImageVerdict: {
                            type: "string",
                            enum: ["safe", "flagged", "rejected"],
                            description: "Overall verdict for images"
                        },
                        issues: {
                            type: "array",
                            description: "Specific image issues found",
                            items: {
                                type: "object",
                                properties: {
                                    imageType: {
                                        type: "string",
                                        description: "Type of image (storyline_cover, character_avatar, persona_avatar)"
                                    },
                                    imageName: {
                                        type: "string",
                                        description: "Name/identifier of the image"
                                    },
                                    issue: {
                                        type: "string",
                                        description: "What's wrong with this image"
                                    },
                                    severity: {
                                        type: "string",
                                        enum: ["low", "medium", "high", "critical"]
                                    },
                                    category: {
                                        type: "string",
                                        enum: ["nudity", "minor_appearance", "violence", "hate_symbol", "other"],
                                        description: "Category of the issue. Use 'minor_appearance' if character LOOKS underage regardless of stated age."
                                    },
                                    visualAgeAssessment: {
                                        type: "string",
                                        description: "Your assessment of how old the character APPEARS visually (e.g., 'appears adult', 'appears 14-16', 'childlike proportions')"
                                    },
                                    statedAge: {
                                        type: "string",
                                        description: "The age stated in the text for this character, if any"
                                    }
                                },
                                required: ["imageType", "issue", "severity", "category"]
                            }
                        }
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
                nsfw: {
                    type: "boolean",
                    description: "Does content (text OR images) contain NSFW material?"
                },
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
                reasoning: {
                    type: "string",
                    description: "2-4 sentences in natural prose explaining your findings. Do NOT use step labels, bullet points, or bold formatting. Write conversationally."
                }
            },
            required: ["verdict", "confidence", "summary", "highlightedIssues", "imageAnalysis", "nsfw", "recommendedAction", "reasoning"]
        }
    }
};

// ============================================
// IMAGE URL EXTRACTION
// ============================================

const extractImageUrls = (content) => {
    const images = [];
    const data = content.data || content;

    // Storyline/content cover
    if (data.cover?.url) {
        images.push({ type: 'cover', name: 'Cover Image', url: data.cover.url });
    } else if (content.cover?.url) {
        images.push({ type: 'cover', name: 'Cover Image', url: content.cover.url });
    } else if (typeof content.cover === 'string' && content.cover.startsWith('http')) {
        images.push({ type: 'cover', name: 'Cover Image', url: content.cover });
    }

    // Single Character Export Media (jsoncharaexample style)
    if (data.media && Array.isArray(data.media)) {
        data.media.forEach((m, idx) => {
            if (m.url && m.type === 'image') {
                images.push({
                    type: 'character_art',
                    name: `Art ${idx + 1}`,
                    url: m.url
                });
            }
        });
    }

    // Character avatars (Storyline structure)
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

    // Persona avatars
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

// ============================================
// IMAGE PROCESSING UTILS
// ============================================

const downloadImageAsBase64 = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.error(`Error downloading image ${url}:`, error.message);
        return null; // Skip image on error
    }
};

// ============================================
// BUILD MULTIMODAL MESSAGE CONTENT
// ============================================

const buildMultimodalContent = async (textPrompt, images, maxImages = 10) => {
    const content = [];

    // Add text first
    content.push({ type: 'text', text: textPrompt });

    // Add images (limit to prevent token overflow)
    const imagesToAnalyze = images.slice(0, maxImages);

    for (const image of imagesToAnalyze) {
        if (!image.url) continue;

        // Convert URL to base64 if it's a remote http/https URL
        // (If it's already a data URI, use as is)
        let imageUrl = image.url;
        if (imageUrl.startsWith('http')) {
            const base64Data = await downloadImageAsBase64(imageUrl);
            if (base64Data) {
                imageUrl = base64Data;
            } else {
                console.warn(`Skipping image ${image.name}: Download failed`);
                continue;
            }
        }

        content.push({
            type: 'image_url',
            image_url: {
                url: imageUrl,
                detail: 'low'  // resolution: 'low' for faster/cheaper, 'high' for detailed
            }
        });
    }

    return content;
};

// ============================================
// MAIN MODERATION FUNCTION (WITH IMAGES)
// ============================================

const autoModerateContent = async (contentType, content, options = {}) => {
    try {
        const { includeImages = true, maxImages = 5 } = options;

        // STEP 1: Field validation
        const validation = validateFields(contentType, content);
        if (validation.issues.length > 0 || validation.warnings.length > 0) {
            console.log(' Field validation results:', validation.all.length, 'issues/warnings');
        }

        // STEP 2: Get policies
        const policies = await Policy.find({ isActive: true });

        // STEP 3: Build content strings
        let fieldsToAnalyze = {};

        switch (contentType) {
            case 'character':
                fieldsToAnalyze = extractCharacterFields(content);
                break;
            case 'storyline':
                fieldsToAnalyze = extractStorylineFields(content);
                break;
            case 'persona':
                fieldsToAnalyze = extractPersonaFields(content);
                break;
            default:
                fieldsToAnalyze = { raw: JSON.stringify(content) };
        }

        const policyContext = policies.map(p =>
            `- ${p.policyId}: ${p.title} (${p.severity.toUpperCase()}) - ${p.description}`
        ).join('\n');

        const fieldBreakdown = Object.entries(fieldsToAnalyze)
            .filter(([_, value]) => value && value.trim())
            .map(([field, value]) => `[FIELD: ${field}]\n${value}`)
            .join('\n\n---\n\n');

        const isMarkedNSFW = content.nsfw === true;

        // STEP 4: Extract images
        const images = includeImages ? extractImageUrls(content) : [];
        const hasImages = images.length > 0;

        console.log(' Sending to AI for analysis...');
        console.log(`   Content type: ${contentType}`);
        console.log(`   NSFW tagged: ${isMarkedNSFW}`);
        console.log(`   Fields to analyze: ${Object.keys(fieldsToAnalyze).join(', ')}`);
        console.log(`   Images to analyze: ${images.length}`);

        // STEP 5: Build prompt
        const prompt = `You are an expert content moderator for ISEKAI ZERO, a fictional roleplay and storytelling platform.

Analyze the text content and any attached images for policy violations. Write your reasoning in natural prose - do NOT use step labels, numbered lists, or bold formatting in your reasoning field.

## CONTENT METADATA
- Content Type: ${contentType}
- Marked as NSFW: ${isMarkedNSFW ? 'YES' : 'NO'}
- Images Attached: ${hasImages ? `YES (${images.length} images)` : 'NO'}
${hasImages ? `- Image Types: ${images.map(i => `${i.type}: ${i.name}`).join(', ')}` : ''}

${hasImages ? `
## IMAGE ANALYSIS - CRITICAL

You have ${images.length} image(s) to analyze. This is extremely important:

### MINOR APPEARANCE CHECK (CRITICAL!)
You must evaluate whether each character in the images VISUALLY APPEARS to be a minor, regardless of what the text claims their age is.

RED FLAGS for minor appearance:
- Childlike body proportions (small frame, flat chest, short stature relative to head size)
- Childlike facial features (large eyes relative to face, round cheeks, small nose/mouth)
- School uniforms or childlike clothing
- Overall appearance suggesting someone under 18

IMPORTANT: A stated age of "18", "20", "100", or "1000 year old vampire" does NOT matter if the character LOOKS like a child. The "actually she's 1000 years old" excuse is not valid. Judge by VISUAL APPEARANCE.

If a character LOOKS like a minor AND is depicted in sexual/suggestive content:
- Revealing clothing, suggestive poses, sexual context = REJECT
- This applies even if text says they're an adult

### Other Image Checks:
- Nudity in non-NSFW tagged content = FLAG
- Extreme violence/gore = FLAG  
- Hate symbols = FLAG
- Adult-appearing characters in NSFW content = ALLOWED
` : ''}

## TEXT ANALYSIS

Read ALL text fields carefully, including character descriptions. Look for:
- Stated ages in character descriptions (e.g., "Age: 20", "18 years old", etc.)
- Extract and note the age of EACH character mentioned
- Sexual content involving minors = REJECT
- Medical misinformation with specific claims = FLAG
- Hate speech targeting real groups = FLAG

IMPORTANT: Character ages are often listed in their descriptions like "Age: 20" or "Species: X, Age: Y". Read these carefully and compare to the visual appearance in images.

Note: Comfort themes (Mommy/Daddy dynamics), fantasy violence, and properly-tagged NSFW adult content are allowed.

## POLICIES:
${policyContext}

## CONTENT TO ANALYZE:

${fieldBreakdown}

${hasImages ? `
## IMAGES TO ANALYZE:

${images.map((img, idx) => `IMAGE ${idx + 1}: ${img.type} - "${img.name}"`).join('\n')}

Look at each image carefully. Does any character APPEAR to be under 18? Consider their body proportions, facial features, and overall appearance - not just stated ages.
` : ''}

## OUTPUT INSTRUCTIONS

In your reasoning field, write 2-4 sentences in natural prose explaining what you found. Do NOT use:
- Step labels (STEP 1, STEP 2, etc.)
- Bold text or markdown formatting
- Bullet points or numbered lists
- Labels like "REASONABLE PERSON TEST"

Just write naturally, like: "This is an adult fantasy game with explicit content properly tagged as NSFW. All characters have stated ages of 18+ and appear visually adult in the images. No policy violations detected."

Or if there's an issue: "While the text states the character is 20 years old, the image depicts a character with childlike proportions in revealing clothing. This combination requires review regardless of stated age."
`;

        // STEP 6: Build message content (text or multimodal)
        let messageContent;

        if (hasImages) {
            // MULTIMODAL: text + images together
            messageContent = await buildMultimodalContent(prompt, images, maxImages);
            // Count valid images added
            const validImages = messageContent.filter(c => c.type === 'image_url').length;
            console.log(`   📷 Sending ${validImages} images for analysis (converted to base64)`);
        } else {
            // TEXT ONLY: just the prompt string
            messageContent = prompt;
        }

        // STEP 7: Call AI
        const response = await openai.chat.completions.create({
            model: process.env.AI_MODEL || 'anthropic/claude-4.5-sonnet',
            messages: [
                {
                    role: 'system',
                    content: `You are a content moderator who analyzes text and images together.

            CRITICAL FOR IMAGES: Judge whether characters LOOK like minors based on their VISUAL APPEARANCE, not stated ages.A character drawn with childlike proportions in sexual content is a violation regardless of claimed age.

Write your reasoning in natural conversational prose.Do not use step labels, bullet points, bold text, or structured formatting.

Always include the imageAnalysis field in your response, even if no images(set totalImages: 0).`
                },
                { role: 'user', content: messageContent }
            ],
            tools: [moderationTool],
            tool_choice: { type: "function", function: { name: "submit_moderation_result" } },
            temperature: 0.15,
            max_tokens: 4000
        });

        // STEP 8: Parse response
        const toolCall = response.choices[0].message.tool_calls?.[0];
        let result;

        if (toolCall && toolCall.function && toolCall.function.name === 'submit_moderation_result') {
            try {
                result = JSON.parse(toolCall.function.arguments);
                console.log("✓ Structured output received and parsed");
                console.log(`   Verdict: ${result.verdict}, Confidence: ${result.confidence} `);
                if (result.imageAnalysis) {
                    console.log(`   Images analyzed: ${result.imageAnalysis.totalImages || 0} `);
                    console.log(`   Images flagged: ${result.imageAnalysis.flaggedImages || 0} `);
                }
            } catch (parseError) {
                console.error("Tool arguments parsing failed:", parseError);
                throw new Error("AI produced invalid JSON in tool arguments");
            }
        } else {
            console.error("AI failed to call tool.");
            throw new Error("AI did not use the structured output tool");
        }

        // STEP 9: Process and return results
        const highlightedIssues = (result.highlightedIssues || []).map(issue => ({
            field: issue.field || 'unknown',
            quote: issue.quote || '',
            policy: issue.policy || 'N/A',
            policyTitle: issue.policyTitle || '',
            severity: issue.severity || 'medium',
            reason: issue.reason || ''
        }));

        const imageAnalysis = result.imageAnalysis || {
            totalImages: images.length,
            flaggedImages: 0,
            overallImageVerdict: 'safe',
            issues: []
        };

        return {
            success: true,
            moderationResult: {
                aiVerdict: result.verdict,
                aiConfidence: result.confidence,
                aiReasoning: result.reasoning,
                aiSummary: result.summary,
                highlightedIssues: highlightedIssues,
                fieldAnalysis: result.fieldAnalysis || {},

                // Image analysis results
                imageAnalysis: imageAnalysis,
                imagesAnalyzed: imageAnalysis.totalImages || 0,
                imagesFlagged: imageAnalysis.flaggedImages || 0,

                categories: result.categories || [],
                flaggedPolicies: result.flaggedPolicies || [],
                offendingSnippet: highlightedIssues[0]?.quote || null,
                nsfw: result.nsfw || false,
                nsfwReason: result.nsfwReason || null,
                recommendedAction: result.recommendedAction,
                humanReviewPriority: result.humanReviewPriority,
                moderatedAt: new Date()
            },
            suggestionsForCreator: [
                ...highlightedIssues.map(issue => ({
                    type: issue.severity === 'critical' ? 'error' : 'warning',
                    field: issue.field,
                    issue: `Potential ${issue.policyTitle || issue.policy} concern`,
                    quote: issue.quote,
                    suggestion: issue.reason,
                    source: 'ai_moderation'
                })),
                ...(imageAnalysis.issues || []).map(issue => ({
                    type: issue.severity === 'critical' ? 'error' : 'warning',
                    field: issue.imageType,
                    issue: `Image issue: ${issue.issue} `,
                    quote: issue.imageName || issue.imageType,
                    suggestion: `Review ${issue.imageType} for ${issue.category}`,
                    source: 'image_moderation'
                })),
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
                hasImageIssues: (imageAnalysis.flaggedImages || 0) > 0,
                needsManualReview: true,
                hasFieldErrors: !validation.isValid,
                hasFieldWarnings: validation.hasWarnings,
                highlightedIssueCount: highlightedIssues.length,
                imageIssueCount: (imageAnalysis.issues || []).length
            },
            meta: {
                imagesProvided: images.length,
                imagesAnalyzed: Math.min(images.length, maxImages),
                imageUrls: images.slice(0, maxImages).map(i => ({ type: i.type, name: i.name }))
            }
        };

    } catch (error) {
        console.error('Auto-moderation error:', error);
        if (error.response) {
            console.error('API Error Response:', JSON.stringify(error.response.data || error.response, null, 2));
        }
        console.error('Error Message:', error.message);

        return {
            success: false,
            error: error.message,
            moderationResult: {
                aiVerdict: 'flagged',
                aiConfidence: 0,
                aiReasoning: `Auto - moderation failed: ${error.message}. Requires manual review.`,
                aiSummary: 'AI analysis failed - needs human review',
                highlightedIssues: [],
                imageAnalysis: { totalImages: 0, flaggedImages: 0, issues: [] },
                fieldAnalysis: {},
                categories: [],
                flaggedPolicies: [],
                recommendedAction: 'review',
                humanReviewPriority: 'high',
                moderatedAt: new Date()
            },
            flags: { needsManualReview: true }
        };
    }
};

// ============================================
// FIELD EXTRACTION HELPERS
// ============================================

const extractStorylineFields = (story) => ({
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
});

const extractCharacterFields = (char) => ({
    name: char.name || '',
    description: char.description || '',
    descriptionSummary: char.descriptionSummary || '',
    promptDescription: char.promptDescription || '',
    exampleDialogue: char.exampleDialogue || '',
    tags: (char.tags || []).join(', ')
});

const extractPersonaFields = (persona) => ({
    name: persona.name || '',
    description: persona.description || '',
    descriptionSummary: persona.descriptionSummary || '',
    tags: (persona.tags || []).join(', ')
});

// ============================================
// CONTENT BUILDERS
// ============================================

const buildCharacterContent = (char) => `
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

    // Characters
    let characterContent = '';
    if (story.rawCharacterList?.trim()) {
        characterContent = story.rawCharacterList;
    } else if (story.characterSnapshots?.length > 0) {
        characterContent = story.characterSnapshots.filter(c => !c.deleted).map((char, idx) => {
            let charInfo = `-- - CHARACTER ${idx + 1}: ${char.name || 'Unnamed'} ---\n`;
            charInfo += `NSFW: ${char.nsfw ? 'Yes' : 'No'} \n`;
            if (char.descriptionSummary) charInfo += `SUMMARY: ${char.descriptionSummary} \n`;
            if (char.description) {
                const desc = char.description.length > 2000 ? char.description.substring(0, 2000) + '...' : char.description;
                charInfo += `DESCRIPTION: \n${desc} \n`;
            }
            return charInfo;
        }).join('\n');
    }
    if (characterContent) content += `\n === CHARACTERS ===\n${characterContent} \n`;

    // Personas
    let personaContent = '';
    if (story.rawPersonaList?.trim()) {
        personaContent = story.rawPersonaList;
    } else if (story.personaSnapshots?.length > 0) {
        personaContent = story.personaSnapshots.filter(p => !p.deleted).map((persona, idx) => {
            let personaInfo = `-- - PERSONA ${idx + 1}: ${persona.name || 'Unnamed'} ---\n`;
            personaInfo += `NSFW: ${persona.nsfw ? 'Yes' : 'No'} \n`;
            if (persona.descriptionSummary) personaInfo += `SUMMARY: ${persona.descriptionSummary} \n`;
            if (persona.description) {
                const desc = persona.description.length > 2000 ? persona.description.substring(0, 2000) + '...' : persona.description;
                personaInfo += `DESCRIPTION: \n${desc} \n`;
            }
            return personaInfo;
        }).join('\n');
    }
    if (personaContent) content += `\n === PERSONAS ===\n${personaContent} \n`;

    return content.trim();
};

const buildPersonaContent = (persona) => `
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

const buildFullJsonContent = (data) => buildStorylineContent({
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

// ============================================
// FULL JSON IMPORT MODERATION
// ============================================

const autoModerateFullJson = async (jsonContent, options = { includeImages: true }) => {
    try {
        const data = jsonContent.data || jsonContent;

        console.log("🔍 Moderating full JSON import...");

        // DETECT CONTENT TYPE
        // Scenario A: Single Character Import (has name, no title, no snapshots)
        const isSingleCharacter = data.name && !data.title && (!data.characterSnapshots || data.characterSnapshots.length === 0);

        if (isSingleCharacter) {
            console.log("   -> Detected SINGLE CHARACTER import");
            console.log(`   - Name: ${data.name || 'Unknown'} `);

            const characterData = {
                name: data.name,
                description: data.description || '',
                descriptionSummary: data.descriptionSummary || '',
                promptDescription: data.promptDescription || '',
                exampleDialogue: data.exampleDialogue || '',
                firstMessage: data.firstMessage || '',
                tags: (data.tags || []).concat(data._tagIds || []), // Handle different tag formats
                cover: data.cover,
                media: data.media || [], // Images from character card
                nsfw: data.nsfw || false
            };

            return await autoModerateContent('character', characterData, {
                includeImages: options.includeImages,
                maxImages: options.maxImages || 5
            });
        }

        // Scenario B: Storyline/World Import
        console.log("   -> Detected STORYLINE/WORLD import");
        console.log(`   - Title: ${data.title || 'Untitled'} `);
        console.log(`   - Characters: ${data.characterSnapshots?.length || 0} `);
        console.log(`   - Personas: ${data.personaSnapshots?.length || 0} `);

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
            cover: data.cover,
            characterSnapshots: data.characterSnapshots,
            personaSnapshots: data.personaSnapshots,
            tags: data.tagSnapshots?.filter(t => !t.deleted).map(t => t.name) || []
        };

        return await autoModerateContent('storyline', storylineData, {
            includeImages: options.includeImages,
            maxImages: options.maxImages || 5
        });

    } catch (error) {
        console.error('Full JSON moderation error:', error);
        return {
            success: false,
            error: error.message,
            moderationResult: {
                aiVerdict: 'flagged',
                aiConfidence: 0,
                aiReasoning: `Auto - moderation failed: ${error.message} `,
                aiSummary: 'AI analysis failed - needs human review',
                highlightedIssues: [],
                imageAnalysis: { totalImages: 0, flaggedImages: 0, issues: [] },
                categories: [],
                recommendedAction: 'review',
                humanReviewPriority: 'high',
                moderatedAt: new Date()
            },
            flags: { needsManualReview: true }
        };
    }
};

// ============================================
// EXPORTS
// ============================================

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