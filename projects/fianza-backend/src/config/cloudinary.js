const cloudinary = require('cloudinary').v2;

const credentials = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

const missingCredentials = Object.entries(credentials)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingCredentials.length > 0) {
  throw new Error(`Missing Cloudinary configuration: ${missingCredentials.join(', ')}`);
}

cloudinary.config(credentials);

module.exports = cloudinary;
