const { uploadBufferToCloudinary } = require('../services/cloudinaryUploadService');

async function uploadImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Image file is required' });
        }

        const result = await uploadBufferToCloudinary(req.file.buffer, {
            folder: 'post_images',
            transformation: [
                {
                    width: 800,
                    crop: 'limit',
                    quality: 'auto'
                }
            ],
            format: 'webp'
        });

        return res.status(200).json({
            success: true,
            data: {
                imageUrl: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height
            },
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        return res.status(error?.status || 500).json({
            success: false,
            message: error?.message || 'Failed to upload image',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

module.exports = {
    uploadImage
};