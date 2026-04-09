const { Queue, Worker, QueueEvents } = require('bullmq');
const { uploadBufferToMedia } = require('../services/cloudinaryUploadService');

const REDIS_URL = String(process.env.REDIS_URL || 'redis://localhost:6379').trim();
const QUEUE_NAME = 'upload-jobs';

let uploadQueue = null;
let uploadWorker = null;
let queueEvents = null;

function shouldUseQueue() {
    const mode = String(process.env.UPLOAD_PIPELINE_MODE || 'queue').trim().toLowerCase();
    if (!String(process.env.REDIS_URL || '').trim()) {
        return false;
    }

    return mode !== 'direct';
}

function getConnection() {
    return {
        url: REDIS_URL
    };
}

function ensureQueue() {
    if (!uploadQueue) {
        uploadQueue = new Queue(QUEUE_NAME, {
            connection: getConnection(),
            defaultJobOptions: {
                attempts: 3,
                removeOnComplete: true,
                removeOnFail: 200
            }
        });
    }

    if (!queueEvents) {
        queueEvents = new QueueEvents(QUEUE_NAME, {
            connection: getConnection()
        });
    }

    return uploadQueue;
}

async function processUpload(buffer, options = {}) {
    if (!shouldUseQueue()) {
        return uploadBufferToMedia(buffer, options);
    }

    try {
        const queue = ensureQueue();
        const job = await queue.add('upload', {
            bufferBase64: Buffer.from(buffer).toString('base64'),
            options
        });

        const result = await job.waitUntilFinished(queueEvents);
        return result;
    } catch (_error) {
        return uploadBufferToMedia(buffer, options);
    }
}

function startUploadWorker() {
    if (!shouldUseQueue() || uploadWorker) {
        return uploadWorker;
    }

    try {
        uploadWorker = new Worker(
            QUEUE_NAME,
            async (job) => {
                const buffer = Buffer.from(String(job.data?.bufferBase64 || ''), 'base64');
                return uploadBufferToMedia(buffer, job.data?.options || {});
            },
            {
                connection: getConnection(),
                concurrency: Math.max(1, Math.min(16, Number(process.env.UPLOAD_PIPELINE_CONCURRENCY) || 2))
            }
        );

        uploadWorker.on('error', () => {
            // Keep worker running; errors are surfaced to job callers.
        });
    } catch (_error) {
        uploadWorker = null;
    }

    return uploadWorker;
}

async function stopUploadWorker() {
    if (uploadWorker) {
        await uploadWorker.close();
        uploadWorker = null;
    }

    if (queueEvents) {
        await queueEvents.close();
        queueEvents = null;
    }

    if (uploadQueue) {
        await uploadQueue.close();
        uploadQueue = null;
    }
}

module.exports = {
    processUpload,
    startUploadWorker,
    stopUploadWorker
};