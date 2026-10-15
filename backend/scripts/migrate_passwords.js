import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Employee from '../src/models/Employee.js';
import { hashPassword, isBcryptHash } from '../src/utils/password.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

export const runMigration = async () => {
  const isExecute = process.argv.includes('--execute');
  const uriArg = process.argv.find(
    (arg) => arg.startsWith('--mongo-uri=') || arg.startsWith('--uri=')
  );
  const mongoUri =
    (uriArg ? uriArg.split('=')[1]?.trim() : null) ||
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/recruitment_db';

  // Lấy cờ chỉ định database từ command line arguments (ví dụ: --database=test_db hoặc --db-name=test_db)
  const dbArg = process.argv.find(
    (arg) => arg.startsWith('--database=') || arg.startsWith('--db-name=')
  );
  const specifiedDb = dbArg ? dbArg.split('=')[1]?.trim() : null;

  console.log('================================================================');
  console.log('SCRIPT CHUYỂN ĐỔI MẬT KHẨU NHÂN VIÊN SANG BCRYPT (PASSWORD MIGRATION)');
  console.log('================================================================');
  console.log(
    `Chế độ chạy: ${isExecute ? 'EXECUTE (Ghi dữ liệu vào DB)' : 'DRY-RUN (Mặc định: Chỉ kiểm tra, không sửa dữ liệu)'}`
  );

  try {
    await mongoose.connect(mongoUri);
    const actualDb = mongoose.connection.db?.databaseName || 'unknown';
    // Tuyệt đối không in URI kết nối (để tránh rò rỉ thông tin đăng nhập trong tham số URI), chỉ in tên database
    console.log(`Cơ sở dữ liệu đang kết nối: ${actualDb}\n`);

    // ==========================================================================
    // KIỂM TRA BẢO VỆ TÊN DATABASE TRƯỚC KHI DÙNG --EXECUTE
    // Đặt ngay sau khi kết nối, trước khi đọc dữ liệu hoặc thoát sớm
    // ==========================================================================
    if (isExecute) {
      // 1. Nghiêm cấm chạy --execute trên cơ sở dữ liệu mẫu recruitment_db
      if (actualDb === 'recruitment_db') {
        console.error('[CHẶN THỰC THI - BẢO VỆ DỮ LIỆU MẪU]');
        console.error("Nghiêm cấm chạy --execute trên database 'recruitment_db' để bảo toàn nguyên trạng dữ liệu mẫu.");
        console.error(
          'Hệ thống áp dụng cơ chế Just-In-Time (JIT) Migration tự động nâng cấp mật khẩu sang bcrypt khi đăng nhập.'
        );
        await mongoose.disconnect();
        process.exit(1);
      }

      // 2. Yêu cầu kiểm tra tên database khớp với tham số truyền vào
      if (!specifiedDb || specifiedDb !== actualDb) {
        console.error('[LỖI XÁC NHẬN TÊN DATABASE]');
        console.error(
          `Để chạy --execute, bạn phải xác nhận chính xác tên database cần cập nhật qua cờ: --database=${actualDb}`
        );
        await mongoose.disconnect();
        process.exit(1);
      }
    }

    const employees = await Employee.find({});
    console.log(`Tổng số tài khoản nhân viên trong DB: ${employees.length}`);

    const plaintextEmployees = employees.filter((emp) => !isBcryptHash(emp.password));
    console.log(`Số tài khoản đang lưu mật khẩu dạng plaintext: ${plaintextEmployees.length}`);

    if (plaintextEmployees.length === 0) {
      console.log('Tất cả tài khoản nhân viên đã được băm bằng bcrypt. Không cần migration.');
      await mongoose.disconnect();
      return { success: true, updatedCount: 0 };
    }

    console.log('\nDanh sách tài khoản cần chuyển đổi:');
    plaintextEmployees.forEach((emp, index) => {
      // Bảo vệ thông tin cá nhân: Không in họ tên và email ra terminal
      console.log(
        `  ${index + 1}. [Vai trò: ${emp.role}] ID: ${emp._id} - Định danh cá nhân: [ĐÃ BẢO MẬT] - Mật khẩu: [PLAINTEXT/CẦN BĂM]`
      );
    });

    // Chế độ Dry-Run mặc định: dừng lại an toàn
    if (!isExecute) {
      console.log('\n[DRY-RUN HOÀN TẤT]: Đây là chế độ kiểm tra an toàn mặc định, không thay đổi dữ liệu.');
      console.log(
        'Để thực hiện băm và cập nhật thực tế, cần cờ --execute kèm xác nhận tên database: --database=<tên_db>'
      );
      console.log('Lưu ý: Nghiêm cấm chạy --execute trên cơ sở dữ liệu mẫu recruitment_db.');
      await mongoose.disconnect();
      return { success: true, dryRun: true, count: plaintextEmployees.length };
    }

    console.log(`\nĐang tiến hành băm mật khẩu và cập nhật vào DB '${actualDb}'...`);
    let updatedCount = 0;
    for (const emp of plaintextEmployees) {
      const plain = emp.password || '123456';
      const hashed = await hashPassword(plain);
      await Employee.findByIdAndUpdate(emp._id, { password: hashed });
      updatedCount++;
    }

    console.log(
      `[THÀNH CÔNG] Đã chuyển đổi an toàn ${updatedCount} tài khoản sang bcrypt hash trên DB '${actualDb}'.`
    );
    await mongoose.disconnect();
    return { success: true, updatedCount };
  } catch (error) {
    console.error('Lỗi khi chạy migration:', error.message || error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

runMigration();
