const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const mongoose = require('mongoose');
const path = require('path');

// Routes
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/commentRoutes');
const statsRoutes = require('./routes/statsRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const { fetchAndStoreData, search } = require('./controllers/postController');

// Middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { globalLimiter, searchLimiter } = require('./middleware/rateLimiter');

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
    app.use(compression());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(morgan('dev'));
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Lightweight request timing to help track endpoint latency
    app.use((req, res, next) => {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            const end = process.hrtime.bigint();
            const durationMs = Number(end - start) / 1e6;
            if (process.env.NODE_ENV !== 'production' && durationMs > 300) {
                console.log(`[perf] ${req.method} ${req.originalUrl} ${durationMs.toFixed(2)}ms`);
            }
        });
        next();
    });

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
                database: getDatabaseStatus()
            },
            message: 'Health check successful'
        });
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

    // 404 handler
    app.use(notFoundHandler);

    // Error handler (must be last)
    app.use(errorHandler);

    return app;
}

const app = createApp();

module.exports = app;
module.exports.createApp = createApp;
