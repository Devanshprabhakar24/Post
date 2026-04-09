const multer = require('multer');

/**
 * Centralized error handler middleware
 */
function errorHandler(err, req, res, next) {
    console.error(`[${req?.requestId || 'n/a'}] Error:`, err);

    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large. Maximum allowed size is 5MB'
            : err.message;

        return res.status(400).json({
            success: false,
            data: null,
            message,
            requestId: req.requestId,
            error: process.env.NODE_ENV === 'development' ? err : undefined
        });
    }

    // Default error status is 500 Internal Server Error
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';

    return res.status(status).json({
        success: false,
        data: null,
        message,
        requestId: req.requestId,
        error: process.env.NODE_ENV === 'development' ? err : undefined
    });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
    return res.status(404).json({
        success: false,
        data: null,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        requestId: req.requestId
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
