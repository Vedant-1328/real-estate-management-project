import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '../uploads');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

export const vehicleDocumentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const vehicleId = req.params.id;
      const dir = path.join(uploadsRoot, 'vehicles', String(vehicleId));
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|jpg|jpeg|png|webp|doc|docx)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export const toPublicUploadPath = (absolutePath) => {
  const rel = path.relative(uploadsRoot, absolutePath).replace(/\\/g, '/');
  return `/uploads/${rel}`;
};
