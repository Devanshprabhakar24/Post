const mongoose = require('mongoose');

async function connectDatabase() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is required in environment variables');
    }

    mongoose.set('strictQuery', true);
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
