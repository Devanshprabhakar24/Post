require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const { ensureRedisClient } = require('./config/redis');
const { attachSearchSocket } = require('./sockets/searchSocket');
const { attachLikeSocket } = require('./sockets/likeSocket');
const { attachNotificationSocket } = require('./sockets/notificationSocket');
const { attachPostSocket } = require('./sockets/postSocket');
const { attachCommentSocket } = require('./sockets/commentSocket');
const { attachPresenceSocket } = require('./sockets/presenceSocket');
const { startSyncCronJob } = require('./jobs/syncCron');
const { startLikeFlushJob } = require('./jobs/likeFlushJob');
const { startUploadWorker, stopUploadWorker } = require('./jobs/uploadQueue');
const { setActiveSocketConnections } = require('./metrics');

// Services
const apiService = require('./services/apiService');

// Models
const Post = require('./models/Post');
const User = require('./models/User');
const Comment = require('./models/Comment');

const PORT = Number(process.env.PORT) || 5000;

function resolveAllowedOrigins() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const configuredOrigins = String(process.env.CORS_ORIGIN || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (configuredOrigins.length > 0) {
        return configuredOrigins;
    }

    return isDevelopment ? ['http://localhost:5173'] : [];
}

/**
 * Upsert helper function
 */
async function upsertData(Model, items, idField, normalizeFn) {
    if (!Array.isArray(items) || items.length === 0) {
        return { fetched: 0, upserted: 0, modified: 0 };
    }

    const operations = items.map((item) => ({
        updateOne: {
            filter: { [idField]: item.id },
            update: { $set: normalizeFn(item) },
            upsert: true
        }
    }));

    const result = await Model.bulkWrite(operations, { ordered: false });
    return {
        fetched: items.length,
        upserted: result.upsertedCount,
        modified: result.modifiedCount
    };
}

async function seedInitialDataIfNeeded() {
    console.log('\n📊 Seeding data from JSONPlaceholder API...');

    try {
        const [postCount, userCount, commentCount] = await Promise.all([
            Post.estimatedDocumentCount(),
            User.estimatedDocumentCount(),
            Comment.estimatedDocumentCount()
        ]);

        if (postCount === 0) {
            console.log('  ⬇️  Fetching posts...');
            const postsResult = await apiService.fetchPosts();
            if (postsResult.success) {
                const postsSummary = await upsertData(
                    Post,
                    postsResult.data,
                    'postId',
                    (p) => ({ id: p.id, postId: p.id, userId: p.userId, title: p.title, body: p.body, isExternal: true })
                );
                console.log(`  ✓ Posts seeded: ${postsSummary.upserted} upserted, ${postsSummary.modified} modified`);
            }
        } else {
            console.log(`  ✓ Posts already exist (${postCount} documents)`);
        }

        if (userCount === 0) {
            console.log('  ⬇️  Fetching users...');
            const usersResult = await apiService.fetchUsers();
            if (usersResult.success) {
                const usersSummary = await upsertData(
                    User,
                    usersResult.data,
                    'userId',
                    (u) => ({
                        id: u.id,
                        userId: u.id,
                        name: u.name,
                        username: u.username,
                        email: u.email,
                        address: u.address || {},
                        phone: u.phone || '',
                        website: u.website || '',
                        company: u.company || {},
                        isExternal: true
                    })
                );
                console.log(`  ✓ Users seeded: ${usersSummary.upserted} upserted, ${usersSummary.modified} modified`);
            }
        } else {
            console.log(`  ✓ Users already exist (${userCount} documents)`);
        }

        if (commentCount === 0) {
            console.log('  ⬇️  Fetching comments...');
            const commentsResult = await apiService.fetchComments();
            if (commentsResult.success) {
                const commentsSummary = await upsertData(
                    Comment,
                    commentsResult.data,
                    'commentId',
                    (c) => ({
                        id: c.id,
                        commentId: c.id,
                        userId: c.userId || c.postId || 1,
                        postId: c.postId,
                        parentCommentId: c.parentCommentId ?? null,
                        name: c.name,
                        email: c.email,
                        body: c.body
                    })
                );
                console.log(`  ✓ Comments seeded: ${commentsSummary.upserted} upserted, ${commentsSummary.modified} modified`);
            }
        } else {
            console.log(`  ✓ Comments already exist (${commentCount} documents)`);
        }
    } catch (seedError) {
        console.error('⚠️  Error during data seeding:', seedError.message);
    }
}

/**
 * Bootstrap server with database and WebSocket
 */
