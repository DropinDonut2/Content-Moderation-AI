/**
 * Policy Import Service
 * Supports:
 * 1. Fetching from URL (docs.isekai.world)
 * 2. Parsing pasted HTML
 * 3. Parsing uploaded HTML/Markdown/JSON files
 */

const Policy = require('../models/Policy');

// ============================================
// HTML PARSING UTILITIES
// ============================================

/**
 * Clean HTML tags and decode entities
 */
const cleanHtml = (html) => {
    if (!html) return '';
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Parse ISEKAI ZERO policy document HTML into structured policies
 * Works with the HTML from docs.isekai.world/books/terms-policies/page/content-creation-policy
 */
const parseIsekaiPolicyHtml = (html) => {
    const policies = [];

    // Define all ISEKAI policies with their patterns
    const policyDefinitions = [
        {
            num: 1,
            pattern: /1\.\s*Spam,?\s*Scams?\s*(?:and|&)?\s*Deceptive/i,
            title: 'Spam, Scams & Deceptive Practices',
            category: 'spam',
            severity: 'medium',
            defaultAction: 'flag'
        },
        {
            num: 2,
            pattern: /2\.\s*Sexual\s*(?:and|&)?\s*Nudity/i,
            title: 'Sexual and Nudity Content',
            category: 'nsfw',
            severity: 'high',
            defaultAction: 'flag'
        },
        {
            num: 3,
            pattern: /3\.\s*External\s*Links/i,
            title: 'External Links',
            category: 'spam',
            severity: 'high',
            defaultAction: 'flag'
        },
        {
            num: 4,
            pattern: /4\.\s*Age[- ]?Restricted/i,
            title: 'Age-Restricted Content',
            category: 'nsfw',
            severity: 'medium',
            defaultAction: 'flag'
        },
        {
            num: 5,
            pattern: /5\.\s*Child\s*Safety/i,
            title: 'Child Safety',
            category: 'illegal',
            severity: 'critical',
            defaultAction: 'reject'
        },
        {
            num: 6,
            pattern: /6\.\s*Thumbnails?\s*(?:and|&)?\s*Images?/i,
            title: 'Thumbnails and Images',
            category: 'nsfw',
            severity: 'high',
            defaultAction: 'flag'
        },
        {
            num: 7,
            pattern: /7\.\s*Suicide,?\s*Self[- ]?Harm/i,
            title: 'Suicide & Self-Harm',
            category: 'self_harm',
            severity: 'critical',
            defaultAction: 'reject'
        },
        {
            num: 8,
            pattern: /8\.\s*Harmful\s*(?:or|\/)\s*Dangerous/i,
            title: 'Harmful or Dangerous Acts',
            category: 'violence',
            severity: 'critical',
            defaultAction: 'reject'
        },
        {
            num: 9,
            pattern: /9\.\s*Violent\s*(?:or|\/)\s*Graphic/i,
            title: 'Violent or Graphic Content',
            category: 'violence',
            severity: 'critical',
            defaultAction: 'flag'
        },
        {
            num: 10,
            pattern: /10\.\s*Hate\s*Speech/i,
            title: 'Hate Speech & Discrimination',
            category: 'hate_speech',
            severity: 'critical',
            defaultAction: 'reject'
        },
        {
            num: 11,
            pattern: /11\.\s*Cultural\s*Sensitiv/i,
            title: 'Cultural Sensitivity',
            category: 'cultural_sensitivity',
            severity: 'medium',
            defaultAction: 'flag'
        },
        {
            num: 12,
            pattern: /12\.\s*(?:General\s*)?Misinformation/i,
            title: 'Misinformation',
            category: 'misinformation',
            severity: 'high',
            defaultAction: 'flag'
        },
        {
            num: 13,
            pattern: /13\.\s*Elections?\s*Misinformation/i,
            title: 'Election Misinformation',
            category: 'misinformation',
            severity: 'high',
            defaultAction: 'flag'
        },
        {
            num: 14,
            pattern: /14\.\s*Medical\s*Misinformation/i,
            title: 'Medical Misinformation',
            category: 'misinformation',
            severity: 'high',
            defaultAction: 'flag'
        },
        {
            num: 15,
            pattern: /15\.\s*Educational|EDSA/i,
            title: 'Educational, Documentary, Scientific & Artistic Content',
            category: 'spam',
            severity: 'low',
            defaultAction: 'flag'
        }
    ];

    // Extract text content from HTML for searching
    const textContent = cleanHtml(html);

    // Try to extract content between sections
    for (let i = 0; i < policyDefinitions.length; i++) {
        const def = policyDefinitions[i];
        const nextDef = policyDefinitions[i + 1];

        // Find where this section starts
        const startMatch = textContent.match(def.pattern);
        if (!startMatch) continue;

        const startIndex = startMatch.index;
        let endIndex = textContent.length;

        // Find where next section starts (or use end of document)
        if (nextDef) {
            const nextMatch = textContent.substring(startIndex + 50).match(nextDef.pattern);
            if (nextMatch) {
                endIndex = startIndex + 50 + nextMatch.index;
            }
        } else {
            // For last policy, look for "Content Moderation Process" or similar
            const endMatch = textContent.substring(startIndex).match(/Content\s*Moderation\s*Process|Consequences\s*for\s*Violations/i);
            if (endMatch) {
                endIndex = startIndex + endMatch.index;
            }
        }

        // Extract section text
        let sectionText = textContent.substring(startIndex, endIndex);

        // Clean up - remove the header itself
        sectionText = sectionText.replace(def.pattern, '').trim();

        // Extract description (first 500 chars after header, cleaned up)
        let description = sectionText.substring(0, 800);

        // Try to get a cleaner description by finding the first substantial paragraph
        const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 20);
        if (sentences.length > 0) {
            description = sentences.slice(0, 3).join('. ').trim();
            if (description && !description.endsWith('.')) {
                description += '.';
            }
        }

        // If description is still weak, use a default
        if (!description || description.length < 30) {
            description = `Policy regarding ${def.title.toLowerCase()}. Content that violates this policy may be flagged or removed.`;
        }

        // Extract examples from bullet points or list items in the section
        const examples = [];
        const bulletMatches = sectionText.match(/(?:•|·|-|\*|›)\s*([^•·\-\*›\n]{15,100})/g) || [];
        for (const match of bulletMatches.slice(0, 5)) {
            const example = match.replace(/^[•·\-\*›]\s*/, '').trim();
            if (example.length > 15 && example.length < 150) {
                examples.push(example);
            }
        }

        // If no examples found, create generic ones
        if (examples.length === 0) {
            examples.push(`Content violating ${def.title} guidelines`);
        }

        policies.push({
            policyId: `POL-${String(def.num).padStart(3, '0')}`,
            title: def.title,
            category: def.category,
            description: description,
            examples: examples,
            severity: def.severity,
            defaultAction: def.defaultAction,
            isActive: true,
            source: 'isekai_docs_import'
        });
    }

    // If we found some but not all, that's still useful
    if (policies.length > 0) {
        console.log(`✓ Parsed ${policies.length} policies from HTML`);
        return policies;
    }

    // Fallback: Try table-based parsing
    return parseIsekaiTablesHtml(html);
};

