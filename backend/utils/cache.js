const DEFAULT_TTL_MS = 5 * 60 * 1000;

const store = new Map();

function now() {
    return Date.now();
}

function isExpired(entry) {
    if (!entry) {
        return true;
    }

    return entry.expiresAt <= now();
}

function get(key) {
    const entry = store.get(key);
    if (isExpired(entry)) {
        store.delete(key);
        return null;
    }

    return entry.value;
}

function set(key, value, ttlMs = DEFAULT_TTL_MS) {
    const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
    store.set(key, {
        value,
        expiresAt: now() + safeTtl
    });
}

function has(key) {
    return get(key) !== null;
}

function clear(key) {
    if (typeof key === 'string' && key.length > 0) {
        store.delete(key);
        return;
    }

    store.clear();
}

function clearByPrefix(prefix) {
    if (!prefix) {
        return;
    }

    Array.from(store.keys()).forEach((key) => {
        if (key.startsWith(prefix)) {
            store.delete(key);
        }
    });
}

async function remember(key, ttlMs, factory) {
    const cached = get(key);
    if (cached !== null) {
        return cached;
    }

    const value = await factory();
    set(key, value, ttlMs);
    return value;
}

module.exports = {
    get,
    set,
    has,
    clear,
    clearByPrefix,
    remember,
    DEFAULT_TTL_MS
};
