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

async function syncExternalData() {
    const [postsResult, usersResult, commentsResult] = await Promise.all([
        fetchPosts(),
        fetchUsers(),
        fetchComments()
    ]);

    if (postsResult.success && postsResult.data.length) {
        await Post.bulkWrite(
            buildUpsertOps(postsResult.data, 'postId', (post) => ({
                id: post.id,
                postId: post.id,
                userId: post.userId,
                title: post.title || '',
                body: post.body || '',
                isExternal: true
            })),
            { ordered: false }
        );
    }

    if (usersResult.success && usersResult.data.length) {
        await User.bulkWrite(
            buildUpsertOps(usersResult.data, 'userId', (user) => ({
                id: user.id,
                userId: user.id,
                name: user.name || '',
                username: user.username || '',
                email: user.email || '',
                address: user.address || {},
                phone: user.phone || '',
                website: user.website || '',
                company: user.company || {},
                isExternal: true
            })),
            { ordered: false }
        );
    }

    if (commentsResult.success && commentsResult.data.length) {
        await Comment.bulkWrite(
            buildUpsertOps(commentsResult.data, 'commentId', (comment) => ({
                id: comment.id,
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

function startSyncCronJob() {
    const task = cron.schedule('0 * * * *', async () => {
        try {
            await syncExternalData();
            console.log('[CRON] External API data synced successfully');
        } catch (error) {
            console.error('[CRON] External API sync failed:', error.message);
        }
    });

    return task;
}

module.exports = {
    syncExternalData,
    startSyncCronJob
};