async function bootstrap() {
    try {
        const required = ['MONGO_URI', 'JWT_SECRET'];
        required.forEach((key) => {
            if (!String(process.env[key] || '').trim()) {
                throw new Error(`Missing env: ${key}`);
            }
        });

        // Connect to MongoDB
        await connectDatabase();
        console.log('✓ Connected to MongoDB');

        // Create HTTP server and Socket.io
        const server = http.createServer(app);
        const allowedOrigins = resolveAllowedOrigins();
        const io = new Server(server, {
            cors: {
                origin(origin, callback) {
                    if (!origin) {
                        return callback(null, true);
                    }

                    if (allowedOrigins.includes(origin)) {
                        return callback(null, true);
                    }

                    return callback(new Error('Not allowed by CORS'));
                },
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        const redisClient = await ensureRedisClient();
        if (redisClient) {
            const subClient = redisClient.duplicate();
            try {
                if (subClient.status === 'wait') {
                    await subClient.connect();
                }

                io.adapter(
                    createAdapter(redisClient, subClient, {
                        key: String(process.env.SOCKET_REDIS_PREFIX || 'pe:socket')
                    })
                );
                console.log('✓ Socket.IO Redis adapter enabled');
            } catch (_error) {
                console.warn('⚠️  Socket.IO Redis adapter unavailable, using in-memory adapter');
            }
        }

        const searchNamespace = io.of('/search');
        const feedNamespace = io.of('/feed');
        const presenceNamespace = io.of('/presence');

        attachSearchSocket(searchNamespace);
        attachLikeSocket(feedNamespace);
        attachNotificationSocket(feedNamespace);
        attachPostSocket(feedNamespace);
        attachCommentSocket(feedNamespace);
        attachPresenceSocket(presenceNamespace);

        io.on('connection', () => {
            setActiveSocketConnections(io.engine.clientsCount);
        });
        io.engine.on('connection_error', () => {
            setActiveSocketConnections(io.engine.clientsCount);
        });
        io.engine.on('close', () => {
            setActiveSocketConnections(io.engine.clientsCount);
        });

        // Start hourly fetch cron
        const cronTask = startSyncCronJob();
        const likeFlushJob = startLikeFlushJob();
        startUploadWorker();

        // Start HTTP/WebSocket server
        server.on('error', async (error) => {
            if (error?.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use. Stop the running process or set a different PORT.`);
            } else {
                console.error('❌ HTTP server failed to start:', error?.message || error);
            }

            cronTask.stop();
            await likeFlushJob.flush();
            likeFlushJob.stop();
            await stopUploadWorker();
            await new Promise((resolve) => io.close(resolve));
            await disconnectDatabase();
            process.exit(1);
        });

        server.listen(PORT, () => {
            console.log(`\n${'═'.repeat(60)}`);
            console.log(`🚀 Real-Time Post Explorer Backend`);
            console.log(`${'═'.repeat(60)}`);
            console.log(`\n📍 HTTP Server`);
            console.log(`   http://localhost:${PORT}`);
            console.log(`\n🔌 WebSocket (Socket.io)`);
            console.log(`   ws://localhost:${PORT}`);
            console.log(`\n📡 API Endpoints`);
            console.log(`   Health:   GET http://localhost:${PORT}/api/health`);
            console.log(`   Posts:    GET http://localhost:${PORT}/api/posts`);
            console.log(`   Users:    GET http://localhost:${PORT}/api/users`);
            console.log(`   Comments: GET http://localhost:${PORT}/api/comments`);
            console.log(`   Stats:    GET http://localhost:${PORT}/api/stats`);
            console.log(`   Search:   GET http://localhost:${PORT}/api/search?q=query`);
            console.log(`\n${'═'.repeat(60)}\n`);

            if (String(process.env.SEED_ON_START || 'true').toLowerCase() !== 'false') {
                setImmediate(() => {
                    seedInitialDataIfNeeded().catch((error) => {
                        console.error('⚠️  Background seed failed:', error?.message || error);
                    });
                });
            }
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            console.log(`\n⏹️  Received ${signal}, shutting down gracefully...`);

            const forceExitTimer = setTimeout(() => {
                process.exit(1);
            }, 10_000);

            await new Promise((resolve) => {
                server.close(() => {
                    console.log('  ✓ HTTP server closed');
                    resolve();
                });
            });

            cronTask.stop();
            await likeFlushJob.flush();
            likeFlushJob.stop();
            await stopUploadWorker();
            await new Promise((resolve) => io.close(resolve));

            const redis = await ensureRedisClient();
            if (redis && redis.status === 'ready') {
                await redis.quit();
            }

            await disconnectDatabase();
            clearTimeout(forceExitTimer);
            console.log('  ✓ Database connection closed');
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    } catch (error) {
        console.error('❌ Failed to start backend:', error.message);
        process.exit(1);
    }
}

// Start the server
bootstrap();
