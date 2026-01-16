const mongoose = require('mongoose');
const Storyline = require('../models/Storyline');

// dotenv.config({ path: '../../.env' });
const MONGODB_URI = "mongodb+srv://Kim:VK3Pzn6j4PcbbMDM@cluster0.vxyffbb.mongodb.net/?appName=Cluster0";

const debugLatest = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the latest Storyline
        const latestStory = await Storyline.findOne().sort({ createdAt: -1 });

        if (!latestStory) {
            console.log('No storylines found.');
        } else {
            console.log('--- LATEST STORYLINE ---');
            console.log('ID:', latestStory._id);
            console.log('Title:', latestStory.title);
            console.log('Moderation Result:', JSON.stringify(latestStory.moderationResult, null, 2));
            console.log('Offending Snippet:', latestStory.moderationResult?.offendingSnippet);
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugLatest();
