const rateLimit = require('express-rate-limit')
const Redis = require('ioredis')
const RedisStoreModule = require('rate-limit-redis')
const RedisStore = RedisStoreModule.default || RedisStoreModule
const logger = require('../utils/logger')

const redisClient = new Redis(process.env.REDIS_URL)

const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => {
        // Skip routes that have their own specific limiters
        return req.path.includes('create-post') || req.method === 'DELETE';
    },
    handler: (req, res) => {
        logger.warn('IP %s exceeded global rate limit', req.ip)
        return res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.'
        })
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
})

const createPostLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('IP %s exceeded createPost rate limit', req.ip)
        return res.status(429).json({
            success: false,
            message: 'Too many posts created. Wait before posting again.'
        })
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
})

const deletePostLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('IP %s exceeded deletePost rate limit', req.ip)
        return res.status(429).json({
            success: false,
            message: 'Too many deletions. Wait before deleting again.'
        })
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
})

module.exports = {
    globalRateLimiter,
    createPostLimiter,
    deletePostLimiter
}