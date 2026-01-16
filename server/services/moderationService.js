const { ChatOpenAI } = require('@langchain/openai');
const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const Policy = require('../models/Policy');
const ModerationLog = require('../models/ModerationLog');

/**
 * Initialize LangChain ChatOpenAI with OpenRouter
 */
const createChatModel = () => {
    return new ChatOpenAI({
        modelName: process.env.AI_MODEL || 'anthropic/claude-3-haiku',
        openAIApiKey: process.env.OPENROUTER_API_KEY,
        temperature: 0.1,
        configuration: {
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'http://localhost:5000',
                'X-Title': 'Content Moderation AI'
            }
        }
    });
};

/**
 * Build the moderation prompt template
 */
const buildModerationPromptTemplate = (policies) => {
    const policyText = policies.map(p => `
### ${p.policyId}: ${p.title}
- Category: ${p.category}
- Severity: ${p.severity}
- Description: ${p.description}
- Examples of violations: ${p.examples.join(', ')}
`).join('\n');

    const systemTemplate = `You are a content moderation AI. Your job is to analyze user-generated content and determine if it violates any policies.

## Your Task
Analyze the provided content against the moderation policies listed below. Return a JSON response with your verdict.

## Moderation Policies
${policyText}

## Response Format
You MUST respond with valid JSON only, no other text:
{{
  "verdict": "safe|flagged|rejected",
  "category": "category_name or null if safe",
  "confidence": 0.0-1.0,
  "policyViolated": "POL-XXX or null if safe",
  "reasoning": "Brief explanation of your decision"
}}

## Verdict Definitions
- "safe": Content does not violate any policy
- "flagged": Content possibly violates a policy but needs human review
- "rejected": Content clearly violates a policy

## Guidelines
1. Be objective and consistent
2. Consider context when evaluating content
3. If unsure, use "flagged" with lower confidence
4. Always cite the specific policy violated
5. Provide clear reasoning for your decision`;

    const humanTemplate = `Analyze this content for policy violations:

---
{content}
---

Respond with JSON only.`;

    return ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(systemTemplate),
        HumanMessagePromptTemplate.fromTemplate(humanTemplate)
    ]);
};

/**
 * Main moderation function using LangChain
 */
const moderateContent = async ({ content, contentId, contentType, userId, context }) => {
    const startTime = Date.now();

    // 1. Fetch all active policies
    const policies = await Policy.find({ isActive: true });

    // 2. Create LangChain model and prompt
    const model = createChatModel();
    const promptTemplate = buildModerationPromptTemplate(policies);

    // 3. Create the chain
    const chain = promptTemplate.pipe(model);

    // 4. Invoke the chain
    let parsedResponse;
    try {
        const response = await chain.invoke({ content });
        parsedResponse = parseAIResponse(response.content);
    } catch (error) {
        console.error('LangChain invocation error:', error);
        parsedResponse = {
            verdict: 'flagged',
            category: null,
            confidence: 0.5,
            policyViolated: null,
            reasoning: `AI error: ${error.message} - flagged for human review`
        };
    }

    const responseTime = Date.now() - startTime;

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
 * Parse AI response JSON
 */
const parseAIResponse = (aiResponse) => {
    try {
        let jsonStr = aiResponse;

        // Handle markdown code blocks
        const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        } else {
            // Fallback: Try to find the JSON object boundaries
            const firstOpen = aiResponse.indexOf('{');
            const lastClose = aiResponse.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose !== -1) {
                jsonStr = aiResponse.substring(firstOpen, lastClose + 1);
            }
        }

        const parsed = JSON.parse(jsonStr.trim());

        let category = parsed.category || null;
        // If query returns "nsfw, illegal", take the first one
        if (category && typeof category === 'string' && category.includes(',')) {
            category = category.split(',')[0].trim();
        }

        return {
            verdict: parsed.verdict || 'flagged',
            category: category,
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
