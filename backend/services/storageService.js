const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Cloudinary if credentials are provided
let isCloudinaryConfigured = false;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  isCloudinaryConfigured = true;
  console.log('☁️ Cloudinary storage service connected successfully.');
} else {
  console.log('📁 Using local disk storage (/uploads) for uploaded images.');
}

/**
 * Handle uploading files
 * @param {Object} file Multer file object
 * @returns {Promise<string>} URL or local relative path of uploaded file
 */
const uploadImage = async (file) => {
  if (!file) return null;

  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(file.path, { folder: 'kiranam' }, (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          // Fall back to local URL if Cloudinary fails
          const localUrl = `/uploads/${file.filename}`;
          resolve(localUrl);
        } else {
          // Delete local file after successful upload to cloud
          fs.unlinkSync(file.path);
          resolve(result.secure_url);
        }
      });
    });
  } else {
    // Local storage URL path
    return `/uploads/${file.filename}`;
  }
};

module.exports = {
  uploadImage,
  uploadsDir
};
