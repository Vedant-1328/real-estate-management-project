import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { sequelize } from './models/index.js';
import './models/index.js';
import apiRoutes from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';
import { sanitizeBody } from './middlewares/sanitize.js';
import { authenticateUpload, sendUploadFile } from './middlewares/uploadAuth.js';
import { assertEncryptionReady } from './utils/fieldEncryption.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const serverStart = Date.now();
let dbConnected = false;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: isProd ? FRONTEND_URL : [FRONTEND_URL, 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', sanitizeBody);

app.get('/api/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    dbConnected = true;
  } catch {
    dbConnected = false;
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbConnected,
    uptime: Math.floor((Date.now() - serverStart) / 1000),
  });
});

app.get('/uploads/*splat', authenticateUpload, sendUploadFile);

app.use('/api', apiRoutes);

if (isProd) {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    dbConnected = true;
    console.log('MySQL connected via Sequelize');
    try {
      assertEncryptionReady();
      console.log('Field encryption active for sensitive database columns');
    } catch (encErr) {
      console.warn('Field encryption:', encErr.message);
    }
  } catch (err) {
    dbConnected = false;
    console.warn('Database connection failed (server will still start):', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${NODE_ENV})`);
  });
};

startServer();
