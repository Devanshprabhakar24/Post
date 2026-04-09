import { io } from 'socket.io-client';

const FALLBACK_URL = 'http://localhost:8000';

function normalizeUrl(raw) {
    if (!raw) {
        return FALLBACK_URL;
    }

    return raw.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://').replace(/\/$/, '');
}

const SOCKET_URL = normalizeUrl(import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || FALLBACK_URL);

const SOCKET_OPTIONS = import.meta.env.DEV
    ? {
        transports: ['polling'],
        autoConnect: false
    }
    : {
        transports: ['websocket', 'polling'],
        autoConnect: false
    };

const socket = io(SOCKET_URL, SOCKET_OPTIONS);

function connectSocket() {
    if (!socket.connected) {
        socket.connect();
    }
}

function onSearchResults(handler) {
    socket.on('results', handler);
    return () => socket.off('results', handler);
}

function emitSearch(query, debounceMs = 300) {
    socket.emit('search', { query, debounceMs });
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
    socket.on('userOnline', handler);
    return () => socket.off('userOnline', handler);
}

function onUserOffline(handler) {
    socket.on('userOffline', handler);
    return () => socket.off('userOffline', handler);
}

function identifyUser(userId) {
    socket.emit('identify', { userId });
}

function joinPost(postId) {
    socket.emit('joinPost', postId);
}

function disconnectSocket() {
    socket.disconnect();
}

function onNotification(handler) {
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
}

export { socket, connectSocket, onSearchResults, emitSearch, onLikeUpdated, onNewPost, onUserOnline, onUserOffline, onNotification, joinPost, identifyUser, disconnectSocket };
