const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const [scheme, token] = authHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({
                success: false,
                data: null,
                message: 'Authorization token is required'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                data: null,
                message: 'JWT_SECRET is not configured'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            userId: Number(decoded.userId),
            email: decoded.email,
            role: decoded.role || 'user'
        };

        return next();
    } catch (_error) {
        return res.status(401).json({
            success: false,
            data: null,
            message: 'Invalid or expired token'
        });
    }
}

module.exports = {
    authMiddleware
};
