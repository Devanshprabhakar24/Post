const User = require('../models/User');
const Post = require('../models/Post');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createNotification } = require('../services/notificationService');
const { deleteMediaByUrl } = require('../services/cloudinaryUploadService');
const { processUpload } = require('../jobs/uploadQueue');

function getViewerUserId(req) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token || !process.env.JWT_SECRET) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return Number(decoded.userId) || null;
    } catch (_error) {
        return null;
    }
}

/**
 * Normalize user data from JSONPlaceholder format
 */
function normalizeUser(user) {
    return {
        userId: user.id,
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        address: user.address || {},
        phone: user.phone || '',
        website: user.website || '',
        company: user.company || {}
    };
}

function resolveProfileImageFields(user) {
    const directProfilePic = String(user?.profilePic || '').trim();
    const directImageUrl = String(user?.imageUrl || '').trim();

    if (directProfilePic || directImageUrl) {
        const resolved = directProfilePic || directImageUrl;
        return {
            imageUrl: directImageUrl || resolved,
            profilePic: resolved
        };
    }

    const imageData = String(user?.profilePicData || '').trim();
    if (!imageData) {
        return {
            imageUrl: '',
            profilePic: ''
        };
    }

    const contentType = String(user?.profilePicContentType || 'image/jpeg').trim() || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${imageData}`;

    return {
        imageUrl: dataUrl,
        profilePic: dataUrl
    };
}

/**
 * Upsert users into database
 */
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

/**
 * Get all users
 * GET /api/users
 */
async function getAllUsers(req, res) {
    try {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const cursor = String(req.query.cursor || '').trim();
        const query = {};

        if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
            query._id = { $lt: cursor };
        }

        const users = await User.find(query)
            .sort({ _id: -1 })
            .limit(limit)
            .select({ _id: 1, userId: 1, name: 1, username: 1, email: 1, bio: 1, imageUrl: 1, profilePic: 1, isOnline: 1, followers: 1, following: 1, isExternal: 1, createdAt: 1, profilePicData: 1, profilePicContentType: 1 })
            .lean();

        const nextCursor = users.length > 0 ? String(users[users.length - 1]._id || '') : null;
        const normalizedUsers = users.map((entry) => {
            const { _id, profilePicData, profilePicContentType, ...rest } = entry;
            const image = resolveProfileImageFields({
                ...rest,
                profilePicData,
                profilePicContentType
            });

            return {
                ...rest,
                imageUrl: image.imageUrl,
                profilePic: image.profilePic
            };
        });

        return res.status(200).json({
            success: true,
            data: normalizedUsers,
            count: normalizedUsers.length,
            pagination: {
                limit,
                cursor: nextCursor
            },
            message: 'Users fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

/**
 * Get single user
 * GET /api/users/:id
 */
async function getUserById(req, res) {
    try {
        const userId = parseInt(req.params.id);
        const viewerUserId = getViewerUserId(req);

        if (Number.isNaN(userId) || userId < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.findOne({ userId })
            .select({ _id: 0, userId: 1, name: 1, username: 1, email: 1, bio: 1, imageUrl: 1, profilePic: 1, followers: 1, following: 1, isOnline: 1, onlineAt: 1, address: 1, phone: 1, website: 1, company: 1, profilePicData: 1, profilePicContentType: 1 })
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const image = resolveProfileImageFields(user);

        const posts = await Post.find({ userId })
            .select({ _id: 0, postId: 1, userId: 1, title: 1, body: 1, imageUrl: 1, hashtags: 1, likes: 1, createdAt: 1, updatedAt: 1 })
            .sort({ createdAt: -1 })
            .lean();

        const normalizedPosts = posts.map((post) => ({
            ...post,
            likedBy: []
        }));

        const { profilePicData, profilePicContentType, ...safeUser } = user;

        const followersCount = Array.isArray(user.followers) ? user.followers.length : 0;
        const followingCount = Array.isArray(user.following) ? user.following.length : 0;
        const isFollowing = viewerUserId ? (Array.isArray(user.followers) && user.followers.includes(viewerUserId)) : false;

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    ...safeUser,
                    imageUrl: image.imageUrl,
                    profilePic: image.profilePic
                },
                posts: normalizedPosts,
                followersCount,
                followingCount,
                isFollowing
            },
            message: 'User fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

/**
 * Get posts by user
 * GET /api/users/:id/posts
 */
async function getUserPosts(req, res) {
    try {
        const userId = parseInt(req.params.id);

        if (Number.isNaN(userId) || userId < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Verify user exists
        const user = await User.findOne({ userId }).select({ _id: 0, userId: 1 }).lean();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const posts = await Post.find({ userId })
            .select({ _id: 0, postId: 1, userId: 1, title: 1, body: 1, imageUrl: 1, hashtags: 1, likes: 1, createdAt: 1, updatedAt: 1 })
            .sort({ createdAt: -1 })
            .lean();

        const normalizedPosts = posts.map((post) => ({
            ...post,
            likedBy: []
        }));

        return res.status(200).json({
            success: true,
            data: normalizedPosts,
            count: normalizedPosts.length,
            message: 'User posts fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user posts',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

async function followUser(req, res) {
    try {
        const targetUserId = parseInt(req.params.id, 10);
        const viewerUserId = Number(req.user?.userId);

        if (Number.isNaN(targetUserId) || targetUserId < 1) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        if (!viewerUserId || Number.isNaN(viewerUserId)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (targetUserId === viewerUserId) {
            return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
        }

        const [viewer, target] = await Promise.all([
            User.findOne({ userId: viewerUserId }).lean(),
            User.findOne({ userId: targetUserId }).lean()
        ]);

        if (!viewer || !target) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await Promise.all([
            User.updateOne({ userId: viewerUserId }, { $addToSet: { following: targetUserId } }),
            User.updateOne({ userId: targetUserId }, { $addToSet: { followers: viewerUserId } })
        ]);

        const [updatedViewer, updatedTarget] = await Promise.all([
            User.findOne({ userId: viewerUserId }).select({ _id: 0, following: 1 }).lean(),
            User.findOne({ userId: targetUserId }).select({ _id: 0, followers: 1 }).lean()
        ]);

        await createNotification({
            recipientId: targetUserId,
            senderId: viewerUserId,
            postId: null,
            type: 'follow',
            message: `${viewer.name || viewer.username || 'Someone'} started following you`
        });

        return res.status(200).json({
            success: true,
            data: {
                userId: targetUserId,
                isFollowing: true,
                followersCount: Array.isArray(updatedTarget?.followers) ? updatedTarget.followers.length : 0,
                followingCount: Array.isArray(updatedViewer?.following) ? updatedViewer.following.length : 0
            },
            message: 'Followed successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to follow user',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

async function unfollowUser(req, res) {
    try {
        const targetUserId = parseInt(req.params.id, 10);
        const viewerUserId = Number(req.user?.userId);

        if (Number.isNaN(targetUserId) || targetUserId < 1) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        if (!viewerUserId || Number.isNaN(viewerUserId)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (targetUserId === viewerUserId) {
            return res.status(400).json({ success: false, message: 'You cannot unfollow yourself' });
        }

        const [viewer, target] = await Promise.all([
            User.findOne({ userId: viewerUserId }).lean(),
            User.findOne({ userId: targetUserId }).lean()
        ]);

        if (!viewer || !target) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await Promise.all([
            User.updateOne({ userId: viewerUserId }, { $pull: { following: targetUserId } }),
            User.updateOne({ userId: targetUserId }, { $pull: { followers: viewerUserId } })
        ]);

        const [updatedViewer, updatedTarget] = await Promise.all([
            User.findOne({ userId: viewerUserId }).select({ _id: 0, following: 1 }).lean(),
            User.findOne({ userId: targetUserId }).select({ _id: 0, followers: 1 }).lean()
        ]);

        return res.status(200).json({
            success: true,
            data: {
                userId: targetUserId,
                isFollowing: false,
                followersCount: Array.isArray(updatedTarget?.followers) ? updatedTarget.followers.length : 0,
                followingCount: Array.isArray(updatedViewer?.following) ? updatedViewer.following.length : 0
            },
            message: 'Unfollowed successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to unfollow user',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

async function uploadProfilePic(req, res) {
    try {
        const authUserId = Number(req.user?.userId);

        if (!authUserId || Number.isNaN(authUserId)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Image file is required' });
        }

        const user = await User.findOne({ userId: authUserId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const previousImage = String(user.profilePic || user.imageUrl || '').trim();
        const uploadResult = await processUpload(req.file.buffer, {
            folder: 'profile_pics',
            mimetype: req.file.mimetype,
            transformation: [
                {
                    width: 300,
                    height: 300,
                    crop: 'fill',
                    gravity: 'auto',
                    quality: 'auto',
                    fetch_format: 'webp'
                }
            ]
        });

        const nextUrl = String(uploadResult?.secure_url || '').trim();
        const nextData = String(uploadResult?.imageData || '').trim();
        const nextContentType = String(uploadResult?.imageContentType || req.file.mimetype || '').trim();

        user.profilePic = nextUrl;
        user.imageUrl = nextUrl;
        user.profilePicData = uploadResult?.storage === 'database' ? nextData : '';
        user.profilePicContentType = uploadResult?.storage === 'database' ? nextContentType : '';
        await user.save();

        if (previousImage && previousImage !== nextUrl) {
            await deleteMediaByUrl(previousImage);
        }

        return res.status(200).json({
            success: true,
            data: {
                userId: user.userId,
                name: user.name,
                username: user.username,
                email: user.email,
                bio: user.bio || '',
                imageUrl: user.imageUrl || '',
                profilePic: user.profilePic || '',
                profilePicData: user.profilePicData || '',
                profilePicContentType: user.profilePicContentType || ''
            },
            message: 'Profile picture uploaded successfully'
        });
    } catch (error) {
        return res.status(error?.status || 500).json({
            success: false,
            message: error?.message || 'Failed to upload profile picture'
        });
    }
}

module.exports = {
    getAllUsers,
    getUserById,
    getUserPosts,
    followUser,
    unfollowUser,
    uploadProfilePic
};
