let ioInstance = null;

function attachLikeSocket(io) {
    ioInstance = io;

    io.on('connection', (socket) => {
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

    ioInstance.emit('likeUpdated', payload);
    if (payload?.postId) {
        ioInstance.to(`post:${payload.postId}`).emit('likeUpdated', payload);
    }
}

module.exports = {
    attachLikeSocket,
    emitLikeUpdated
};
