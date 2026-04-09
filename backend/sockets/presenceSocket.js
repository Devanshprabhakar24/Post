const User = require('../models/User');

let ioInstance = null;
const onlineUsers = new Map();

function getOnlineUserIds() {
    return Array.from(onlineUsers.keys()).map((value) => Number(value));
}

async function setPresence(userId, isOnline) {
    await User.updateOne(
        { userId },
        {
            $set: {
                isOnline,
                onlineAt: isOnline ? new Date() : null
            }
        }
    );
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
            await markOnline(userId);
        });

        socket.on('disconnect', async () => {
            const userId = Number(socket.data.userId);
            if (Number.isFinite(userId) && userId > 0) {
                await markOffline(userId);
            }
        });
    });
}

module.exports = {
    attachPresenceSocket,
    getOnlineUserIds
};