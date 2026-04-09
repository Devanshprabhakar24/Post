import axios from 'axios';

const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');
const AUTH_TOKEN_KEY = 'post-explorer-access-token';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

function getErrorMessage(error, fallbackMessage) {
    const message = error?.response?.data?.message;
    return typeof message === 'string' && message ? message : fallbackMessage;
}

async function fetchPosts(params = {}, options = {}) {
    try {
        const { data } = await api.get('/api/posts', { params, signal: options.signal });
        return {
            posts: Array.isArray(data?.data) ? data.data : [],
            pagination: data?.pagination || null
        };
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to load posts'));
    }
}

async function createPost(payload) {
    try {
        const imageFile = payload?.imageFile || null;

        if (imageFile) {
            const formData = new FormData();
            formData.append('title', String(payload?.title || ''));
            formData.append('body', String(payload?.body || ''));
            formData.append('image', imageFile);

            const { data } = await api.post('/api/posts', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return data?.data || null;
        }

        const { data } = await api.post('/api/posts', payload);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to create post'));
    }
}

async function uploadProfilePicture(file) {
    try {
        const formData = new FormData();
        formData.append('image', file);

        const { data } = await api.post('/api/users/upload-profile-pic', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to upload profile picture'));
    }
}

async function uploadImage(file) {
    try {
        const formData = new FormData();
        formData.append('image', file);

        const { data } = await api.post('/api/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to upload image'));
    }
}

async function updatePost(postId, payload) {
    try {
        const { data } = await api.put(`/api/posts/${postId}`, payload);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to update post'));
    }
}

async function deletePost(postId) {
    try {
        const { data } = await api.delete(`/api/posts/${postId}`);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to delete post'));
    }
}

async function syncPosts() {
    try {
        await api.get('/api/data/fetch');
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to sync posts'));
    }
}

async function fetchUsers(options = {}) {
    try {
        const { data } = await api.get('/api/users', { signal: options.signal });
        return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to load users'));
    }
}

async function fetchUserById(userId) {
    try {
        const { data } = await api.get(`/api/users/${userId}`);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to fetch user'));
    }
}

async function followUser(userId) {
    try {
        const { data } = await api.post(`/api/users/${userId}/follow`);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to follow user'));
    }
}

async function unfollowUser(userId) {
    try {
        const { data } = await api.post(`/api/users/${userId}/unfollow`);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to unfollow user'));
    }
}

async function fetchUserPosts(userId) {
    try {
        const { data } = await api.get(`/api/users/${userId}/posts`);
        return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to fetch user posts'));
    }
}

async function fetchPostComments(postId) {
    try {
        const { data } = await api.get(`/api/posts/${postId}/comments`);
        return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to fetch comments'));
    }
}

async function createPostComment(postId, body) {
    try {
        const { data } = await api.post(`/api/posts/${postId}/comment`, { body });
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to create comment'));
    }
}

async function replyToComment(commentId, body) {
    try {
        const { data } = await api.post(`/api/comments/${commentId}/reply`, { body });
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to reply to comment'));
    }
}

async function fetchStats() {
    try {
        const { data } = await api.get('/api/stats');
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to fetch stats'));
    }
}

async function loginUser(payload) {
    try {
        const { data } = await api.post('/api/auth/login', payload);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to login'));
    }
}

async function registerUser(payload) {
    try {
        const { data } = await api.post('/api/auth/register', payload);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to register'));
    }
}

async function fetchPostById(postId) {
    try {
        const { data } = await api.get(`/api/posts/${postId}`);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to load post details'));
    }
}

async function likePost(postId, userId) {
    try {
        const { data } = await api.post(`/api/posts/${postId}/like`, { userId });
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to like post'));
    }
}

async function unlikePost(postId, userId) {
    try {
        const { data } = await api.post(`/api/posts/${postId}/unlike`, { userId });
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to unlike post'));
    }
}

async function getLikeStatus(postId, userId) {
    try {
        const { data } = await api.get(`/api/posts/${postId}/likes`, {
            params: { userId }
        });
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to get like status'));
    }
}

async function fetchPostCommentsCount(postId) {
    try {
        const { data } = await api.get(`/api/posts/${postId}/comments`);
        return Number(data?.count) || 0;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to fetch comments count'));
    }
}

async function fetchNotifications(params = {}) {
    try {
        const { data } = await api.get('/api/notifications', { params });
        return {
            notifications: Array.isArray(data?.data) ? data.data : [],
            pagination: data?.pagination || null,
            unreadCount: Number(data?.unreadCount) || 0
        };
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to fetch notifications'));
    }
}

async function markNotificationRead(notificationId) {
    try {
        const { data } = await api.put(`/api/notifications/${notificationId}/read`);
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to mark notification as read'));
    }
}

async function markAllNotificationsRead() {
    try {
        const { data } = await api.put('/api/notifications/read-all');
        return data?.data || null;
    } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to mark all notifications as read'));
    }
}

export {
    API_BASE_URL,
    AUTH_TOKEN_KEY,
    loginUser,
    registerUser,
    fetchPosts,
    createPost,
    uploadProfilePicture,
    uploadImage,
    updatePost,
    deletePost,
    syncPosts,
    fetchUsers,
    fetchUserById,
    followUser,
    unfollowUser,
    fetchUserPosts,
    fetchPostComments,
    createPostComment,
    replyToComment,
    fetchStats,
    fetchPostById,
    likePost,
    unlikePost,
    getLikeStatus,
    fetchPostCommentsCount,
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead
};
