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

FIRST MESSAGE:
${story.firstMessage || 'No first message'}

CHARACTERS INVOLVED: ${charNames}

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