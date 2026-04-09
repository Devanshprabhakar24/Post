import { io } from 'socket.io-client';

const FALLBACK_URL = 'http://localhost:8000';
const isDev = import.meta.env.DEV;

if (!isDev && !String(import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || '').trim()) {
    throw new Error('VITE_WS_URL or VITE_API_URL is required in production');
}

function normalizeUrl(raw) {
    if (!raw) {
        return FALLBACK_URL;
    }

    return raw.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://').replace(/\/$/, '');
}

const SOCKET_URL = normalizeUrl(
    isDev
        ? (import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || FALLBACK_URL)
        : (import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL)
);

const SOCKET_OPTIONS = import.meta.env.DEV
    ? {
        transports: ['polling'],
        autoConnect: false
    }
    : {
        transports: ['websocket', 'polling'],
        autoConnect: false
    };

const socket = io(`${SOCKET_URL}/feed`, SOCKET_OPTIONS);
const searchSocket = io(`${SOCKET_URL}/search`, SOCKET_OPTIONS);
const presenceSocket = io(`${SOCKET_URL}/presence`, SOCKET_OPTIONS);

function connectSocket() {
    if (!socket.connected) {
        socket.connect();
    }

    if (!searchSocket.connected) {
        searchSocket.connect();
    }

    if (!presenceSocket.connected) {
        presenceSocket.connect();
    }
}

function onSearchResults(handler) {
    searchSocket.on('results', handler);
    return () => searchSocket.off('results', handler);
}

function emitSearch(query, debounceMs = 300) {
    searchSocket.emit('search', { query, debounceMs });
}

function onLikeUpdated(handler) {
    socket.on('likeUpdated', handler);
    return () => socket.off('likeUpdated', handler);
}

function onNewPost(handler) {
    socket.on('newPost', handler);
    return () => socket.off('newPost', handler);
}

function onUserOnline(handler) {
    presenceSocket.on('userOnline', handler);
    return () => presenceSocket.off('userOnline', handler);
}

function onUserOffline(handler) {
    presenceSocket.on('userOffline', handler);
    return () => presenceSocket.off('userOffline', handler);
}

function identifyUser(userId) {
    socket.emit('identify', { userId });
    presenceSocket.emit('identify', { userId });
}

function joinPost(postId) {
    socket.emit('joinPost', postId);
}

function disconnectSocket() {
    socket.disconnect();
    searchSocket.disconnect();
    presenceSocket.disconnect();
}

function onNotification(handler) {
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
}

export { socket, connectSocket, onSearchResults, emitSearch, onLikeUpdated, onNewPost, onUserOnline, onUserOffline, onNotification, joinPost, identifyUser, disconnectSocket };
