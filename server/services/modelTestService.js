// ============================================
// MODEL TEST SERVICE
// ============================================
// A lightweight, read-only service for testing AI vision models
// against images using the same moderation prompt as production.
// No DB writes - results are returned directly.
// ============================================

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// ============================================
// CLIENT (OpenRouter)
// ============================================

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY
});

// ============================================
// SUPPORTED MODELS FOR TESTING
// ============================================

const SUPPORTED_MODELS = {
    'anthropic/claude-sonnet-4.6': 'Claude Sonnet 4.6',
    'google/gemini-3-flash-preview': 'Gemini 3 Flash Preview',
    'x-ai/grok-4.1-fast': 'Grok 4.1 Fast',
    'moonshotai/kimi-k2.5': 'Kimi K2.5',
};

// ============================================
// IMAGE ANALYSIS SCHEMA (simplified for test)
// ============================================

const imageTestSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        verdict: {
            type: 'string',
            enum: ['safe', 'flagged', 'rejected'],
            description: 'Overall verdict for the image'
        },
        confidence: {
            type: 'number',
            description: 'Confidence in verdict (0.0–1.0)'
        },
        reasoning: {
            type: 'string',
            description: '2-3 sentences in natural prose explaining the verdict'
        },
        imageStyle: {
            type: 'string',
            enum: ['anime', 'cartoon', 'illustrated', 'photorealistic', 'real_photo', 'unknown'],
            description: 'Detected art style of the image'
        },
        isPhotorealistic: {
            type: 'boolean',
            description: 'TRUE if image looks like a real photo or hyperrealistic render'
        },
        isAiGenerated: {
            type: 'boolean',
            description: 'TRUE if the image appears to be AI-generated artwork'
        },
        isCopyrighted: {
            type: 'boolean',
            description: 'TRUE if image appears to be from a copyrighted source'
        },
        copyrightSource: {
            type: 'string',
            description: 'If copyrighted, name the source (e.g. "Genshin Impact"). Empty string if unknown or AI-gen.'
        },
        minorAppearance: {
            type: 'boolean',
            description: 'TRUE if any character in the image VISUALLY appears to be under 18'
        },
        nudityDetected: {
            type: 'boolean',
            description: 'TRUE if intimate body parts (nipples, genitalia) are visible'
        },
        issues: {
            type: 'array',
            description: 'List of issues found with the image',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    category: {
                        type: 'string',
                        enum: ['nudity', 'minor_appearance', 'photorealistic', 'copyright', 'violence', 'hate_symbol', 'other']
                    },
                    severity: {
                        type: 'string',
                        enum: ['low', 'medium', 'high', 'critical']
                    },
                    description: { type: 'string' }
                },
                required: ['category', 'severity', 'description']
            }
        }
    },
    required: [
        'verdict', 'confidence', 'reasoning', 'imageStyle',
        'isPhotorealistic', 'isAiGenerated', 'isCopyrighted',
        'copyrightSource', 'minorAppearance', 'nudityDetected', 'issues'
    ]
};

// ============================================
// BUILD SYSTEM PROMPT FOR IMAGE TESTING
// ============================================

const buildImageTestPrompt = (policyContext) => {
    return `You are an expert content moderator for ISEKAI ZERO, a fictional roleplay and storytelling platform. You are analyzing a single uploaded image to assess whether it complies with platform policies.

## PLATFORM CONTEXT
ISEKAI ZERO is an anime/illustrated art roleplay platform. Only anime, cartoon, and illustrated art styles are allowed. Photorealistic and real photo images are NOT allowed.

## IMAGE STYLE POLICY (CHECK FIRST — MOST IMPORTANT)

### ALLOWED Styles ✓
- Anime (Japanese animation: large eyes, stylized features, cel-shading)
- Cartoon (western animation style)
- Illustrated (paintings, drawings, digital art with artistic style)

### NOT ALLOWED Styles ✗ → IMMEDIATELY REJECT
- Photorealistic (looks like a real photograph)
- Hyperrealistic (designed to look like real life)
- Real Photos (actual photographs)
- AI-Generated Realistic Humans (even if AI-made, if it LOOKS real → REJECT)

### Signs of PHOTOREALISTIC (MUST REJECT):
- Natural human skin texture (pores, blemishes, realistic skin tones)
- Realistic lighting and shadows on human features
- Natural hair with realistic sheen and individual strands
- Camera-like depth of field or bokeh blur
- Realistic fabric textures
- Human eyes with realistic reflections
- Real-world environments that look photographic

### Signs of ANIME/ILLUSTRATED (ALLOWED):
- Large stylized eyes
- Simplified or exaggerated facial features  
- Cel-shaded or flat coloring
- Anime-style hair (bright colors, impossible shapes)
- Artistic/painted backgrounds

## MINOR APPEARANCE CHECK (CRITICAL)
Judge characters by VISUAL APPEARANCE only, not stated ages.

REJECT if:
- Character LOOKS like a minor (childlike proportions, flat chest, small frame, round childish face, school uniform)
- AND is depicted in sexual or suggestive context

The "actually she's 1000 years old" loophole is NOT valid. Judge by LOOKS.

## NUDITY & EXPOSURE RULES

ALLOWED (with NSFW tag):
- Cleavage (any amount)
- Revealing outfits, lingerie, bikinis, suggestive poses

REJECT (intimate parts visible):
- Visible nipples (even partial)
- Visible genitalia
- Crotch bulge or camel toe
- See-through clothing showing intimate parts

## COPYRIGHT DETECTION
For the image, determine if it appears to be:
1. AI-GENERATED (ALLOWED) — telltale AI art signs, original characters, NovelAI/SD/Midjourney aesthetics
2. COPYRIGHTED (flag for review) — official game art (Genshin, Honkai, Blue Archive), anime screenshots, recognizable franchise characters

## ZERO TOLERANCE — ALWAYS REJECT
- Any sexual content involving characters who LOOK like minors
- Non-consensual sexual content
- Photorealistic humans (even AI-generated)

## CONTENT CREATION POLICY:
${policyContext}

## INSTRUCTIONS
Analyze the image provided and return a JSON verdict. Be decisive. Do NOT use "flagged" just to be safe — if something is a clear violation, REJECT it.`;
};

