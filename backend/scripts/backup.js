import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Department from '../src/models/Department.js';
import Position from '../src/models/Position.js';
import Candidate from '../src/models/Candidate.js';
import Application from '../src/models/Application.js';
import Interview from '../src/models/Interview.js';
import Employee from '../src/models/Employee.js';
import { maskMongoUri } from '../src/utils/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

export const REQUIRED_COLLECTIONS = [
  { name: 'departments', model: Department, filename: 'departments.json' },
  { name: 'positions', model: Position, filename: 'positions.json' },
  { name: 'candidates', model: Candidate, filename: 'candidates.json' },
  { name: 'applications', model: Application, filename: 'applications.json' },
  { name: 'interviews', model: Interview, filename: 'interviews.json' },
  { name: 'employees', model: Employee, filename: 'employees.json' }
];

/**
 * Thực hiện sao lưu dữ liệu toàn diện vào thư mục riêng theo từng lần chạy.
 * Sử dụng thư mục tạm (staging) để đảm bảo tính nguyên tử: không bao giờ để lại
 * một bộ backup dở dang hoặc chưa hoàn chỉnh nếu có lỗi xảy ra giữa chừng.
 */
export async function performBackup(options = {}) {
  const {
    mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recruitment_db',
    targetDir = null,
    baseBackupDir = path.join(__dirname, '../backup'),
    silent = false,
    closeConnection = true
  } = options;

  let openedConnection = false;
  if (mongoose.connection.readyState === 0) {
    if (!silent) console.log(`[BACKUP] Kết nối tới MongoDB: ${maskMongoUri(mongoUri)}`);
    await mongoose.connect(mongoUri);
    openedConnection = true;
  }

  // Kiểm tra targetDir: Tuyệt đối không được ghi đè hoặc xóa thư mục đích đã tồn tại
  if (targetDir && fs.existsSync(targetDir)) {
    throw new Error(
      `[BACKUP_TARGET_EXISTS] Thư mục đích targetDir đã tồn tại: ${targetDir}. Không được ghi đè hoặc xóa để bảo vệ bản sao lưu trước đó.`
    );
  }

  // Tạo thư mục đích riêng biệt theo từng lần chạy nếu không chỉ định targetDir
  let finalDir = targetDir;
  if (!finalDir) {
    let candidateDir;
    do {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      candidateDir = path.join(
        baseBackupDir,
        `backup_${timestamp}_${Math.random().toString(36).substring(2, 7)}`
      );
    } while (fs.existsSync(candidateDir));
    finalDir = candidateDir;
  }

  const stagingDir = `${finalDir}.staging_${Date.now()}`;

  try {
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stagingDir, { recursive: true });

    if (!silent) console.log(`--- Bắt đầu sao lưu 6 collections vào staging: ${stagingDir} ---`);

    const summary = {};
    for (const col of REQUIRED_COLLECTIONS) {
      const docs = await col.model.find({}).lean();
      const filePath = path.join(stagingDir, col.filename);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      summary[col.name] = docs.length;
      if (!silent) console.log(`[SUCCESS] Đã sao lưu ${docs.length} bản ghi -> ${col.filename}`);
    }

    // Ghi manifest.json khẳng định toàn bộ 6 file đã hoàn thành đầy đủ
    const manifest = {
      status: 'completed',
      createdAt: new Date().toISOString(),
      database: mongoose.connection.db?.databaseName || 'unknown',
      collections: summary,
      files: REQUIRED_COLLECTIONS.map((c) => c.filename)
    };
    fs.writeFileSync(path.join(stagingDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    // Kiểm tra đủ 6 file trong staging trước khi chuyển sang thư mục chính thức
    for (const col of REQUIRED_COLLECTIONS) {
      const p = path.join(stagingDir, col.filename);
      if (!fs.existsSync(p)) {
        throw new Error(`Tệp sao lưu bị thiếu sau khi ghi: ${col.filename}`);
      }
    }

    // Chuyển staging thành thư mục backup chính thức (từ chối ghi đè nếu finalDir đã xuất hiện)
    if (fs.existsSync(finalDir)) {
      throw new Error(
        `[BACKUP_TARGET_EXISTS] Thư mục đích đã tồn tại trước khi hoàn tất sao lưu: ${finalDir}. Từ chối ghi đè.`
      );
    }
    fs.renameSync(stagingDir, finalDir);

    // Cập nhật con trỏ latest.json trong baseBackupDir để phục vụ tiện ích khôi phục tự động
    try {
      if (!fs.existsSync(baseBackupDir)) {
        fs.mkdirSync(baseBackupDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(baseBackupDir, 'latest.json'),
        JSON.stringify({ latestDir: finalDir, createdAt: manifest.createdAt }, null, 2),
        'utf-8'
      );
    } catch {}

    if (!silent) {
      console.log(`--- Quá trình sao lưu hoàn tất thành công! Thư mục: ${finalDir} ---`);
    }

    return {
      success: true,
      backupDir: finalDir,
      manifest,
      summary
    };
  } catch (error) {
    // Dọn dẹp thư mục staging để tránh để lại bộ backup dở dang
    if (fs.existsSync(stagingDir)) {
      try {
        fs.rmSync(stagingDir, { recursive: true, force: true });
      } catch {}
    }
    if (!silent) {
      console.error('[ERROR] Lỗi khi sao lưu dữ liệu:', error.message);
    }
    throw error;
  } finally {
    if (openedConnection && closeConnection) {
      await mongoose.disconnect();
    }
  }
}

// Chạy trực tiếp từ dòng lệnh (CLI)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  performBackup({ closeConnection: true })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
