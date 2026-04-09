const mongoose = require('mongoose');
const Notification = require('../models/Notification');

async function getNotifications(req, res) {
    try {
        const recipientId = Number(req.user?.userId);
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        if (!Number.isFinite(recipientId) || recipientId < 1) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find({ recipientId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments({ recipientId }),
            Notification.countDocuments({ recipientId, isRead: false })
        ]);

        return res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            unreadCount,
            message: 'Notifications fetched successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

async function markNotificationRead(req, res) {
    try {
        const recipientId = Number(req.user?.userId);
        const notificationId = String(req.params.id || '').trim();

        if (!Number.isFinite(recipientId) || recipientId < 1) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }

        const updated = await Notification.findOneAndUpdate(
            { _id: notificationId, recipientId },
            { $set: { isRead: true } },
            { new: true }
        ).lean();

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.status(200).json({
            success: true,
            data: updated,
            message: 'Notification marked as read'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

async function markAllNotificationsRead(req, res) {
    try {
        const recipientId = Number(req.user?.userId);

        if (!Number.isFinite(recipientId) || recipientId < 1) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const result = await Notification.updateMany(
            { recipientId, isRead: false },
            { $set: { isRead: true } }
        );

        return res.status(200).json({
            success: true,
            data: { modifiedCount: Number(result.modifiedCount) || 0 },
            message: 'All notifications marked as read'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

module.exports = {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
};