const User = require('../models/User');
const mongoose = require('mongoose');
const { getRedisClient } = require('../utils/redisCache');

let ioInstance = null;
const localConnectionCount = new Map();
let flushTimer = null;

const ONLINE_USERS_KEY = 'online:users';
const DIRTY_USERS_KEY = 'presence:dirty-users';
const PRESENCE_FLUSH_INTERVAL_MS = 60 * 1000;

async function getOnlineUserIds() {
    const redis = getRedisClient();
    try {
        const members = await redis.smembers(ONLINE_USERS_KEY);
        return members
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0);
    } catch (_error) {
        return Array.from(localConnectionCount.entries())
            .filter(([, count]) => Number(count) > 0)
            .map(([key]) => Number(key));
    }
}

async function persistPresenceBatch() {
    if (mongoose.connection.readyState !== 1) {
        return;
    }

    const redis = getRedisClient();

    let dirtyUserIds = [];
    try {
        dirtyUserIds = await redis.smembers(DIRTY_USERS_KEY);
    } catch (_error) {
        return;
    }

    const userIds = dirtyUserIds
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0);

    if (!userIds.length) {
        return;
    }

    let onlineSet = new Set();
    try {
        const onlineMembers = await redis.smembers(ONLINE_USERS_KEY);
        onlineSet = new Set(
            onlineMembers
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value > 0)
        );
    } catch (_error) {
        onlineSet = new Set();
    }

    const now = new Date();
    const operations = userIds.map((userId) => ({
        updateOne: {
            filter: { userId },
            update: {
                $set: {
                    isOnline: onlineSet.has(userId),
                    onlineAt: onlineSet.has(userId) ? now : null
                }
            }
        }
    }));

    await User.bulkWrite(operations, { ordered: false });
    await redis.srem(DIRTY_USERS_KEY, ...userIds.map(String));
}

async function markOnline(userId) {
    const key = String(userId);
    const currentCount = Number(localConnectionCount.get(key) || 0);
    localConnectionCount.set(key, currentCount + 1);

    if (currentCount > 0) {
        return;
    }

    const redis = getRedisClient();
    await redis.sadd(ONLINE_USERS_KEY, key);
    await redis.sadd(DIRTY_USERS_KEY, key);

    ioInstance?.emit('userOnline', {
        userId,
        onlineUsers: await getOnlineUserIds()
    });
}

async function markOffline(userId) {
    const key = String(userId);
    const currentCount = Number(localConnectionCount.get(key) || 0);

    if (currentCount <= 1) {
        localConnectionCount.delete(key);

        const redis = getRedisClient();
        await redis.srem(ONLINE_USERS_KEY, key);
        await redis.sadd(DIRTY_USERS_KEY, key);

        ioInstance?.emit('userOffline', {
            userId,
            onlineUsers: await getOnlineUserIds()
        });
        return;
    }

    localConnectionCount.set(key, currentCount - 1);
}

function attachPresenceSocket(namespace) {
    ioInstance = namespace;

    if (!flushTimer) {
        flushTimer = setInterval(() => {
            persistPresenceBatch().catch(() => {
                // Keep interval alive if persistence fails.
            });
        }, PRESENCE_FLUSH_INTERVAL_MS);

        if (typeof flushTimer.unref === 'function') {
            flushTimer.unref();
        }
    }

    namespace.on('connection', (socket) => {
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
                // Presence writes are best-effort.
            }
        });

        socket.on('disconnect', async () => {
            const userId = Number(socket.data.userId);
            if (!Number.isFinite(userId) || userId < 1) {
                return;
            }

            try {
                await markOffline(userId);
            } catch (_error) {
                // Ignore disconnect-time persistence failures.
            }
        });
    });
}

module.exports = {
    attachPresenceSocket,
    getOnlineUserIds,
    persistPresenceBatch
};
