const crypto = require('crypto');

const RECENT_LATENCY_LIMIT = 500;

const metrics = {
    startedAt: Date.now(),
    totalRequests: 0,
    errorRequests: 0,
    routeStats: new Map(),
    recentLatencies: []
};

function createRequestId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRouteKey(req) {
    const routePath = req.route?.path;
    const basePath = req.baseUrl || '';

    if (routePath) {
        return `${req.method} ${basePath}${routePath}`;
    }

    return `${req.method} ${req.path || req.originalUrl || '/'}`;
}

function pushLatency(durationMs) {
    metrics.recentLatencies.push(durationMs);
    if (metrics.recentLatencies.length > RECENT_LATENCY_LIMIT) {
        metrics.recentLatencies.shift();
    }
}

function updateRouteStats(routeKey, durationMs, statusCode) {
    const current = metrics.routeStats.get(routeKey) || {
        count: 0,
        totalLatencyMs: 0,
        maxLatencyMs: 0,
        errors: 0
    };

    current.count += 1;
    current.totalLatencyMs += durationMs;
    current.maxLatencyMs = Math.max(current.maxLatencyMs, durationMs);
    if (statusCode >= 400) {
        current.errors += 1;
    }

    metrics.routeStats.set(routeKey, current);
}

function requestIdMiddleware(req, res, next) {
    const requestId = req.headers['x-request-id'] || createRequestId();
    req.requestId = String(requestId);
    res.setHeader('x-request-id', req.requestId);
    next();
}

function requestMetricsMiddleware(req, res, next) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        const routeKey = getRouteKey(req);

        metrics.totalRequests += 1;
        if (res.statusCode >= 400) {
            metrics.errorRequests += 1;
        }

        updateRouteStats(routeKey, durationMs, res.statusCode);
        pushLatency(durationMs);
    });

    next();
}

function percentile(values, p) {
    if (!Array.isArray(values) || values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
    return Number(sorted[index].toFixed(2));
}

function getTopRoutes(limit = 10) {
    return Array.from(metrics.routeStats.entries())
        .map(([route, value]) => ({
            route,
            count: value.count,
            errors: value.errors,
            avgLatencyMs: value.count > 0 ? Number((value.totalLatencyMs / value.count).toFixed(2)) : 0,
            maxLatencyMs: Number(value.maxLatencyMs.toFixed(2))
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function getApiMetricsSnapshot() {
    const uptimeSeconds = Math.max(1, process.uptime());
    const recent = metrics.recentLatencies;

    return {
        startedAt: new Date(metrics.startedAt).toISOString(),
        totalRequests: metrics.totalRequests,
        errorRequests: metrics.errorRequests,
        errorRate: metrics.totalRequests > 0 ? Number((metrics.errorRequests / metrics.totalRequests).toFixed(4)) : 0,
        requestsPerSecond: Number((metrics.totalRequests / uptimeSeconds).toFixed(2)),
        latencyMs: {
            p50: percentile(recent, 0.5),
            p95: percentile(recent, 0.95),
            p99: percentile(recent, 0.99)
        },
        topRoutes: getTopRoutes(10)
    };
}

function renderPrometheusMetrics(snapshot, extras = {}) {
    const data = snapshot || getApiMetricsSnapshot();
    const processUptime = Number(process.uptime().toFixed(2));
    const memory = process.memoryUsage();
    const dbReadyState = Number(extras.dbReadyState ?? -1);

    return [
        '# HELP app_requests_total Total API requests observed by the app process',
        '# TYPE app_requests_total counter',
        `app_requests_total ${data.totalRequests}`,
        '# HELP app_requests_errors_total Total API requests with status >= 400',
        '# TYPE app_requests_errors_total counter',
        `app_requests_errors_total ${data.errorRequests}`,
        '# HELP app_requests_per_second Request throughput observed by the app process',
        '# TYPE app_requests_per_second gauge',
        `app_requests_per_second ${data.requestsPerSecond}`,
        '# HELP app_latency_p50_ms P50 API latency in milliseconds',
        '# TYPE app_latency_p50_ms gauge',
        `app_latency_p50_ms ${data.latencyMs.p50}`,
        '# HELP app_latency_p95_ms P95 API latency in milliseconds',
        '# TYPE app_latency_p95_ms gauge',
        `app_latency_p95_ms ${data.latencyMs.p95}`,
        '# HELP app_latency_p99_ms P99 API latency in milliseconds',
        '# TYPE app_latency_p99_ms gauge',
        `app_latency_p99_ms ${data.latencyMs.p99}`,
        '# HELP process_uptime_seconds Node.js process uptime in seconds',
        '# TYPE process_uptime_seconds gauge',
        `process_uptime_seconds ${processUptime}`,
        '# HELP process_resident_memory_bytes Resident memory size in bytes',
        '# TYPE process_resident_memory_bytes gauge',
        `process_resident_memory_bytes ${memory.rss}`,
        '# HELP process_heap_used_bytes Heap used in bytes',
        '# TYPE process_heap_used_bytes gauge',
        `process_heap_used_bytes ${memory.heapUsed}`,
        '# HELP mongodb_ready_state Mongoose connection readyState',
        '# TYPE mongodb_ready_state gauge',
        `mongodb_ready_state ${dbReadyState}`
    ].join('\n');
}

module.exports = {
    requestIdMiddleware,
    requestMetricsMiddleware,
    getApiMetricsSnapshot,
    renderPrometheusMetrics
};