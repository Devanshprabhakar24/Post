const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const cache = require('../utils/cache');

const STATS_CACHE_KEY = 'stats:global';
const STATS_CACHE_TTL = 60 * 1000;

async function getStats(_req, res, next) {
    try {
        const payload = await cache.remember(STATS_CACHE_KEY, STATS_CACHE_TTL, async () => {
            const [totalPosts, totalUsers, totalComments] = await Promise.all([
                Post.countDocuments(),
                User.countDocuments(),
                Comment.countDocuments()
            ]);

            const mostActiveUserResult = await Post.aggregate([
                { $group: { _id: '$userId', postCount: { $sum: 1 } } },
                { $sort: { postCount: -1 } },
                { $limit: 1 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'userId',
                        as: 'user'
                    }
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        userId: '$_id',
                        postCount: 1,
                        name: '$user.name',
                        username: '$user.username',
                        email: '$user.email'
                    }
                }
            ]);

            const mostLikedPost = await Post.findOne()
                .sort({ likes: -1, createdAt: -1 })
                .select({ _id: 0, postId: 1, title: 1, likes: 1, userId: 1 })
                .lean();

            return {
                totalPosts,
                totalUsers,
                totalComments,
                mostActiveUser: mostActiveUserResult[0] || null,
                mostLikedPost: mostLikedPost || null
            };
        });

        return res.status(200).json({
            success: true,
            data: payload,
            message: 'Stats fetched successfully'
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getStats
};
