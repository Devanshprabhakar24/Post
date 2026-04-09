const express = require('express');
const { searchLimiter } = require('../middleware/rateLimiter');
const { authMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');
const { getPostComments } = require('../controllers/commentController');
const {
    fetchAndStorePosts,
    createPost,
    updatePost,
    deletePost,
    getAllPosts,
    getPostById,
    likePost,
    unlikePost,
    getLikeStatus,
    getTopLikedPosts,
    getTrendingPosts,
    search,
    searchDiagnostics
} = require('../controllers/postController');

const router = express.Router();

// Data management
router.get('/fetch', fetchAndStorePosts);

// User generated post management
router.post('/', authMiddleware, upload.single('image'), createPost);
router.post('/:id/comment', authMiddleware, require('../controllers/commentController').createPostComment);
router.put('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);

// Top liked and trending
router.get('/top-liked', getTopLikedPosts);
router.get('/trending', getTrendingPosts);
router.get('/search', searchLimiter, search);
router.get('/search/diagnostics', authMiddleware, searchDiagnostics);

// Get all posts with pagination and filtering
router.get('/', getAllPosts);

// Get comments for a post
router.get('/:id/comments', getPostComments);

// Like system
router.post('/:id/like', authMiddleware, likePost);
router.post('/:id/unlike', authMiddleware, unlikePost);
router.get('/:id/likes', getLikeStatus);

// Get single post with author and comments
router.get('/:id', getPostById);

module.exports = router;
