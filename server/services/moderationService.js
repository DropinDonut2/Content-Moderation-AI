const Policy = require('../models/Policy');
const ModerationLog = require('../models/ModerationLog');
const { buildModerationPrompt } = require('../prompts/moderationPrompt');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Main moderation function
 */
const moderateContent = async ({ content, contentId, contentType, userId, context }) => {
    const startTime = Date.now();

    // 1. Fetch all active policies
    const policies = await Policy.find({ isActive: true });

    // 2. Build the prompt
    const { systemPrompt, userPrompt } = buildModerationPrompt(policies, content);

    // 3. Call OpenRouter API
    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    const responseTime = Date.now() - startTime;

    // 4. Parse AI response
    const parsedResponse = parseAIResponse(aiResponse);

    // 5. Find the violated policy if any
    let policyViolated = null;
    let policyDetails = null;

    if (parsedResponse.policyViolated) {
        policyViolated = await Policy.findOne({ policyId: parsedResponse.policyViolated });
        if (policyViolated) {
            policyDetails = {
                policyId: policyViolated.policyId,
                title: policyViolated.title,
                description: policyViolated.description
            };
        }
    }

    // 6. Determine final verdict based on confidence threshold
    const confidenceThreshold = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7;
    let verdict = parsedResponse.verdict;

    // If AI says rejected but confidence is low, flag for review instead
    if (verdict === 'rejected' && parsedResponse.confidence < confidenceThreshold) {
        verdict = 'flagged';
    }

    // 7. Save to moderation log
    const moderationLog = new ModerationLog({
        contentId,
        content,
        contentType,
        userId,
        context,
        verdict,
        category: parsedResponse.category,
        confidence: parsedResponse.confidence,
        policyViolated: policyViolated?._id,
        policyDetails,
        reasoning: parsedResponse.reasoning,
        aiModel: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
        aiResponseTime: responseTime,
        reviewStatus: verdict === 'safe' ? 'approved' : 'pending'
    });

    await moderationLog.save();

    // 8. Return result
    return {
        moderationId: moderationLog._id,
        verdict,
        category: parsedResponse.category,
        confidence: parsedResponse.confidence,
        policyViolated: policyDetails,
        reasoning: parsedResponse.reasoning,
        aiModel: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
        responseTime
    };
};

/**
 * Call OpenRouter API
 */
const callOpenRouter = async (systemPrompt, userPrompt) => {
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5000',
            'X-Title': 'Content Moderation AI'
        },
        body: JSON.stringify({
            model: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.1
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};

/**
 * Parse AI response JSON
 */
const parseAIResponse = (aiResponse) => {
    try {
        // Extract JSON from the response (handle markdown code blocks)
        let jsonStr = aiResponse;
        const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr.trim());

        return {
            verdict: parsed.verdict || 'flagged',
            category: parsed.category || null,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            policyViolated: parsed.policyViolated || null,
            reasoning: parsed.reasoning || 'Unable to parse AI reasoning'
        };
    } catch (error) {
        console.error('Failed to parse AI response:', error);
        return {
            verdict: 'flagged',
            category: null,
            confidence: 0.5,
            policyViolated: null,
            reasoning: 'Failed to parse AI response - flagged for human review'
        };
    }
};

module.exports = {
    moderateContent
};
