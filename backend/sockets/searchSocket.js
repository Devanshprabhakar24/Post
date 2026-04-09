const { searchPostsInDatabase } = require('../controllers/postController');

/**
 * Attach WebSocket (Socket.io) handlers for real-time search
 * Emits 'results' event with matched posts on 'search' event
 */
function attachSearchSocket(io) {
    io.on('connection', (socket) => {
        let debounceTimer = null;
        let lastSignature = '';

        // Handle search event
        socket.on('search', async (payload) => {
            const query = typeof payload === 'string' ? payload : payload?.query || '';
            const requestedDebounce = Number(payload?.debounceMs) || 250;
            const debounceMs = Math.max(100, Math.min(700, requestedDebounce));

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                try {
                    const posts = await searchPostsInDatabase(query);
                    const signature = JSON.stringify({
                        query,
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
                        query,
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
