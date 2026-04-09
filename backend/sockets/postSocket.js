let ioInstance = null;

function attachPostSocket(io) {
    ioInstance = io;
}

function emitNewPost(payload) {
    if (!ioInstance) {
        return;
    }

    ioInstance.emit('newPost', payload);
}

module.exports = {
    attachPostSocket,
    emitNewPost
};