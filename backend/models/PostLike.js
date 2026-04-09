const mongoose = require('mongoose');

const postLikeSchema = new mongoose.Schema(
    {
        postId: {
            type: Number,
            required: true,
            index: true
        },
        userId: {
            type: Number,
            required: true,
            index: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        versionKey: false
    }
);

postLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('PostLike', postLikeSchema);