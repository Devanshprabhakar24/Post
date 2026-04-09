const { uploadBufferToMedia } = require('./cloudinaryUploadService');

const queue = [];
let activeWorkers = 0;

const stats = {
    enqueued: 0,
    completed: 0,
    failed: 0
};

function getPipelineMode() {
    const mode = String(process.env.UPLOAD_PIPELINE_MODE || 'queue').trim().toLowerCase();
    return mode === 'direct' ? 'direct' : 'queue';
}

function getConcurrency() {
    const parsed = Number(process.env.UPLOAD_PIPELINE_CONCURRENCY);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return 1;
    }

    return Math.min(8, Math.floor(parsed));
}

async function executeUpload(buffer, options) {
    return uploadBufferToMedia(buffer, options);
}

function processQueue() {
    const maxWorkers = getConcurrency();

    while (activeWorkers < maxWorkers && queue.length > 0) {
        const job = queue.shift();
        if (!job) {
            return;
        }

        activeWorkers += 1;
        executeUpload(job.buffer, job.options)
            .then((result) => {
                stats.completed += 1;
                job.resolve(result);
            })
            .catch((error) => {
                stats.failed += 1;
                job.reject(error);
            })
            .finally(() => {
                activeWorkers = Math.max(0, activeWorkers - 1);
                setImmediate(processQueue);
            });
    }
}

async function uploadMediaWithPipeline(buffer, options = {}) {
    if (getPipelineMode() === 'direct') {
        return executeUpload(buffer, options);
    }

    stats.enqueued += 1;

    return new Promise((resolve, reject) => {
        queue.push({ buffer, options, resolve, reject });
        setImmediate(processQueue);
    });
}

function getUploadPipelineMetrics() {
    return {
        mode: getPipelineMode(),
        concurrency: getConcurrency(),
        queueDepth: queue.length,
        activeWorkers,
        enqueued: stats.enqueued,
        completed: stats.completed,
        failed: stats.failed
    };
}

module.exports = {
    uploadMediaWithPipeline,
    getUploadPipelineMetrics
};