const cloudinary = require('cloudinary').v2;

const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim().toLowerCase();
const apiKey = String(process.env.CLOUDINARY_API_KEY || '').trim();
const apiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim();

if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
}

function hasCloudinaryConfig() {
    return Boolean(cloudName && apiKey && apiSecret);
}

module.exports = {
    cloudinary,
    hasCloudinaryConfig
};