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
 * Tìm kiếm thư mục backup phù hợp nhất:
 * 1. Thư mục được truyền trực tiếp qua options
 * 2. Thư mục được ghi nhận trong `latest.json`
 * 3. Thư mục con `backup_*` mới nhất theo thời gian
 * 4. Thư mục `baseBackupDir` gốc (tương thích ngược)
 */
export function resolveBackupDir(baseBackupDir, explicitDir = null) {
  // Khi người gọi chỉ định explicitDir: bắt buộc kiểm tra tồn tại, nếu không tồn tại phải báo lỗi ngay
  if (explicitDir !== null && explicitDir !== undefined) {
    if (!fs.existsSync(explicitDir)) {
      throw new Error(
        `[RESTORE_PREFLIGHT_ERROR] Thư mục backup được chỉ định không tồn tại: ${explicitDir}`
      );
    }
    return explicitDir;
  }

  // Chỉ khi không chỉ định backupDir mới tự động tìm bản backup gần nhất
  // 1. Kiểm tra con trỏ latest.json
  const latestJsonPath = path.join(baseBackupDir, 'latest.json');
  if (fs.existsSync(latestJsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(latestJsonPath, 'utf-8'));
      if (parsed.latestDir && fs.existsSync(parsed.latestDir)) {
        return parsed.latestDir;
      }
    } catch {}
  }

  // 2. Tìm các thư mục con dạng backup_*
  if (fs.existsSync(baseBackupDir)) {
    const entries = fs
      .readdirSync(baseBackupDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('backup_') && !d.name.includes('.staging_'))
      .map((d) => path.join(baseBackupDir, d.name))
      .sort()
      .reverse();

    if (entries.length > 0) {
      return entries[0];
    }

    // 3. Kiểm tra nếu chính baseBackupDir chứa 6 file
    const hasAny = fs.existsSync(path.join(baseBackupDir, 'departments.json'));
    if (hasAny) {
      return baseBackupDir;
    }
  }

  return path.join(baseBackupDir, 'latest');
}

/**
 * Quy trình khôi phục dữ liệu an toàn (Safe Restore):
 * - Bước 1: Tiền kiểm tra (Pre-flight): Đủ 6 file, cú pháp JSON hợp lệ, cấu trúc mảng.
 *           Nếu lỗi, DỪNG NGAY và không chạm vào DB.
 * - Bước 2: Tạo Snapshot dữ liệu hiện tại trước khi thay đổi dữ liệu, lưu ra đĩa và bộ nhớ.
 * - Bước 3: Thay thế dữ liệu và Hậu kiểm tra tính toàn vẹn (Post-verification).
 * - Bước 4: Nếu GHI LỖI hoặc HẬU KIỂM THẤT BẠI, tự động kích hoạt Rollback từ snapshot và báo rõ kết quả.
 *           Nếu rollback cũng lỗi, bảo lưu snapshot để phục hồi thủ công (không tự ý tuyên bố an toàn).
 * - Bước 5: Hậu kiểm tra thành công: Cập nhật trạng thái 'restore_verified' và bảo lưu snapshot.
 */
