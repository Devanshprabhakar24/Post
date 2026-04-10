const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { cloudinary, hasCloudinaryConfig } = require('../config/cloudinary');
const CLOUDINARY_UPLOAD_PRESET = String(process.env.CLOUDINARY_UPLOAD_PRESET || '').trim();
const LOCAL_UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const LOCAL_MEDIA_BASE_URL = String(process.env.PUBLIC_MEDIA_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/$/, '');

const ALLOWED_IMAGE_SIGNATURES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

function getDetectedMimeType(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
        return null;
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }

    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return 'image/png';
    }

    const signature = buffer.slice(0, 12).toString('ascii');
    if (signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP') {
        return 'image/webp';
    }

    return null;
}

function assertValidImageBuffer(buffer, mimetype) {
    const detectedMimeType = getDetectedMimeType(buffer);
    const declaredMimeType = String(mimetype || '').toLowerCase();

    if (!detectedMimeType || !ALLOWED_IMAGE_SIGNATURES.has(detectedMimeType)) {
        const error = new Error('Only JPG, JPEG, PNG, and WEBP images are allowed');
        error.status = 400;
        throw error;
    }

    if (declaredMimeType && declaredMimeType !== detectedMimeType) {
        const error = new Error('Uploaded file type does not match the file contents');
        error.status = 400;
        throw error;
    }

    return detectedMimeType;
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
        const validatedMimeType = assertValidImageBuffer(buffer, options.mimetype);
        const sanitizedOptions = {
            ...options,
            mimetype: validatedMimeType
        };

        const cloudinaryResult = await uploadBufferToCloudinary(buffer, sanitizedOptions);
        return {
            ...cloudinaryResult,
            storage: 'cloudinary'
        };
    } catch (error) {
        if (error?.status === 400) {
            throw error;
        }

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
    isLocalMediaUrl,
    assertValidImageBuffer,
    getDetectedMimeType
};