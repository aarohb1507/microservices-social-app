const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit!");
  try {
    const { query, page = 1, limit = 10 } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    // Create cache key
    const cacheKey = `search:${query.trim().toLowerCase()}:${page}:${limit}`;
    
    // Step 1: Check Redis cache
    const cachedResults = await req.redisClient.get(cacheKey);
    if (cachedResults) {
      logger.info("Cache hit for query: %s", query);
      return res.json(JSON.parse(cachedResults));
    }

    logger.info("Cache miss for query: %s, fetching from DB", query);

    // Step 2: Query MongoDB
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(parseInt(limit));

    const totalResults = await Search.countDocuments({
      $text: { $search: query }
    });

    const response = {
      success: true,
      data: results,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        totalResults: totalResults,
        totalPages: Math.ceil(totalResults / limit)
      }
    };

    // Step 3: Cache results for 5 minutes (300 seconds)
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(response));
    logger.info("Cached search results for query: %s", query);

    res.json(response);
  } catch (e) {
    logger.error("Error while searching post: %s", e.message);
    res.status(500).json({
      success: false,
      message: "Error while searching post",
    });
  }
};

module.exports = { searchPostController };