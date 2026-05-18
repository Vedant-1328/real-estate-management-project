import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, '../uploads');

export const authenticateUpload = authenticate;

export const sendUploadFile = (req, res, next) => {
  const relative = req.params.splat || req.params[0] || '';
  if (!relative || relative.includes('..')) {
    return res.status(400).json({ success: false, message: 'Invalid path' });
  }

  const absolute = path.resolve(uploadsRoot, relative);
  if (!absolute.startsWith(uploadsRoot)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  if (!fs.existsSync(absolute)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  return res.sendFile(absolute, (err) => {
    if (err && !res.headersSent) next(err);
  });
};
