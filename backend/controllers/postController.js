const Post = require('../models/Post');
const PostLike = require('../models/PostLike');
const User = require('../models/User');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const {
    fetchPosts: fetchSourcePosts,
    fetchUsers: fetchSourceUsers,
    fetchComments: fetchSourceComments
} = require('../services/apiService');
const { searchPostsWithUsers, searchPostsRealtime, analyzeSearchQueryPerformance } = require('../services/searchService');
const { emitLikeUpdated } = require('../sockets/likeSocket');
const { createNotification } = require('../services/notificationService');
const { emitNewPost } = require('../sockets/postSocket');
const { extractHashtags, normalizeHashtag } = require('../utils/hashtags');
const cache = require('../utils/cache');
const { processUpload } = require('../jobs/uploadQueue');
const { bufferLikeDelta } = require('../jobs/likeFlushJob');

const CACHE_TTL = {
    postsList: 60 * 1000,
    postById: 2 * 60 * 1000,
    postComments: 2 * 60 * 1000,
    search: 30 * 1000,
    topLiked: 60 * 1000,
    trending: 60 * 1000
};

function buildCacheKey(prefix, value) {
    return `${prefix}:${value}`;
}

function invalidatePostCaches(postId) {
    cache.clearByPrefix('posts:list:');
    cache.clearByPrefix('feed:');
    cache.clearByPrefix('search:');
    cache.clearByPrefix('stats:');
    cache.clearByPrefix('posts:top-liked');
    cache.clearByPrefix('posts:trending');

    if (postId) {
        cache.clear(buildCacheKey('posts:detail', postId));
        cache.clear(buildCacheKey('posts:comments', postId));
    }
}

/**
 * Normalize post data from JSONPlaceholder format
 */
function normalizePost(post) {
    return {
        id: post.id,
        postId: post.id,
        userId: post.userId,
        title: post.title || '',
        body: post.body || '',
        imageUrl: post.imageUrl || '',
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        isExternal: true
    };
}

function normalizeUser(user) {
    return {
        id: user.id,
        userId: user.id,
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        isExternal: true,
        address: user.address || {},
        phone: user.phone || '',
        website: user.website || '',
        company: user.company || {}
    };
}

function normalizeComment(comment) {
    return {
        id: comment.id,
        commentId: comment.id,
        userId: Number(comment.userId) || Number(comment.postId) || 1,
        postId: comment.postId,
        parentCommentId: comment.parentCommentId ?? null,
        name: comment.name || '',
        email: comment.email || '',
        body: comment.body || ''
    };
}

function sanitizePost(post) {
    const likes = Number(post?.likes) || 0;
    return {
        ...post,
        likes,
        likedBy: []
    };
}

function getAuthUserId(req) {
    if (req.user?.userId && Number.isFinite(Number(req.user.userId))) {
        return Number(req.user.userId);
    }

    const fallback = String(req.body?.userId || '').trim();
    return fallback ? Number(fallback) : null;
}

function canModifyPost(post, authUserId, isAdmin = false) {
    if (isAdmin) {
        return true;
    }

    if (!post || !authUserId) {
        return false;
    }

    return Number(post.userId) === Number(authUserId);
}

/**
 * Upsert posts into database
 */
async function upsertPosts(posts) {
    if (!Array.isArray(posts) || posts.length === 0) {
        return { fetched: 0, matched: 0, upserted: 0, modified: 0 };
    }

    const operations = posts.map((post) => ({
        updateOne: {
            filter: { postId: post.id },
            update: {
                $set: normalizePost(post)
            },
            upsert: true
        }
    }));

    const result = await Post.bulkWrite(operations, { ordered: false });

    return {
        fetched: posts.length,
        matched: result.matchedCount,
        upserted: result.upsertedCount,
        modified: result.modifiedCount
    };
}

async function upsertUsers(users) {
    if (!Array.isArray(users) || users.length === 0) {
        return { fetched: 0, matched: 0, upserted: 0, modified: 0 };
    }

    const operations = users.map((user) => ({
        updateOne: {
            filter: { userId: user.id },
            update: {
                $set: normalizeUser(user)
            },
            upsert: true
        }
    }));

    const result = await User.bulkWrite(operations, { ordered: false });

    return {
        fetched: users.length,
        matched: result.matchedCount,
        upserted: result.upsertedCount,
        modified: result.modifiedCount
    };
}