// ============================================
// ANALYZE A BATCH OF IMAGES
// ============================================

const analyzeImageBatch = async (images, model, batchIndex) => {
    if (!images || images.length === 0) {
        return { success: false, error: 'No images provided' };
    }

    const validModel = SUPPORTED_MODELS.hasOwnProperty(model) ? model : 'anthropic/claude-sonnet-4-20250514';

    // Load policy file
    const policyPath = path.join(__dirname, '../../content-creation-policy.txt');
    let policyContext = '';
    try {
        policyContext = fs.readFileSync(policyPath, 'utf8');
    } catch (err) {
        console.error('Model test: Failed to read policy file:', err.message);
        policyContext = 'Standard platform safety guidelines apply. No photorealistic images, no minor sexualization, no non-consensual content.';
    }

    const systemPrompt = buildImageTestPrompt(policyContext);

    const results = [];

    // Analyze each image individually to get per-image results
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const startTime = Date.now();

        try {
            console.log(`[ModelTest] Batch ${batchIndex} | Image ${i + 1}/${images.length}: ${image.name} | Model: ${validModel}`);

            const userPrompt = `Analyze this image for content policy compliance. The image filename is: "${image.name}". Return your analysis as valid JSON matching the required schema.`;

            const messageContent = [
                { type: 'text', text: userPrompt },
                {
                    type: 'image_url',
                    image_url: {
                        url: image.base64,
                        detail: 'low'
                    }
                }
            ];

            const response = await openai.chat.completions.create({
                model: validModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: messageContent }
                ],
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'image_moderation_result',
                        strict: true,
                        schema: imageTestSchema
                    }
                },
                max_tokens: 1024,
                temperature: 0.1
            });

            const elapsed = Date.now() - startTime;
            const rawContent = response.choices[0]?.message?.content || '{}';

            let parsed;
            try {
                parsed = JSON.parse(rawContent);
            } catch (parseErr) {
                // Fallback if JSON parse fails
                parsed = {
                    verdict: 'flagged',
                    confidence: 0,
                    reasoning: 'Failed to parse model response.',
                    imageStyle: 'unknown',
                    isPhotorealistic: false,
                    isAiGenerated: false,
                    isCopyrighted: false,
                    copyrightSource: '',
                    minorAppearance: false,
                    nudityDetected: false,
                    issues: []
                };
            }

            results.push({
                id: image.id,
                name: image.name,
                success: true,
                elapsedMs: elapsed,
                model: validModel,
                modelName: SUPPORTED_MODELS[validModel] || validModel,
                ...parsed,
                usage: response.usage || null
            });

        } catch (err) {
            console.error(`[ModelTest] Error analyzing image ${image.name}:`, err.message);
            results.push({
                id: image.id,
                name: image.name,
                success: false,
                error: err.message,
                model: validModel,
                modelName: SUPPORTED_MODELS[validModel] || validModel,
                verdict: 'flagged',
                confidence: 0,
                reasoning: `Analysis failed: ${err.message}`,
                imageStyle: 'unknown',
                isPhotorealistic: false,
                isAiGenerated: false,
                isCopyrighted: false,
                copyrightSource: '',
                minorAppearance: false,
                nudityDetected: false,
                issues: []
            });
        }
    }

    return {
        success: true,
        batchIndex,
        model: validModel,
        modelName: SUPPORTED_MODELS[validModel] || validModel,
        results,
        analyzedCount: results.filter(r => r.success).length
    };
};

// ============================================
// GET SUPPORTED MODELS LIST
// ============================================

const getSupportedModels = () => {
    return Object.entries(SUPPORTED_MODELS).map(([id, name]) => ({ id, name }));
};

module.exports = {
    analyzeImageBatch,
    getSupportedModels
};
