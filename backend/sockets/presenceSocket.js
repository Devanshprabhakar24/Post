const User = require('../models/User');
const mongoose = require('mongoose');

let ioInstance = null;
const onlineUsers = new Map();

function getOnlineUserIds() {
    return Array.from(onlineUsers.keys()).map((value) => Number(value));
}

async function setPresence(userId, isOnline) {
    if (mongoose.connection.readyState !== 1) {
        return;
    }

    try {
        await User.updateOne(
            { userId },
            {
                $set: {
                    isOnline,
                    onlineAt: isOnline ? new Date() : null
                }
            }
        );
    } catch (error) {
        const message = String(error?.message || '').toLowerCase();
        const isDisconnectError =
            error?.name === 'MongoNotConnectedError' ||
            message.includes('client must be connected') ||
            message.includes('topology is closed') ||
            message.includes('connection') && message.includes('closed');

        if (!isDisconnectError) {
            throw error;
        }
    }
}

async function markOnline(userId) {
    const key = String(userId);
    const entry = onlineUsers.get(key) || new Set();
    const wasOffline = entry.size === 0;
    entry.add(userId);
    onlineUsers.set(key, entry);

    if (wasOffline) {
        await setPresence(userId, true);
        ioInstance?.emit('userOnline', { userId, onlineUsers: getOnlineUserIds() });
    }
}

async function markOffline(userId) {
    const key = String(userId);
    const entry = onlineUsers.get(key);
    if (!entry) {
        return;
    }

    entry.delete(userId);
    if (entry.size > 0) {
        onlineUsers.set(key, entry);
        return;
    }

    onlineUsers.delete(key);
    await setPresence(userId, false);
    ioInstance?.emit('userOffline', { userId, onlineUsers: getOnlineUserIds() });
}

function attachPresenceSocket(io) {
    ioInstance = io;

    io.on('connection', (socket) => {
        socket.on('identify', async (payload = {}) => {
            const userId = Number(payload.userId || socket.handshake.query.userId);

            if (!Number.isFinite(userId) || userId < 1) {
                return;
            }

            socket.data.userId = userId;
            socket.join(String(userId));
            socket.join(`user:${userId}`);
            try {
                await markOnline(userId);
            } catch (_error) {
                // Presence writes are best-effort; failures should not crash socket flow.
            }
        });

        socket.on('disconnect', async () => {
            const userId = Number(socket.data.userId);
            if (Number.isFinite(userId) && userId > 0) {
                try {
                    await markOffline(userId);
                } catch (_error) {
                    // Ignore disconnect-time persistence failures during shutdown.
                }
            }
        });
    });
}

module.exports = {
    attachPresenceSocket,
    getOnlineUserIds
};