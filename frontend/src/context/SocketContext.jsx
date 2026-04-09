import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api';
import { connectSocket, disconnectSocket, identifyUser, onLikeUpdated, onNewPost, onNotification, onUserOffline, onUserOnline, socket } from '../services/socket';

const SocketContext = createContext(null);

function buildLikeNotificationMessage(payload) {
    const title = String(payload?.postTitle || '').trim();
    const authorName = String(payload?.author?.name || payload?.author?.username || '').trim();
    const totalLikes = Number(payload?.totalLikes) || 0;

    if (title && authorName) {
        return `${title} by ${authorName} now has ${totalLikes} likes`;
    }

    if (title) {
        return `${title} now has ${totalLikes} likes`;
    }

    if (authorName) {
        return `A post by ${authorName} now has ${totalLikes} likes`;
    }

    return `Post #${payload?.postId} now has ${totalLikes} likes`;
}

function buildLikeNotificationTarget(payload) {
    const postId = Number(payload?.postId);
    return Number.isFinite(postId) && postId > 0 ? `/posts/${postId}` : '/';
}

function normalizeNotification(item) {
    const id = String(item?._id || item?.id || `${Date.now()}-${Math.random()}`);
    const type = String(item?.type || 'system').toLowerCase();
    const targetUrl = item?.targetUrl || buildLikeNotificationTarget(item);

    return {
        ...item,
        id,
        type,
        read: Boolean(item?.isRead ?? item?.read),
        targetUrl,
        createdAt: item?.createdAt || new Date().toISOString()
    };
}

export function SocketProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        let active = true;

        if (!user?.userId) {
            setNotifications([]);
            return () => {
                active = false;
            };
        }

        fetchNotifications({ page: 1, limit: 30 })
            .then((response) => {
                if (!active) {
                    return;
                }

                const list = (response?.notifications || []).map(normalizeNotification);
                setNotifications(list);
            })
            .catch(() => {
                if (active) {
                    setNotifications([]);
                }
            });

        return () => {
            active = false;
        };
    }, [user?.userId]);

    useEffect(() => {
        connectSocket();

        if (user?.userId) {
            identifyUser(user.userId);
        }

        const unsubscribes = [];

        const stopNotification = onNotification((payload) => {
            const kind = String(payload?.type || 'system').toLowerCase();
            const targetUrl = payload?.targetUrl || buildLikeNotificationTarget(payload);
            const message = payload?.message || (kind === 'like'
                ? buildLikeNotificationMessage(payload)
                : kind === 'comment'
                    ? `${payload?.actor?.name || 'Someone'} commented on your post`
                    : 'New notification');

            const nextItem = normalizeNotification({
                ...payload,
                type: kind,
                message,
                targetUrl,
                isRead: false
            });

            toast.success(message);

            setNotifications((current) => [
                ...(current.some((entry) => entry.id === nextItem.id) ? current : [nextItem, ...current])
            ].slice(0, 30));
        });
        unsubscribes.push(stopNotification);

        const stopPostCreated = onNewPost((payload) => {
            setNotifications((current) => [
                {
                    id: `${Date.now()}-post-${payload?.postId || 'new'}`,
                    type: 'post',
                    read: false,
                    message: `${payload?.author?.name || 'Someone'} published a new post`,
                    createdAt: new Date().toISOString(),
                    payload
                },
                ...current
            ].slice(0, 30));
        });
        unsubscribes.push(stopPostCreated);

        const stopLikeUpdated = onLikeUpdated((payload) => {
            const message = buildLikeNotificationMessage(payload);

            setNotifications((current) => [
                normalizeNotification({
                    id: `${Date.now()}-like-${payload?.postId || 'post'}`,
                    type: 'like',
                    message,
                    targetUrl: buildLikeNotificationTarget(payload),
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    payload
                }),
                ...current
            ].slice(0, 30));
        });
        unsubscribes.push(stopLikeUpdated);

        const stopUserOnline = onUserOnline((payload) => {
            setOnlineUsers((current) => Array.from(new Set([...(current || []), ...(payload?.onlineUsers || []), Number(payload?.userId || 0)])).filter(Boolean));
        });
        unsubscribes.push(stopUserOnline);

        const stopUserOffline = onUserOffline((payload) => {
            setOnlineUsers((current) => current.filter((entry) => entry !== Number(payload?.userId)));
        });
        unsubscribes.push(stopUserOffline);

        return () => {
            unsubscribes.forEach((unsubscribe) => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            disconnectSocket();
        };
    }, [user?.userId]);

    const markAllRead = async () => {
        try {
            await markAllNotificationsRead();
        } catch (_error) {
            // Keep local fallback behavior even if request fails.
        }

        setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    };

    const markNotificationAsRead = async (notificationId) => {
        try {
            await markNotificationRead(notificationId);
        } catch (_error) {
            // Keep local fallback behavior even if request fails.
        }

        setNotifications((current) => current.map((item) => (
            item.id === String(notificationId) ? { ...item, read: true } : item
        )));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const unreadCount = notifications.filter((item) => !item.read).length;
    const isUserOnline = (userId) => onlineUsers.includes(Number(userId));

    const value = useMemo(
        () => ({
            socket,
            notifications,
            unreadCount,
            onlineUsers,
            isUserOnline,
            markAllRead,
            markNotificationAsRead,
            clearNotifications
        }),
        [notifications, unreadCount, onlineUsers, markAllRead, markNotificationAsRead, clearNotifications]
    );

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocketContext() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocketContext must be used within SocketProvider');
    }

    return context;
}
