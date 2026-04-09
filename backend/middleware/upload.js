const multer = require('multer');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (_req, file, cb) => {
        const mime = String(file?.mimetype || '').toLowerCase();

        if (!ALLOWED_MIME_TYPES.has(mime)) {
            const error = new Error('Only JPG, JPEG, PNG, and WEBP images are allowed');
            error.status = 400;
            return cb(error);
        }

        return cb(null, true);
    }
});

module.exports = {
    upload
};