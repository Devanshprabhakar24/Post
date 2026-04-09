const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            unique: true,
            sparse: true,
            index: true
        },
        postId: {
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
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 300,
            index: true
        },
        body: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 5000,
            index: true
        },
        imageUrl: {
            type: String,
            trim: true,
            default: ''
        },
        imageData: {
            type: String,
            default: ''
        },
        imageContentType: {
            type: String,
            default: ''
        },
        hashtags: {
            type: [String],
            default: [],
            index: true
        },
        likes: {
            type: Number,
            default: 0,
            index: true
        },
        isExternal: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Text index for full-text search
postSchema.index({ title: 'text', body: 'text' });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ isExternal: 1, createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: -1, createdAt: -1 });
postSchema.index({ userId: 1, likes: -1, createdAt: -1 });
postSchema.index({ hashtags: 1, likes: -1 });

module.exports = mongoose.model('Post', postSchema);