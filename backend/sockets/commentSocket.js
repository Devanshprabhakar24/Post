let ioInstance = null;

function attachCommentSocket(namespace) {
    ioInstance = namespace;
}

function emitCommentCreated(payload) {
    if (!ioInstance) {
        return;
    }

    const postId = Number(payload?.postId);
    ioInstance.emit('commentCreated', payload);

    if (Number.isFinite(postId) && postId > 0) {
        ioInstance.to(`post:${postId}`).emit('commentCreated', payload);
    }
}

module.exports = {
    attachCommentSocket,
    emitCommentCreated
};
