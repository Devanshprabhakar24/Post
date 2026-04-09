let ioInstance = null;
const pendingByPost = new Map();
const emitTimers = new Map();

function flushPostLike(postId) {
    const payload = pendingByPost.get(postId);
    if (!payload || !ioInstance) {
        pendingByPost.delete(postId);
        emitTimers.delete(postId);
        return;
    }

    ioInstance.emit('likeUpdated', payload);
    ioInstance.to(`post:${postId}`).emit('likeUpdated', payload);

    pendingByPost.delete(postId);
    emitTimers.delete(postId);
}

function attachLikeSocket(namespace) {
    ioInstance = namespace;

    namespace.on('connection', (socket) => {
        socket.on('joinPost', (postId) => {
            const normalized = Number(postId);
            if (!Number.isNaN(normalized) && normalized > 0) {
                socket.join(`post:${normalized}`);
            }
        });
    });
}

function emitLikeUpdated(payload) {
    if (!ioInstance) {
        return;
    }

    const postId = Number(payload?.postId);
    if (!Number.isFinite(postId) || postId < 1) {
        ioInstance.emit('likeUpdated', payload);
        return;
    }

    pendingByPost.set(postId, payload);
    if (!emitTimers.has(postId)) {
        emitTimers.set(
            postId,
            setTimeout(() => {
                flushPostLike(postId);
            }, 1000)
        );
    }
}

module.exports = {
    attachLikeSocket,
    emitLikeUpdated
};
