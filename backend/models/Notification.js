const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        recipientId: {
            type: Number,
            required: true,
            index: true
        },
        senderId: {
            type: Number,
            required: true,
            index: true
        },
        postId: {
            type: Number,
            default: null,
            index: true
        },
        type: {
            type: String,
            required: true,
            enum: ['like', 'comment', 'reply', 'follow'],
            index: true
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true
        },
        dedupeKey: {
            type: String,
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);