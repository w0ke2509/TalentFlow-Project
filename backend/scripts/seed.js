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
import { hashPassword } from '../src/utils/password.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const readJSON = (fileName) => {
  const content = fs.readFileSync(path.join(__dirname, '../data', fileName), 'utf-8');
  // Chuyển đổi $oid và $date của MongoDB Extended JSON sang plain object/date
  return JSON.parse(content, (key, value) => {
    if (value && typeof value === 'object') {
      if (value.$oid) return new mongoose.Types.ObjectId(value.$oid);
      if (value.$date) return new Date(value.$date);
    }
    return value;
  });
};

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recruitment_db';
    console.log(`[Connecting to MongoDB]: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('--- Đang dọn dẹp dữ liệu cũ trong database ---');
    await Promise.all([
      Department.deleteMany(),
      Position.deleteMany(),
      Candidate.deleteMany(),
      Application.deleteMany(),
      Interview.deleteMany(),
      Employee.deleteMany()
    ]);

    console.log('--- Đang import dữ liệu mẫu vào 6 collections ---');
    const departments = readJSON('departments.json');
    const positions = readJSON('positions.json');
    const candidates = readJSON('candidates.json');
    const applications = readJSON('applications.json');
    const interviews = readJSON('interviews.json');
    const employees = readJSON('employees.json');

    await Department.insertMany(departments);
    console.log(`[OK] Đã nạp ${departments.length} departments`);

    await Position.insertMany(positions);
    console.log(`[OK] Đã nạp ${positions.length} positions`);

    // Đồng bộ currentStatus cho candidate từ application tương ứng
    const appStatusMap = {};
    for (const app of applications) {
      if (app.candidateId) {
        const cId = app.candidateId.toString();
        if (!appStatusMap[cId]) {
          appStatusMap[cId] = app.status;
        }
      }
    }
    const enrichedCandidates = candidates.map(c => ({
      ...c,
      currentStatus: appStatusMap[c._id.toString()] || 'applied'
    }));

    await Candidate.insertMany(enrichedCandidates);
    console.log(`[OK] Đã nạp ${candidates.length} candidates`);

    await Application.insertMany(applications);
    console.log(`[OK] Đã nạp ${applications.length} applications`);

    await Interview.insertMany(interviews);
    console.log(`[OK] Đã nạp ${interviews.length} interviews`);

    const hashedEmployees = await Promise.all(
      employees.map(async (emp) => ({
        ...emp,
        password: await hashPassword(emp.password || '123456')
      }))
    );

    await Employee.insertMany(hashedEmployees);
    console.log(`[OK] Đã nạp ${employees.length} employees (đã băm bcrypt mật khẩu mặc định 123456)`);

    console.log('========================================================');
    console.log('=> KHỞI TẠO DỮ LIỆU THÀNH CÔNG! SẴN SÀNG QUẢN TRỊ TRÊN MINGO & WEB APP');
    console.log('========================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Lỗi khi seed dữ liệu]:', error);
    process.exit(1);
  }
};

seedData();