export async function performRestore(options = {}) {
  const {
    mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recruitment_db',
    baseBackupDir = path.join(__dirname, '../backup'),
    backupDir = null,
    snapshotsDir = path.join(__dirname, '../snapshots'),
    simulateFailDuringWrite = null,
    simulateFailDuringVerification = null,
    silent = false,
    closeConnection = true
  } = options;

  const targetBackupDir = resolveBackupDir(baseBackupDir, backupDir);

  // ==========================================================================
  // BƯỚC 1: TIỀN KIỂM TRA (PRE-FLIGHT) - TUYỆT ĐỐI CHƯA TÁC ĐỘNG TỚI DATABASE
  // ==========================================================================
  if (!fs.existsSync(targetBackupDir)) {
    throw new Error(`[RESTORE_PREFLIGHT_ERROR] Không tìm thấy thư mục backup tại: ${targetBackupDir}`);
  }

  // 1.1. Kiểm tra sự tồn tại của đủ 6 file bắt buộc
  const missingFiles = [];
  for (const col of REQUIRED_COLLECTIONS) {
    const p = path.join(targetBackupDir, col.filename);
    if (!fs.existsSync(p)) {
      missingFiles.push(col.filename);
    }
  }
  if (missingFiles.length > 0) {
    throw new Error(
      `[RESTORE_PREFLIGHT_ERROR] Thiếu ${missingFiles.length} tệp sao lưu bắt buộc: ${missingFiles.join(', ')}`
    );
  }

  // 1.2. Parse và kiểm tra cú pháp JSON, cấu trúc cơ bản
  const parsedData = {};
  for (const col of REQUIRED_COLLECTIONS) {
    const p = path.join(targetBackupDir, col.filename);
    let raw;
    try {
      raw = fs.readFileSync(p, 'utf-8');
    } catch (readErr) {
      throw new Error(`[RESTORE_PREFLIGHT_ERROR] Không thể đọc tệp ${col.filename}: ${readErr.message}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (jsonErr) {
      throw new Error(
        `[RESTORE_PREFLIGHT_ERROR] Tệp ${col.filename} bị hỏng hoặc cú pháp JSON không hợp lệ: ${jsonErr.message}`
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error(
        `[RESTORE_PREFLIGHT_ERROR] Dữ liệu trong ${col.filename} phải là một mảng (Array) danh sách bản ghi`
      );
    }

    // Kiểm tra cấu trúc từng document cơ bản
    for (let i = 0; i < parsed.length; i++) {
      const doc = parsed[i];
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
        throw new Error(
          `[RESTORE_PREFLIGHT_ERROR] Bản ghi thứ ${i + 1} trong ${col.filename} không phải là một Object hợp lệ`
        );
      }
    }

    parsedData[col.name] = parsed;
  }

  // ==========================================================================
  // BƯỚC 2: KẾT NỐI VÀ LƯU SNAPSHOT DỮ LIỆU HIỆN TẠI TRƯỚC KHI GHI
  // ==========================================================================
  let openedConnection = false;
  if (mongoose.connection.readyState === 0) {
    if (!silent) console.log(`[RESTORE] Kết nối tới MongoDB: ${maskMongoUri(mongoUri)}`);
    await mongoose.connect(mongoUri);
    openedConnection = true;
  }

  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const currentSnapshotDir = path.join(
    snapshotsDir,
    `snapshot_${timestamp}_${Math.random().toString(36).substring(2, 7)}`
  );
  fs.mkdirSync(currentSnapshotDir, { recursive: true });

  const snapshotData = {};
  const snapshotCounts = {};

  if (!silent) console.log(`--- Tạo Snapshot an toàn trước khi khôi phục tại: ${currentSnapshotDir} ---`);

  for (const col of REQUIRED_COLLECTIONS) {
    const currentDocs = await col.model.find({}).lean();
    snapshotData[col.name] = currentDocs;
    snapshotCounts[col.name] = currentDocs.length;
    const snapFile = path.join(currentSnapshotDir, col.filename);
    fs.writeFileSync(snapFile, JSON.stringify(currentDocs, null, 2), 'utf-8');
  }

  const snapshotManifest = {
    status: 'created',
    createdAt: new Date().toISOString(),
    database: mongoose.connection.db?.databaseName || 'unknown',
    counts: snapshotCounts,
    sourceBackupDir: targetBackupDir
  };
  fs.writeFileSync(
    path.join(currentSnapshotDir, 'manifest.json'),
    JSON.stringify(snapshotManifest, null, 2),
    'utf-8'
  );

  // ==========================================================================
  // BƯỚC 3: THỰC THI GHI DỮ LIỆU & HẬU KIỂM TRA (POST-VERIFICATION)
  // ==========================================================================
  let restoreFailed = false;
  let failureType = null; // 'WRITE_FAILED' hoặc 'VERIFICATION_FAILED'
  let failureError = null;
  const verificationCounts = {};

  try {
    if (!silent) console.log(`--- Bắt đầu áp dụng dữ liệu từ ${targetBackupDir} ---`);

    for (const col of REQUIRED_COLLECTIONS) {
      // Giả lập lỗi ghi dữ liệu nếu được yêu cầu trong test
      if (typeof simulateFailDuringWrite === 'function' && simulateFailDuringWrite(col.name)) {
        throw new Error(`[SIMULATED_WRITE_ERROR] Giả lập sự cố ghi dữ liệu tại collection '${col.name}'`);
      }

      await col.model.deleteMany({});
      const docsToInsert = parsedData[col.name];
      if (docsToInsert && docsToInsert.length > 0) {
        await col.model.insertMany(docsToInsert);
      }
      if (!silent) {
        console.log(`[RESTORED] Đã khôi phục ${docsToInsert.length} bản ghi -> ${col.name}`);
      }
    }

    // Hậu kiểm tra tính toàn vẹn và số lượng bản ghi sau khi ghi
    if (!silent) console.log(`--- Tiến hành hậu kiểm tra tính toàn vẹn sau khi ghi ---`);
    for (const col of REQUIRED_COLLECTIONS) {
      // Giả lập lỗi hậu kiểm nếu được yêu cầu trong test
      if (typeof simulateFailDuringVerification === 'function' && simulateFailDuringVerification(col.name)) {
        throw new Error(`[SIMULATED_VERIFICATION_ERROR] Giả lập hậu kiểm thất bại tại collection '${col.name}'`);
      }

      const currentCount = await col.model.countDocuments();
      const expectedCount = parsedData[col.name].length;
      if (currentCount !== expectedCount) {
        throw new Error(
          `[VERIFICATION_COUNT_MISMATCH] Collection '${col.name}' hiện có ${currentCount} bản ghi, không khớp kỳ vọng ${expectedCount}`
        );
      }
      verificationCounts[col.name] = currentCount;
    }
  } catch (err) {
    restoreFailed = true;
    failureError = err;
    failureType =
      err.message.includes('VERIFICATION') || err.message.includes('SIMULATED_VERIFICATION')
        ? 'VERIFICATION_FAILED'
        : 'WRITE_FAILED';
    if (!silent) {
      console.error(`[RESTORE_ERROR] Quá trình restore gặp sự cố (${failureType}): ${err.message}`);
    }
  }

  // ==========================================================================
  // BƯỚC 4: XỬ LÝ ROLLBACK NẾU GHI HOẶC HẬU KIỂM THẤT BẠI
  // ==========================================================================
  if (restoreFailed) {
    if (!silent) {
      console.log(`[ROLLBACK] Sự cố phát sinh (${failureType}): Bắt đầu tự động khôi phục dữ liệu từ snapshot: ${currentSnapshotDir}`);
    }

    let rollbackSuccess = false;
    let rollbackError = null;

    try {
      for (const col of REQUIRED_COLLECTIONS) {
        await col.model.deleteMany({});
        const snapDocs = snapshotData[col.name];
        if (snapDocs && snapDocs.length > 0) {
          await col.model.insertMany(snapDocs);
        }
      }
      rollbackSuccess = true;
      if (!silent) {
        console.log(`[ROLLBACK_SUCCESS] Đã khôi phục thành công dữ liệu về trạng thái snapshot ban đầu.`);
        console.log(`[SNAPSHOT_RETAINED] Snapshot vẫn được giữ nguyên tại: ${currentSnapshotDir}`);
      }
    } catch (rbErr) {
      rollbackError = rbErr;
      if (!silent) {
        console.error(`[ROLLBACK_FAILED] Khôi phục từ snapshot thất bại: ${rbErr.message}`);
        console.error(
          `[CRITICAL_WARNING] KHÔNG THỂ BẢO ĐẢM TRẠNG THÁI DỮ LIỆU! Snapshot được giữ nguyên tại: ${currentSnapshotDir} để phục hồi thủ công.`
        );
      }
    }

    // Cập nhật trạng thái snapshot manifest
    try {
      snapshotManifest.status = rollbackSuccess ? 'rollback_completed' : 'rollback_failed';
      snapshotManifest.failureType = failureType;
      snapshotManifest.failureError = failureError?.message;
      snapshotManifest.rollbackError = rollbackError?.message;
      fs.writeFileSync(
        path.join(currentSnapshotDir, 'manifest.json'),
        JSON.stringify(snapshotManifest, null, 2),
        'utf-8'
      );
    } catch {}

    const errorToThrow = new Error(
      rollbackSuccess
        ? `[RESTORE_FAILED_ROLLBACK_OK] Sự cố ${failureType}: ${failureError.message}. Đã rollback thành công về snapshot ban đầu.`
        : `[RESTORE_CRITICAL_FAILURE] Sự cố ${failureType}: ${failureError.message}. Rollback cũng thất bại: ${rollbackError?.message}. Snapshot được giữ tại ${currentSnapshotDir} để phục hồi thủ công.`
    );
    errorToThrow.rollbackSuccess = rollbackSuccess;
    errorToThrow.failureType = failureType;
    errorToThrow.snapshotDir = currentSnapshotDir;
    errorToThrow.originalError = failureError;
    errorToThrow.rollbackError = rollbackError;

    if (openedConnection && closeConnection) {
      await mongoose.disconnect();
    }
    throw errorToThrow;
  }

  // ==========================================================================
  // BƯỚC 5: THÀNH CÔNG: XÁC MINH HOÀN TẤT & LƯU VẾT SNAPSHOT
  // ==========================================================================
  try {
    snapshotManifest.status = 'restore_verified';
    snapshotManifest.verifiedAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(currentSnapshotDir, 'manifest.json'),
      JSON.stringify(snapshotManifest, null, 2),
      'utf-8'
    );
  } catch {}

  if (!silent) {
    console.log(`--- Quá trình phục hồi và kiểm chứng hoàn tất thành công! ---`);
    console.log(`[SNAPSHOT_PRESERVED] Snapshot dữ liệu trước khi restore được lưu tại: ${currentSnapshotDir}`);
  }

  if (openedConnection && closeConnection) {
    await mongoose.disconnect();
  }

  return {
    success: true,
    restoredFrom: targetBackupDir,
    snapshotDir: currentSnapshotDir,
    counts: verificationCounts
  };
}

// Chạy trực tiếp từ dòng lệnh (CLI)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  performRestore({ closeConnection: true })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
