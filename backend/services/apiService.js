const axios = require('axios');

const JSONPLACEHOLDER_BASE_URL = 'https://jsonplaceholder.typicode.com';

const apiClient = axios.create({
    baseURL: JSONPLACEHOLDER_BASE_URL,
    timeout: 15000
});

/**
 * Fetch posts from JSONPlaceholder
 */
async function fetchPosts() {
    try {
        const response = await apiClient.get('/posts');
        return {
            success: true,
            data: Array.isArray(response.data) ? response.data : [],
            message: 'Posts fetched successfully'
        };
    } catch (error) {
        return {
            success: false,
            data: [],
            message: error.message || 'Failed to fetch posts'
        };
    }
}

/**
 * Fetch users from JSONPlaceholder
 */
async function fetchUsers() {
    try {
        const response = await apiClient.get('/users');
        return {
            success: true,
            data: Array.isArray(response.data) ? response.data : [],
            message: 'Users fetched successfully'
        };
    } catch (error) {
        return {
            success: false,
            data: [],
            message: error.message || 'Failed to fetch users'
        };
    }
}

/**
 * Fetch comments from JSONPlaceholder
 */
async function fetchComments() {
    try {
        const response = await apiClient.get('/comments');
        return {
            success: true,
            data: Array.isArray(response.data) ? response.data : [],
            message: 'Comments fetched successfully'
        };
    } catch (error) {
        return {
            success: false,
            data: [],
            message: error.message || 'Failed to fetch comments'
        };
    }
}

module.exports = {
    fetchPosts,
    fetchUsers,
    fetchComments
};
