// ============================================
// CONTENT MODERATION SERVICE (WITH IMAGE MODERATION) MULTIMODAL
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
// - Creator feedback & suggestions
// 
// METHODS USED:
// - Prompt Engineering (context and instructions)
// - Structured Output (JSON schema response format)
// - Multimodal: Text + Images sent together
// ============================================

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

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
// STRUCTURED OUTPUT SCHEMA (Replaces Tool Definition)
// ============================================
// NOTE: All object types MUST have "additionalProperties: false" for Claude

const moderationSchema = {
    type: "object",
    additionalProperties: false,
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
        reasoning: {
            type: "string",
            description: "2-4 sentences in natural prose explaining your findings. Do NOT use step labels, bullet points, or bold formatting. Write conversationally."
        },
        highlightedIssues: {
            type: "array",
            description: "Text-based issues found. Empty array if safe.",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    field: { type: "string" },
                    quote: { type: "string" },
                    policy: { type: "string" },
                    policyTitle: { type: "string" },
                    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                    reason: { type: "string" }
                },
                required: ["field", "quote", "policy", "policyTitle", "severity", "reason"]
            }
        },
        imageAnalysis: {
            type: "object",
            additionalProperties: false,
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
                copyrightedImages: {
                    type: "number",
                    description: "Number of images that appear to be copyrighted (not AI-generated)"
                },
                overallImageVerdict: {
                    type: "string",
                    enum: ["safe", "flagged", "rejected"],
                    description: "Overall verdict for images"
                },
                issues: {
                    type: "array",
                    description: "Specific image issues found (safety/content issues)",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            imageType: {
                                type: "string",
                                description: "Type of image (cover, character_avatar, persona_avatar)"
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
                                enum: ["nudity", "minor_appearance", "violence", "hate_symbol", "copyright", "other"],
                                description: "Category of the issue. Use 'minor_appearance' if character LOOKS underage regardless of stated age. Use 'copyright' for copyrighted images."
                            },
                            visualAgeAssessment: {
                                type: "string",
                                description: "Your assessment of how old the character APPEARS visually"
                            },
                            statedAge: {
                                type: "string",
                                description: "The age stated in the text for this character, if any"
                            }
                        },
                        required: ["imageType", "imageName", "issue", "severity", "category", "visualAgeAssessment", "statedAge"]
                    }
                },
                copyrightAnalysis: {
                    type: "array",
                    description: "Copyright analysis for each image - identify if images are from copyrighted sources",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            imageType: {
                                type: "string",
                                description: "Type of image (cover, character_avatar, persona_avatar)"
                            },
                            imageName: {
                                type: "string",
                                description: "Name/identifier of the image"
                            },
                            isAiGenerated: {
                                type: "boolean",
                                description: "True if the image appears to be AI-generated (which is ALLOWED)"
                            },
                            isCopyrighted: {
                                type: "boolean",
                                description: "True if the image appears to be from a copyrighted source (anime, game, movie, etc.)"
                            },
                            copyrightSource: {
                                type: "string",
                                description: "If copyrighted, identify the source (e.g., 'Genshin Impact', 'Naruto', 'Final Fantasy', 'Official game artwork'). Empty string if AI-generated or unknown."
                            },
                            copyrightConfidence: {
                                type: "string",
                                enum: ["certain", "likely", "possible", "unlikely", "ai_generated"],
                                description: "How confident are you that this is copyrighted? Use 'ai_generated' if it's clearly AI-made."
                            },
                            reasoning: {
                                type: "string",
                                description: "Brief explanation of why you think it's AI-generated or copyrighted"
                            }
                        },
                        required: ["imageType", "imageName", "isAiGenerated", "isCopyrighted", "copyrightSource", "copyrightConfidence", "reasoning"]
                    }
                }
            },
            required: ["totalImages", "flaggedImages", "copyrightedImages", "overallImageVerdict", "issues", "copyrightAnalysis"]
        },
        suggestions: {
            type: "object",
            additionalProperties: false,
            description: "Detailed constructive feedback for the creator",
            properties: {
                type: {
                    type: "string",
                    enum: ["great", "minor_improvements", "needs_work", "rejected"],
                    description: "great = excellent, minor_improvements = small tweaks, needs_work = significant issues, rejected = must fix to approve"
                },
                overallFeedback: {
                    type: "string",
                    description: "Detailed 3-5 sentence explanation. Be specific about what's good, what's wrong, and the overall assessment."
                },
                specificIssues: {
                    type: "array",
                    description: "List of specific issues, each clearly explained",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            field: { type: "string", description: "Which field has the issue" },
                            problem: { type: "string", description: "What the problem is" },
                            howToFix: { type: "string", description: "Specific actionable fix" }
                        },
                        required: ["field", "problem", "howToFix"]
                    }
                },
                strengths: {
                    type: "array",
                    description: "What the creator did well (include even for rejected content if applicable)",
                    items: { type: "string" }
                },
                includeExampleLinks: {
                    type: "boolean",
                    description: "True if creator would benefit from seeing approved examples (for quality issues, NOT policy violations)"
                }
            },
            required: ["type", "overallFeedback", "specificIssues", "strengths", "includeExampleLinks"]
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
                additionalProperties: false,
                properties: {
                    category: { type: "string" },
                    flagged: { type: "boolean" },
                    confidence: { type: "number" }
                },
                required: ["category", "flagged", "confidence"]
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
        violationSeverity: {
            type: "string",
            enum: ["none", "low", "medium", "high", "critical"]
        }
    },
    required: [
        "verdict", 
        "confidence", 
        "summary", 
        "reasoning",
        "highlightedIssues", 
        "imageAnalysis", 
        "suggestions",
        "nsfw", 
        "nsfwReason",
        "categories",
        "flaggedPolicies",
        "recommendedAction",
        "violationSeverity"
    ]
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
        return null;
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
                detail: 'low'
            }
        });
    }

    return content;
};

