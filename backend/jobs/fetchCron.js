const cron = require('node-cron');
const { fetchPosts, fetchUsers, fetchComments } = require('../services/apiService');
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');

function buildUpsertOps(items, idField, normalize) {
    return items.map((item) => ({
        updateOne: {
            filter: { [idField]: item.id },
            update: { $set: normalize(item) },
            upsert: true
        }
    }));
}

async function fetchAndUpsertAll() {
    const [postsResult, usersResult, commentsResult] = await Promise.all([
        fetchPosts(),
        fetchUsers(),
        fetchComments()
    ]);

    if (postsResult.success && postsResult.data.length) {
        await Post.bulkWrite(
            buildUpsertOps(postsResult.data, 'postId', (post) => ({
                postId: post.id,
                userId: post.userId,
                title: post.title || '',
                body: post.body || ''
            })),
            { ordered: false }
        );
    }

    if (usersResult.success && usersResult.data.length) {
        await User.bulkWrite(
            buildUpsertOps(usersResult.data, 'userId', (user) => ({
                userId: user.id,
                name: user.name || '',
                username: user.username || '',
                email: user.email || '',
                address: user.address || {},
                phone: user.phone || '',
                website: user.website || '',
                company: user.company || {}
            })),
            { ordered: false }
        );
    }

    if (commentsResult.success && commentsResult.data.length) {
        await Comment.bulkWrite(
            buildUpsertOps(commentsResult.data, 'commentId', (comment) => ({
                commentId: comment.id,
                postId: comment.postId,
                name: comment.name || '',
                email: comment.email || '',
                body: comment.body || ''
            })),
            { ordered: false }
        );
    }
}

function startFetchCronJob() {
    const task = cron.schedule('0 * * * *', async () => {
        try {
            await fetchAndUpsertAll();
            console.log('[CRON] Refreshed posts, users, and comments data');
        } catch (error) {
            console.error('[CRON] Failed to refresh data:', error.message);
        }
    });

    return task;
}

module.exports = {
    startFetchCronJob
};
