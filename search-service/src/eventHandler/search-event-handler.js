const logger = require("../utils/logger");
const Search = require("../models/Search");
const Redis = require("ioredis");

const redisClient = new Redis(process.env.REDIS_URL);

// Helper function to invalidate search cache
const invalidateSearchCache = async () => {
    try {
        // Get all cache keys matching "search:*"
        const keys = await redisClient.keys("search:*");
        if (keys.length > 0) {
            await redisClient.del(...keys);
            logger.info("Invalidated %d search cache keys", keys.length);
        }
    } catch (error) {
        logger.error("Error invalidating search cache: %s", error.message);
    }
};

const handlePostCreated = async (event) => {
    const { postId, userId, content, createdAt } = event;
    try {
        const newSearchPost = new Search({
            postId,
            userId,
            content,
            createdAt
        });
        await newSearchPost.save();
        logger.info(`Search document created for post id ${postId}`);
        
        // Invalidate search cache when new post is indexed
        await invalidateSearchCache();
    } catch (error) {
        logger.error("Error creating search document: %s", error.message);
    }
}

const handlePostDeleted = async (event) => {
    const { postId } = event;
    try {
        await Search.deleteOne({ postId });
        logger.info(`Search document deleted for post id ${postId}`);
        
        // Invalidate search cache when post is deleted
        await invalidateSearchCache();
    } catch (error) {
        logger.error("Error deleting search document: %s", error.message);
    }
}

module.exports = { handlePostCreated, handlePostDeleted };
