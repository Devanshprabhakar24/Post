const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const { buildCommentTree } = require('../utils/commentThreads');
const cache = require('../utils/cache');
const { createNotification } = require('../services/notificationService');

function buildCacheKey(prefix, value) {
    return `${prefix}:${value}`;
}

function invalidateCommentCaches(postId) {
    cache.clearByPrefix('posts:list:');
    cache.clearByPrefix('search:');
    cache.clearByPrefix('stats:');
    cache.clear(buildCacheKey('posts:detail', postId));
    cache.clear(buildCacheKey('posts:comments', postId));
}

function getAuthUserId(req) {
    if (req.user?.userId && Number.isFinite(Number(req.user.userId))) {
        return Number(req.user.userId);
    }

    return null;
}

async function getCommentAuthor(userId) {
    const user = await User.findOne({ userId })
        .select({ _id: 0, userId: 1, name: 1, username: 1, email: 1, imageUrl: 1 })
        .lean();

    if (!user) {
        return {
            userId,
            name: 'Unknown user',
            username: '',
            email: '',
            imageUrl: ''
        };
    }

    return user;
}

/**
 * Normalize comment data from JSONPlaceholder format
 */
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

/**
 * Upsert comments into database
 */
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
 * Get all comments
 * GET /api/comments
 */
async function getAllComments(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 10);
        const postId = req.query.postId ? parseInt(req.query.postId) : null;

        let query = {};
        if (postId && !Number.isNaN(postId)) {
            query.postId = postId;
        }

        const skip = (page - 1) * limit;
        const [comments, total] = await Promise.all([
            Comment.find(query)
                .select({ _id: 0, commentId: 1, userId: 1, postId: 1, parentCommentId: 1, name: 1, email: 1, body: 1, createdAt: 1, updatedAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Comment.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            data: comments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            message: 'Comments fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch comments',
            error: error.message
        });
    }
}

/**
 * Get single comment
 * GET /api/comments/:id
 */
async function getCommentById(req, res) {
    try {
        const commentId = parseInt(req.params.id);

        if (Number.isNaN(commentId) || commentId < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid comment ID'
            });
        }

        const comment = await Comment.findOne({ commentId })
            .select({ _id: 0, commentId: 1, userId: 1, postId: 1, parentCommentId: 1, name: 1, email: 1, body: 1, createdAt: 1, updatedAt: 1 })
            .lean();

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: comment,
            message: 'Comment fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch comment',
            error: error.message
        });
    }
}

async function createPostComment(req, res) {
    try {
        const postId = parseInt(req.params.id, 10);
        const authUserId = getAuthUserId(req);
        const body = String(req.body?.body || '').trim();

        if (Number.isNaN(postId) || postId < 1) {
            return res.status(400).json({ success: false, message: 'Invalid post ID' });
        }

        if (!authUserId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!body) {
            return res.status(400).json({ success: false, message: 'Comment body is required' });
        }

        const actor = await getCommentAuthor(authUserId);
        const maxComment = await Comment.findOne().sort({ commentId: -1 }).select({ commentId: 1 }).lean();
        const nextCommentId = Number(maxComment?.commentId || 0) + 1;

        const created = await Comment.create({
            id: nextCommentId,
            commentId: nextCommentId,
            userId: authUserId,
            postId,
            parentCommentId: null,
            name: actor.name || actor.username || 'Anonymous',
            email: actor.email || '',
            body
        });

        invalidateCommentCaches(postId);

        const post = await Post.findOne({ postId }).select({ _id: 0, postId: 1, userId: 1, title: 1 }).lean();
        const postOwner = post
            ? await User.findOne({ userId: post.userId })
                .select({ _id: 0, userId: 1, name: 1, username: 1 })
                .lean()
            : null;

        const actorName = actor.name || actor.username || 'Someone';

        await createNotification({
            recipientId: postOwner?.userId,
            senderId: authUserId,
            postId,
            type: 'comment',
            message: `${actorName} commented on your post`
        });

        return res.status(201).json({
            success: true,
            data: { ...created.toObject(), replies: [] },
            message: 'Comment created successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create comment', error: error.message });
    }
}

async function createReply(req, res) {
    try {
        const parentCommentId = parseInt(req.params.id, 10);
        const authUserId = getAuthUserId(req);
        const body = String(req.body?.body || '').trim();

        if (Number.isNaN(parentCommentId) || parentCommentId < 1) {
            return res.status(400).json({ success: false, message: 'Invalid comment ID' });
        }

        if (!authUserId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!body) {
            return res.status(400).json({ success: false, message: 'Reply body is required' });
        }

        const parentComment = await Comment.findOne({ commentId: parentCommentId }).lean();
        if (!parentComment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        if (parentComment.parentCommentId) {
            return res.status(400).json({ success: false, message: 'Reply nesting is limited to 2 levels' });
        }

        const actor = await getCommentAuthor(authUserId);
        const maxComment = await Comment.findOne().sort({ commentId: -1 }).select({ commentId: 1 }).lean();
        const nextCommentId = Number(maxComment?.commentId || 0) + 1;

        const created = await Comment.create({
            id: nextCommentId,
            commentId: nextCommentId,
            userId: authUserId,
            postId: parentComment.postId,
            parentCommentId: parentComment.commentId,
            name: actor.name || actor.username || 'Anonymous',
            email: actor.email || '',
            body
        });

        invalidateCommentCaches(parentComment.postId);

        const replyTarget = await User.findOne({ userId: parentComment.userId })
            .select({ _id: 0, userId: 1, name: 1, username: 1 })
            .lean();

        const actorName = actor.name || actor.username || 'Someone';

        await createNotification({
            recipientId: replyTarget?.userId,
            senderId: authUserId,
            postId: parentComment.postId,
            type: 'reply',
            message: `${actorName} replied to your comment`
        });

        return res.status(201).json({
            success: true,
            data: { ...created.toObject(), replies: [] },
            message: 'Reply created successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create reply', error: error.message });
    }
}

async function getPostComments(req, res) {
    try {
        const postId = parseInt(req.params.id, 10);

        if (Number.isNaN(postId) || postId < 1) {
            return res.status(400).json({ success: false, message: 'Invalid post ID' });
        }

        const comments = await Comment.find({ postId })
            .select({ _id: 0, commentId: 1, userId: 1, postId: 1, parentCommentId: 1, name: 1, email: 1, body: 1, createdAt: 1, updatedAt: 1 })
            .sort({ createdAt: 1 })
            .lean();

        const data = buildCommentTree(comments);

        return res.status(200).json({
            success: true,
            data,
            count: comments.length,
            message: 'Comments fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch comments', error: error.message });
    }
}

module.exports = {
    getAllComments,
    getCommentById,
    createPostComment,
    createReply,
    getPostComments
};
