const Post = require('../models/Post');

function buildRegex(query) {
    return { $regex: query, $options: 'i' };
}

function normalizeTag(query) {
    return String(query || '').replace(/^#/, '').trim().toLowerCase();
}

async function searchPostsWithUsers(query, limit = 50) {
    const normalized = typeof query === 'string' ? query.trim() : '';
    const hashtag = normalizeTag(normalized);

    if (!normalized) {
        return [];
    }

    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));

    const [textResults, authorNameResults] = await Promise.all([
        Post.aggregate([
            {
                $match: {
                    $text: { $search: normalized }
                }
            },
            {
                $addFields: {
                    textScore: { $meta: 'textScore' }
                }
            },
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
                $sort: {
                    textScore: -1,
                    likes: -1,
                    createdAt: -1
                }
            },
            { $limit: safeLimit },
            {
                $project: {
                    _id: 0,
                    postId: 1,
                    userId: 1,
                    title: 1,
                    body: 1,
                    likes: 1,
                    likedBy: 1,
                    imageUrl: 1,
                    hashtags: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    author: {
                        userId: '$author.userId',
                        name: '$author.name',
                        username: '$author.username',
                        email: '$author.email',
                        imageUrl: '$author.imageUrl',
                        bio: '$author.bio',
                        isOnline: '$author.isOnline'
                    }
                }
            }
        ]),
        Post.aggregate([
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
                        { 'author.name': buildRegex(normalized) },
                        { hashtags: hashtag ? hashtag : buildRegex(normalized) }
                    ]
                }
            },
            {
                $sort: {
                    likes: -1,
                    createdAt: -1
                }
            },
            { $limit: safeLimit },
            {
                $project: {
                    _id: 0,
                    postId: 1,
                    userId: 1,
                    title: 1,
                    body: 1,
                    likes: 1,
                    likedBy: 1,
                    imageUrl: 1,
                    hashtags: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    author: {
                        userId: '$author.userId',
                        name: '$author.name',
                        username: '$author.username',
                        email: '$author.email',
                        imageUrl: '$author.imageUrl',
                        bio: '$author.bio',
                        isOnline: '$author.isOnline'
                    }
                }
            }
        ])
    ]);

    const merged = new Map();
    [...textResults, ...authorNameResults].forEach((item) => {
        if (!merged.has(item.postId)) {
            merged.set(item.postId, item);
        }
    });

    return Array.from(merged.values()).slice(0, safeLimit);
}

async function searchPostsRealtime(query, limit = 100) {
    const normalized = typeof query === 'string' ? query.trim() : '';
    const hashtag = normalizeTag(normalized);
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 100));

    if (!normalized) {
        return Post.find().sort({ createdAt: -1 }).limit(safeLimit).lean();
    }

    const regex = buildRegex(normalized);

    return Post.aggregate([
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
        {
            $sort: {
                likes: -1,
                createdAt: -1
            }
        },
        { $limit: safeLimit },
        {
            $project: {
                _id: 0,
                postId: 1,
                userId: 1,
                title: 1,
                body: 1,
                imageUrl: 1,
                hashtags: 1,
                likes: { $ifNull: ['$likes', 0] },
                likedBy: { $ifNull: ['$likedBy', []] },
                createdAt: 1,
                updatedAt: 1,
                author: {
                    userId: '$author.userId',
                    name: '$author.name',
                    username: '$author.username',
                    email: '$author.email',
                    imageUrl: '$author.imageUrl',
                    bio: '$author.bio',
                    isOnline: '$author.isOnline'
                }
            }
        }
    ]);
}

module.exports = {
    searchPostsWithUsers,
    searchPostsRealtime
};
