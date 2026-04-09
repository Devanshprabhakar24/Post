const Redis = require('ioredis');
const { incCacheHit, incCacheMiss } = require('../metrics');

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const REDIS_URL = String(process.env.REDIS_URL || 'redis://localhost:6379').trim();
const KEY_PREFIX = String(process.env.CACHE_PREFIX || 'pe:cache').trim();

const localStore = new Map();
let redisClient = null;

function now() {
    return Date.now();
}

function localGet(key) {
    const entry = localStore.get(key);
    if (!entry || entry.expiresAt <= now()) {
        localStore.delete(key);
        return null;
    }

    return entry.value;
}

function localSet(key, value, ttlMs = DEFAULT_TTL_MS) {
    const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
    localStore.set(key, {
        value,
        expiresAt: now() + safeTtl
    });
}

function localClear(key) {
    if (typeof key === 'string' && key.length > 0) {
        localStore.delete(key);
        return;
    }

    localStore.clear();
}

function localClearByPrefix(prefix) {
    if (!prefix) {
        return;
    }

    Array.from(localStore.keys()).forEach((key) => {
        if (key.startsWith(prefix)) {
            localStore.delete(key);
        }
    });
}

function prefixedKey(key) {
    return `${KEY_PREFIX}:${key}`;
}

function getRedisClient() {
    if (!redisClient) {
        redisClient = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableOfflineQueue: true,
            lazyConnect: true
        });

        redisClient.on('error', () => {
            // Redis is optional. Cache methods fall back to local Map.
        });
    }

    if (redisClient.status === 'wait') {
        redisClient.connect().catch(() => {
            // Best-effort connect.
        });
    }

    return redisClient;
}

async function get(key) {
    const redis = getRedisClient();
    try {
        const raw = await redis.get(prefixedKey(key));
        if (raw === null || raw === undefined) {
            const fallback = localGet(key);
            if (fallback === null) {
                incCacheMiss();
            } else {
                incCacheHit();
            }
            return fallback;
        }

        incCacheHit();
        return JSON.parse(raw);
    } catch (_error) {
        const fallback = localGet(key);
        if (fallback === null) {
            incCacheMiss();
        } else {
            incCacheHit();
        }
        return fallback;
    }
}

async function set(key, value, ttlMs = DEFAULT_TTL_MS) {
    const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
    const redis = getRedisClient();

    try {
        await redis.set(prefixedKey(key), JSON.stringify(value), 'PX', safeTtl);
    } catch (_error) {
        localSet(key, value, safeTtl);
    }
}

async function has(key) {
    return (await get(key)) !== null;
}

function clear(key) {
    const redis = getRedisClient();
    if (typeof key === 'string' && key.length > 0) {
        redis.del(prefixedKey(key)).catch(() => {
            localClear(key);
        });
        return;
    }

    redis.keys(`${KEY_PREFIX}:*`)
        .then((keys) => (keys.length ? redis.del(...keys) : null))
        .catch(() => {
            localClear();
        });
}

function clearByPrefix(prefix) {
    if (!prefix) {
        return;
    }

    const redis = getRedisClient();
    redis.keys(`${KEY_PREFIX}:${prefix}*`)
        .then((keys) => {
            if (!keys.length) {
                return null;
            }

            const pipeline = redis.pipeline();
            keys.forEach((key) => {
                pipeline.del(key);
            });
            return pipeline.exec();
        })
        .catch(() => {
            localClearByPrefix(prefix);
        });
}

async function remember(key, ttlMs, factory) {
    const cached = await get(key);
    if (cached !== null) {
        return cached;
    }

    const value = await factory();
    await set(key, value, ttlMs);
    return value;
}

module.exports = {
    get,
    set,
    has,
    clear,
    clearByPrefix,
    remember,
    DEFAULT_TTL_MS,
    redisClient: getRedisClient,
    getRedisClient
};