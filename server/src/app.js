import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import scheduleStoreRoutes from './routes/scheduleStoreRoutes.js';
import { createCorsOriginValidator } from './corsOrigins.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(cors({ origin: createCorsOriginValidator(), credentials: true }));
  // Lịch tuần/tháng JSON có thể lớn hơn 1mb
  app.use(express.json({ limit: '5mb' }));

  const uploadDir = path.resolve(__dirname, '../../public/uploads');
  app.use('/uploads', express.static(uploadDir));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'lichkhoa-api' });
  });

  app.use('/api/auth', userRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/schedule-store', scheduleStoreRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Lỗi máy chủ.' });
  });

  return app;
}
