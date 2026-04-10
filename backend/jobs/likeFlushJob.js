const Post = require('../models/Post');
const { getRedisClient } = require('../utils/redisCache');
const { setLikeBufferQueueSize } = require('../metrics');

const LIKE_DELTA_KEY_PREFIX = 'like:delta:';
const LIKE_DELTA_SET_KEY = 'like:delta:keys';
const FLUSH_INTERVAL_MS = 3 * 1000;

let timer = null;
let flushing = false;

function buildDeltaKey(postId) {
    return `${LIKE_DELTA_KEY_PREFIX}${postId}`;
}

async function bufferLikeDelta(postId, delta) {
    const normalizedPostId = Number(postId);
    const normalizedDelta = Number(delta);
    if (!Number.isFinite(normalizedPostId) || !Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
        return;
    }

    const redis = getRedisClient();
    const key = buildDeltaKey(normalizedPostId);
    try {
        await redis.multi()
            .incrby(key, normalizedDelta)
            .sadd(LIKE_DELTA_SET_KEY, normalizedPostId)
            .exec();

        const size = await redis.scard(LIKE_DELTA_SET_KEY);
        setLikeBufferQueueSize(size);
    } catch (_error) {
        // Best-effort buffering; write path still persists PostLike documents.
    }
}

async function flushLikeDeltas() {
    if (flushing) {
        return;
    }

    flushing = true;
    const redis = getRedisClient();

    try {
        const postIds = await redis.smembers(LIKE_DELTA_SET_KEY);
        setLikeBufferQueueSize(postIds.length);
        if (!postIds.length) {
            return;
        }

        const pipeline = redis.pipeline();
        postIds.forEach((postId) => pipeline.get(buildDeltaKey(postId)));
        const responses = await pipeline.exec();

        const operations = [];
        const successfulPostIds = [];
        for (let i = 0; i < postIds.length; i += 1) {
            const postId = Number(postIds[i]);
            const [pipelineError, raw] = responses?.[i] || [];
            if (pipelineError || !Number.isFinite(postId)) {
                continue;
            }

            const value = Number(raw || 0);
            if (!Number.isFinite(value) || value === 0) {
                continue;
            }

            operations.push({
                updateOne: {
                    filter: { postId },
                    update: {
                        $inc: { likes: value }
                    }
                }
            });
            successfulPostIds.push(postId);
        }

        if (operations.length > 0) {
            await Post.bulkWrite(operations, { ordered: false });
            await Post.updateMany({ likes: { $lt: 0 } }, { $set: { likes: 0 } });
        }

        const cleanup = redis.pipeline();
        successfulPostIds.forEach((postId) => {
            cleanup.del(buildDeltaKey(postId));
            cleanup.srem(LIKE_DELTA_SET_KEY, postId);
        });
        await cleanup.exec();
        setLikeBufferQueueSize(0);
    } finally {
        flushing = false;
    }
}

function startLikeFlushJob() {
    if (timer) {
        return {
            flush: flushLikeDeltas,
            stop: stopLikeFlushJob
        };
    }

    timer = setInterval(() => {
        flushLikeDeltas().catch(() => {
            // Keep job alive if one flush cycle fails.
        });
    }, FLUSH_INTERVAL_MS);

    if (typeof timer.unref === 'function') {
        timer.unref();
    }

    return {
        flush: flushLikeDeltas,
        stop: stopLikeFlushJob
    };
}

function stopLikeFlushJob() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

module.exports = {
    bufferLikeDelta,
    flushLikeDeltas,
    startLikeFlushJob,
    stopLikeFlushJob
};