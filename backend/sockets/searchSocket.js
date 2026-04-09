const { searchPostsInDatabase } = require('../controllers/postController');
const { getRedisClient } = require('../utils/redisCache');

function cacheKeyForSearch(query) {
    const normalized = String(query || '').trim().toLowerCase() || '__all__';
    return `search:result:${normalized}`;
}

/**
 * Attach WebSocket (Socket.io) handlers for real-time search
 * Emits 'results' event with matched posts on 'search' event
 */
function attachSearchSocket(namespace) {
    namespace.on('connection', (socket) => {
        let debounceTimer = null;
        let lastSignature = '';

        // Handle search event
        socket.on('search', async (payload) => {
            const query = typeof payload === 'string' ? payload : payload?.query || '';
            const normalizedQuery = String(query || '').trim();
            const requestedDebounce = Number(payload?.debounceMs) || 250;
            const debounceMs = Math.max(100, Math.min(700, requestedDebounce));

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                try {
                    if (normalizedQuery.length > 0 && normalizedQuery.length < 3) {
                        lastSignature = '';
                        socket.emit('results', {
                            success: true,
                            query: normalizedQuery,
                            results: [],
                            count: 0
                        });
                        return;
                    }

                    const redis = getRedisClient();
                    const key = cacheKeyForSearch(normalizedQuery);

                    let posts = null;
                    try {
                        const cached = await redis.get(key);
                        if (cached) {
                            posts = JSON.parse(cached);
                        }
                    } catch (_error) {
                        posts = null;
                    }

                    if (!Array.isArray(posts)) {
                        posts = await searchPostsInDatabase(normalizedQuery);
                        try {
                            await redis.set(key, JSON.stringify(posts), 'PX', 15 * 1000);
                        } catch (_error) {
                            // Ignore cache write errors.
                        }
                    }

                    const signature = JSON.stringify({
                        query: normalizedQuery,
                        ids: posts.map((item) => item.postId),
                        likes: posts.map((item) => item.likes)
                    });

                    if (signature === lastSignature) {
                        return;
                    }

                    lastSignature = signature;

                    // Emit results back to client
                    socket.emit('results', {
                        success: true,
                        query: normalizedQuery,
                        results: posts,
                        count: posts.length
                    });
                } catch (error) {
                    socket.emit('results', {
                        success: false,
                        message: error.message || 'Failed to search posts',
                        results: []
                    });
                }
            }, debounceMs);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            clearTimeout(debounceTimer);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`Client ${socket.id} disconnected`);
            }
        });
    });
}

module.exports = {
    attachSearchSocket
};
