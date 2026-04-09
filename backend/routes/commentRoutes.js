const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getAllComments, getCommentById, createReply } = require('../controllers/commentController');

const router = express.Router();

// Get all comments with pagination
router.get('/', getAllComments);

// Get single comment
router.get('/:id', getCommentById);

// Reply to a comment
router.post('/:id/reply', authMiddleware, createReply);

module.exports = router;
