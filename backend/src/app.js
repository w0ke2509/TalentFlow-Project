import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Root Healthcheck
app.get('/', (req, res) => {
  res.json({
    message: 'Chào mừng đến với API Hệ Thống Quản Lý Tuyển Dụng Nhân Viên (MongoDB + Mingo)',
    status: 'Running',
    version: '1.0.0'
  });
});

export default app;
