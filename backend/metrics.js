const client = require('prom-client');

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpRequestDurationMs = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [10, 25, 50, 100, 250, 500, 1000, 2000, 5000]
});

const activeSocketConnections = new client.Gauge({
    name: 'active_socket_connections',
    help: 'Active Socket.IO connections'
});

const cacheHitsTotal = new client.Counter({
    name: 'cache_hits_total',
    help: 'Total cache hits'
});

const cacheMissesTotal = new client.Counter({
    name: 'cache_misses_total',
    help: 'Total cache misses'
});

const likeBufferQueueSize = new client.Gauge({
    name: 'like_buffer_queue_size',
    help: 'Number of post keys waiting in buffered like delta set'
});

registry.registerMetric(httpRequestDurationMs);
registry.registerMetric(activeSocketConnections);
registry.registerMetric(cacheHitsTotal);
registry.registerMetric(cacheMissesTotal);
registry.registerMetric(likeBufferQueueSize);

function observeHttpRequest({ method, route, statusCode, durationMs }) {
    httpRequestDurationMs.observe(
        {
            method: method || 'UNKNOWN',
            route: route || 'unknown',
            status_code: String(statusCode || 0)
        },
        Number(durationMs) || 0
    );
}

function setActiveSocketConnections(count) {
    activeSocketConnections.set(Number(count) || 0);
}

function incCacheHit() {
    cacheHitsTotal.inc();
}

function incCacheMiss() {
    cacheMissesTotal.inc();
}

function setLikeBufferQueueSize(size) {
    likeBufferQueueSize.set(Number(size) || 0);
}

async function getMetricsText() {
    return registry.metrics();
}

module.exports = {
    observeHttpRequest,
    setActiveSocketConnections,
    incCacheHit,
    incCacheMiss,
    setLikeBufferQueueSize,
    getMetricsText,
    registry
};