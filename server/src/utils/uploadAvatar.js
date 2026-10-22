import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveUploadDir() {
  const configured = process.env.UPLOAD_DIR || '../public/uploads';
  const serverRoot = path.resolve(__dirname, '../..');
  const absolute = path.isAbsolute(configured)
    ? configured
    : path.resolve(serverRoot, configured);
  fs.mkdirSync(absolute, { recursive: true });
  return absolute;
}

export function cloudinaryEnabled() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
  );
}

if (cloudinaryEnabled()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, resolveUploadDir());
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

function fileFilter(_req, file, cb) {
  if (!file.mimetype?.startsWith('image/')) {
    cb(new Error('Chỉ chấp nhận file ảnh.'));
    return;
  }
  cb(null, true);
}

export const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});

export async function persistAvatar(file) {
  if (!file) throw new Error('Thiếu file avatar.');
  if (cloudinaryEnabled()) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'lichkhoa/avatars',
      transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }]
    });
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    return result.secure_url;
  }
  return `/uploads/${path.basename(file.path)}`;
}
