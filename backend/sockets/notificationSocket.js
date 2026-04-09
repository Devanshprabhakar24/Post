let ioInstance = null;

function attachNotificationSocket(io) {
    ioInstance = io;
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