// ============================================
// MAIN MODERATION FUNCTION (WITH STRUCTURED OUTPUT)
// ============================================

const autoModerateContent = async (contentType, content, options = {}) => {
    try {
        const { includeImages = true, maxImages = 5 } = options;

        // STEP 1: Field validation
        const validation = validateFields(contentType, content);
        if (validation.issues.length > 0 || validation.warnings.length > 0) {
            console.log(' Field validation results:', validation.all.length, 'issues/warnings');
        }

        // STEP 2: Get policies from file
        const policyPath = path.join(__dirname, '../../content-creation-policy.txt');
        let policyContext = "";
        try {
            policyContext = fs.readFileSync(policyPath, 'utf8');
            console.log(`   Loaded policy file from ${policyPath} (${policyContext.length} chars)`);
        } catch (err) {
            console.error("Failed to read policy file:", err);
            policyContext = "Error loading policy file. Please proceed with standard safety guidelines.";
        }

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

Analyze the text content and any attached images against the provided CONTENT CREATION POLICY. Write your reasoning in natural prose.

You MUST respond with valid JSON matching the required schema.

## CRITICAL: FANTASY CONTENT CONTEXT

This is a FANTASY ROLEPLAY platform. You must understand the difference between:

### ALLOWED Fantasy Content:
- Characters who hate/hunt FANTASY RACES (goblins, orcs, elves, demons, vampires, monsters, beasts, undead, etc.) = ALLOWED
- "Monster hunter" or "demon slayer" characters = ALLOWED
- Villain characters with evil ideologies against fantasy races = ALLOWED
- Fantasy genocide/war against non-human creatures (orcs, goblins, etc.) = ALLOWED
- Characters described as racist against elves/dwarves/orcs = ALLOWED (it's worldbuilding, not real hate speech)
- Violence against fantasy creatures, even detailed = ALLOWED
- Morally grey or evil protagonists = ALLOWED
- Dark fantasy themes (massacre, war, genocide of fantasy races) = ALLOWED

### NOT ALLOWED (Real-World Harm):
- Hate speech against REAL human groups (race, ethnicity, religion, gender, sexuality) = FLAG
- Content that uses fantasy as a thin allegory for real-world hate (e.g., "orcs" that are clearly meant to represent a real ethnic group) = FLAG
- Sexual content involving minors = REJECT
- Non-consensual sexual content = REJECT

### Key Distinction:
"She hates elves and has killed 847 of them" = ALLOWED (fantasy racism, common trope)
"She hates [real ethnic group]" = NOT ALLOWED (real-world hate speech)

A character being a villain who commits atrocities against fantasy races is STORYTELLING, not policy violation. Judge based on whether it targets REAL groups or promotes REAL harm.

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

### COPYRIGHT DETECTION (Important!)
For EACH image, analyze whether it appears to be:

1. **AI-GENERATED** (ALLOWED ✓):
   - Look for telltale AI art signs: slightly inconsistent details, smooth/plastic skin texture
   - Common AI art styles (NovelAI, Stable Diffusion, Midjourney aesthetics)
   - Original characters not from any known franchise
   - If AI-generated, mark isAiGenerated: true, isCopyrighted: false

2. **COPYRIGHTED** (FLAG for review):
   - Official artwork from games (Genshin Impact, Honkai, Blue Archive, Azur Lane, etc.)
   - Screenshots or art from anime/manga
   - Characters from movies, TV shows, or known franchises
   - Fan art that clearly depicts copyrighted characters
   - Official promotional art or game CGs
   
   If copyrighted:
   - Set isCopyrighted: true
   - Identify the source in copyrightSource (e.g., "Genshin Impact - Raiden Shogun", "Naruto - Hinata")
   - Set copyrightConfidence: certain/likely/possible based on how sure you are

3. **CONFIDENCE LEVELS**:
   - "certain": Unmistakably from a specific franchise (official art, iconic characters)
   - "likely": Strong resemblance to known copyrighted content
   - "possible": Some elements suggest it might be from a franchise
   - "unlikely": Appears to be original but not clearly AI-generated
   - "ai_generated": Clearly AI-generated artwork

IMPORTANT: AI-generated images are ALLOWED. We only need to flag potentially copyrighted images so moderators can review them. Do NOT reject solely for copyright - just document what you find in copyrightAnalysis.
` : ''}

## ZERO TOLERANCE - ALWAYS REJECT

These are NEVER acceptable, even with NSFW tagging or "fictional" framing:

### 1. Non-Consensual / Rape Content
ANY sexual content where consent is absent, forced, or coerced:
- Explicit rape or "non-con" scenarios = REJECT
- "Forced to", "no choice", "must submit" = REJECT
- Mind control / hypnosis / drugging for sex = REJECT
- Blackmail / coercion / threats for sex = REJECT
- Curses or "biological needs" that FORCE sexual acts = REJECT (non-consent with extra steps)
- "Reluctantly accepts" or "resistance breaks down" = REJECT

"It's fiction" or "NSFW tagged" does NOT make rape content acceptable.

### 2. Minor Safety (SEXUAL Content Only)
- ANY sexual content involving characters under 18 = REJECT
- Characters who LOOK like minors in sexual context = REJECT
- "Actually 1000 years old" loophole = STILL REJECT

NOTE: Violence involving minors in non-sexual context (fantasy battles, war, etc.) is NOT CSAM. Only SEXUAL content triggers this policy.

### 3. Real-World Harm
- Detailed instructions for weapons/drugs/violence = REJECT
- Content targeting real people for harm = REJECT

## FLAG FOR HUMAN REVIEW

These require human moderator review:
- Dubious consent / power imbalances (boss/employee, etc.)
- Extreme violence combined with sexual content
- Degradation/humiliation as primary theme
- Any gray areas where consent is unclear

## TEXT ANALYSIS

Read ALL text fields carefully, including character descriptions. Look for:
- Stated ages in character descriptions (e.g., "Age: 20", "18 years old", etc.)
- Extract and note the age of EACH character mentioned
- Sexual content involving minors = REJECT
- Non-consensual sexual content = REJECT
- Medical misinformation with specific claims = FLAG
- Hate speech targeting REAL-WORLD groups (ethnicity, religion, etc.) = FLAG
- Fantasy racism against elves/orcs/goblins/demons = ALLOWED (not real hate speech)

NOTE: "Killed a half-elf child" is VIOLENCE, not CSAM. Only flag CSAM for SEXUAL content involving minors.

IMPORTANT: Character ages are often listed in their descriptions like "Age: 20" or "Species: X, Age: Y". Read these carefully and compare to the visual appearance in images.

Note: Comfort themes (Mommy/Daddy dynamics), fantasy violence, and properly-tagged NSFW adult content are allowed.

## CONTENT CREATION POLICY:
${policyContext}

## CONTENT TO ANALYZE:

${fieldBreakdown}

${hasImages ? `
## IMAGES TO ANALYZE:

${images.map((img, idx) => `IMAGE ${idx + 1}: ${img.type} - "${img.name}"`).join('\n')}

Look at each image carefully. Does any character APPEAR to be under 18? Consider their body proportions, facial features, and overall appearance - not just stated ages.
` : ''}

## CREATOR FEEDBACK & SUGGESTIONS

Provide detailed, constructive feedback to help creators improve their content.

### For REJECTED content:
- Explain exactly WHY it was rejected
- List specific issues that need to be fixed  
- Provide actionable suggestions
- Be specific: "The plot lacks character motivation" NOT "The plot is bad"
- Set includeExampleLinks to TRUE if rejected for quality/structure issues (not policy violations)

### For FLAGGED content:
- Explain what triggered the flag
- Suggest specific changes to resolve concerns
- Set includeExampleLinks to TRUE if helpful

### For SAFE content:
- Type: "great" if excellent with no suggestions
- Type: "minor_improvements" if there are optional enhancements
- Praise specific strengths
- Set includeExampleLinks to FALSE

Example feedback for rejected quality issues:
"The story lacks sufficient details, character development, and narrative structure. The plot outline is overly broad, and the premise does not provide enough concrete guidance or context to develop a compelling story."

## OUTPUT INSTRUCTIONS

Respond with valid JSON only. No markdown code blocks, no explanation outside the JSON.

In your reasoning field, write 2-4 sentences in natural prose. Do NOT use step labels, bullet points, or bold formatting.

When citing policies in 'highlightedIssues', USE THE EXACT SECTION TITLE from the provided policy text.

Always include the imageAnalysis field, even if no images (set totalImages: 0, flaggedImages: 0, copyrightedImages: 0, overallImageVerdict: "safe", issues: [], copyrightAnalysis: []).

Always include copyrightAnalysis for each image when images are present.

Always include the suggestions field with constructive feedback.
`;

        // STEP 6: Build message content (text or multimodal)
        let messageContent;

        if (hasImages) {
            messageContent = await buildMultimodalContent(prompt, images, maxImages);
            const validImages = messageContent.filter(c => c.type === 'image_url').length;
            console.log(`   📷 Sending ${validImages} images for analysis (converted to base64)`);
        } else {
            messageContent = prompt;
        }

        // STEP 7: Call AI with Structured Output
        const response = await openai.chat.completions.create({
            model: process.env.AI_MODEL || 'anthropic/claude-sonnet-4-20250514',
            messages: [
                {
                    role: 'system',
                    content: `You are a content moderator who analyzes text and images together.

CRITICAL FOR IMAGES: 
1. Judge whether characters LOOK like minors based on their VISUAL APPEARANCE, not stated ages. A character drawn with childlike proportions in sexual content is a violation regardless of claimed age.
2. For each image, determine if it is AI-GENERATED (allowed) or COPYRIGHTED (flag for review). Identify the source of copyrighted images (e.g., "Genshin Impact", "Naruto").

Write your reasoning in natural conversational prose. Do not use step labels, bullet points, bold text, or structured formatting.

You MUST respond with valid JSON matching the schema provided. No markdown, no code blocks, just pure JSON.

Always include imageAnalysis with copyrightAnalysis for each image.
Always include suggestions with constructive feedback for the creator.`
                },
                { role: 'user', content: messageContent }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "moderation_result",
                    strict: true,
                    schema: moderationSchema
                }
            },
            temperature: 0.15,
            max_tokens: 4000
        });

        // STEP 7.5: Calculate usage and cost
        const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        
        const PRICING = {
            input: 3.00 / 1_000_000,
            output: 15.00 / 1_000_000
        };
        
        const inputCost = usage.prompt_tokens * PRICING.input;
        const outputCost = usage.completion_tokens * PRICING.output;
        const totalCost = inputCost + outputCost;
        
        const usageStats = {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            inputCost: inputCost,
            outputCost: outputCost,
            totalCost: totalCost,
            costFormatted: `$${totalCost.toFixed(4)}`
        };
        
        console.log(`📊 Token Usage: ${usageStats.totalTokens} tokens | ${usageStats.costFormatted}`);

        // STEP 8: Parse response (SIMPLER with Structured Output!)
        let result;
        try {
            const content = response.choices[0].message.content;
            result = JSON.parse(content);
            console.log("✓ Structured output received and parsed");
            console.log(`   Verdict: ${result.verdict}, Confidence: ${result.confidence}`);
            if (result.imageAnalysis) {
                console.log(`   Images analyzed: ${result.imageAnalysis.totalImages || 0}`);
                console.log(`   Images flagged: ${result.imageAnalysis.flaggedImages || 0}`);
                console.log(`   Copyrighted images: ${result.imageAnalysis.copyrightedImages || 0}`);
                
                // Log copyright details if any found
                if (result.imageAnalysis.copyrightAnalysis?.length > 0) {
                    result.imageAnalysis.copyrightAnalysis.forEach(img => {
                        if (img.isCopyrighted) {
                            console.log(`   ⚠️ Copyright detected: ${img.imageName} - ${img.copyrightSource} (${img.copyrightConfidence})`);
                        } else if (img.isAiGenerated) {
                            console.log(`   ✓ AI-generated: ${img.imageName}`);
                        }
                    });
                }
            }
        } catch (parseError) {
            console.error("JSON parsing failed:", parseError);
            console.error("Raw response:", response.choices[0].message.content);
            throw new Error("AI produced invalid JSON response");
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
            copyrightedImages: 0,
            overallImageVerdict: 'safe',
            issues: [],
            copyrightAnalysis: []
        };

        const suggestions = result.suggestions || {
            type: 'great',
            overallFeedback: 'This content meets all requirements.',
            specificIssues: [],
            strengths: [],
            includeExampleLinks: false
        };

        return {
            success: true,
            moderationResult: {
                aiVerdict: result.verdict,
                aiConfidence: result.confidence,
                aiReasoning: result.reasoning,
                aiSummary: result.summary,
                highlightedIssues: highlightedIssues,

                // Image analysis results
                imageAnalysis: imageAnalysis,
                imagesAnalyzed: imageAnalysis.totalImages || 0,
                imagesFlagged: imageAnalysis.flaggedImages || 0,

                // Creator suggestions
                suggestions: suggestions,

                // Usage stats
                usage: usageStats,

                categories: result.categories || [],
                flaggedPolicies: result.flaggedPolicies || [],
                offendingSnippet: highlightedIssues[0]?.quote || null,
                nsfw: result.nsfw || false,
                nsfwReason: result.nsfwReason || null,
                recommendedAction: result.recommendedAction,
                violationSeverity: result.violationSeverity || 'none',
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
                    issue: `Image issue: ${issue.issue}`,
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
                hasCopyrightConcern: (imageAnalysis.copyrightedImages || 0) > 0,
                copyrightedImageCount: imageAnalysis.copyrightedImages || 0,
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

        // ============================================
        // SPECIAL HANDLING: Anthropic Moderation Flags
        // ============================================
        // If Anthropic's input moderation flags the content, auto-reject it
        // This is a GOOD signal - it means the content is definitely problematic
        
        const errorMessage = error.message || '';
        const isModerationFlag = errorMessage.includes('flagged for') || 
                                  errorMessage.includes('requires moderation') ||
                                  error.status === 403;
        
        // Check for specific flag types
        const isMinorsSexualFlag = errorMessage.includes('sexual/minors') || 
                                    errorMessage.includes('minors');
        const isSexualFlag = errorMessage.includes('sexual') && !isMinorsSexualFlag;
        const isViolenceFlag = errorMessage.includes('violence');
        
        if (isModerationFlag && isMinorsSexualFlag) {
            console.log('⛔ ANTHROPIC MODERATION: Content flagged for sexual/minors - AUTO-REJECTING');
            return {
                success: true, // We successfully determined the result
                moderationResult: {
                    aiVerdict: 'rejected',
                    aiConfidence: 1.0,
                    aiReasoning: 'This content was automatically rejected because it was flagged by the AI provider\'s safety system for potential minor-related sexual content. This type of content violates our Child Safety Policy and cannot be approved under any circumstances.',
                    aiSummary: 'Auto-rejected: Flagged for potential CSAM/minor safety concerns',
                    highlightedIssues: [{
                        field: 'content',
                        quote: '[Content flagged by AI safety system]',
                        policy: '5. Child Safety Policy',
                        policyTitle: 'Child Safety Policy',
                        severity: 'critical',
                        reason: 'Content was flagged by AI provider moderation for "sexual/minors". This indicates potential CSAM or sexualized minor content.'
                    }],
                    imageAnalysis: { 
                        totalImages: 0, 
                        flaggedImages: 0, 
                        overallImageVerdict: 'rejected', 
                        issues: [{
                            imageType: 'content',
                            imageName: 'All content',
                            issue: 'Flagged by AI safety system for minor-related concerns',
                            severity: 'critical',
                            category: 'minor_appearance',
                            visualAgeAssessment: 'Flagged by automated system',
                            statedAge: 'N/A'
                        }]
                    },
                    suggestions: {
                        type: 'rejected',
                        overallFeedback: 'This content has been automatically rejected because it was flagged by our AI safety system for potential minor-related sexual content. This type of content cannot be approved. Please review our Child Safety Policy and ensure all characters are clearly adults (18+) in both appearance and description, with no sexual content involving minors.',
                        specificIssues: [{
                            field: 'content',
                            problem: 'Content flagged for potential sexual content involving minors',
                            howToFix: 'Ensure all characters in sexual/romantic contexts are clearly adults (18+) in both description AND visual appearance. Remove any content that sexualizes minors or minor-appearing characters.'
                        }],
                        strengths: [],
                        includeExampleLinks: false
                    },
                    categories: [{ category: 'csam', flagged: true, confidence: 1.0 }],
                    flaggedPolicies: ['5. Child Safety Policy'],
                    recommendedAction: 'reject',
                    violationSeverity: 'critical',
                    moderatedAt: new Date()
                },
                flags: { 
                    needsManualReview: false, // Auto-rejected, no review needed
                    hasChildSafetyConcern: true,
                    autoRejectedByProvider: true
                }
            };
        }

        // Generic moderation flag (not minors-specific)
        if (isModerationFlag) {
            console.log('⚠️ ANTHROPIC MODERATION: Content flagged - marking for review');
            return {
                success: true,
                moderationResult: {
                    aiVerdict: 'flagged',
                    aiConfidence: 0.9,
                    aiReasoning: `This content was flagged by the AI provider's safety system: ${errorMessage}. It requires human review to determine if it violates our policies.`,
                    aiSummary: 'Flagged by AI safety system - requires human review',
                    highlightedIssues: [{
                        field: 'content',
                        quote: '[Content flagged by AI safety system]',
                        policy: 'AI Safety Filter',
                        policyTitle: 'AI Safety Filter',
                        severity: 'high',
                        reason: `Provider moderation flag: ${errorMessage}`
                    }],
                    imageAnalysis: { totalImages: 0, flaggedImages: 0, overallImageVerdict: 'flagged', issues: [] },
                    suggestions: {
                        type: 'needs_work',
                        overallFeedback: 'This content was flagged by our AI safety system and requires human review. A moderator will review your content shortly.',
                        specificIssues: [],
                        strengths: [],
                        includeExampleLinks: false
                    },
                    categories: [],
                    flaggedPolicies: ['AI Safety Filter'],
                    recommendedAction: 'review',
                    violationSeverity: 'high',
                    moderatedAt: new Date()
                },
                flags: { 
                    needsManualReview: true,
                    flaggedByProvider: true
                }
            };
        }

        // Regular error (not a moderation flag)
        return {
            success: false,
            error: error.message,
            moderationResult: {
                aiVerdict: 'flagged',
                aiConfidence: 0,
                aiReasoning: `Auto-moderation failed: ${error.message}. Requires manual review.`,
                aiSummary: 'AI analysis failed - needs human review',
                highlightedIssues: [],
                imageAnalysis: { totalImages: 0, flaggedImages: 0, overallImageVerdict: 'safe', issues: [] },
                suggestions: {
                    type: 'needs_work',
                    overallFeedback: 'Unable to analyze content due to a technical error. Please try again.',
                    specificIssues: [],
                    strengths: [],
                    includeExampleLinks: false
                },
                categories: [],
                flaggedPolicies: [],
                recommendedAction: 'review',
                violationSeverity: 'high',
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
            let charInfo = `--- CHARACTER ${idx + 1}: ${char.name || 'Unnamed'} ---\n`;
            charInfo += `NSFW: ${char.nsfw ? 'Yes' : 'No'}\n`;
            if (char.descriptionSummary) charInfo += `SUMMARY: ${char.descriptionSummary}\n`;
            if (char.description) {
                const desc = char.description.length > 2000 ? char.description.substring(0, 2000) + '...' : char.description;
                charInfo += `DESCRIPTION:\n${desc}\n`;
            }
            return charInfo;
        }).join('\n');
    }
    if (characterContent) content += `\n=== CHARACTERS ===\n${characterContent}\n`;

    // Personas
    let personaContent = '';
    if (story.rawPersonaList?.trim()) {
        personaContent = story.rawPersonaList;
    } else if (story.personaSnapshots?.length > 0) {
        personaContent = story.personaSnapshots.filter(p => !p.deleted).map((persona, idx) => {
            let personaInfo = `--- PERSONA ${idx + 1}: ${persona.name || 'Unnamed'} ---\n`;
            personaInfo += `NSFW: ${persona.nsfw ? 'Yes' : 'No'}\n`;
            if (persona.descriptionSummary) personaInfo += `SUMMARY: ${persona.descriptionSummary}\n`;
            if (persona.description) {
                const desc = persona.description.length > 2000 ? persona.description.substring(0, 2000) + '...' : persona.description;
                personaInfo += `DESCRIPTION:\n${desc}\n`;
            }
            return personaInfo;
        }).join('\n');
    }
    if (personaContent) content += `\n=== PERSONAS ===\n${personaContent}\n`;

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
        const isSingleCharacter = data.name && !data.title && (!data.characterSnapshots || data.characterSnapshots.length === 0);

        if (isSingleCharacter) {
            console.log("   -> Detected SINGLE CHARACTER import");
            console.log(`   - Name: ${data.name || 'Unknown'}`);

            const characterData = {
                name: data.name,
                description: data.description || '',
                descriptionSummary: data.descriptionSummary || '',
                promptDescription: data.promptDescription || '',
                exampleDialogue: data.exampleDialogue || '',
                firstMessage: data.firstMessage || '',
                tags: (data.tags || []).concat(data._tagIds || []),
                cover: data.cover,
                media: data.media || [],
                nsfw: data.nsfw || false
            };

            return await autoModerateContent('character', characterData, {
                includeImages: options.includeImages,
                maxImages: options.maxImages || 5
            });
        }

        // Scenario B: Storyline/World Import
        console.log("   -> Detected STORYLINE/WORLD import");
        console.log(`   - Title: ${data.title || 'Untitled'}`);
        console.log(`   - Characters: ${data.characterSnapshots?.length || 0}`);
        console.log(`   - Personas: ${data.personaSnapshots?.length || 0}`);

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
                aiReasoning: `Auto-moderation failed: ${error.message}`,
                aiSummary: 'AI analysis failed - needs human review',
                highlightedIssues: [],
                imageAnalysis: { totalImages: 0, flaggedImages: 0, overallImageVerdict: 'safe', issues: [] },
                suggestions: {
                    type: 'needs_work',
                    overallFeedback: 'Unable to analyze content due to a technical error.',
                    specificIssues: [],
                    strengths: [],
                    includeExampleLinks: false
                },
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