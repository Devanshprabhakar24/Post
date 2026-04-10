const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            unique: true,
            sparse: true,
            index: true
        },
        userId: {
            type: Number,
            required: true,
            unique: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        role: {
            type: String,
            trim: true,
            default: 'user',
            index: true
        },
        password: {
            type: String,
            select: false
        },
        bio: {
            type: String,
            trim: true,
            default: ''
        },
        imageUrl: {
            type: String,
            trim: true,
            default: ''
        },
        profilePic: {
            type: String,
            trim: true,
            default: ''
        },
        profilePicData: {
            type: String,
            default: ''
        },
        profilePicContentType: {
            type: String,
            default: ''
        },
        followers: {
            type: [Number],
            default: []
        },
        following: {
            type: [Number],
            default: []
        },
        isOnline: {
            type: Boolean,
            default: false,
            index: true
        },
        onlineAt: {
            type: Date,
            default: null
        },
        isExternal: {
            type: Boolean,
            default: true,
            index: true
        },
        address: {
            street: String,
            city: String,
            zipcode: String,
            geo: {
                lat: String,
                lng: String
            }
        },
        phone: String,
        website: String,
        company: {
            name: String,
            catchPhrase: String,
            bs: String
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model('User', userSchema);
