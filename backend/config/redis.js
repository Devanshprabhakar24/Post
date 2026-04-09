const { getRedisClient } = require('../utils/redisCache');

async function ensureRedisClient() {
    const client = getRedisClient();

    if (client.status === 'wait') {
        try {
            await client.connect();
        } catch (_error) {
            return null;
        }
    }

    return client.status === 'ready' ? client : null;
}

module.exports = {
    getRedisClient,
    ensureRedisClient
};
