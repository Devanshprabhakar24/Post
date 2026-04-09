const Notification = require('../models/Notification');
const { emitNotification } = require('../sockets/notificationSocket');

const DUPLICATE_WINDOW_MS = 30 * 1000;

function buildTargetUrl(type, senderId, postId) {
    if (Number.isFinite(Number(postId)) && Number(postId) > 0) {
        return `/posts/${Number(postId)}`;
    }

    if (type === 'follow' && Number.isFinite(Number(senderId)) && Number(senderId) > 0) {
        return `/profile/${Number(senderId)}`;
    }

    return '/';
}

async function createNotification({ recipientId, senderId, postId = null, type, message }) {
    const normalizedRecipientId = Number(recipientId);
    const normalizedSenderId = Number(senderId);
    const normalizedPostId = Number.isFinite(Number(postId)) && Number(postId) > 0 ? Number(postId) : null;
    const normalizedType = String(type || '').trim().toLowerCase();
    const normalizedMessage = String(message || '').trim();

    if (!Number.isFinite(normalizedRecipientId) || normalizedRecipientId < 1) {
        return null;
    }

    if (!Number.isFinite(normalizedSenderId) || normalizedSenderId < 1) {
        return null;
    }

    if (!normalizedType || !normalizedMessage) {
        return null;
    }

    if (normalizedRecipientId === normalizedSenderId) {
        return null;
    }

    const duplicateSince = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const duplicate = await Notification.findOne({
        recipientId: normalizedRecipientId,
        senderId: normalizedSenderId,
        postId: normalizedPostId,
        type: normalizedType,
        message: normalizedMessage,
        createdAt: { $gte: duplicateSince }
    }).lean();

    const record = duplicate || (await Notification.create({
        recipientId: normalizedRecipientId,
        senderId: normalizedSenderId,
        postId: normalizedPostId,
        type: normalizedType,
        message: normalizedMessage,
        isRead: false
    })).toObject();

    const payload = {
        ...record,
        targetUrl: buildTargetUrl(normalizedType, normalizedSenderId, normalizedPostId)
    };

    emitNotification(payload);
    return payload;
}

module.exports = {
    createNotification
};