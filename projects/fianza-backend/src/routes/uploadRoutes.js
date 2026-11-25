const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');
const imageUpload = require('../middleware/imageUpload');

const router = express.Router();

router.post(
  '/images',
  protect,
  (req, res, next) => {
    imageUpload.single('image')(req, res, (error) => {
      if (!error) return next();

      if (error instanceof multer.MulterError) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        const message = error.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 5 MB or smaller.'
          : 'Please upload one image at a time.';
        return res.status(status).json({ message });
      }

      return next(error);
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select a valid image file.' });
    }

    try {
      const image = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'fianza/property-evidence', resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            if (!result?.secure_url) {
              return reject(new Error('Cloudinary returned no secure image URL.'));
            }
            return resolve({ secure_url: result.secure_url });
          }
        );
        stream.end(req.file.buffer);
      });

      return res.status(201).json(image);
    } catch (error) {
      console.error('Cloudinary image upload failed:', error.message);
      return res.status(502).json({ message: 'Image upload failed. Please try again.' });
    }
  }
);

module.exports = router;