/**
 * Alternative parsing that focuses on tables
 */
const parseIsekaiTablesHtml = (html) => {
    const policies = [];

    // Find all tables
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    let policyCounter = 1;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
        const tableHtml = tableMatch[1];

        // Find all rows
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
            const rowHtml = rowMatch[1];

            // Find cells
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells = [];
            let cellMatch;

            while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                cells.push(cleanHtml(cellMatch[1]));
            }

            // If we have at least 2 cells with content
            if (cells.length >= 2 && cells[0].length > 3 && cells[1].length > 10) {
                const title = cells[0];
                const description = cells[1];

                // Skip header rows
                if (title.toLowerCase().includes('type') || title.toLowerCase().includes('category')) {
                    continue;
                }

                policies.push({
                    policyId: `POL-${String(policyCounter++).padStart(3, '0')}`,
                    title: title.substring(0, 100),
                    category: detectCategory(title + ' ' + description),
                    description: description.substring(0, 500),
                    examples: [description.substring(0, 100)],
                    severity: detectSeverity(title + ' ' + description),
                    defaultAction: detectSeverity(title + ' ' + description) === 'critical' ? 'reject' : 'flag',
                    isActive: true,
                    source: 'isekai_docs_import'
                });
            }
        }
    }

    if (policies.length > 0) {
        console.log(`✓ Parsed ${policies.length} policies from tables`);
    }

    return policies;
};

