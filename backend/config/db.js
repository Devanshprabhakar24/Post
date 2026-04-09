const mongoose = require('mongoose');

let queryInstrumentationEnabled = false;

function getSlowQueryThresholdMs() {
    const value = Number(process.env.MONGO_SLOW_QUERY_MS);
    return Number.isFinite(value) && value > 0 ? value : 200;
}

function logSlowQuery({ operation, modelName, durationMs, conditions }) {
    const thresholdMs = getSlowQueryThresholdMs();
    if (durationMs < thresholdMs) {
        return;
    }

    const safeConditions = (() => {
        try {
            return JSON.stringify(conditions || {});
        } catch (_error) {
            return '[unserializable conditions]';
        }
    })();

    console.warn(`[mongo:slow] ${operation} ${modelName} ${durationMs.toFixed(2)}ms query=${safeConditions}`);
}

function enableMongoSlowQueryLogging() {
    if (queryInstrumentationEnabled) {
        return;
    }

    queryInstrumentationEnabled = true;

    const originalQueryExec = mongoose.Query.prototype.exec;
    mongoose.Query.prototype.exec = async function execWithTiming(...args) {
        const start = process.hrtime.bigint();
        try {
            return await originalQueryExec.apply(this, args);
        } finally {
            const end = process.hrtime.bigint();
            const durationMs = Number(end - start) / 1e6;
            logSlowQuery({
                operation: this.op || 'query',
                modelName: this.model?.modelName || 'UnknownModel',
                durationMs,
                conditions: this.getQuery()
            });
        }
    };

    const originalAggregateExec = mongoose.Aggregate.prototype.exec;
    mongoose.Aggregate.prototype.exec = async function aggregateExecWithTiming(...args) {
        const start = process.hrtime.bigint();
        try {
            return await originalAggregateExec.apply(this, args);
        } finally {
            const end = process.hrtime.bigint();
            const durationMs = Number(end - start) / 1e6;
            logSlowQuery({
                operation: 'aggregate',
                modelName: this._model?.modelName || 'UnknownModel',
                durationMs,
                conditions: this._pipeline || []
            });
        }
    };
}

async function connectDatabase() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is required in environment variables');
    }

    mongoose.set('strictQuery', true);
    enableMongoSlowQueryLogging();
    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 20,
        minPoolSize: 2,
        maxIdleTimeMS: 30000
    });
}

async function disconnectDatabase() {
    await mongoose.disconnect();
}

module.exports = {
    connectDatabase,
    disconnectDatabase
};
