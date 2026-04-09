let ioInstance = null;

function attachNotificationSocket(namespace) {
    ioInstance = namespace;

    namespace.on('connection', (socket) => {
        socket.on('identify', (payload = {}) => {
            const userId = Number(payload.userId || socket.handshake.query.userId);
            if (!Number.isFinite(userId) || userId < 1) {
                return;
            }

            socket.join(String(userId));
            socket.join(`user:${userId}`);
        });
    });
}

function emitNotification(payload) {
    if (!ioInstance) {
        return;
    }

    const recipientId = Number(payload?.recipientId || payload?.targetUserId);
    if (Number.isFinite(recipientId) && recipientId > 0) {
        ioInstance.to(String(recipientId)).emit('notification', payload);
        ioInstance.to(`user:${recipientId}`).emit('notification', payload);
    }
}

module.exports = {
    attachNotificationSocket,
    emitNotification
};