/**
 * Detect category from text content
 */
const detectCategory = (text) => {
    const lower = text.toLowerCase();

    if (/child|minor|csam|underage|kid/i.test(lower)) return 'illegal';
    if (/hate|discriminat|racist|slur|genocide/i.test(lower)) return 'hate_speech';
    if (/harass|bully|stalk|doxx/i.test(lower)) return 'harassment';
    if (/spam|scam|pyramid|mislead|deceptive/i.test(lower)) return 'spam';
    if (/nsfw|sexual|nude|explicit|erotic|genital|pornograph/i.test(lower)) return 'nsfw';
    if (/violen|gore|torture|harm|danger|weapon|bomb|graphic/i.test(lower)) return 'violence';
    if (/suicide|self.?harm|cutting|eating.?disorder/i.test(lower)) return 'self_harm';
    if (/misinform|fake|false|conspiracy|election|medical/i.test(lower)) return 'misinformation';
    if (/cultural|sensitiv|religio/i.test(lower)) return 'cultural_sensitivity';

    return 'spam'; // Default
};

/**
 * Detect severity from text content
 */
const detectSeverity = (text) => {
    const lower = text.toLowerCase();

    if (/zero.?tolerance|immediate|permanent|csam|child|minor|terror|suicide|self.?harm/i.test(lower)) return 'critical';
    if (/hate|discriminat|genocide/i.test(lower)) return 'critical';
    if (/prohibited|forbidden|not.?allowed|banned|explicit/i.test(lower)) return 'high';
    if (/restricted|limited|caution|adult|nsfw/i.test(lower)) return 'medium';

    return 'medium'; // Default
};

// ============================================
// IMPORT METHODS
// ============================================

/**
 * Import policies from a URL
 */
