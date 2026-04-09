const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;

function buildToken(user) {
    return jwt.sign(
        {
            userId: user.userId,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function sanitizeUser(user) {
    return {
        userId: user.userId,
        name: user.name,
        username: user.username,
        email: user.email,
        imageUrl: user.imageUrl || '',
        profilePic: user.profilePic || user.imageUrl || '',
        profilePicData: user.profilePicData || '',
        profilePicContentType: user.profilePicContentType || '',
        createdAt: user.createdAt
    };
}

async function register(req, res) {
    try {
        const { name, email, password } = req.body || {};

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'name, email, and password are required'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                data: null,
                message: 'JWT_SECRET is not configured'
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail }).select({ _id: 1 }).lean();
        if (existing) {
            return res.status(409).json({
                success: false,
                data: null,
                message: 'User already exists with this email'
            });
        }

        const [lastUser, hashedPassword] = await Promise.all([
            User.findOne().sort({ userId: -1 }).select({ userId: 1 }).lean(),
            bcrypt.hash(String(password), SALT_ROUNDS)
        ]);

        const nextUserId = Number(lastUser?.userId || 0) + 1;
        const baseUsername = normalizedEmail.split('@')[0] || `user${nextUserId}`;

        const user = await User.create({
            id: nextUserId,
            userId: nextUserId,
            name: String(name).trim(),
            username: `${baseUsername}_${nextUserId}`,
            email: normalizedEmail,
            password: hashedPassword,
            isExternal: false
        });

        const token = buildToken(user);

        return res.status(201).json({
            success: true,
            data: {
                token,
                user: sanitizeUser(user)
            },
            message: 'User registered successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to register user'
        });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'email and password are required'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                data: null,
                message: 'JWT_SECRET is not configured'
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail }).select('+password');

        if (!user || !user.password) {
            return res.status(401).json({
                success: false,
                data: null,
                message: 'Invalid credentials'
            });
        }

        const isValid = await bcrypt.compare(String(password), user.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                data: null,
                message: 'Invalid credentials'
            });
        }

        const token = buildToken(user);

        return res.status(200).json({
            success: true,
            data: {
                token,
                user: sanitizeUser(user)
            },
            message: 'Login successful'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            message: 'Failed to login'
        });
    }
}

module.exports = {
    register,
    login
};
