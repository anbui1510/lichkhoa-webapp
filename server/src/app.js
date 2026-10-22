import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  const uploadDir = path.resolve(__dirname, '../../public/uploads');
  app.use('/uploads', express.static(uploadDir));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'lichkhoa-api' });
  });

  app.use('/api/auth', userRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Lỗi máy chủ.' });
  });

  return app;
}
