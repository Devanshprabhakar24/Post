import { io } from 'socket.io-client';

const FALLBACK_URL = 'http://localhost:8000';
const isDev = import.meta.env.DEV;

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

let socket = null;
let searchSocket = null;
let presenceSocket = null;

function createFeedSocket() {
    return io(`${SOCKET_URL}/feed`, SOCKET_OPTIONS);
}

function createSearchSocket() {
    return io(`${SOCKET_URL}/search`, SOCKET_OPTIONS);
}

function createPresenceSocket() {
    return io(`${SOCKET_URL}/presence`, SOCKET_OPTIONS);
}

function ensureSockets() {
    if (!socket) {
        socket = createFeedSocket();
    }

    if (!searchSocket) {
        searchSocket = createSearchSocket();
    }

    if (!presenceSocket) {
        presenceSocket = createPresenceSocket();
    }
}

function connectSocket() {
    ensureSockets();

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
    if (!searchSocket) {
        return () => { };
    }

    searchSocket.on('results', handler);
    return () => searchSocket.off('results', handler);
}

function emitSearch(query, debounceMs = 300) {
    searchSocket?.emit('search', { query, debounceMs });
}

function onLikeUpdated(handler) {
    if (!socket) {
        return () => { };
    }

    socket.on('likeUpdated', handler);
    return () => socket.off('likeUpdated', handler);
}

function onNewPost(handler) {
    if (!socket) {
        return () => { };
    }

    socket.on('newPost', handler);
    return () => socket.off('newPost', handler);
}

function onUserOnline(handler) {
    if (!presenceSocket) {
        return () => { };
    }

    presenceSocket.on('userOnline', handler);
    return () => presenceSocket.off('userOnline', handler);
}

function onUserOffline(handler) {
    if (!presenceSocket) {
        return () => { };
    }

    presenceSocket.on('userOffline', handler);
    return () => presenceSocket.off('userOffline', handler);
}

function identifyUser(userId) {
    socket?.emit('identify', { userId });
    presenceSocket?.emit('identify', { userId });
}

function joinPost(postId) {
    socket?.emit('joinPost', postId);
}

function disconnectSocket() {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }

    if (searchSocket) {
        searchSocket.removeAllListeners();
        searchSocket.disconnect();
        searchSocket = null;
    }

    if (presenceSocket) {
        presenceSocket.removeAllListeners();
        presenceSocket.disconnect();
        presenceSocket = null;
    }
}

function onNotification(handler) {
    if (!socket) {
        return () => { };
    }

    socket.on('notification', handler);
    return () => socket.off('notification', handler);
}

export { socket, connectSocket, onSearchResults, emitSearch, onLikeUpdated, onNewPost, onUserOnline, onUserOffline, onNotification, joinPost, identifyUser, disconnectSocket };
