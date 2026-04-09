const express = require('express');
const cors = require('cors');
const pino = require('pino');
const pinoHttp = require('pino-http');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const mongoose = require('mongoose');
const path = require('path');
const { getRedisClient } = require('./utils/redisCache');
const { getMetricsText, observeHttpRequest } = require('./metrics');

// Routes
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/commentRoutes');
const statsRoutes = require('./routes/statsRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const metricsRoutes = require('./routes/metricsRoutes');

const { fetchAndStoreData, search } = require('./controllers/postController');

// Middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { globalLimiter, searchLimiter } = require('./middleware/rateLimiter');
const {
    requestIdMiddleware,
    requestMetricsMiddleware,
    getApiMetricsSnapshot
} = require('./middleware/observability');

function getDatabaseStatus() {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };

    return states[mongoose.connection.readyState] || 'unknown';
}

function createApp() {
    const app = express();
    const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const configuredOrigins = String(process.env.CORS_ORIGIN || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    const allowedOrigins = configuredOrigins.length > 0
        ? configuredOrigins
        : (isDevelopment ? ['http://localhost:5173'] : []);

    const corsOptions = {
        origin(origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    };

    // Return full JSON payloads for API requests instead of 304 revalidation responses.
    app.set('etag', false);

    // Middleware
    app.use(cors(corsOptions));
    app.options(/.*/, cors(corsOptions));
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use((req, _res, next) => {
        if (req.body && typeof req.body === 'object') {
            req.body = mongoSanitize.sanitize(req.body);
        }

        if (req.params && typeof req.params === 'object') {
            req.params = mongoSanitize.sanitize(req.params);
        }

        next();
    });
    app.use(compression());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(pinoHttp({ logger }));
    app.use(requestIdMiddleware);
    app.use(requestMetricsMiddleware);
    app.use((req, res, next) => {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
            observeHttpRequest({
                method: req.method,
                route: req.route?.path || req.path,
                statusCode: res.statusCode,
                durationMs
            });
        });
        next();
    });
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Global rate limiting
    app.use('/api/', globalLimiter);

    // Health check endpoint
    app.get('/api/health', (_req, res) => {
        res.status(200).json({
            success: true,
            data: {
                status: 'ok',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                database: getDatabaseStatus(),
                metrics: getApiMetricsSnapshot()
            },
            message: 'Health check successful'
        });
    });

    app.get('/api/health/live', (_req, res) => {
        return res.status(200).json({
            success: true,
            data: {
                status: 'live',
                timestamp: new Date().toISOString()
            },
            message: 'Liveness probe successful'
        });
    });

    app.get('/api/health/ready', async (_req, res) => {
        try {
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({
                    success: false,
                    data: {
                        databaseReady: false,
                        redisReady: false
                    },
                    message: 'Readiness probe failed'
                });
            }

            const hasRedisConfig = Boolean(String(process.env.REDIS_URL || '').trim());
            if (!hasRedisConfig) {
                return res.status(200).json({
                    success: true,
                    data: {
                        databaseReady: true,
                        redisReady: false,
                        redisRequired: false
                    },
                    message: 'Readiness probe successful'
                });
            }

            const redis = getRedisClient();
            const pong = await redis.ping();
            const redisReady = pong === 'PONG';

            if (!redisReady) {
                return res.status(503).json({
                    success: false,
                    data: {
                        databaseReady: true,
                        redisReady: false
                    },
                    message: 'Readiness probe failed'
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    databaseReady: true,
                    redisReady: true,
                    redisRequired: true
                },
                message: 'Readiness probe successful'
            });
        } catch (_error) {
            return res.status(503).json({
                success: false,
                data: {
                    databaseReady: mongoose.connection.readyState === 1,
                    redisReady: false
                },
                message: 'Readiness probe failed'
            });
        }
    });

    app.get('/metrics', async (req, res) => {
        const allowList = String(process.env.METRICS_ALLOWLIST || '127.0.0.1,::1').split(',').map((entry) => entry.trim()).filter(Boolean);
        const remote = String(req.ip || req.connection?.remoteAddress || '').replace('::ffff:', '');
        if (!allowList.includes(remote)) {
            return res.status(403).type('text/plain').send('forbidden\n');
        }

        const metrics = await getMetricsText();
        return res.status(200).type('text/plain; version=0.0.4').send(metrics);
    });

    // Data fetch endpoint
    app.get('/api/data/fetch', fetchAndStoreData);

    // REST Search endpoint
    app.get('/api/search', searchLimiter, search);

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/posts', postRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/comments', commentRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/stats', statsRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/metrics', metricsRoutes);

    // 404 handler
    app.use(notFoundHandler);

    // Error handler (must be last)
    app.use(errorHandler);

    return app;
}

const app = createApp();

module.exports = app;
module.exports.createApp = createApp;
