const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
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
    standardHeaders: true,
    legacyHeaders: false,
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
