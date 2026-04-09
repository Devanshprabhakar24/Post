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
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);