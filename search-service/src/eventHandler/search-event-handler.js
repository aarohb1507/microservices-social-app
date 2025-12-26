const logger = require("../utils/logger");
const Search = require("../models/Search");

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
    } catch (error) {
        logger.error("Error creating search document", error);
    }
}

const handlePostDeleted = async (event) => {
    const { postId } = event;
    try {
        await Search.deleteOne({ postId });
        logger.info(`Search document deleted for post id ${postId}`);
    } catch (error) {
        logger.error("Error deleting search document", error);
    }
}
module.exports = { handlePostCreated, handlePostDeleted };
