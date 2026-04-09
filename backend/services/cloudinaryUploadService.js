const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { cloudinary, hasCloudinaryConfig } = require('../config/cloudinary');
const CLOUDINARY_UPLOAD_PRESET = String(process.env.CLOUDINARY_UPLOAD_PRESET || '').trim();
const LOCAL_UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const LOCAL_MEDIA_BASE_URL = String(process.env.PUBLIC_MEDIA_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/$/, '');

function ensureCloudinaryConfigured() {
    if (!hasCloudinaryConfig()) {
        const error = new Error('Cloudinary is not configured');
        error.status = 500;
        throw error;
    }
}

function uploadBufferToCloudinary(buffer, options = {}) {
    ensureCloudinaryConfigured();

    return new Promise((resolve, reject) => {
        const uploadOptions = { ...options };

        if (CLOUDINARY_UPLOAD_PRESET) {
            uploadOptions.upload_preset = CLOUDINARY_UPLOAD_PRESET;
            delete uploadOptions.signature;
            delete uploadOptions.api_key;
            delete uploadOptions.timestamp;
            delete uploadOptions.folder;
        }

        const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(result);
        });

        Readable.from(buffer).pipe(uploadStream);
    });
}

function bufferToDataUrl(buffer, mimetype) {
    const safeMimeType = String(mimetype || 'application/octet-stream').trim() || 'application/octet-stream';
    const base64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : Buffer.from(buffer || '').toString('base64');
    return `data:${safeMimeType};base64,${base64}`;
}

function getExtensionFromMimeType(mimeType) {
    const normalized = String(mimeType || '').toLowerCase();

    switch (normalized) {
        case 'image/jpeg':
        case 'image/jpg':
            return 'jpg';
        case 'image/png':
            return 'png';
        case 'image/webp':
            return 'webp';
        default:
            return 'bin';
    }
}

async function storeBufferLocally(buffer, options = {}) {
    const folder = String(options.folder || 'media').replace(/[^a-z0-9_-]/gi, '_');
    const extension = getExtensionFromMimeType(options.mimetype);
    const safeFileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
    const relativeDir = path.join(LOCAL_UPLOAD_ROOT, folder);
    const relativeUrl = `/uploads/${folder}/${safeFileName}`;

    await fs.mkdir(relativeDir, { recursive: true });
    await fs.writeFile(path.join(relativeDir, safeFileName), buffer);

    return {
        secure_url: `${LOCAL_MEDIA_BASE_URL}${relativeUrl}`,
        public_id: `${folder}/${safeFileName}`,
        local_path: path.join(relativeDir, safeFileName)
    };
}

function isLocalMediaUrl(url) {
    return typeof url === 'string' && url.includes('/uploads/');
}

async function deleteLocalMediaByUrl(url) {
    if (!isLocalMediaUrl(url)) {
        return null;
    }

    try {
        const parsed = new URL(url, LOCAL_MEDIA_BASE_URL);
        const relativePath = parsed.pathname.replace(/^\/uploads\//, '');

        if (!relativePath || relativePath === parsed.pathname) {
            return null;
        }

        const absolutePath = path.join(LOCAL_UPLOAD_ROOT, relativePath);
        await fs.unlink(absolutePath);
        return true;
    } catch (_error) {
        return null;
    }
}

async function uploadBufferToMedia(buffer, options = {}) {
    try {
        const cloudinaryResult = await uploadBufferToCloudinary(buffer, options);
        return {
            ...cloudinaryResult,
            storage: 'cloudinary'
        };
    } catch (error) {
        return {
            secure_url: bufferToDataUrl(buffer, options.mimetype),
            public_id: null,
            storage: 'database',
            imageData: Buffer.isBuffer(buffer) ? buffer.toString('base64') : Buffer.from(buffer || '').toString('base64'),
            imageContentType: String(options.mimetype || 'application/octet-stream').trim() || 'application/octet-stream',
            fallbackError: error?.message || 'Cloudinary upload failed'
        };
    }
}

async function deleteMediaByUrl(url) {
    if (!url) {
        return null;
    }

    if (isLocalMediaUrl(url)) {
        return deleteLocalMediaByUrl(url);
    }

    return deleteCloudinaryAssetByUrl(url);
}

function getPublicIdFromCloudinaryUrl(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }

    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) {
        return null;
    }

    const afterUpload = url.slice(uploadIndex + '/upload/'.length);
    const segments = afterUpload.split('/').filter(Boolean);

    if (!segments.length) {
        return null;
    }

    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const idSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments.slice(1);

    if (!idSegments.length) {
        return null;
    }

    const withExtension = idSegments.join('/').split('?')[0];
    const publicId = withExtension.replace(/\.[^.]+$/, '');

    return publicId || null;
}

async function deleteCloudinaryAssetByUrl(url) {
    ensureCloudinaryConfigured();

    const publicId = getPublicIdFromCloudinaryUrl(url);
    if (!publicId) {
        return null;
    }

    try {
        return await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            invalidate: true
        });
    } catch (_error) {
        return null;
    }
}

module.exports = {
    uploadBufferToCloudinary,
    uploadBufferToMedia,
    deleteCloudinaryAssetByUrl,
    deleteLocalMediaByUrl,
    deleteMediaByUrl,
    storeBufferLocally,
    getPublicIdFromCloudinaryUrl,
    isLocalMediaUrl
};