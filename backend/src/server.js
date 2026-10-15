import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import connectDB from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nạp biến môi trường từ backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;

// Khởi chạy kết nối Database và Lắng nghe cổng
connectDB();

app.listen(PORT, () => {
  console.log(`[Backend Server running on port ${PORT}]`);
});
