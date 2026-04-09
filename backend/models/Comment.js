const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            unique: true,
            sparse: true,
            index: true
        },
        commentId: {
            type: Number,
            required: true,
            unique: true,
            index: true
        },
        userId: {
            type: Number,
            required: true,
            index: true
        },
        postId: {
            type: Number,
            required: true,
            index: true
        },
        parentCommentId: {
            type: Number,
            default: null,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        body: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

commentSchema.index({ postId: 1, parentCommentId: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
