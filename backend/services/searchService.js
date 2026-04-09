const Post = require('../models/Post');
const User = require('../models/User');

function buildRegex(query) {
    return { $regex: query, $options: 'i' };
}

function normalizeTag(query) {
    return String(query || '').replace(/^#/, '').trim().toLowerCase();
}

function normalizePostRow(post) {
    return {
        postId: post.postId,
        userId: post.userId,
        title: post.title,
        body: post.body,
        likes: Number(post.likes) || 0,
        likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
        imageUrl: String(post.imageUrl || ''),
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
    };
}

function computeSearchScore(post, normalized, hashtag) {
    const title = String(post?.title || '').toLowerCase();
    const body = String(post?.body || '').toLowerCase();
    const authorName = String(post?.author?.name || '').toLowerCase();
    const authorUsername = String(post?.author?.username || '').toLowerCase();
    const tags = Array.isArray(post?.hashtags) ? post.hashtags.map((tag) => String(tag || '').toLowerCase()) : [];

    let score = 0;

    if (title === normalized) {
        score += 120;
    } else if (title.startsWith(normalized)) {
        score += 80;
    } else if (title.includes(normalized)) {
        score += 55;
    }

    if (body.includes(normalized)) {
        score += 30;
    }

    if (authorName.includes(normalized) || authorUsername.includes(normalized)) {
        score += 45;
    }

    if (hashtag && tags.includes(hashtag)) {
        score += 75;
    }

    const likeBoost = Math.min(35, Math.log10((Number(post?.likes) || 0) + 1) * 10);
    score += likeBoost;

    if (post?.createdAt) {
        const ageHours = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
        const recencyBoost = Math.max(0, 20 - Math.min(20, ageHours / 6));
        score += recencyBoost;
    }

    return Number(score.toFixed(2));
}

async function hydrateAuthors(posts) {
    const list = Array.isArray(posts) ? posts : [];
    if (list.length === 0) {
        return [];
    }

    const userIds = Array.from(
        new Set(
            list
                .map((post) => Number(post?.userId))
                .filter((userId) => Number.isFinite(userId) && userId > 0)
        )
    );

    if (userIds.length === 0) {
        return list;
    }

    const authors = await User.find({ userId: { $in: userIds } })
        .select({ _id: 0, userId: 1, name: 1, username: 1, email: 1, imageUrl: 1, bio: 1, isOnline: 1 })
        .lean();

    const authorMap = authors.reduce((acc, author) => {
        acc[Number(author.userId)] = author;
        return acc;
    }, {});

    return list.map((post) => ({
        ...post,
        author: authorMap[Number(post.userId)] || null
    }));
}

async function findMatchedUserIds(regex, limit) {
    const matchedUsers = await User.find({
        $or: [{ name: regex }, { username: regex }]
    })
        .select({ _id: 0, userId: 1 })
        .limit(limit)
        .lean();

    return matchedUsers
        .map((user) => Number(user?.userId))
        .filter((userId) => Number.isFinite(userId));
}

function buildSearchConditions(normalized, hashtag, matchedUserIds) {
    const regex = buildRegex(normalized);
    const conditions = [{ title: regex }, { body: regex }];

    if (hashtag) {
        conditions.push({ hashtags: hashtag });
    }

    if (matchedUserIds.length > 0) {
        conditions.push({ userId: { $in: matchedUserIds } });
    }

    return conditions;
}

function summarizeExecutionStats(explain) {
    const executionStats = explain?.executionStats || {};
    const winningPlan = explain?.queryPlanner?.winningPlan || null;

    return {
        executionTimeMillis: Number(executionStats.executionTimeMillis || 0),
        totalKeysExamined: Number(executionStats.totalKeysExamined || 0),
        totalDocsExamined: Number(executionStats.totalDocsExamined || 0),
        nReturned: Number(executionStats.nReturned || 0),
        winningPlan
    };
}

function measureMs(start) {
    return Number((process.hrtime.bigint() - start) / BigInt(1e6));
}

async function searchPostsWithUsers(query, limit = 50) {
    const normalized = typeof query === 'string' ? query.trim().toLowerCase() : '';
    const hashtag = normalizeTag(normalized);

    if (!normalized) {
        return [];
    }

    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const regex = buildRegex(normalized);
    const matchedUserIds = await findMatchedUserIds(regex, safeLimit);
    const postOrConditions = [
        { $text: { $search: normalized } },
        ...buildSearchConditions(normalized, hashtag, matchedUserIds)
    ];

    const rows = await Post.find({ $or: postOrConditions })
        .select({ _id: 0, postId: 1, userId: 1, title: 1, body: 1, likes: 1, likedBy: 1, imageUrl: 1, hashtags: 1, createdAt: 1, updatedAt: 1 })
        .sort({ likes: -1, createdAt: -1 })
        .limit(safeLimit * 2)
        .lean();

    const dedupedMap = new Map();
    rows.map(normalizePostRow).forEach((item) => {
        if (!dedupedMap.has(item.postId)) {
            dedupedMap.set(item.postId, item);
        }
    });

    const hydrated = await hydrateAuthors(Array.from(dedupedMap.values()));

    return hydrated
        .map((post) => ({
            ...post,
            searchScore: computeSearchScore(post, normalized, hashtag)
        }))
        .sort((a, b) => {
            if (b.searchScore !== a.searchScore) {
                return b.searchScore - a.searchScore;
            }
            if (b.likes !== a.likes) {
                return b.likes - a.likes;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, safeLimit);
}

async function searchPostsRealtime(query, limit = 100) {
    const normalized = typeof query === 'string' ? query.trim().toLowerCase() : '';
    const hashtag = normalizeTag(normalized);
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 100));

    if (!normalized) {
        return Post.find()
            .select({ _id: 0, postId: 1, userId: 1, title: 1, body: 1, imageUrl: 1, hashtags: 1, likes: 1, likedBy: 1, createdAt: 1, updatedAt: 1 })
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .lean();
    }

    const regex = buildRegex(normalized);
    const matchedUserIds = await findMatchedUserIds(regex, safeLimit);
    const conditions = buildSearchConditions(normalized, hashtag, matchedUserIds);

    const posts = await Post.find({ $or: conditions })
        .select({ _id: 0, postId: 1, userId: 1, title: 1, body: 1, imageUrl: 1, hashtags: 1, likes: 1, likedBy: 1, createdAt: 1, updatedAt: 1 })
        .sort({ likes: -1, createdAt: -1 })
        .limit(safeLimit)
        .lean();

    const hydrated = await hydrateAuthors(posts.map(normalizePostRow));

    return hydrated
        .map((post) => ({
            ...post,
            searchScore: computeSearchScore(post, normalized, hashtag)
        }))
        .sort((a, b) => {
            if (b.searchScore !== a.searchScore) {
                return b.searchScore - a.searchScore;
            }
            if (b.likes !== a.likes) {
                return b.likes - a.likes;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
}

async function analyzeSearchQueryPerformance(query, limit = 50) {
    const normalized = typeof query === 'string' ? query.trim().toLowerCase() : '';
    const hashtag = normalizeTag(normalized);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));

    if (!normalized) {
        return {
            before: { durationMs: 0, explain: null },
            after: { durationMs: 0, explain: null },
            improvementMs: 0,
            improvementPct: 0
        };
    }

    const regex = buildRegex(normalized);
    const matchedUserIds = await findMatchedUserIds(regex, safeLimit);
    const optimizedConditions = buildSearchConditions(normalized, hashtag, matchedUserIds);

    const baselinePipeline = [
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: 'userId',
                as: 'author'
            }
        },
        {
            $unwind: {
                path: '$author',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $match: {
                $or: [
                    { title: regex },
                    { body: regex },
                    { 'author.name': regex },
                    ...(hashtag ? [{ hashtags: hashtag }] : [])
                ]
            }
        },
        { $sort: { likes: -1, createdAt: -1 } },
        { $limit: safeLimit }
    ];

    const baselineStart = process.hrtime.bigint();
    await Post.aggregate(baselinePipeline);
    const baselineDurationMs = measureMs(baselineStart);

    const optimizedStart = process.hrtime.bigint();
    await Post.find({ $or: optimizedConditions })
        .sort({ likes: -1, createdAt: -1 })
        .limit(safeLimit)
        .lean();
    const optimizedDurationMs = measureMs(optimizedStart);

    const [baselineExplainRaw, optimizedExplainRaw] = await Promise.all([
        Post.collection.aggregate(baselinePipeline).explain('executionStats'),
        Post.collection
            .find({ $or: optimizedConditions })
            .sort({ likes: -1, createdAt: -1 })
            .limit(safeLimit)
            .explain('executionStats')
    ]);

    const improvementMs = baselineDurationMs - optimizedDurationMs;
    const improvementPct = baselineDurationMs > 0 ? Number(((improvementMs / baselineDurationMs) * 100).toFixed(2)) : 0;

    return {
        before: {
            durationMs: baselineDurationMs,
            explain: summarizeExecutionStats(baselineExplainRaw)
        },
        after: {
            durationMs: optimizedDurationMs,
            explain: summarizeExecutionStats(optimizedExplainRaw)
        },
        improvementMs,
        improvementPct
    };
}

module.exports = {
    searchPostsWithUsers,
    searchPostsRealtime,
    analyzeSearchQueryPerformance
};
