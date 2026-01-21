const fs = require('fs');
const path = require('path');

// Mock extractImageUrls and buildFullJsonContent for standalone testing
function extractImageUrls(json) {
    const urls = new Set();
    function traverse(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            obj.forEach(item => traverse(item));
        } else {
            // Check current object for common image fields
            if (obj.url && typeof obj.url === 'string' && obj.url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
                urls.add(obj.url);
            }
            if (obj.cover && typeof obj.cover === 'string') {
                urls.add(obj.cover);
            }
            if (obj.avatar && typeof obj.avatar === 'string') {
                urls.add(obj.avatar);
            }
            // Recurse keys
            Object.values(obj).forEach(val => traverse(val));
        }
    }
    traverse(json);
    return Array.from(urls);
}

function buildFullJsonContent(json) {
    return JSON.stringify(json); // Simplified placeholder
}

async function test() {
    try {
        const filePath = path.join(__dirname, '../', 'jsoncharaexample2');
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return;
        }

        const rawData = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(rawData);
        const data = jsonData.data || jsonData;

        console.log('--- DATA DUMP START ---');
        console.log('name:', data.name);
        console.log('title:', data.title);
        console.log('characterSnapshots:', Array.isArray(data.characterSnapshots) ? 'Array' : typeof data.characterSnapshots);
        console.log('--- DATA DUMP END ---');

        // Logic from routes/content.js
        const isCharacter = (data.name && !data.title);

        console.log('isCharacter detected as:', isCharacter);

        // Extract preview info
        const images = extractImageUrls(jsonData);

        let tagNames = [];
        let characterPreviews = [];
        let estimatedTextLength = 0;

        if (isCharacter) {
            tagNames = (data.tags || []).map(t => ({ name: t, type: 'tag', nsfw: false }));
            // For character, we can estimate text from bio/description
            estimatedTextLength = (data.description || '').length + (data.descriptionSummary || '').length;
        } else {
            const textPreview = buildFullJsonContent(jsonData);
            estimatedTextLength = textPreview.length;

            tagNames = data.tagSnapshots
                ?.filter(t => !t.deleted)
                ?.map(t => ({ name: t.name, type: t.type, nsfw: t.nsfw || false })) || [];

            characterPreviews = data.characterSnapshots?.map(c => ({
                name: c.name,
                nsfw: c.nsfw || false,
                status: c.status,
                hasDescription: !!c.description,
                descriptionLength: c.description?.length || 0,
                tagCount: c.tagSnapshots?.length || 0,
                hasAvatar: !!c.cover?.url
            })) || [];
        }

        const preview = {
            title: isCharacter ? (data.name || 'Unnamed Character') : (data.title || 'Untitled'),
            type: isCharacter ? 'character' : 'storyline',
            status: data.status,
            nsfw: data.nsfw || false,
            hasCover: !!data.cover?.url,
            coverUrl: data.cover?.url || null,
            characterCount: isCharacter ? 0 : (data.characterSnapshots?.length || 0),
            personaCount: isCharacter ? 0 : (data.personaSnapshots?.length || 0),
            tagCount: isCharacter ? (data.tags?.length || 0) : tagNames.length,
            imageCount: images.length,
            estimatedTextLength: estimatedTextLength,
            tags: tagNames.slice(0, 20),
            characters: characterPreviews
        };

        console.log('PREVIEW GENERATED SUCCESSFULLY:');
        console.log(JSON.stringify(preview, null, 2));

    } catch (error) {
        console.error('ERROR:', error);
    }
}

test();