async function upsertComments(comments) {
    if (!Array.isArray(comments) || comments.length === 0) {
        return { fetched: 0, matched: 0, upserted: 0, modified: 0 };
    }

    const operations = comments.map((comment) => ({
        updateOne: {
            filter: { commentId: comment.id },
            update: {
                $set: normalizeComment(comment)
            },
            upsert: true
        }
    }));

    const result = await Comment.bulkWrite(operations, { ordered: false });

    return {
        fetched: comments.length,
        matched: result.matchedCount,
        upserted: result.upsertedCount,
        modified: result.modifiedCount
    };
}

/**
 * Fetch posts from external API and store in MongoDB
 * GET /api/data/fetch
 */
async function fetchAndStorePosts(req, res) {
    try {
        // Check if data already exists in DB (basic caching)
        const existingCount = await Post.countDocuments();
        if (existingCount > 0) {
            return res.status(200).json({
                success: true,
                message: 'Posts already exist in database',
                summary: {
                    total: existingCount,
                    fromCache: true
                }
            });
        }

        // Fetch from external API
        const apiResult = await fetchSourcePosts();
        if (!apiResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch posts from external API',
                error: apiResult.message
            });
        }

        const posts = apiResult.data;
        const summary = await upsertPosts(posts);

        return res.status(200).json({
            success: true,
            message: 'Posts fetched and stored successfully',
            summary
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch and store posts',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

async function fetchAndStoreData(_req, res) {
    try {
        await Post.updateMany(
            {
                $or: [
                    { likes: { $exists: false } },
                    { isExternal: { $exists: false } }
                ]
            },
            {
                $set: {
                    likes: 0,
                    isExternal: true
                }
            }
        );

        const [postCount, userCount, commentCount] = await Promise.all([
            Post.countDocuments(),
            User.countDocuments(),
            Comment.countDocuments()
        ]);

        if (postCount > 0 && userCount > 0 && commentCount > 0) {
            return res.status(200).json({
                success: true,
                data: {
                    posts: postCount,
                    users: userCount,
                    comments: commentCount,
                    fromCache: true
                },
                message: 'Data already exists in database'
            });
        }

        const [postsResult, usersResult, commentsResult] = await Promise.all([
            fetchSourcePosts(),
            fetchSourceUsers(),
            fetchSourceComments()
        ]);

        if (!postsResult.success || !usersResult.success || !commentsResult.success) {
            return res.status(500).json({
                success: false,
                data: null,
                message: 'Failed to fetch data from external API'
            });
        }

        const [postsSummary, usersSummary, commentsSummary] = await Promise.all([
            upsertPosts(postsResult.data),
            upsertUsers(usersResult.data),
            upsertComments(commentsResult.data)
        ]);

        cache.set('posts', postsSummary);
        cache.set('users', usersSummary);
        cache.set('comments', commentsSummary);
        invalidatePostCaches();

        return res.status(200).json({
            success: true,
            data: {
                posts: postsSummary,
                users: usersSummary,
                comments: commentsSummary
            },
            message: 'Posts, users, and comments fetched and cached successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to fetch and cache data'
        });
    }
}

/**
 * Create user-generated post
 * POST /api/posts
 */
async function createPost(req, res) {
    try {
        const authUserId = getAuthUserId(req);
        const { title, body, imageUrl, image, hashtags: explicitHashtags = [] } = req.body || {};
        const normalizedTitle = String(title || '').trim();
        const normalizedBody = String(body || '').trim();

        if (!authUserId || Number.isNaN(authUserId)) {
            return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
        }

        if (!normalizedTitle || !normalizedBody) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'title and body are required'
            });
        }

        if (normalizedTitle.length < 3 || normalizedTitle.length > 300) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'title must be between 3 and 300 characters'
            });
        }

        if (normalizedBody.length < 10 || normalizedBody.length > 5000) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'body must be between 10 and 5000 characters'
            });
        }

        const maxPost = await Post.findOne().sort({ postId: -1 }).select({ postId: 1 }).lean();
        const nextPostId = Number(maxPost?.postId || 0) + 1;
        const bodyHashtags = extractHashtags([normalizedTitle, normalizedBody]);
        const explicitHashtagList = Array.isArray(explicitHashtags)
            ? explicitHashtags.map((tag) => normalizeHashtag(tag)).filter(Boolean)
            : [];
        const hashtags = Array.from(new Set([...bodyHashtags, ...explicitHashtagList]));
        let resolvedImageUrl = String(imageUrl || image || '').trim();
        let resolvedImageData = '';
        let resolvedImageContentType = '';

        if (req.file?.buffer) {
            const uploadResult = await processUpload(req.file.buffer, {
                folder: 'post_images',
                mimetype: req.file.mimetype,
                transformation: [
                    {
                        width: 800,
                        crop: 'limit',
                        quality: 'auto',
                        fetch_format: 'webp'
                    }
                ]
            });
            resolvedImageUrl = String(uploadResult?.secure_url || '').trim();
            resolvedImageData = uploadResult?.storage === 'database' ? String(uploadResult?.imageData || '').trim() : '';
            resolvedImageContentType = uploadResult?.storage === 'database' ? String(uploadResult?.imageContentType || req.file.mimetype || '').trim() : '';
        }

        const created = await Post.create({
            id: nextPostId,
            postId: nextPostId,
            userId: authUserId,
            title: normalizedTitle,
            body: normalizedBody,
            imageUrl: resolvedImageUrl,
            imageData: resolvedImageData,
            imageContentType: resolvedImageContentType,
            hashtags,
            likes: 0,
            isExternal: false
        });

        const author = await User.findOne({ userId: authUserId })
            .select({ _id: 0, userId: 1, name: 1, username: 1, email: 1, imageUrl: 1, profilePic: 1, bio: 1, isOnline: 1 })
            .lean();

        const payload = {
            ...sanitizePost(created.toObject()),
            author: author || null
        };

        invalidatePostCaches(nextPostId);
        emitNewPost(payload);

        return res.status(201).json({
            success: true,
            data: payload,
            message: 'Post created successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to create post',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

/**
 * Update a post if it satisfies sync/ownership rules
 * PUT /api/posts/:id
 */
async function updatePost(req, res) {
    try {
        const postId = parseInt(req.params.id, 10);
        const authUserId = getAuthUserId(req);
        const { title, body } = req.body || {};

        if (Number.isNaN(postId) || postId < 1) {
            return res.status(400).json({ success: false, data: null, message: 'Invalid post ID' });
        }

        if (!authUserId || Number.isNaN(authUserId)) {
            return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
        }

        const post = await Post.findOne({ postId }).lean();
        if (!post) {
            return res.status(404).json({ success: false, data: null, message: 'Post not found' });
        }

        if (!canModifyPost(post, authUserId, Boolean(req.user?.isAdmin))) {
            return res.status(403).json({
                success: false,
                data: null,
                message: 'Not allowed to update this post'
            });
        }

        const update = {};
        if (typeof title === 'string' && title.trim()) {
            update.title = title.trim();
        }
        if (typeof body === 'string' && body.trim()) {
            update.body = body.trim();
        }

        if (!Object.keys(update).length) {
            return res.status(400).json({ success: false, data: null, message: 'No valid fields to update' });
        }

        const updated = await Post.findOneAndUpdate({ postId }, { $set: update }, { new: true }).lean();
        invalidatePostCaches(postId);

        return res.status(200).json({
            success: true,
            data: sanitizePost(updated),
            message: 'Post updated successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to update post',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

/**
 * Delete a post if it satisfies sync/ownership rules
 * DELETE /api/posts/:id
 */
async function deletePost(req, res) {
    try {
        const postId = parseInt(req.params.id, 10);
        const authUserId = getAuthUserId(req);

        if (Number.isNaN(postId) || postId < 1) {
            return res.status(400).json({ success: false, data: null, message: 'Invalid post ID' });
        }

        if (!authUserId || Number.isNaN(authUserId)) {
            return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
        }

        const post = await Post.findOne({ postId }).lean();
        if (!post) {
            return res.status(404).json({ success: false, data: null, message: 'Post not found' });
        }

        if (!canModifyPost(post, authUserId, Boolean(req.user?.isAdmin))) {
            return res.status(403).json({
                success: false,
                data: null,
                message: 'Not allowed to delete this post'
            });
        }

        await Post.deleteOne({ postId });
        await Comment.deleteMany({ postId });

        invalidatePostCaches(postId);

        return res.status(200).json({
            success: true,
            data: { postId },
            message: 'Post deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to delete post',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

/**
 * Get all posts with pagination, filtering, and search
 * GET /api/posts?page=1&limit=10&userId=1&keyword=react
 */
async function getAllPosts(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 10);
        const cursor = String(req.query.cursor || '').trim();
        const useCursor = Boolean(cursor) && mongoose.Types.ObjectId.isValid(cursor);
        const userId = req.query.userId ? parseInt(req.query.userId) : null;
        const keyword = req.query.keyword ? String(req.query.keyword).trim() : null;
        const hashtag = req.query.hashtag ? normalizeHashtag(req.query.hashtag) : '';
        const sortOrder = String(req.query.sort || 'desc').toLowerCase() === 'asc' ? 1 : -1;
        const sortBy = String(req.query.sortBy || 'createdAt').toLowerCase();
        const sortField = sortBy === 'likes' ? 'likes' : 'createdAt';

        let query = {};

        // Filter by userId
        if (userId && !Number.isNaN(userId)) {
            query.userId = userId;
        }

        // Filter by keyword (title or body)
        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { body: { $regex: keyword, $options: 'i' } },
                { hashtags: { $regex: keyword.replace(/^#/, ''), $options: 'i' } }
            ];
        }

        if (hashtag) {
            query.hashtags = hashtag;
        }

        if (useCursor) {
            query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
        }

        const cacheKey = [
            'feed',
            `p${page}`,
            `c${useCursor ? cursor : '_'}`,
            `l${limit}`,
            `u${Number.isFinite(userId) ? userId : 'all'}`,
            `q${keyword ? encodeURIComponent(keyword.toLowerCase()) : '_'}`,
            `h${hashtag || '_'}`,
            `s${sortField}`,
            `o${sortOrder}`
        ].join(':');

        const payload = await cache.remember(cacheKey, CACHE_TTL.postsList, async () => {
            const [result] = await Post.aggregate([
                { $match: query },
                {
                    $facet: {
                        data: [
                            { $sort: { [sortField]: sortOrder } },
                            ...(useCursor ? [] : [{ $skip: (page - 1) * limit }]),
                            { $limit: limit },
                            {
                                $lookup: {
                                    from: 'users',
                                    let: { authorUserId: '$userId' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$userId', '$$authorUserId']
                                                }
                                            }
                                        },
                                        {
                                            $project: {
                                                _id: 0,
                                                userId: 1,
                                                name: 1,
                                                username: 1,
                                                email: 1,
                                                imageUrl: 1,
                                                bio: 1,
                                                isOnline: 1
                                            }
                                        },
                                        { $limit: 1 }
                                    ],
                                    as: 'author'
                                }
                            },
                            {
                                $addFields: {
                                    author: { $arrayElemAt: ['$author', 0] },
                                    likes: { $ifNull: ['$likes', 0] },
                                    hashtags: { $ifNull: ['$hashtags', []] },
                                    imageUrl: { $ifNull: ['$imageUrl', ''] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    postId: 1,
                                    userId: 1,
                                    title: 1,
                                    body: 1,
                                    imageUrl: 1,
                                    hashtags: 1,
                                    likes: 1,
                                    commentsCount: 1,
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
                        ],
                        meta: [{ $count: 'total' }]
                    }
                }
            ]);

            const total = result?.meta?.[0]?.total || 0;
            const rawPosts = Array.isArray(result?.data) ? result.data : [];
            const postIds = rawPosts
                .map((post) => Number(post?.postId))
                .filter((postId) => Number.isFinite(postId));

            const groupedCounts = postIds.length
                ? await Comment.aggregate([
                    { $match: { postId: { $in: postIds } } },
                    { $group: { _id: '$postId', count: { $sum: 1 } } }
                ])
                : [];

            const commentsCountMap = groupedCounts.reduce((acc, item) => {
                const key = Number(item?._id);
                if (Number.isFinite(key)) {
                    acc[key] = Number(item?.count) || 0;
                }
                return acc;
            }, {});

            const data = rawPosts.map((post) => sanitizePost({
                ...post,
                commentsCount: commentsCountMap[Number(post.postId)] || 0
            }));

            const lastCursor = data.length > 0 ? String(data[data.length - 1]._id || '') : null;
            const normalizedPosts = data.map((post) => {
                const { _id, ...rest } = post;
                return rest;
            });

            return {
                posts: normalizedPosts,
                total,
                lastCursor
            };
        });

        return res.status(200).json({
            success: true,
            data: payload.posts,
            pagination: {
                page,
                limit,
                total: payload.total,
                pages: Math.ceil(payload.total / limit),
                cursor: payload.lastCursor || null
            },
            message: 'Posts fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch posts',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

/**
 * Get single post with user (author) and comments
 * GET /api/posts/:id
 */
async function getPostById(req, res) {
    try {
        const postId = parseInt(req.params.id);

        if (Number.isNaN(postId) || postId < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid post ID'
            });
        }

        const cacheKey = buildCacheKey('posts:detail', postId);
        const payload = await cache.remember(cacheKey, CACHE_TTL.postById, async () => {
            const [post] = await Post.aggregate([
                { $match: { postId } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: 'userId',
                        as: 'author'
                    }
                },
                {
                    $lookup: {
                        from: 'comments',
                        localField: 'postId',
                        foreignField: 'postId',
                        as: 'comments'
                    }
                },
                {
                    $addFields: {
                        author: { $arrayElemAt: ['$author', 0] },
                        likes: { $ifNull: ['$likes', 0] },
                        hashtags: { $ifNull: ['$hashtags', []] },
                        imageUrl: { $ifNull: ['$imageUrl', ''] }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        postId: 1,
                        userId: 1,
                        title: 1,
                        body: 1,
                        imageUrl: 1,
                        hashtags: 1,
                        likes: 1,
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
                        },
                        comments: {
                            $map: {
                                input: '$comments',
                                as: 'comment',
                                in: {
                                    commentId: '$$comment.commentId',
                                    postId: '$$comment.postId',
                                    name: '$$comment.name',
                                    email: '$$comment.email',
                                    body: '$$comment.body',
                                    createdAt: '$$comment.createdAt',
                                    updatedAt: '$$comment.updatedAt'
                                }
                            }
                        }
                    }
                }
            ]);

            return post || null;
        });

        if (!payload) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: payload,
            message: 'Post fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch post',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

/**
 * Get comments for a post
 * GET /api/posts/:id/comments
 */
async function getPostComments(req, res) {
    try {
        const postId = parseInt(req.params.id);

        if (Number.isNaN(postId) || postId < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid post ID'
            });
        }

        // Verify post exists
        const post = await Post.findOne({ postId }).select({ _id: 0, postId: 1 }).lean();
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const cacheKey = buildCacheKey('posts:comments', postId);
        const comments = await cache.remember(cacheKey, CACHE_TTL.postComments, async () =>
            Comment.find({ postId })
                .select({ _id: 0, commentId: 1, postId: 1, name: 1, email: 1, body: 1, createdAt: 1, updatedAt: 1 })
                .lean()
        );

        return res.status(200).json({
            success: true,
            data: comments,
            count: comments.length,
            message: 'Comments fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch comments',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

/**
 * Search across posts, comments, and user names
 * GET /api/search?q=react
 */
async function search(req, res) {
    try {
        const query = req.query.q ? String(req.query.q).trim() : '';

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const cacheKey = buildCacheKey('search', query.toLowerCase());
        const posts = await cache.remember(cacheKey, CACHE_TTL.search, () => searchPostsWithUsers(query, 50));

        return res.status(200).json({
            success: true,
            data: posts,
            message: 'Search completed successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Search failed',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

async function searchDiagnostics(req, res) {
    try {
        const diagnosticsEnabled =
            process.env.NODE_ENV !== 'production' ||
            String(process.env.ENABLE_SEARCH_DIAGNOSTICS || '').trim().toLowerCase() === 'true';

        if (!diagnosticsEnabled) {
            return res.status(403).json({
                success: false,
                message: 'Search diagnostics are disabled in this environment'
            });
        }

        const query = req.query.q ? String(req.query.q).trim() : '';
        const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));

        if (!query || query.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 3 characters'
            });
        }

        const diagnostics = await analyzeSearchQueryPerformance(query, limit);

        return res.status(200).json({
            success: true,
            data: {
                query,
                limit,
                diagnostics
            },
            message: 'Search diagnostics fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to compute search diagnostics',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

/**
 * Search posts in database for WebSocket handler
 */
async function searchPostsInDatabase(query) {
    const normalized = typeof query === 'string' ? query.trim().toLowerCase() : '';
    const cacheKey = buildCacheKey('search:realtime', normalized || '__all__');
    return cache.remember(cacheKey, 15 * 1000, () => searchPostsRealtime(query, 100));
}

async function likePost(req, res) {
    try {
        const postId = parseInt(req.params.id);
        const authUserId = getAuthUserId(req);

        if (Number.isNaN(postId) || postId < 1) {
            return res.status(400).json({ success: false, data: null, message: 'Invalid post ID' });
        }

        if (!authUserId || Number.isNaN(authUserId)) {
            return res.status(400).json({ success: false, data: null, message: 'userId is required' });
        }

        const post = await Post.findOne({ postId }).lean();
        if (!post) {
            return res.status(404).json({ success: false, data: null, message: 'Post not found' });
        }

        const [existsLike, author, actor] = await Promise.all([
            PostLike.exists({ postId, userId: authUserId }),
            User.findOne({ userId: post.userId })
                .select({ _id: 0, userId: 1, name: 1, username: 1, email: 1 })
                .lean(),
            User.findOne({ userId: authUserId })
                .select({ _id: 0, userId: 1, name: 1, username: 1 })
                .lean()
        ]);

        if (existsLike) {
            const likedByRaw = await PostLike.find({ postId }).select('userId').lean();
            const likedBy = likedByRaw.map((entry) => Number(entry.userId)).filter((entry) => Number.isFinite(entry));
            return res.status(200).json({
                success: true,
                data: {
                    postId,
                    totalLikes: Number(post.likes) || 0,
                    likedBy
                },
                message: 'Post was already liked by this user'
            });
        }

        await PostLike.create({ postId, userId: authUserId });
        await bufferLikeDelta(postId, 1);
        const likedByRaw = await PostLike.find({ postId }).select('userId').lean();
        const likedBy = likedByRaw.map((entry) => Number(entry.userId)).filter((entry) => Number.isFinite(entry));

        const totalLikes = Math.max(0, Number(post.likes) + 1);

        emitLikeUpdated({
            postId,
            postTitle: post.title || '',
            postUserId: post.userId,
            actor: {
                userId: authUserId,
                name: actor?.name || '',
                username: actor?.username || ''
            },
            author: author || null,
            totalLikes,
            likedBy
        });

        await createNotification({
            recipientId: post.userId,
            senderId: authUserId,
            postId,
            type: 'like',
            message: `${actor?.name || actor?.username || 'Someone'} liked your post`,
            actor: {
                userId: authUserId,
                name: actor?.name || '',
                username: actor?.username || ''
            }
        });
        invalidatePostCaches(postId);

        return res.status(200).json({
            success: true,
            data: {
                postId,
                totalLikes,
                likedBy
            },
            message: 'Post liked successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: 'Failed to like post' });
    }
}

async function unlikePost(req, res) {
    try {
        const postId = parseInt(req.params.id);
        const authUserId = getAuthUserId(req);

        if (Number.isNaN(postId) || postId < 1) {
            return res.status(400).json({ success: false, data: null, message: 'Invalid post ID' });
        }

        if (!authUserId || Number.isNaN(authUserId)) {
            return res.status(400).json({ success: false, data: null, message: 'userId is required' });
        }

        const post = await Post.findOne({ postId }).lean();
        if (!post) {
            return res.status(404).json({ success: false, data: null, message: 'Post not found' });
        }

        const deleted = await PostLike.deleteOne({ postId, userId: authUserId });
        if (deleted.deletedCount > 0) {
            await bufferLikeDelta(postId, -1);
        }

        const likedByRaw = await PostLike.find({ postId }).select('userId').lean();
        const likedBy = likedByRaw.map((entry) => Number(entry.userId)).filter((entry) => Number.isFinite(entry));

        const totalLikes = Math.max(0, Number(post.likes) + (deleted.deletedCount > 0 ? -1 : 0));

        const author = await User.findOne({ userId: post.userId })
            .select({ _id: 0, userId: 1, name: 1, username: 1, email: 1 })
            .lean();

        emitLikeUpdated({
            postId,
            postTitle: post.title || '',
            postUserId: post.userId,
            author: author || null,
            totalLikes,
            likedBy
        });
        invalidatePostCaches(postId);

        return res.status(200).json({
            success: true,
            data: {
                postId,
                totalLikes,
                likedBy
            },
            message: deleted.deletedCount > 0 ? 'Post unliked successfully' : 'Post was not liked by this user'
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: 'Failed to unlike post' });
    }
}

async function getLikeStatus(req, res) {
    try {
        const postId = parseInt(req.params.id);
        const authUserId = Number(req.query.userId);

        if (Number.isNaN(postId) || postId < 1) {
            return res.status(400).json({ success: false, data: null, message: 'Invalid post ID' });
        }

        const post = await Post.findOne({ postId }).lean();
        if (!post) {
            return res.status(404).json({ success: false, data: null, message: 'Post not found' });
        }

        const totalLikes = Number(post.likes) || 0;
        const isLiked = Number.isFinite(authUserId)
            ? Boolean(await PostLike.exists({ postId, userId: authUserId }))
            : false;

        return res.status(200).json({
            success: true,
            data: {
                postId,
                totalLikes,
                isLiked
            },
            message: 'Like status fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: 'Failed to fetch like status' });
    }
}

async function getTopLikedPosts(_req, res) {
    try {
        const posts = await cache.remember('posts:top-liked', CACHE_TTL.topLiked, async () =>
            Post.find()
                .select({ _id: 0, postId: 1, userId: 1, title: 1, body: 1, imageUrl: 1, hashtags: 1, likes: 1, createdAt: 1, updatedAt: 1 })
                .sort({ likes: -1, createdAt: -1 })
                .limit(10)
                .lean()
        );

        const normalizedPosts = posts.map(sanitizePost);

        return res.status(200).json({
            success: true,
            data: normalizedPosts,
            message: 'Top liked posts fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: 'Failed to fetch top liked posts' });
    }
}

async function getTrendingPosts(_req, res) {
    try {
        const trending = await cache.remember('posts:trending', CACHE_TTL.trending, async () =>
            Post.aggregate([
                {
                    $lookup: {
                        from: 'comments',
                        let: { postId: '$postId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$postId', '$$postId']
                                    }
                                }
                            },
                            { $count: 'count' }
                        ],
                        as: 'commentsMeta'
                    }
                },
                {
                    $addFields: {
                        commentsCount: {
                            $ifNull: [{ $arrayElemAt: ['$commentsMeta.count', 0] }, 0]
                        },
                        likesSafe: { $ifNull: ['$likes', 0] },
                        hashtags: { $ifNull: ['$hashtags', []] },
                        trendingScore: {
                            $add: [
                                { $ifNull: ['$likes', 0] },
                                { $ifNull: [{ $arrayElemAt: ['$commentsMeta.count', 0] }, 0] }
                            ]
                        }
                    }
                },
                {
                    $sort: {
                        trendingScore: -1,
                        likesSafe: -1,
                        createdAt: -1
                    }
                },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        postId: 1,
                        userId: 1,
                        title: 1,
                        body: 1,
                        imageUrl: 1,
                        hashtags: 1,
                        likes: '$likesSafe',
                        commentsCount: 1,
                        trendingScore: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ])
        );

        return res.status(200).json({
            success: true,
            data: trending,
            message: 'Trending posts fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: 'Failed to fetch trending posts' });
    }
}

module.exports = {
    fetchAndStoreData,
    fetchAndStorePosts,
    createPost,
    updatePost,
    deletePost,
    getAllPosts,
    getPostById,
    getPostComments,
    search,
    searchDiagnostics,
    searchPostsInDatabase,
    likePost,
    unlikePost,
    getLikeStatus,
    getTopLikedPosts,
    getTrendingPosts
};
