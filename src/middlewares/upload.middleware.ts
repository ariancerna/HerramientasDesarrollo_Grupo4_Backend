import multer from 'multer';
import { ApiError } from '../lib/errors/api-error';

export const MAX_FILE_SIZE = 1.5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(ApiError.badRequest('Solo se admiten imágenes JPEG, PNG o WebP'));
    }

    callback(null, true);
  },
});
