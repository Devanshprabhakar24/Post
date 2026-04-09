let ioInstance = null;

function attachPostSocket(namespace) {
    ioInstance = namespace;
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