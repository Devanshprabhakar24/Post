const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');
const { getAllUsers, getUserById, getUserPosts, followUser, unfollowUser, uploadProfilePic } = require('../controllers/userController');

const router = express.Router();

// Get all users
router.get('/', getAllUsers);

// Upload profile picture
router.post('/upload-profile-pic', authMiddleware, upload.single('image'), uploadProfilePic);

// Get posts by user
router.get('/:id/posts', getUserPosts);

// Follow / unfollow
router.post('/:id/follow', authMiddleware, followUser);
router.post('/:id/unfollow', authMiddleware, unfollowUser);

// Get single user
router.get('/:id', getUserById);

module.exports = router;
