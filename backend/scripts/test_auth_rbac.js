import mongoose from "mongoose";
import http from "http";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { getJwtSecret, generateToken } from "../src/middleware/auth.js";
import { hashPassword, verifyPassword, isBcryptHash } from "../src/utils/password.js";
import Department from "../src/models/Department.js";
import Employee from "../src/models/Employee.js";
import Candidate from "../src/models/Candidate.js";
import Position from "../src/models/Position.js";
import Application from "../src/models/Application.js";
import Interview from "../src/models/Interview.js";

// QA Yêu cầu 3: Mỗi lần chạy test PHẢI dùng một database ngẫu nhiên, không xóa database tên cố định
const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
const TEST_DB_NAME = `talentflow_test_auth_rbac_${uniqueId}`;
const TEST_DB_URI = `mongodb://localhost:27017/${TEST_DB_NAME}`;
const TEST_SECRET = "test_super_secret_for_qa_verification_12345";

let server;
let serverPort;
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, detail = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}${detail ? " - " + detail : ""}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? " - " + detail : ""}`);
    failedCount++;
  }
}

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: serverPort,
        path,
        method,
        headers
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(responseBody);
          } catch {
            json = responseBody;
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("================================================================");
  console.log("BƯỚC 1: KIỂM THỬ XÁC THỰC JWT & PHÂN QUYỀN RBAC (DYNAMIC TEST DB)");
  console.log("================================================================\n");

  // QA Yêu cầu 3: Database động riêng biệt
  assert(
    TEST_DB_NAME.startsWith("talentflow_test_auth_rbac_") && TEST_DB_NAME.includes(uniqueId),
    "QA Yêu cầu 3: Tạo tên Database kiểm thử động độc lập cho từng phiên chạy",
    `Database: ${TEST_DB_NAME}`
  );

  // 1. Kiểm tra không có fallback JWT_SECRET
  console.log("\n--- 1. Kiểm tra Cấu hình JWT & Secret Enforcement ---");
  const originalSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  let thrown = false;
  try {
    getJwtSecret();
  } catch (err) {
    thrown = true;
    assert(thrown && err.message.includes("JWT_SECRET"), "Thiếu JWT_SECRET bắt buộc ném lỗi cấu hình, không fallback");
  }
  process.env.JWT_SECRET = TEST_SECRET;
  assert(getJwtSecret() === TEST_SECRET, "Lấy đúng JWT_SECRET khi đã cấu hình");

  // 2. Kiểm tra mã hóa và xác thực mật khẩu
  console.log("\n--- 2. Kiểm tra Tiện ích Password & Bcrypt ---");
  const rawPw = "MatKhau123@";
  const hashed = await hashPassword(rawPw);
  assert(isBcryptHash(hashed), "Băm mật khẩu thành công ra định dạng bcrypt ($2a$/$2b$)");
  
  const checkCorrect = await verifyPassword(rawPw, hashed);
  assert(checkCorrect.match === true && checkCorrect.needsRehash === false, "Xác thực mật khẩu đúng với chuỗi băm bcrypt (needsRehash=false)");
  
  const checkWrong = await verifyPassword("WrongPassword", hashed);
  assert(checkWrong.match === false, "Từ chối mật khẩu sai với chuỗi băm bcrypt");
  
  const checkLegacy = await verifyPassword("123456", "123456");
  assert(checkLegacy.match === true && checkLegacy.needsRehash === true, "Hỗ trợ xác thực tài khoản demo chưa migrate (fallback plaintext, cờ needsRehash=true)");
  
  const checkLegacyWrong = await verifyPassword("wrong", "123456");
  assert(checkLegacyWrong.match === false, "Từ chối mật khẩu sai đối với tài khoản plaintext");

  // 3. Kết nối Isolated Test Database
  console.log("\n--- 3. Khởi tạo Cơ sở Dữ liệu Kiểm thử Độc lập ---");
  console.log(`Connecting to dynamic test DB: ${TEST_DB_URI}...`);
  await mongoose.connect(TEST_DB_URI);
  console.log(`Đã kết nối an toàn tới database tạm: ${TEST_DB_NAME}`);

  // Seed test fixtures
  const dept = await Department.create({ name: "Phòng Công Nghệ", code: "TECH" });
  const pos = await Position.create({
    title: "Senior Node.js Developer",
    departmentId: dept._id,
    description: "Tuyển dụng Node.js backend developer",
    status: "open"
  });

  // QA Yêu cầu: Mật khẩu mặc định 123456 được băm bcrypt khi lưu Employee mới
  const defaultPwEmp = await Employee.create({
    fullName: "Nhân Viên Mặc Định",
    email: "default_pw@talentflow.vn",
    role: "hr",
    departmentId: dept._id,
    positionId: pos._id
    // không truyền password -> nhận default '123456'
  });
  assert(
    isBcryptHash(defaultPwEmp.password),
    "QA Yêu cầu: Tạo mới Employee không truyền password -> lưu HASH của 123456, không lưu chuỗi thô"
  );
  assert(
    await verifyPassword("123456", defaultPwEmp.password).then((r) => r.match),
    "Mật khẩu mặc định đã băm xác thực chính xác với chuỗi 123456"
  );

  // Tạo tài khoản legacy mô phỏng dữ liệu MongoDB cũ đang lưu plaintext
  const legacyEmp = await Employee.collection.insertOne({
    fullName: "Nhân Viên Cũ Plaintext",
    email: "legacy_user@talentflow.vn",
    password: "123456", // lưu chuỗi thô trực tiếp qua MongoDB driver
    role: "hr",
    departmentId: dept._id,
    positionId: pos._id,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const legacyEmpId = legacyEmp.insertedId;

  const adminEmp = await Employee.create({
    fullName: "Nguyễn Admin",
    email: "admin@talentflow.vn",
    password: rawPw,
    role: "admin",
    departmentId: dept._id,
    positionId: pos._id
  });

  const hrEmp = await Employee.create({
    fullName: "Trần HR",
    email: "hr@talentflow.vn",
    password: rawPw,
    role: "hr",
    departmentId: dept._id,
    positionId: pos._id
  });

  const interviewerEmp = await Employee.create({
    fullName: "Lê Interviewer",
    email: "interviewer@talentflow.vn",
    password: rawPw,
    role: "interviewer",
    departmentId: dept._id,
    positionId: pos._id
  });

  const staffEmp = await Employee.create({
    fullName: "Phạm Employee",
    email: "employee@talentflow.vn",
    password: rawPw,
    role: "employee",
    departmentId: dept._id,
    positionId: pos._id
  });

  const cand = await Candidate.create({
    fullName: "Ứng Viên Test",
    email: "candidate@test.com",
    phone: "0901234567"
  });

  const appRecord = await Application.create({
    candidateId: cand._id,
    positionId: pos._id,
    status: "interview"
  });

  const originalScheduledAt = new Date(Date.now() + 86400000);
  const originalLocation = "Phòng Họp 302";
  const originalInterviewer = interviewerEmp.fullName;
  const originalRound = "Phỏng vấn kỹ thuật";

  const interviewRecord = await Interview.create({
    applicationId: appRecord._id,
    round: originalRound,
    interviewer: originalInterviewer,
    location: originalLocation,
    scheduledAt: originalScheduledAt,
    result: "pending",
    score: 0,
    feedback: ""
  });

  // Start HTTP Server
  server = app.listen(0);
  serverPort = server.address().port;
  console.log(`Server test lắng nghe trên cổng: ${serverPort}`);

  // 4. Kiểm thử luồng Đăng nhập (Authentication) & JIT Password Migration
  console.log("\n--- 4. Kiểm thử Đăng nhập & Chuyển đổi Mật khẩu JIT ---");
  const loginStaff = await request("POST", "/api/auth/login", { email: "employee@talentflow.vn", password: rawPw });
  assert(loginStaff.status === 403, "Đăng nhập với role 'employee' bị từ chối 403 (không có quyền truy cập ATS)");

  const loginBadPw = await request("POST", "/api/auth/login", { email: "admin@talentflow.vn", password: "wrong" });
  assert(loginBadPw.status === 401, "Đăng nhập sai mật khẩu bị từ chối 401");

  const loginAdmin = await request("POST", "/api/auth/login", { email: "admin@talentflow.vn", password: rawPw });
  assert(loginAdmin.status === 200 && Boolean(loginAdmin.body?.data?.token), "Đăng nhập Admin thành công trả về HTTP 200 và JWT token");
  const adminToken = loginAdmin.body?.data?.token;

  // QA Yêu cầu: Đăng nhập tài khoản cũ lưu plaintext -> Đăng nhập thành công và tự động migrate sang bcrypt hash trong DB
  const loginLegacy = await request("POST", "/api/auth/login", { email: "legacy_user@talentflow.vn", password: "123456" });
  assert(loginLegacy.status === 200, "QA Yêu cầu: Đăng nhập tài khoản cũ bằng '123456' thành công (giữ nguyên UX)");
  
  const migratedDoc = await Employee.findById(legacyEmpId);
  assert(
    isBcryptHash(migratedDoc.password),
    "QA Yêu cầu: Tài khoản cũ được tự động chuyển đổi an toàn (JIT Migration) sang bcrypt hash sau khi đăng nhập"
  );

  const hrToken = generateToken({ id: hrEmp._id.toString(), email: hrEmp.email, role: "hr", fullName: hrEmp.fullName });
  const interviewerToken = generateToken({ id: interviewerEmp._id.toString(), email: interviewerEmp.email, role: "interviewer", fullName: interviewerEmp.fullName });
  const employeeToken = generateToken({ id: staffEmp._id.toString(), email: staffEmp.email, role: "employee", fullName: staffEmp.fullName });
  const expiredToken = jwt.sign({ id: adminEmp._id.toString(), role: "admin" }, TEST_SECRET, { expiresIn: "0s" });

  // 5. Kiểm thử Middleware Xác thực (Authentication Middleware)
  console.log("\n--- 5. Kiểm định Middleware Xác thực (401 Unauthorized) ---");
  const noTokenReq = await request("GET", "/api/candidates");
  assert(noTokenReq.status === 401, "Request không kèm token trả về 401 Unauthorized");

  const invalidTokenReq = await request("GET", "/api/candidates", null, "this-is-not-a-valid-token");
  assert(invalidTokenReq.status === 401, "Request kèm token sai/malformed trả về 401 Unauthorized");

  const expiredTokenReq = await request("GET", "/api/candidates", null, expiredToken);
  assert(expiredTokenReq.status === 401, "Request kèm token hết hạn trả về 401 Unauthorized");

  // 6. QA Yêu cầu 1: Token phải phản ánh tài khoản / role hiện tại
  console.log("\n--- 6. QA Yêu cầu 1: Token phản ánh tài khoản & vai trò hiện tại trong DB ---");
  // Test 6.1: Token trỏ tới tài khoản không tồn tại trong DB -> 401
  const fakeIdToken = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: "admin" }, TEST_SECRET);
  const fakeUserReq = await request("GET", "/api/candidates", null, fakeIdToken);
  assert(fakeUserReq.status === 401, "QA Điểm 1: Token có chữ ký hợp lệ nhưng tài khoản không có trong DB bị từ chối 401 (USER_NOT_FOUND)");

  // Test 6.2: Tài khoản bị vô hiệu hóa (status: 'resigned') -> token bị chặn 403
  await Employee.findByIdAndUpdate(hrEmp._id, { status: "resigned" });
  const inactiveTokenReq = await request("GET", "/api/candidates", null, hrToken);
  assert(inactiveTokenReq.status === 403, "QA Điểm 1: Tài khoản bị chuyển trạng thái 'resigned' trong DB -> token lập tức bị từ chối 403 (USER_INACTIVE)");
  // Khôi phục lại trạng thái active
  await Employee.findByIdAndUpdate(hrEmp._id, { status: "active" });

  // Test 6.3: Thay đổi role trong DB -> Token lập tức phản ánh role mới
  // Tạo một tài khoản test để kiểm tra đổi vai trò
  const roleTestEmp = await Employee.create({
    fullName: "Role Test Employee",
    email: "roletest@talentflow.vn",
    password: rawPw,
    role: "interviewer",
    departmentId: dept._id,
    positionId: pos._id
  });
  const roleTestToken = generateToken({ id: roleTestEmp._id.toString(), email: roleTestEmp.email, role: "interviewer", fullName: roleTestEmp.fullName });
  
  // Khi role là interviewer -> không được tạo ứng viên (403)
  const roleTestBefore = await request("POST", "/api/candidates", { fullName: "Test 1", email: "t1@t.com" }, roleTestToken);
  assert(roleTestBefore.status === 403, "Trước khi đổi role: Tài khoản có role 'interviewer' bị từ chối tạo ứng viên 403");

  // Nâng quyền tài khoản trong DB lên HR
  await Employee.findByIdAndUpdate(roleTestEmp._id, { role: "hr" });
  
  // Dùng lại TOKEN CŨ -> Middleware đọc DB và cấp quyền HR (201 Created)
  const roleTestAfter = await request("POST", "/api/candidates", { fullName: "Test 2", email: "t2@t.com", phone: "0999888777" }, roleTestToken);
  assert(roleTestAfter.status === 201, "QA Điểm 1: Đổi role trong DB lên 'hr' -> Token cũ lập tức phản ánh role mới và được phép thực hiện hành động (201 Created)");

  // Test 6.4 (QA Vá 1): Token hợp lệ nhưng THIẾU `id` (chỉ có role: "admin") -> Bắt buộc bị từ chối 401
  const tokenWithoutId = jwt.sign({ role: "admin" }, TEST_SECRET, { expiresIn: "24h" });
  const noIdTokenReq = await request("GET", "/api/candidates", null, tokenWithoutId);
  assert(noIdTokenReq.status === 401, "QA Vá 1: Token có chữ ký hợp lệ nhưng thiếu trường 'id' (chỉ chứa role: 'admin') bị từ chối 401");

  // Test 6.5 (QA Vá 1): Token có trường `id` không phải ObjectId hợp lệ -> Bị từ chối 401
  const malformedIdToken = jwt.sign({ id: "invalid-not-an-objectid", role: "admin" }, TEST_SECRET, { expiresIn: "24h" });
  const malformedIdReq = await request("GET", "/api/candidates", null, malformedIdToken);
  assert(malformedIdReq.status === 401, "QA Vá 1: Token có trường 'id' không hợp lệ bị từ chối 401");

  // 7. QA Yêu cầu 2: Interviewer CHỈ được cập nhật trường chấm điểm và kết quả
  console.log("\n--- 7. QA Yêu cầu 2: Interviewer CHỈ được cập nhật trường chấm điểm & kết quả ---");
  const maliciousScheduleUpdate = {
    // Các trường chấm điểm (được phép)
    score: 88,
    result: "pass",
    feedback: "Ứng viên có tư duy tốt",
    // Các trường lịch trình (KHÔNG được phép đối với interviewer)
    scheduledAt: new Date("2099-01-01T10:00:00.000Z"),
    location: "Trụ sở tuyệt mật tại Hawaii",
    interviewer: "Hội đồng Khác Không Được Phép",
    round: "Vòng Tuyệt Mật Bị Chèn Ép"
  };

  const interviewerUpdateReq = await request(
    "PUT",
    `/api/interviews/${interviewRecord._id}`,
    maliciousScheduleUpdate,
    interviewerToken
  );
  assert(interviewerUpdateReq.status === 200, "Interviewer gửi cập nhật kết quả phỏng vấn trả về 200 OK");

  // Kiểm tra dữ liệu thực tế trong DB sau khi Interviewer cập nhật
  const updatedInterview = await Interview.findById(interviewRecord._id);
  assert(
    updatedInterview.score === 88 && updatedInterview.result === "pass" && updatedInterview.feedback === "Ứng viên có tư duy tốt",
    "QA Điểm 2: Các trường chấm điểm (score, result, feedback) được cập nhật thành công"
  );
  assert(
    updatedInterview.location === originalLocation,
    "QA Điểm 2: Trường location KHÔNG bị thay đổi bởi interviewer",
    `Giá trị: "${updatedInterview.location}"`
  );
  assert(
    updatedInterview.interviewer === originalInterviewer,
    "QA Điểm 2: Trường interviewer KHÔNG bị thay đổi bởi interviewer",
    `Giá trị: "${updatedInterview.interviewer}"`
  );
  assert(
    updatedInterview.round === originalRound,
    "QA Điểm 2: Trường round KHÔNG bị thay đổi bởi interviewer",
    `Giá trị: "${updatedInterview.round}"`
  );
  assert(
    new Date(updatedInterview.scheduledAt).getTime() === originalScheduledAt.getTime(),
    "QA Điểm 2: Trường scheduledAt KHÔNG bị dời thời gian bởi interviewer"
  );

  // QA Vá 2: Bật validation khi Interviewer cập nhật phỏng vấn - dữ liệu sai không được ghi vào DB
  const baselineScore = updatedInterview.score; // 88
  const baselineResult = updatedInterview.result; // "pass"

  // Test 7.1: Gửi score = 150 (vượt quá 100) -> 400 Bad Request
  const invalidScoreOverReq = await request(
    "PUT",
    `/api/interviews/${interviewRecord._id}`,
    { score: 150 },
    interviewerToken
  );
  assert(invalidScoreOverReq.status === 400, "QA Vá 2: Interviewer gửi score = 150 (vượt quá 100) bị từ chối 400 Bad Request");
  const checkOverDoc = await Interview.findById(interviewRecord._id);
  assert(checkOverDoc.score === baselineScore, `QA Vá 2: Dữ liệu cũ được giữ nguyên sau request score sai (score vẫn là ${baselineScore})`);

  // Test 7.2: Gửi score = -10 (số âm) -> 400 Bad Request
  const invalidScoreNegativeReq = await request(
    "PUT",
    `/api/interviews/${interviewRecord._id}`,
    { score: -10 },
    interviewerToken
  );
  assert(invalidScoreNegativeReq.status === 400, "QA Vá 2: Interviewer gửi score = -10 (số âm) bị từ chối 400 Bad Request");
  const checkNegativeDoc = await Interview.findById(interviewRecord._id);
  assert(checkNegativeDoc.score === baselineScore, `QA Vá 2: Dữ liệu cũ được giữ nguyên sau request score âm (score vẫn là ${baselineScore})`);

  // Test 7.3: Gửi result = "invalid_enum_status" -> 400 Bad Request
  const invalidResultReq = await request(
    "PUT",
    `/api/interviews/${interviewRecord._id}`,
    { result: "invalid_enum_status" },
    interviewerToken
  );
  assert(invalidResultReq.status === 400, "QA Vá 2: Interviewer gửi result sai enum bị từ chối 400 Bad Request");
  const checkResultDoc = await Interview.findById(interviewRecord._id);
  assert(checkResultDoc.result === baselineResult, `QA Vá 2: Dữ liệu cũ được giữ nguyên sau request result sai (result vẫn là '${baselineResult}')`);

  // Admin vẫn có thể cập nhật các trường lịch trình bình thường
  const adminScheduleUpdate = await request(
    "PUT",
    `/api/interviews/${interviewRecord._id}`,
    { location: "Phòng Họp 405 (Đổi bởi Admin)" },
    adminToken
  );
  assert(adminScheduleUpdate.status === 200, "Admin có quyền cập nhật lịch trình và địa điểm phỏng vấn");
  const adminUpdatedInterview = await Interview.findById(interviewRecord._id);
  assert(adminUpdatedInterview.location === "Phòng Họp 405 (Đổi bởi Admin)", "Admin cập nhật location thành công vào DB");

  // 8. Kiểm định Phân quyền RBAC Các Vai Trò Khác
  console.log("\n--- 8. Kiểm định Phân quyền RBAC Các Vai Trò Khác ---");
  const empAccessReq = await request("GET", "/api/candidates", null, employeeToken);
  assert(empAccessReq.status === 403, "Role 'employee' gửi token hợp lệ nhưng bị chặn 403 trên toàn hệ thống ATS");

  const interviewerReportsReq = await request("GET", "/api/reports", null, interviewerToken);
  assert(interviewerReportsReq.status === 403, "Role 'interviewer' truy cập báo cáo /api/reports bị chặn 403");

  const interviewerCreateCandReq = await request("POST", "/api/candidates", { fullName: "Hacker", email: "h@h.com" }, interviewerToken);
  assert(interviewerCreateCandReq.status === 403, "Role 'interviewer' tạo ứng viên bị chặn 403");

  const interviewerCreateInterviewReq = await request("POST", "/api/interviews", { round: "Vòng 1" }, interviewerToken);
  assert(interviewerCreateInterviewReq.status === 403, "Role 'interviewer' tạo lịch phỏng vấn mới bị chặn 403");

  const interviewerDeleteInterviewReq = await request("DELETE", `/api/interviews/${interviewRecord._id}`, null, interviewerToken);
  assert(interviewerDeleteInterviewReq.status === 403, "Role 'interviewer' xóa lịch phỏng vấn bị chặn 403");

  const hrCreateCandReq = await request("POST", "/api/candidates", {
    fullName: "Ứng Viên Do HR Tạo",
    email: "cand_hr@test.com",
    phone: "0911222333"
  }, hrToken);
  assert(hrCreateCandReq.status === 201, "Role 'hr' tạo ứng viên mới thành công (201 Created)");
  const createdCandId = hrCreateCandReq.body?.data?._id;

  const hrDeleteCandReq = await request("DELETE", `/api/candidates/${createdCandId}`, null, hrToken);
  assert(hrDeleteCandReq.status === 403, "Role 'hr' cố ý xóa ứng viên bị chặn 403 (chỉ admin có quyền xóa)");

  const adminDeleteCandReq = await request("DELETE", `/api/candidates/${createdCandId}`, null, adminToken);
  assert(adminDeleteCandReq.status === 200, "Role 'admin' xóa ứng viên thành công trả về 200 OK");

  // Dọn dẹp
  console.log("\n--- Dọn dẹp & Giải phóng Tài nguyên ---");
  await mongoose.connection.db.dropDatabase();
  console.log(`Đã drop hoàn toàn database tạm: ${TEST_DB_NAME}`);
  await mongoose.disconnect();
  server.close();
  console.log("Đã đóng kết nối HTTP và Mongoose an toàn.");

  console.log("\n================================================================");
  console.log(`KẾT QUẢ KIỂM ĐỊNH BƯỚC 1: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log("================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Lỗi khi chạy kiểm thử:", err);
  if (server) server.close();
  mongoose.disconnect().finally(() => process.exit(1));
});
