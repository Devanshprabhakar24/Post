const Notification = require('../models/Notification');
const { emitNotification } = require('../sockets/notificationSocket');

const DUPLICATE_WINDOW_MS = 30 * 1000;

function buildDedupeKey(recipientId, senderId, postId, type) {
    return [recipientId, senderId, postId || 'none', type].join(':');
}

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

    const dedupeKey = buildDedupeKey(
        normalizedRecipientId,
        normalizedSenderId,
        normalizedPostId,
        normalizedType
    );
    const expiresAt = new Date(Date.now() + DUPLICATE_WINDOW_MS);

    let created = null;
    try {
        created = await Notification.create({
            recipientId: normalizedRecipientId,
            senderId: normalizedSenderId,
            postId: normalizedPostId,
            type: normalizedType,
            message: normalizedMessage,
            isRead: false,
            dedupeKey,
            expiresAt
        });
    } catch (error) {
        if (Number(error?.code) !== 11000) {
            throw error;
        }

        return null;
    }

    const record = created.toObject();

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