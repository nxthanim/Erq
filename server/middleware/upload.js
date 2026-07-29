const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * File Upload Middleware
 * 
 * Uses memory storage when running on Vercel (serverless),
 * local disk storage otherwise.
 * 
 * Memory storage stores files as Buffer in req.file.buffer,
 * which can then be uploaded to Vercel Blob or stored as base64 in the DB.
 */

const useMemoryStorage = process.env.VERCEL === 'true';

// Ensure upload directories exist (local filesystem only)
if (!useMemoryStorage) {
  const uploadDirs = [
    path.join(__dirname, '../../uploads/profiles'),
    path.join(__dirname, '../../uploads/portfolio'),
  ];
  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

let storage;
if (useMemoryStorage) {
  // Memory storage for serverless (Vercel)
  storage = multer.memoryStorage();
} else {
  // Disk storage for self-hosted
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'profile_picture' || req.originalUrl.includes('profile-picture')) {
        cb(null, path.join(__dirname, '../../uploads/profiles'));
      } else if (file.fieldname === 'portfolio_images' || req.originalUrl.includes('portfolio')) {
        cb(null, path.join(__dirname, '../../uploads/portfolio'));
      } else {
        cb(null, path.join(__dirname, '../../uploads/portfolio'));
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  });
}

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/**
 * Helper: Get a public URL for an uploaded file.
 * On Vercel, returns a data URI (base64) since there's no local filesystem.
 * On self-hosted, returns the local URL path.
 */
function getFileUrl(req, file) {
  if (useMemoryStorage) {
    // Return base64 data URI for serverless
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
  }
  return `/uploads/profiles/${file.filename}`;
}

module.exports = upload;
module.exports.getFileUrl = getFileUrl;
module.exports.useMemoryStorage = useMemoryStorage;
