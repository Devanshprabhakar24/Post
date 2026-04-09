const mongoose = require('mongoose');
const { getApiMetricsSnapshot, renderPrometheusMetrics } = require('../middleware/observability');
const { getUploadPipelineMetrics } = require('../services/uploadPipelineService');

function isAuthorized(req) {
    const isProduction = process.env.NODE_ENV === 'production';
    const configuredToken = String(process.env.METRICS_TOKEN || '').trim();

    if (!isProduction || !configuredToken) {
        return true;
    }

    const incoming = String(req.headers['x-metrics-token'] || req.query.token || '').trim();
    return incoming.length > 0 && incoming === configuredToken;
}

function getRuntimeSnapshot() {
    const memory = process.memoryUsage();

    return {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Number(process.uptime().toFixed(2)),
        memory: {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external
        }
    };
}

async function getMetricsJson(req, res) {
    if (!isAuthorized(req)) {
        return res.status(403).json({
            success: false,
            data: null,
            message: 'Metrics access denied'
        });
    }

    const apiMetrics = getApiMetricsSnapshot();

    return res.status(200).json({
        success: true,
        data: {
            timestamp: new Date().toISOString(),
            api: apiMetrics,
            runtime: getRuntimeSnapshot(),
            database: {
                readyState: mongoose.connection.readyState,
                host: mongoose.connection.host || null,
                name: mongoose.connection.name || null
            },
            uploadPipeline: getUploadPipelineMetrics()
        },
        message: 'Metrics snapshot fetched successfully'
    });
}

async function getMetricsPrometheus(req, res) {
    if (!isAuthorized(req)) {
        return res.status(403).type('text/plain').send('metrics access denied');
    }

    const text = renderPrometheusMetrics(getApiMetricsSnapshot(), {
        dbReadyState: mongoose.connection.readyState
    });

    return res.status(200).type('text/plain; version=0.0.4').send(`${text}\n`);
}

module.exports = {
    getMetricsJson,
    getMetricsPrometheus
};