const importFromUrl = async (url) => {
    try {
        if (!url || !url.startsWith('http')) {
            throw new Error('Invalid URL. Must start with http:// or https://');
        }

        console.log(` Fetching policies from: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        console.log(` Received ${html.length} characters`);

        const policies = parseIsekaiPolicyHtml(html);

        if (policies.length === 0) {
            throw new Error('No policies could be extracted from the page. The HTML structure may not be supported.');
        }

        return {
            success: true,
            policies,
            source: url,
            count: policies.length
        };

    } catch (error) {
        console.error('URL import error:', error);
        return {
            success: false,
            error: error.message,
            source: url
        };
    }
};

/**
 * Import policies from pasted HTML
 */
const importFromHtml = (html) => {
    try {
        if (!html || html.trim().length === 0) {
            throw new Error('HTML content is empty');
        }

        console.log(`Parsing pasted HTML (${html.length} characters)`);

        const policies = parseIsekaiPolicyHtml(html);

        if (policies.length === 0) {
            throw new Error('No policies could be extracted from the HTML. Try pasting more content or using the JSON import.');
        }

        return {
            success: true,
            policies,
            source: 'pasted_html',
            count: policies.length
        };

    } catch (error) {
        console.error('HTML parse error:', error);
        return {
            success: false,
            error: error.message,
            source: 'pasted_html'
        };
    }
};

/**
 * Import policies from uploaded file
 */
const importFromFile = (fileContent, filename) => {
    try {
        if (!fileContent || fileContent.trim().length === 0) {
            throw new Error('File content is empty');
        }

        const extension = filename?.split('.').pop()?.toLowerCase() || 'txt';
        let policies = [];

        console.log(` Parsing file: ${filename} (${extension})`);

        if (extension === 'json') {
            // Direct JSON import
            const data = JSON.parse(fileContent);
            policies = Array.isArray(data) ? data : (data.policies || []);

            // Validate and normalize
            policies = policies.map((p, i) => ({
                policyId: p.policyId || `POL-${String(i + 1).padStart(3, '0')}`,
                title: p.title || p.name || 'Untitled Policy',
                category: p.category || 'spam',
                description: p.description || '',
                examples: p.examples || [],
                severity: p.severity || 'medium',
                defaultAction: p.defaultAction || 'flag',
                isActive: p.isActive !== false,
                source: 'json_import'
            }));
        } else if (extension === 'html' || extension === 'htm') {
            policies = parseIsekaiPolicyHtml(fileContent);
        } else if (extension === 'md' || extension === 'markdown') {
            // Convert markdown headers to find sections
            const htmlLike = fileContent
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/^\* (.*$)/gim, '<li>$1</li>')
                .replace(/^- (.*$)/gim, '<li>$1</li>')
                .replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
            policies = parseIsekaiPolicyHtml(htmlLike);
        } else {
            // Try to parse as HTML anyway
            policies = parseIsekaiPolicyHtml(fileContent);
        }

        if (policies.length === 0) {
            throw new Error(`No policies could be extracted from ${filename}. Try using JSON format for best results.`);
        }

        return {
            success: true,
            policies,
            source: filename,
            count: policies.length
        };

    } catch (error) {
        console.error('File import error:', error);
        return {
            success: false,
            error: error.message,
            source: filename
        };
    }
};

/**
 * Save imported policies to database
 */
const savePolicies = async (policies, mode = 'merge') => {
    try {
        let stats = { added: 0, updated: 0, deleted: 0, errors: 0 };

        if (mode === 'replace') {
            const deleted = await Policy.deleteMany({});
            stats.deleted = deleted.deletedCount;

            for (const policy of policies) {
                try {
                    await Policy.create(policy);
                    stats.added++;
                } catch (e) {
                    console.error(`Error adding policy ${policy.policyId}:`, e.message);
                    stats.errors++;
                }
            }
        } else if (mode === 'merge') {
            for (const policy of policies) {
                try {
                    const existing = await Policy.findOne({ policyId: policy.policyId });
                    if (existing) {
                        await Policy.updateOne({ policyId: policy.policyId }, policy);
                        stats.updated++;
                    } else {
                        await Policy.create(policy);
                        stats.added++;
                    }
                } catch (e) {
                    console.error(`Error processing policy ${policy.policyId}:`, e.message);
                    stats.errors++;
                }
            }
        } else if (mode === 'append') {
            const lastPolicy = await Policy.findOne().sort({ policyId: -1 });
            let nextNum = 1;
            if (lastPolicy && lastPolicy.policyId) {
                const match = lastPolicy.policyId.match(/\d+/);
                if (match) nextNum = parseInt(match[0]) + 1;
            }

            for (const policy of policies) {
                try {
                    policy.policyId = `POL-${String(nextNum++).padStart(3, '0')}`;
                    await Policy.create(policy);
                    stats.added++;
                } catch (e) {
                    console.error(`Error adding policy:`, e.message);
                    stats.errors++;
                }
            }
        }

        return { success: true, stats, mode };

    } catch (error) {
        console.error('Save policies error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Preview policies without saving
 */
const previewPolicies = (policies) => {
    return policies.map(p => ({
        policyId: p.policyId,
        title: p.title,
        category: p.category,
        severity: p.severity,
        descriptionPreview: p.description?.substring(0, 100) + (p.description?.length > 100 ? '...' : ''),
        examplesCount: p.examples?.length || 0
    }));
};

module.exports = {
    importFromUrl,
    importFromHtml,
    importFromFile,
    savePolicies,
    previewPolicies,
    parseIsekaiPolicyHtml
};