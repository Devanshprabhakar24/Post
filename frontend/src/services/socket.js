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
let identifiedUserId = null;
const joinedPostRooms = new Set();

function createFeedSocket() {
    const instance = io(`${SOCKET_URL}/feed`, SOCKET_OPTIONS);
    instance.on('connect', () => {
        if (identifiedUserId) {
            instance.emit('identify', { userId: identifiedUserId });
        }

        joinedPostRooms.forEach((postId) => {
            instance.emit('joinPost', postId);
        });
    });

    return instance;
}

function createSearchSocket() {
    return io(`${SOCKET_URL}/search`, SOCKET_OPTIONS);
}

function createPresenceSocket() {
    const instance = io(`${SOCKET_URL}/presence`, SOCKET_OPTIONS);
    instance.on('connect', () => {
        if (identifiedUserId) {
            instance.emit('identify', { userId: identifiedUserId });
        }
    });

    return instance;
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
    ensureSockets();

    searchSocket.on('results', handler);
    return () => searchSocket.off('results', handler);
}

function emitSearch(query, debounceMs = 300) {
    ensureSockets();
    searchSocket?.emit('search', { query, debounceMs });
}

function onLikeUpdated(handler) {
    ensureSockets();

    socket.on('likeUpdated', handler);
    return () => socket.off('likeUpdated', handler);
}

function onNewPost(handler) {
    ensureSockets();

    socket.on('newPost', handler);
    return () => socket.off('newPost', handler);
}

function onUserOnline(handler) {
    ensureSockets();

    presenceSocket.on('userOnline', handler);
    return () => presenceSocket.off('userOnline', handler);
}

function onUserOffline(handler) {
    ensureSockets();

    presenceSocket.on('userOffline', handler);
    return () => presenceSocket.off('userOffline', handler);
}

function identifyUser(userId) {
    ensureSockets();
    const normalizedUserId = Number(userId);
    if (!normalizedUserId) {
        return;
    }

    identifiedUserId = normalizedUserId;
    socket?.emit('identify', { userId: normalizedUserId });
    presenceSocket?.emit('identify', { userId: normalizedUserId });
}

function joinPost(postId) {
    ensureSockets();
    const normalizedPostId = Number(postId);
    if (!normalizedPostId) {
        return;
    }

    joinedPostRooms.add(normalizedPostId);
    socket?.emit('joinPost', normalizedPostId);
}

function disconnectSocket() {
    identifiedUserId = null;
    joinedPostRooms.clear();

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
    ensureSockets();

    socket.on('notification', handler);
    return () => socket.off('notification', handler);
}

function onCommentCreated(handler) {
    ensureSockets();

    socket.on('commentCreated', handler);
    return () => socket.off('commentCreated', handler);
}

export { socket, connectSocket, onSearchResults, emitSearch, onLikeUpdated, onNewPost, onCommentCreated, onUserOnline, onUserOffline, onNotification, joinPost, identifyUser, disconnectSocket };
