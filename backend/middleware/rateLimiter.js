const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../utils/redisCache');

const isProduction = process.env.NODE_ENV === 'production';

function createStore(prefix) {
    if (!isProduction) {
        return undefined;
    }

    if (!String(process.env.REDIS_URL || '').trim()) {
        return undefined;
    }

    const redisClient = getRedisClient();
    if (!redisClient) {
        return undefined;
    }

    return new RedisStore({
        prefix,
        sendCommand: (...args) => redisClient.call(...args)
    });
}

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 5000,
    store: createStore('rl:global:'),
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    skip: (req) => req.path === '/health',
    message: {
        success: false,
        data: null,
        message: 'Too many requests from this IP, please try again later'
    }
});

const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isProduction ? 40 : 400,
    store: createStore('rl:search:'),
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    message: {
        success: false,
        data: null,
        message: 'Too many search requests, please slow down'
    }
});

module.exports = {
    globalLimiter,
    searchLimiter
};
