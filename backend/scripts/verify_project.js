import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { getJwtSecret, generateToken } from "../src/middleware/auth.js";
import { hashPassword, verifyPassword, isBcryptHash } from "../src/utils/password.js";

import Department from "../src/models/Department.js";
import Position from "../src/models/Position.js";
import Candidate from "../src/models/Candidate.js";
import Application from "../src/models/Application.js";
import Interview from "../src/models/Interview.js";
import Employee from "../src/models/Employee.js";
import { performBackup } from "./backup.js";
import { performRestore } from "./restore.js";
import { maskMongoUri } from "../src/utils/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("================================================================");
console.log("BỘ KIỂM ĐỊNH TOÀN DIỆN TALENTFLOW ATS (STATIC AUDIT & API SUITE)");
console.log("================================================================");

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message, detail = "") {
  if (condition) {
    console.log("  [PASS] " + message + (detail ? " - " + detail : ""));
    totalPassed++;
  } else {
    console.error("  [FAIL] " + message + (detail ? " - " + detail : ""));
    totalFailed++;
  }
}

// ============================================================================
// PHẦN 1: KIỂM ĐỊNH TĨNH: TẬP DỮ LIỆU JSON, KHÓA NGOẠI, SCHEMAS & FRONTEND BUILD
// ============================================================================
console.log("\n================================================================");
console.log("PHẦN 1: KIỂM ĐỊNH TÍNH TOÀN VẸN DỮ LIỆU & KIẾN TRÚC MÃ NGUỒN");
console.log("================================================================");

console.log("\n--- 1.1. Kiểm định 6 Tập dữ liệu JSON Nghiệp vụ ---");
const dataDir = path.join(__dirname, "../data");
const files = [
  "departments.json",
  "positions.json",
  "candidates.json",
  "applications.json",
  "interviews.json",
  "employees.json"
];

const datasets = {};

for (const file of files) {
  const filePath = path.join(dataDir, file);
  assert(fs.existsSync(filePath), "Tệp dữ liệu tồn tại: " + file);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    datasets[file.replace(".json", "")] = parsed;
    assert(Array.isArray(parsed) && parsed.length > 0, file + " chứa " + parsed.length + " bản ghi hợp lệ");
  } catch (err) {
    assert(false, "Lỗi cú pháp JSON trong " + file + ": " + err.message);
  }
}

console.log("\n--- 1.2. Kiểm định Tính toàn vẹn Khóa ngoại (Referential Integrity) ---");
const candIds = new Set(datasets.candidates.map((c) => c._id.$oid || c._id));
const posIds = new Set(datasets.positions.map((p) => p._id.$oid || p._id));
const deptIds = new Set(datasets.departments.map((d) => d._id.$oid || d._id));

// Positions -> Departments
let orphanPos = 0;
for (const pos of datasets.positions) {
  const dId = pos.departmentId.$oid || pos.departmentId;
  if (!deptIds.has(dId)) orphanPos++;
}
assert(orphanPos === 0, "100% Vị trí tuyển dụng tham chiếu đúng Phòng ban hợp lệ");

// Applications -> Candidates & Positions
let orphanAppCand = 0;
let orphanAppPos = 0;
for (const appItem of datasets.applications) {
  const cId = appItem.candidateId.$oid || appItem.candidateId;
  const pId = appItem.positionId.$oid || appItem.positionId;
  if (!candIds.has(cId)) orphanAppCand++;
  if (!posIds.has(pId)) orphanAppPos++;
}
assert(orphanAppCand === 0, "100% Hồ sơ ứng tuyển tham chiếu đúng Ứng viên");
assert(orphanAppPos === 0, "100% Hồ sơ ứng tuyển tham chiếu đúng Vị trí việc làm");

// Employees -> Departments & Positions
let orphanEmp = 0;
for (const emp of datasets.employees) {
  const dId = emp.departmentId.$oid || emp.departmentId;
  const pId = emp.positionId.$oid || emp.positionId;
  if (!deptIds.has(dId) || !posIds.has(pId)) orphanEmp++;
}
assert(orphanEmp === 0, "100% Nhân viên tham chiếu đúng Department và Position");

const empWithCandidate = datasets.employees.filter((emp) => emp.candidateId);
let orphanEmpCand = 0;
for (const emp of empWithCandidate) {
  const cId = emp.candidateId.$oid || emp.candidateId;
  if (!candIds.has(cId)) orphanEmpCand++;
}
assert(orphanEmpCand === 0, "Nhân viên gắn candidateId đều tham chiếu đúng Candidate");

const roleSet = new Set(["admin", "hr", "interviewer", "employee"]);
const missingLoginFields = datasets.employees.filter((emp) => !emp.email || !emp.password || !roleSet.has(emp.role)).length;
assert(missingLoginFields === 0, "100% Nhân viên có email, password demo và role hợp lệ");
assert(datasets.employees.some((emp) => emp.role === "admin"), "Có ít nhất 1 tài khoản admin để đăng nhập demo");

const deptCodes = datasets.departments.map((d) => d.code).filter(Boolean);
assert(deptCodes.length === datasets.departments.length, "100% Phòng ban có mã code");

console.log("\n--- 1.3. Kiểm định Cấu trúc Mongoose Schemas & Model Architecture ---");
const models = ["Department", "Position", "Candidate", "Application", "Interview", "Employee"];
for (const m of models) {
  const modelFile = path.join(__dirname, "../src/models", m + ".js");
  assert(fs.existsSync(modelFile), "Schema Model tồn tại: " + m + ".js");
}

console.log("\n--- 1.4. Kiểm định Gói Build Frontend & Web Assets ---");
const distDir = path.join(__dirname, "../../frontend/dist");
assert(fs.existsSync(distDir), "Thư mục frontend/dist tồn tại");
assert(fs.existsSync(path.join(distDir, "index.html")), "frontend/dist/index.html sẵn sàng phục vụ");

const staticPassed = totalPassed;
console.log(`\n=> KẾT THÚC PHẦN 1: ${staticPassed} tiêu chí kiểm định tĩnh đạt chuẩn.`);

// ============================================================================
// PHẦN 2: KIỂM THỬ TÍCH HỢP HÀNH VI API, RBAC & NGHIỆP VỤ TRÊN DATABASE ĐỘNG
// ============================================================================
console.log("\n================================================================");
console.log("PHẦN 2: KIỂM THỬ HÀNH VI API, RBAC & NGHIỆP VỤ (DATABASE ĐỘNG)");
console.log("================================================================");

const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
const DYNAMIC_DB_NAME = `talentflow_test_api_${uniqueId}`;
const DYNAMIC_DB_URI = `mongodb://localhost:27017/${DYNAMIC_DB_NAME}`;
const TEST_JWT_SECRET = "test_super_secret_for_qa_verification_12345";

let server;
let serverPort;

async function request(method, pathUrl, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: serverPort,
        path: pathUrl,
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

async function runApiSuite() {
  try {
    assert(
      DYNAMIC_DB_NAME.startsWith("talentflow_test_api_") && DYNAMIC_DB_NAME.includes(uniqueId),
      "Khởi tạo tên Database kiểm thử động độc lập cho từng phiên chạy",
      `Database: ${DYNAMIC_DB_NAME}`
    );

  // 2.1. Cấu hình JWT
  console.log("\n--- 2.1. Kiểm tra Cấu hình JWT & Secret Enforcement ---");
  const originalSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  let thrown = false;
  try {
    getJwtSecret();
  } catch (err) {
    thrown = true;
    assert(thrown && err.message.includes("JWT_SECRET"), "Thiếu JWT_SECRET bắt buộc ném lỗi cấu hình, không fallback");
  }
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  assert(getJwtSecret() === TEST_JWT_SECRET, "Lấy đúng JWT_SECRET khi đã cấu hình");

  // 2.2. Password Hashing & Bcrypt
  console.log("\n--- 2.2. Kiểm tra Tiện ích Password & Bcrypt ---");
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

  // 2.3. Kết nối Isolated Test Database
  console.log("\n--- 2.3. Khởi tạo Cơ sở Dữ liệu Kiểm thử Độc lập ---");
  console.log(`Connecting to dynamic test DB: ${DYNAMIC_DB_URI}...`);
  await mongoose.connect(DYNAMIC_DB_URI);
  console.log(`Đã kết nối an toàn tới database tạm: ${DYNAMIC_DB_NAME}`);

  // Seed fixtures
  const dept = await Department.create({ name: "Phòng Công Nghệ", code: "TECH" });
  const pos = await Position.create({
    title: "Senior Node.js Developer",
    departmentId: dept._id,
    description: "Tuyển dụng Node.js backend developer",
    status: "open",
    quantity: 1
  });

  const defaultPwEmp = await Employee.create({
    fullName: "Nhân Viên Mặc Định",
    email: "default_pw@talentflow.vn",
    role: "hr",
    departmentId: dept._id,
    positionId: pos._id
  });
  assert(isBcryptHash(defaultPwEmp.password), "Tạo mới Employee không truyền password -> tự động lưu HASH của 123456");
  assert(
    await verifyPassword("123456", defaultPwEmp.password).then((r) => r.match),
    "Mật khẩu mặc định đã băm xác thực chính xác với chuỗi 123456"
  );

  const legacyEmp = await Employee.collection.insertOne({
    fullName: "Nhân Viên Cũ Plaintext",
    email: "legacy_user@talentflow.vn",
    password: "123456",
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
    fullName: "Nguyễn Ứng Viên",
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

  server = app.listen(0);
  serverPort = server.address().port;
  console.log(`Server test lắng nghe trên cổng: ${serverPort}`);

  // 2.4. Đăng nhập & JIT Migration
  console.log("\n--- 2.4. Kiểm thử Đăng nhập & Chuyển đổi Mật khẩu JIT ---");
  const loginStaff = await request("POST", "/api/auth/login", { email: "employee@talentflow.vn", password: rawPw });
  assert(loginStaff.status === 403, "Đăng nhập với role 'employee' bị từ chối 403 (không có quyền truy cập ATS)");

  const loginBadPw = await request("POST", "/api/auth/login", { email: "admin@talentflow.vn", password: "wrong" });
  assert(loginBadPw.status === 401, "Đăng nhập sai mật khẩu bị từ chối 401");

  const loginAdmin = await request("POST", "/api/auth/login", { email: "admin@talentflow.vn", password: rawPw });
  assert(loginAdmin.status === 200 && Boolean(loginAdmin.body?.data?.token), "Đăng nhập Admin thành công trả về HTTP 200 và JWT token");
  const adminToken = loginAdmin.body?.data?.token;

  const loginLegacy = await request("POST", "/api/auth/login", { email: "legacy_user@talentflow.vn", password: "123456" });
  assert(loginLegacy.status === 200, "Đăng nhập tài khoản cũ bằng '123456' thành công (giữ nguyên UX)");

  const migratedDoc = await Employee.findById(legacyEmpId);
  assert(isBcryptHash(migratedDoc.password), "Tài khoản cũ được tự động chuyển đổi an toàn (JIT Migration) sang bcrypt hash");

  const hrToken = generateToken({ id: hrEmp._id.toString(), email: hrEmp.email, role: "hr", fullName: hrEmp.fullName });
  const interviewerToken = generateToken({ id: interviewerEmp._id.toString(), email: interviewerEmp.email, role: "interviewer", fullName: interviewerEmp.fullName });
  const employeeToken = generateToken({ id: staffEmp._id.toString(), email: staffEmp.email, role: "employee", fullName: staffEmp.fullName });
  const expiredToken = jwt.sign({ id: adminEmp._id.toString(), role: "admin" }, TEST_JWT_SECRET, { expiresIn: "0s" });

  // 2.5. Middleware Xác thực
  console.log("\n--- 2.5. Kiểm định Middleware Xác thực (401 Unauthorized) ---");
  const noTokenReq = await request("GET", "/api/candidates");
  assert(noTokenReq.status === 401, "Request không kèm token trả về 401 Unauthorized");

  const invalidTokenReq = await request("GET", "/api/candidates", null, "this-is-not-a-valid-token");
  assert(invalidTokenReq.status === 401, "Request kèm token sai/malformed trả về 401 Unauthorized");

  const expiredTokenReq = await request("GET", "/api/candidates", null, expiredToken);
  assert(expiredTokenReq.status === 401, "Request kèm token hết hạn trả về 401 Unauthorized");

  // 2.6. Token phản ánh tài khoản & role thực tế trong DB
  console.log("\n--- 2.6. Kiểm định Token phản ánh tài khoản & vai trò hiện tại ---");
  const fakeIdToken = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: "admin" }, TEST_JWT_SECRET);
  const fakeUserReq = await request("GET", "/api/candidates", null, fakeIdToken);
  assert(fakeUserReq.status === 401, "Token có chữ ký hợp lệ nhưng tài khoản không có trong DB bị từ chối 401 (USER_NOT_FOUND)");

  await Employee.findByIdAndUpdate(hrEmp._id, { status: "resigned" });
  const inactiveTokenReq = await request("GET", "/api/candidates", null, hrToken);
  assert(inactiveTokenReq.status === 403, "Tài khoản bị chuyển trạng thái 'resigned' trong DB -> token lập tức bị từ chối 403 (USER_INACTIVE)");
  await Employee.findByIdAndUpdate(hrEmp._id, { status: "active" });

  const roleTestEmp = await Employee.create({
    fullName: "Role Test Employee",
    email: "roletest@talentflow.vn",
    password: rawPw,
    role: "interviewer",
    departmentId: dept._id,
    positionId: pos._id
  });
  const roleTestToken = generateToken({ id: roleTestEmp._id.toString(), email: roleTestEmp.email, role: "interviewer", fullName: roleTestEmp.fullName });

  const roleTestBefore = await request("POST", "/api/candidates", { fullName: "Test 1", email: "t1@t.com", phone: "099111" }, roleTestToken);
  assert(roleTestBefore.status === 403, "Trước khi đổi role: Tài khoản có role 'interviewer' bị từ chối tạo ứng viên 403");

  await Employee.findByIdAndUpdate(roleTestEmp._id, { role: "hr" });
  const roleTestAfter = await request("POST", "/api/candidates", { fullName: "Test 2", email: "t2@t.com", phone: "0999888777" }, roleTestToken);
  assert(roleTestAfter.status === 201, "Đổi role trong DB lên 'hr' -> Token cũ lập tức phản ánh role mới và tạo ứng viên thành công (201 Created)");

  const tokenWithoutId = jwt.sign({ role: "admin" }, TEST_JWT_SECRET, { expiresIn: "24h" });
  const noIdTokenReq = await request("GET", "/api/candidates", null, tokenWithoutId);
  assert(noIdTokenReq.status === 401, "Token có chữ ký hợp lệ nhưng thiếu trường 'id' (chỉ chứa role: 'admin') bị từ chối 401");

  const malformedIdToken = jwt.sign({ id: "invalid-not-an-objectid", role: "admin" }, TEST_JWT_SECRET, { expiresIn: "24h" });
  const malformedIdReq = await request("GET", "/api/candidates", null, malformedIdToken);
  assert(malformedIdReq.status === 401, "Token có trường 'id' không hợp lệ bị từ chối 401");

  // 2.7. Phân quyền RBAC & Giới hạn quyền Interviewer
  console.log("\n--- 2.7. Kiểm định Phân quyền RBAC & Giới hạn quyền Interviewer ---");
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

  const interviewerGetInterviewsReq = await request("GET", "/api/interviews", null, interviewerToken);
  assert(interviewerGetInterviewsReq.status === 200, "Role 'interviewer' xem danh sách phỏng vấn trả về 200");

  const interviewerGetApplicationsReq = await request("GET", "/api/applications", null, interviewerToken);
  assert(interviewerGetApplicationsReq.status === 200, "Role 'interviewer' xem applications để hiển thị chi tiết thẻ ứng viên trả về 200");

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

  // Interviewer chỉ sửa trường chấm điểm
  const interviewerUpdateReq = await request(
    "PUT",
    `/api/interviews/${interviewRecord._id}`,
    {
      score: 88,
      result: "pass",
      feedback: "Ứng viên có tư duy tốt",
      scheduledAt: new Date("2099-01-01T10:00:00.000Z"),
      location: "Trụ sở tuyệt mật tại Hawaii",
      interviewer: "Hội đồng Khác",
      round: "Vòng Chèn Ép"
    },
    interviewerToken
  );
  assert(interviewerUpdateReq.status === 200, "Interviewer gửi cập nhật kết quả phỏng vấn trả về 200 OK");

  const updatedInterview = await Interview.findById(interviewRecord._id);
  assert(
    updatedInterview.score === 88 && updatedInterview.result === "pass" && updatedInterview.feedback === "Ứng viên có tư duy tốt",
    "Các trường chấm điểm (score, result, feedback) được cập nhật thành công"
  );
  assert(updatedInterview.location === originalLocation, "Trường location KHÔNG bị thay đổi bởi interviewer");
  assert(updatedInterview.interviewer === originalInterviewer, "Trường interviewer KHÔNG bị thay đổi bởi interviewer");
  assert(updatedInterview.round === originalRound, "Trường round KHÔNG bị thay đổi bởi interviewer");
  assert(new Date(updatedInterview.scheduledAt).getTime() === originalScheduledAt.getTime(), "Trường scheduledAt KHÔNG bị dời thời gian bởi interviewer");
  assert((await Application.findById(appRecord._id)).status === 'accepted', 'Chấm Đậu tự chuyển Kanban sang Gửi Đề Nghị');
  const downgradePassedReq = await request('PUT', `/api/applications/${appRecord._id}/status`, { status: 'screening' }, adminToken);
  assert(downgradePassedReq.status === 400, 'Hồ sơ đã Đậu không thể lùi về Sơ loại bằng API');

  // Validation trường chấm điểm của Interviewer
  const baselineScore = updatedInterview.score;
  const baselineResult = updatedInterview.result;

  const invalidScoreOverReq = await request("PUT", `/api/interviews/${interviewRecord._id}`, { score: 150 }, interviewerToken);
  assert(invalidScoreOverReq.status === 400, "Interviewer gửi score = 150 (vượt quá 100) bị từ chối 400 Bad Request");
  const checkOverDoc = await Interview.findById(interviewRecord._id);
  assert(checkOverDoc.score === baselineScore, "Dữ liệu cũ được giữ nguyên sau request score sai (> 100)");

  const invalidScoreNegativeReq = await request("PUT", `/api/interviews/${interviewRecord._id}`, { score: -10 }, interviewerToken);
  assert(invalidScoreNegativeReq.status === 400, "Interviewer gửi score = -10 (số âm) bị từ chối 400 Bad Request");
  const checkNegativeDoc = await Interview.findById(interviewRecord._id);
  assert(checkNegativeDoc.score === baselineScore, "Dữ liệu cũ được giữ nguyên sau request score âm");

  const invalidResultReq = await request("PUT", `/api/interviews/${interviewRecord._id}`, { result: "invalid_enum_status" }, interviewerToken);
  assert(invalidResultReq.status === 400, "Interviewer gửi result sai enum bị từ chối 400 Bad Request");
  const checkResultDoc = await Interview.findById(interviewRecord._id);
  assert(checkResultDoc.result === baselineResult, "Dữ liệu cũ được giữ nguyên sau request result sai enum");

  const adminScheduleUpdate = await request("PUT", `/api/interviews/${interviewRecord._id}`, { location: "Phòng Họp 405 (Admin)" }, adminToken);
  assert(adminScheduleUpdate.status === 200, "Admin có quyền cập nhật lịch trình và địa điểm phỏng vấn");
  const reviseToFailReq = await request('PUT', `/api/interviews/${interviewRecord._id}`, { result: 'fail' }, adminToken);
  assert(reviseToFailReq.status === 200 && (await Application.findById(appRecord._id)).status === 'interview', 'Sửa Đậu thành Không đạt đưa hồ sơ về Phỏng Vấn để lên lịch vòng tiếp');

  // ==========================================================================
  // 2.8. KIỂM THỬ NGHIỆP VỤ: CHẶN XÓA VỊ TRÍ ĐANG CÓ HỒ SƠ ỨNG TUYỂN
  // ==========================================================================
  console.log("\n--- 2.8. Kiểm thử Nghiệp vụ: Chặn xóa vị trí đang có hồ sơ ứng tuyển ---");
  // Vị trí pos đang có appRecord liên kết
  const deleteActivePosReq = await request("DELETE", `/api/positions/${pos._id}`, null, adminToken);
  assert(
    deleteActivePosReq.status === 400,
    "Chặn xóa vị trí đang có hồ sơ ứng tuyển liên kết trả về 400 Bad Request"
  );
  assert(
    deleteActivePosReq.body?.message?.includes("hồ sơ ứng tuyển liên kết"),
    "Thông báo lỗi nêu rõ nguyên nhân ràng buộc toàn vẹn hồ sơ ứng tuyển"
  );

  const posStillExists = await Position.findById(pos._id);
  assert(Boolean(posStillExists), "Vị trí tuyển dụng vẫn tồn tại an toàn trong database");

  // Tạo vị trí trống không có hồ sơ liên kết để kiểm tra xóa thành công
  const emptyPos = await Position.create({
    title: "Vị Trí Nháp Cần Xóa",
    departmentId: dept._id,
    description: "Vị trí không có ứng viên",
    status: "open"
  });
  const deleteEmptyPosReq = await request("DELETE", `/api/positions/${emptyPos._id}`, null, adminToken);
  assert(deleteEmptyPosReq.status === 200, "Xóa vị trí trống không có hồ sơ liên kết trả về 200 OK");
  const emptyPosCheck = await Position.findById(emptyPos._id);
  assert(!emptyPosCheck, "Vị trí trống đã được xóa thành công khỏi database");

  // ==========================================================================
  // 2.9. KIỂM THỬ NGHIỆP VỤ: TỰ ĐỘNG ĐÓNG VỊ TRÍ KHI ĐỦ CHỈ TIÊU (HEADCOUNT)
  // ==========================================================================
  console.log("\n--- 2.9. Kiểm thử Nghiệp vụ: Tự động đóng vị trí khi đủ chỉ tiêu ---");
  // Tạo vị trí có quota = 1, status = 'open'
  const quotaPos = await Position.create({
    title: "DevOps Engineer Quota Test",
    departmentId: dept._id,
    description: "Chỉ tiêu tuyển 1 người",
    quantity: 1,
    status: "open"
  });

  const quotaCand = await Candidate.create({
    fullName: "Ứng Viên DevOps",
    email: "devops.cand@test.com",
    phone: "0988776655"
  });

  const quotaApp = await Application.create({
    candidateId: quotaCand._id,
    positionId: quotaPos._id,
    status: "screening"
  });

  const skipScheduleReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { status: "interview" }, adminToken);
  assert(skipScheduleReq.status === 400, "Không thể chuyển Sơ loại sang Phỏng vấn khi chưa có lịch");
  const skipOfferReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { status: "accepted" }, adminToken);
  assert(skipOfferReq.status === 400, "Không thể gửi đề nghị khi chưa có kết quả phỏng vấn Đậu");
  const skipHireReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { status: "hired" }, adminToken);
  assert(skipHireReq.status === 400, "Không thể tuyển dụng trực tiếp từ bước Sơ loại");
  const scheduledQuotaReq = await request("POST", "/api/interviews", {
    applicationId: quotaApp._id, interviewer: "QA", round: "Phỏng vấn kỹ thuật",
    scheduledAt: new Date(Date.now() + 86400000)
  }, adminToken);
  assert(scheduledQuotaReq.status === 201, "Đặt lịch phỏng vấn thành công từ hồ sơ Sơ loại");
  const scheduledQuotaApp = await Application.findById(quotaApp._id);
  assert(scheduledQuotaApp.status === "interview", "Đặt lịch tự chuyển hồ sơ sang bước Phỏng vấn");
  const interviewListReq = await request("GET", "/api/interviews", null, adminToken);
  assert(interviewListReq.status === 200 && interviewListReq.body?.data?.some((iv) =>
    iv._id === scheduledQuotaReq.body?.data?._id &&
    iv.applicationId?.candidateId?.fullName === quotaCand.fullName),
  "Lịch vừa đặt xuất hiện trong API màn Phỏng vấn với đúng ứng viên");
  const duplicateScheduleReq = await request("POST", "/api/interviews", {
    applicationId: quotaApp._id, interviewer: "QA", scheduledAt: new Date(Date.now() + 2 * 86400000)
  }, adminToken);
  assert(duplicateScheduleReq.status === 400, "Không tạo lịch phỏng vấn pending trùng cho cùng hồ sơ");
  const passQuotaReq = await request("PUT", `/api/interviews/${scheduledQuotaReq.body?.data?._id}`, {
    result: "pass", score: 85
  }, adminToken);
  assert(passQuotaReq.status === 200, "Chấm kết quả Đậu cho lịch phỏng vấn");
  assert((await Application.findById(quotaApp._id)).status === 'accepted', 'Chấm Đậu tự chuyển hồ sơ sang Gửi Đề Nghị');
  const offerQuotaReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { status: "accepted" }, adminToken);
  assert(offerQuotaReq.status === 200, "Hồ sơ đã phỏng vấn Đậu được chuyển sang Gửi Đề Nghị");

  const hireWithoutOfferReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { status: "hired" }, adminToken);
  assert(hireWithoutOfferReq.status === 400 && (await Application.findById(quotaApp._id)).status === 'accepted', 'Chưa có đề nghị được ứng viên đồng ý thì không thể tuyển');
  const invalidOfferReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { offerSalary: -1, offerStartDate: '2026-11-01', offerAccepted: true }, adminToken);
  assert(invalidOfferReq.status === 400 && !(await Application.findById(quotaApp._id)).offerAccepted, 'Lương đề nghị không hợp lệ không được lưu');
  const acceptEmptyOfferReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { offerAccepted: true }, adminToken);
  assert(acceptEmptyOfferReq.status === 400, 'Không thể xác nhận đồng ý khi thiếu lương và ngày nhận việc');
  const offerStartDate = '2026-11-01';
  const saveOfferReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, {
    offerSalary: 25000000, offerStartDate, offerNote: 'Đã trao đổi trực tiếp', offerAccepted: true
  }, adminToken);
  assert(saveOfferReq.status === 200 && saveOfferReq.body?.data?.offerSalary === 25000000, 'Lưu lương, ngày và xác nhận ứng viên đồng ý');
  const changeOfferReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { offerSalary: 26000000 }, adminToken);
  assert(changeOfferReq.status === 200 && changeOfferReq.body?.data?.offerAccepted === false, 'Sửa lương đề nghị làm mất xác nhận đồng ý cũ');
  const reconfirmOfferReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { offerSalary: 25000000, offerAccepted: true }, adminToken);
  assert(reconfirmOfferReq.status === 200 && reconfirmOfferReq.body?.data?.offerAccepted === true, 'Xác nhận lại đề nghị sau khi đổi lương');

  // Chuyển hồ sơ sang 'hired'
  const hireAppReq = await request(
    "PUT",
    `/api/applications/${quotaApp._id}/status`,
    { status: "hired" },
    adminToken
  );
  assert(hireAppReq.status === 200, "Chuyển hồ sơ sang trạng thái 'hired' thành công (200 OK)");
  assert(hireAppReq.body?.headcountInfo?.isFull === true, "Headcount info trả về xác nhận vị trí đã nhận đủ chỉ tiêu (isFull = true)");
  const changeHiredResultReq = await request('PUT', `/api/interviews/${scheduledQuotaReq.body?.data?._id}`, { result: 'fail' }, adminToken);
  assert(changeHiredResultReq.status === 400 && (await Interview.findById(scheduledQuotaReq.body?.data?._id)).result === 'pass', 'Đã tuyển không thể đổi kết quả Đậu thành Không đạt');

  const anotherPosition = await Position.create({ title: 'Vị trí đối chiếu tuyển dụng', description: 'Kiểm thử một ứng viên không tuyển hai lần', departmentId: dept._id, quantity: 1, status: 'open' });
  const duplicateHire = await Application.create({ candidateId: quotaCand._id, positionId: anotherPosition._id, status: 'accepted' });
  const duplicateHireReq = await request('PUT', `/api/applications/${duplicateHire._id}/status`, { status: 'hired' }, adminToken);
  assert(duplicateHireReq.status === 400 && (await Application.findById(duplicateHire._id)).status === 'accepted', 'Một ứng viên không thể được tuyển qua hai hồ sơ');
  const emailConflictCandidate = await Candidate.create({ fullName: 'Ứng viên trùng email', email: defaultPwEmp.email, phone: '0999000111' });
  const emailConflictApp = await Application.create({ candidateId: emailConflictCandidate._id, positionId: anotherPosition._id, status: 'accepted' });
  const emailConflictReq = await request('PUT', `/api/applications/${emailConflictApp._id}/status`, { status: 'hired' }, adminToken);
  assert(emailConflictReq.status === 400 && (await Application.findById(emailConflictApp._id)).status === 'accepted', 'Email nhân viên đã tồn tại không tạo thẻ Đã tuyển thiếu nhân viên');
  await Application.deleteMany({ _id: { $in: [duplicateHire._id, emailConflictApp._id] } });
  await Candidate.findByIdAndDelete(emailConflictCandidate._id);
  await Position.findByIdAndDelete(anotherPosition._id);

  // Kiểm tra trực tiếp document vị trí trong DB
  const closedPosDoc = await Position.findById(quotaPos._id);
  assert(closedPosDoc.status === "closed", "Vị trí tuyển dụng tự động chuyển sang trạng thái 'closed' trong database");
  assert(closedPosDoc.closedByQuota === true, "Vị trí ghi nhận đóng tự động do đủ chỉ tiêu");
  const reopenFullReq = await request("PUT", `/api/positions/${quotaPos._id}`, { status: "open" }, adminToken);
  assert(reopenFullReq.status === 400, "Không thể mở lại vị trí đã đủ chỉ tiêu");

  // QA Bổ sung: Nộp hồ sơ vào vị trí đã đóng ('closed') -> Phải trả về 400 và không tạo document
  const countBeforeClosedApp = await Application.countDocuments({ positionId: closedPosDoc._id });
  const applyClosedPosReq = await request(
    "POST",
    "/api/applications",
    { candidateId: cand._id, positionId: closedPosDoc._id },
    adminToken
  );
  assert(
    applyClosedPosReq.status === 400,
    "Tạo hồ sơ ứng tuyển vào vị trí đã đóng ('closed') bị từ chối 400 Bad Request"
  );
  assert(
    applyClosedPosReq.body?.message?.includes("đã đóng"),
    "Thông báo lỗi nêu rõ vị trí tuyển dụng đã đóng, không tiếp nhận thêm hồ sơ mới"
  );
  const countAfterClosedApp = await Application.countDocuments({ positionId: closedPosDoc._id });
  assert(
    countAfterClosedApp === countBeforeClosedApp,
    "Xác nhận không có document hồ sơ ứng tuyển nào được tạo trong DB khi vị trí đóng"
  );

  // Hồ sơ nhân viên phải được xử lý trước khi đảo ngược trạng thái đã tuyển.
  const unhireWhileEmployeeExists = await request("PUT", `/api/applications/${quotaApp._id}/status`, { status: "rejected" }, adminToken);
  assert(unhireWhileEmployeeExists.status === 400, "Không thể hủy tuyển khi hồ sơ nhân viên còn tồn tại");
  const quotaEmployee = await Employee.findOne({ candidateId: quotaCand._id, positionId: quotaPos._id });
  assert(Boolean(quotaEmployee), "Chuyển sang hired tự tạo hồ sơ nhân viên đúng ứng viên và vị trí");
  assert(quotaEmployee.officialSalary === 25000000 && quotaEmployee.startDate.toISOString().startsWith(offerStartDate), 'Hồ sơ nhân viên lấy lương và ngày từ đề nghị đã đồng ý');
  const removeQuotaEmployeeReq = await request("DELETE", `/api/employees/${quotaEmployee._id}`, null, adminToken);
  assert(removeQuotaEmployeeReq.status === 200, "Admin có thể xử lý hồ sơ nhân viên trước khi hủy tuyển");

  // Sau khi xử lý nhân viên, chuyển khỏi 'hired' -> vị trí tự động mở lại
  const unhireAppReq = await request(
    "PUT",
    `/api/applications/${quotaApp._id}/status`,
    { status: "rejected" },
    adminToken
  );
  assert(unhireAppReq.status === 200, "Chuyển hồ sơ từ 'hired' sang 'rejected' thành công (200 OK)");
  const reopenedPosDoc = await Position.findById(quotaPos._id);
  assert(reopenedPosDoc.status === "open", "Vị trí tuyển dụng tự động mở lại thành 'open' khi số lượng trúng tuyển giảm dưới chỉ tiêu");

  const closeManuallyReq = await request("PUT", `/api/positions/${quotaPos._id}`, { status: "closed" }, adminToken);
  assert(closeManuallyReq.status === 200, "Có thể đóng thủ công vị trí chưa đủ chỉ tiêu");
  const scoreRejectedReq = await request("PUT", `/api/applications/${quotaApp._id}/status`, { score: 50 }, adminToken);
  assert(scoreRejectedReq.status === 200, "Cập nhật điểm hồ sơ không tác động trạng thái vị trí");
  const stillClosedPos = await Position.findById(quotaPos._id);
  assert(stillClosedPos.status === "closed", "Vị trí đóng thủ công không bị mở lại ngoài ý muốn");

  const pausedReq = await request("PUT", `/api/positions/${quotaPos._id}`, { status: "paused" }, adminToken);
  assert(pausedReq.status === 200, "Có thể tạm ngưng tuyển dụng");
  const applyPausedReq = await request("POST", "/api/applications", { candidateId: cand._id, positionId: quotaPos._id }, adminToken);
  assert(applyPausedReq.status === 400, "Vị trí tạm ngưng từ chối hồ sơ mới");

  const pendingFollowupReq = await request("POST", "/api/interviews", {
    applicationId: appRecord._id,
    interviewer: "QA",
    scheduledAt: new Date(Date.now() + 2 * 86400000)
  }, adminToken);
  assert(pendingFollowupReq.status === 201, "Có thể lên lịch phỏng vấn tiếp theo cho hồ sơ đang xử lý");
  const redatePastReq = await request("PUT", `/api/interviews/${pendingFollowupReq.body?.data?._id}`, {
    scheduledAt: new Date(Date.now() - 86400000)
  }, adminToken);
  assert(redatePastReq.status === 400, "Không thể dời lịch phỏng vấn đang chờ về quá khứ");
  const acceptWithPendingReq = await request("PUT", `/api/applications/${appRecord._id}/status`, { status: "accepted" }, adminToken);
  assert(acceptWithPendingReq.status === 400, "Không thể nhận ứng viên khi còn lịch phỏng vấn pending");
  const rejectWithPendingReq = await request("PUT", `/api/applications/${appRecord._id}/status`, { status: "rejected" }, adminToken);
  assert(rejectWithPendingReq.status === 400, "Không thể từ chối hồ sơ khi lịch phỏng vấn pending chưa được xử lý");
  const pendingInterviewCheck = await Interview.findById(pendingFollowupReq.body?.data?._id);
  assert(pendingInterviewCheck.result === "pending", "Lịch pending không bị tự chấm đậu khi đổi Kanban thất bại");

  const scheduleRejectedReq = await request("POST", "/api/interviews", {
    applicationId: quotaApp._id,
    interviewer: "QA",
    scheduledAt: new Date(Date.now() + 86400000)
  }, adminToken);
  assert(scheduleRejectedReq.status === 400, "Không thể lên lịch mới cho hồ sơ đã từ chối");

  const duplicateAppReq = await request("POST", "/api/applications", {
    candidateId: cand._id,
    positionId: pos._id
  }, adminToken);
  assert(duplicateAppReq.status === 400, "Không thể tạo hồ sơ đang xử lý trùng ứng viên và vị trí");

  const intakePos = await Position.create({
    title: "Kiểm thử tiếp nhận hồ sơ", description: "Chỉ bắt đầu từ Mới Nộp",
    departmentId: dept._id, quantity: 10
  });
  for (const initialStatus of ["screening", "interview", "accepted", "hired", "rejected"]) {
    const intakeCandidate = await Candidate.create({
      fullName: `Ứng viên kiểm thử ${initialStatus}`,
      email: `intake.${initialStatus}@test.com`, phone: "0900000000"
    });
    const bypassReq = await request("POST", "/api/applications", {
      candidateId: intakeCandidate._id, positionId: intakePos._id, status: initialStatus
    }, adminToken);
    assert(bypassReq.status === 400, `Không tạo hồ sơ mới thẳng vào trạng thái ${initialStatus}`);
    assert(!await Application.exists({ candidateId: intakeCandidate._id }), `Từ chối ${initialStatus} không sinh hồ sơ trong DB`);
  }
  const freshCandidate = await Candidate.create({
    fullName: "Ứng viên mới đúng quy trình", email: "intake.valid@test.com", phone: "0900000001"
  });
  const prefilledOfferReq = await request("POST", "/api/applications", {
    candidateId: freshCandidate._id, positionId: intakePos._id,
    offerSalary: 25000000, offerStartDate: new Date(Date.now() + 86400000), offerAccepted: true
  }, adminToken);
  assert(prefilledOfferReq.status === 400, "Không cài sẵn đề nghị đã đồng ý khi tạo hồ sơ mới");
  assert(!await Application.exists({ candidateId: freshCandidate._id }), "Đề nghị sai giai đoạn không tạo document");
  const freshApplicationReq = await request("POST", "/api/applications", {
    candidateId: freshCandidate._id, positionId: intakePos._id, source: "Website", score: 80, note: "Hồ sơ mới"
  }, adminToken);
  assert(freshApplicationReq.status === 201 && freshApplicationReq.body?.data?.status === "applied", "Tạo hồ sơ hợp lệ bắt đầu tại Mới Nộp");
  assert(freshApplicationReq.body?.data?.offerAccepted === false && !freshApplicationReq.body?.data?.offerSalary, "Hồ sơ mới chưa có đề nghị làm việc");

  const wrongDept = await Department.create({ name: "Phòng kiểm thử khác", code: "OTHER" });
  const wrongDeptEmployeeReq = await request("POST", "/api/employees", {
    fullName: "Nhân viên sai phòng", email: "wrong.dept@test.com",
    departmentId: wrongDept._id, positionId: pos._id
  }, adminToken);
  assert(wrongDeptEmployeeReq.status === 400, "Không thể gán nhân viên vào vị trí thuộc phòng ban khác");

  const deleteLinkedDepartmentReq = await request("DELETE", `/api/departments/${dept._id}`, null, adminToken);
  assert(deleteLinkedDepartmentReq.status === 400, "Không thể xóa phòng ban đang có vị trí liên kết");
  const linkedEmployee = await Employee.create({
    candidateId: quotaCand._id, fullName: "Nhân viên liên kết",
    email: "linked.qa@test.com", departmentId: dept._id, positionId: quotaPos._id
  });
  const deleteHiredCandidateReq = await request("DELETE", `/api/candidates/${quotaCand._id}`, null, adminToken);
  assert(deleteHiredCandidateReq.status === 400, "Không thể xóa ứng viên đã có hồ sơ nhân viên");
  const deleteLinkedApplicationReq = await request("DELETE", `/api/applications/${quotaApp._id}`, null, adminToken);
  assert(deleteLinkedApplicationReq.status === 400, "Không thể xóa hồ sơ đã liên kết nhân viên");
  await Employee.findByIdAndDelete(linkedEmployee._id);

  // ==========================================================================
  // 2.10. KIỂM THỬ NGHIỆP VỤ: KANBAN & ĐẦU VÀO SAI QUAN TRỌNG (VALIDATION)
  // ==========================================================================
  console.log("\n--- 2.10. Kiểm thử Nghiệp vụ: Kanban & Ràng buộc Đầu vào sai ---");

  // 1. Kanban status sai enum
  const invalidKanbanStatusReq = await request(
    "PUT",
    `/api/applications/${quotaApp._id}/status`,
    { status: "invalid_stage_name" },
    adminToken
  );
  assert(invalidKanbanStatusReq.status === 400, "Cập nhật Kanban với trạng thái sai enum bị từ chối 400 Bad Request");
  const checkKanbanDoc = await Application.findById(quotaApp._id);
  assert(checkKanbanDoc.status === "rejected", "Dữ liệu Kanban cũ trong database được giữ nguyên trạng");

  // 2. Điểm đánh giá Kanban âm (< 0)
  const negativeScoreKanbanReq = await request(
    "PUT",
    `/api/applications/${quotaApp._id}/status`,
    { score: -15 },
    adminToken
  );
  assert(negativeScoreKanbanReq.status === 400, "Cập nhật điểm Kanban số âm (-15) bị từ chối 400 Bad Request");

  // 3. Điểm đánh giá Kanban vượt quá 100 (> 100)
  const overScoreKanbanReq = await request(
    "PUT",
    `/api/applications/${quotaApp._id}/status`,
    { score: 125 },
    adminToken
  );
  assert(overScoreKanbanReq.status === 400, "Cập nhật điểm Kanban vượt quá 100 (125) bị từ chối 400 Bad Request");

  // 4. Cập nhật hồ sơ không tồn tại
  const nonExistentAppReq = await request(
    "PUT",
    `/api/applications/${new mongoose.Types.ObjectId()}/status`,
    { status: "screening" },
    adminToken
  );
  assert(nonExistentAppReq.status === 404, "Cập nhật hồ sơ không tồn tại trả về 404 Not Found");

  // 5. Tạo mới hồ sơ ứng tuyển thiếu candidateId hoặc positionId
  const missingCandAppReq = await request(
    "POST",
    "/api/applications",
    { positionId: pos._id },
    adminToken
  );
  assert(missingCandAppReq.status === 400, "Tạo hồ sơ ứng tuyển thiếu candidateId bị từ chối 400 Bad Request");

  // 6. Tạo hồ sơ ứng tuyển với candidateId không tồn tại
  const nonExistentCandAppReq = await request(
    "POST",
    "/api/applications",
    { candidateId: new mongoose.Types.ObjectId(), positionId: pos._id },
    adminToken
  );
  assert(nonExistentCandAppReq.status === 404, "Tạo hồ sơ với candidateId không tồn tại trả về 404 Not Found");

  // 7. Tạo mới ứng viên thiếu trường fullName bắt buộc
  const missingNameCandReq = await request(
    "POST",
    "/api/candidates",
    { email: "noname@test.com" },
    adminToken
  );
  assert(missingNameCandReq.status === 400, "Tạo ứng viên thiếu fullName bị Mongoose Schema từ chối 400 Bad Request");

  // 8. Tạo mới vị trí thiếu trường title bắt buộc
  const missingTitlePosReq = await request(
    "POST",
    "/api/positions",
    { departmentId: dept._id, description: "Thiếu tiêu đề" },
    adminToken
  );
  assert(missingTitlePosReq.status === 400, "Tạo vị trí thiếu title bị Mongoose Schema từ chối 400 Bad Request");
  } finally {
    console.log("\n--- Dọn dẹp & Giải phóng Tài nguyên ---");
    try {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        if (mongoose.connection.db && mongoose.connection.db.databaseName === DYNAMIC_DB_NAME) {
          await mongoose.connection.db.dropDatabase();
          console.log(`Đã drop hoàn toàn database tạm: ${DYNAMIC_DB_NAME}`);
        }
        await mongoose.disconnect();
      }
    } catch (cleanupErr) {
      console.error("Lỗi khi dọn dẹp database tạm:", cleanupErr);
    }
    try {
      if (server) {
        server.close();
      }
    } catch (serverErr) {
      console.error("Lỗi khi đóng server:", serverErr);
    }
    console.log("Đã đóng kết nối HTTP và Mongoose an toàn.");
  }

  const apiPassed = totalPassed - staticPassed;
  console.log(`\n=> KẾT THÚC PHẦN 2: ${apiPassed} tiêu chí kiểm thử hành vi API đạt chuẩn.`);
  return apiPassed;
}

async function runBackupRestoreSuite() {
  console.log("\n================================================================");
  console.log("PHẦN 3: KIỂM THỬ BACKUP & SAFE RESTORE (DATABASE & THƯ MỤC TẠM)");
  console.log("================================================================");

  const startPart3Passed = totalPassed;
  const backupTestId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const BACKUP_TEST_DB = `talentflow_test_backup_restore_${backupTestId}`;
  const BACKUP_TEST_URI = `mongodb://localhost:27017/${BACKUP_TEST_DB}`;
  const TEMP_DIR = path.join(__dirname, `../temp_backup_test_${backupTestId}`);
  const TEMP_BACKUP_DIR = path.join(TEMP_DIR, "backup");
  const TEMP_SNAPSHOTS_DIR = path.join(TEMP_DIR, "snapshots");

  assert(
    BACKUP_TEST_DB.startsWith("talentflow_test_backup_restore_"),
    "Khởi tạo tên Database tạm độc lập cho suite Backup & Restore",
    `Database: ${BACKUP_TEST_DB}`
  );

  try {
    // 3.1. Bảo mật: Che thông tin đăng nhập trong Connection URI
    console.log("\n--- 3.1. Kiểm tra Che giấu Thông tin Đăng nhập trong Connection String ---");
    const maskedStandard = maskMongoUri("mongodb://admin:secret123@localhost:27017/recruitment_db");
    assert(
      maskedStandard === "mongodb://admin:****@localhost:27017/recruitment_db",
      "Che mật khẩu đối với connection string tiêu chuẩn (mongodb://user:pass@host)"
    );

    const maskedAtlas = maskMongoUri(
      "mongodb+srv://dba_user:SuperPass99@cluster0.abc.mongodb.net/recruitment_db?retryWrites=true"
    );
    assert(
      maskedAtlas ===
        "mongodb+srv://dba_user:****@cluster0.abc.mongodb.net/recruitment_db?retryWrites=true",
      "Che mật khẩu đối với connection string Atlas SRV (mongodb+srv://user:pass@host)"
    );

    const maskedLocal = maskMongoUri("mongodb://localhost:27017/recruitment_db");
    assert(
      maskedLocal === "mongodb://localhost:27017/recruitment_db",
      "Giữ nguyên URI cục bộ không chứa thông tin đăng nhập"
    );

    // 3.2. Bảo mật: .gitignore loại bỏ thư mục backup và snapshots
    console.log("\n--- 3.2. Kiểm tra .gitignore Bảo vệ Dữ liệu Hồ sơ & Mật khẩu Hash ---");
    const gitignorePath = path.join(__dirname, "../../.gitignore");
    assert(fs.existsSync(gitignorePath), "Tệp .gitignore tồn tại ở thư mục gốc");
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
    assert(
      gitignoreContent.includes("backup/") && gitignoreContent.includes("snapshots/"),
      ".gitignore đã cấu hình loại trừ toàn bộ thư mục backup/ và snapshots/"
    );

    // 3.3. Kết nối Database tạm & Nạp dữ liệu mẫu
    console.log("\n--- 3.3. Khởi tạo Cơ sở Dữ liệu Kiểm thử Tạm cho Backup/Restore ---");
    await mongoose.connect(BACKUP_TEST_URI);
    assert(
      mongoose.connection.db.databaseName === BACKUP_TEST_DB,
      "Kết nối an toàn tới database tạm riêng biệt cho Backup & Restore"
    );

    const dept = await Department.create({ name: "Phòng Kỹ Thuật", code: "ENG" });
    const pos = await Position.create({
      title: "Backend Engineer",
      departmentId: dept._id,
      description: "Node.js Developer",
      status: "open",
      quantity: 2
    });
    const cand = await Candidate.create({
      fullName: "Đoàn Văn Nam",
      email: "nam.doan@example.com",
      phone: "0901234567",
      skills: ["Node.js", "MongoDB"]
    });
    const appDoc = await Application.create({
      candidateId: cand._id,
      positionId: pos._id,
      status: "screening",
      stage: "CV Review"
    });
    const iv = await Interview.create({
      applicationId: appDoc._id,
      round: "Vòng Chuyên Môn",
      interviewer: "Lead Tech",
      scheduledAt: new Date(Date.now() + 86400000),
      status: "scheduled"
    });
    const emp = await Employee.create({
      fullName: "Trần Quản Trị",
      email: "admin_backup@talentflow.vn",
      password: await hashPassword("123456"),
      role: "admin",
      departmentId: dept._id,
      positionId: pos._id
    });

    assert((await Department.countDocuments()) === 1, "Department được nạp vào DB kiểm thử (1 bản ghi)");
    assert((await Position.countDocuments()) === 1, "Position được nạp vào DB kiểm thử (1 bản ghi)");
    assert((await Candidate.countDocuments()) === 1, "Candidate được nạp vào DB kiểm thử (1 bản ghi)");
    assert((await Application.countDocuments()) === 1, "Application được nạp vào DB kiểm thử (1 bản ghi)");
    assert((await Interview.countDocuments()) === 1, "Interview được nạp vào DB kiểm thử (1 bản ghi)");
    assert((await Employee.countDocuments()) === 1, "Employee được nạp vào DB kiểm thử (1 bản ghi)");

    // 3.4. Kiểm thử Sao lưu (Backup)
    console.log("\n--- 3.4. Kiểm thử Sao lưu (Backup) Toàn vẹn & Tính Nguyên tử ---");
    const backupRes = await performBackup({
      mongoUri: BACKUP_TEST_URI,
      baseBackupDir: TEMP_BACKUP_DIR,
      silent: true,
      closeConnection: false
    });

    assert(backupRes.success === true, "Lệnh performBackup thực thi thành công");
    assert(fs.existsSync(backupRes.backupDir), "Thư mục sao lưu riêng biệt theo lần chạy được tạo thành công");

    // Kiểm tra đủ 6 file JSON
    const requiredFiles = [
      "departments.json",
      "positions.json",
      "candidates.json",
      "applications.json",
      "interviews.json",
      "employees.json"
    ];
    let all6FilesExist = true;
    for (const f of requiredFiles) {
      if (!fs.existsSync(path.join(backupRes.backupDir, f))) {
        all6FilesExist = false;
      }
    }
    assert(all6FilesExist, "Thư mục sao lưu chứa đầy đủ 6 tệp JSON collections nghiệp vụ");

    // Kiểm tra manifest.json
    const manifestPath = path.join(backupRes.backupDir, "manifest.json");
    assert(fs.existsSync(manifestPath), "Tệp manifest.json tồn tại khẳng định bộ backup hoàn thành toàn vẹn");
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    assert(manifestContent.status === "completed", "Trạng thái manifest ghi nhận 'completed'");
    assert(manifestContent.collections.candidates === 1, "Manifest xác nhận số lượng bản ghi khớp thực tế");

    // Kiểm tra không để lại thư mục staging dở dang
    const stagingEntries = fs.readdirSync(TEMP_BACKUP_DIR).filter((n) => n.includes(".staging_"));
    assert(stagingEntries.length === 0, "Không để lại thư mục staging dở dang trong thư mục sao lưu");

    // 3.4.1. QA Yêu cầu 1: Từ chối ghi đè hoặc xóa targetDir đã tồn tại
    console.log("\n--- 3.4.1. Kiểm thử Từ chối Ghi đè/Xóa targetDir đã Tồn tại ---");
    const existingTargetDir = path.join(TEMP_DIR, "existing_backup_dir");
    fs.mkdirSync(existingTargetDir, { recursive: true });
    fs.writeFileSync(path.join(existingTargetDir, "dummy_protect.txt"), "Dữ liệu quan trọng không được xóa", "utf-8");

    let targetExistsErrorThrown = false;
    try {
      await performBackup({
        mongoUri: BACKUP_TEST_URI,
        targetDir: existingTargetDir,
        silent: true,
        closeConnection: false
      });
    } catch (err) {
      targetExistsErrorThrown = true;
      assert(
        err.message.includes("BACKUP_TARGET_EXISTS") && err.message.includes("đã tồn tại"),
        "performBackup phát hiện và từ chối ghi đè khi targetDir đã tồn tại"
      );
    }
    assert(targetExistsErrorThrown, "Ném lỗi cấu hình bảo vệ targetDir thành công");
    assert(
      fs.existsSync(path.join(existingTargetDir, "dummy_protect.txt")),
      "Tệp dữ liệu cũ trong targetDir được bảo toàn 100%, không bị xóa hay ghi đè"
    );

    // 3.5. Kiểm thử Tiền kiểm tra Restore: Chặn bộ backup thiếu file
    console.log("\n--- 3.5. Kiểm thử Tiền kiểm tra Restore: Chặn bộ Backup Thiếu file ---");
    const brokenMissingDir = path.join(TEMP_DIR, "broken_missing_dir");
    fs.mkdirSync(brokenMissingDir, { recursive: true });
    // Copy 5 files, cố tình bỏ qua employees.json
    for (const f of [
      "departments.json",
      "positions.json",
      "candidates.json",
      "applications.json",
      "interviews.json"
    ]) {
      fs.copyFileSync(path.join(backupRes.backupDir, f), path.join(brokenMissingDir, f));
    }

    let missingFileErrorThrown = false;
    try {
      await performRestore({
        mongoUri: BACKUP_TEST_URI,
        backupDir: brokenMissingDir,
        snapshotsDir: TEMP_SNAPSHOTS_DIR,
        silent: true,
        closeConnection: false
      });
    } catch (err) {
      missingFileErrorThrown = true;
      assert(
        err.message.includes("Thiếu") && err.message.includes("employees.json"),
        "Phát hiện và từ chối ngay lập tức khi thiếu tệp sao lưu bắt buộc (employees.json)"
      );
    }
    assert(missingFileErrorThrown, "Tiền kiểm tra (Pre-flight) kích hoạt thành công đối với bộ backup thiếu file");
    assert((await Candidate.countDocuments()) === 1, "Dữ liệu MongoDB hiện tại giữ nguyên 100%, không bị xóa");

    // 3.5.1. QA Yêu cầu 2: Chỉ định backupDir không tồn tại: Báo lỗi ngay, không fallback sang latest
    console.log("\n--- 3.5.1. Kiểm thử Chỉ định backupDir Không tồn tại: Báo lỗi ngay, Không Fallback ---");
    const nonExistentBackupDir = path.join(TEMP_DIR, "non_existent_custom_dir_123");
    let nonExistentDirThrown = false;
    try {
      await performRestore({
        mongoUri: BACKUP_TEST_URI,
        backupDir: nonExistentBackupDir,
        snapshotsDir: TEMP_SNAPSHOTS_DIR,
        silent: true,
        closeConnection: false
      });
    } catch (err) {
      nonExistentDirThrown = true;
      assert(
        err.message.includes("không tồn tại") && err.message.includes(nonExistentBackupDir),
        "performRestore ném lỗi ngay lập tức khi backupDir chỉ định không tồn tại"
      );
    }
    assert(nonExistentDirThrown, "Từ chối thực thi khi backupDir tùy chỉnh không tồn tại (không tự chuyển latest)");
    assert((await Candidate.countDocuments()) === 1, "Dữ liệu MongoDB hiện tại giữ nguyên 100%, không bị thay đổi");

    // 3.6. Kiểm thử Tiền kiểm tra Restore: Chặn JSON hỏng
    console.log("\n--- 3.6. Kiểm thử Tiền kiểm tra Restore: Chặn tệp JSON Hỏng cú pháp ---");
    const brokenSyntaxDir = path.join(TEMP_DIR, "broken_syntax_dir");
    fs.mkdirSync(brokenSyntaxDir, { recursive: true });
    for (const f of requiredFiles) {
      if (f === "candidates.json") {
        fs.writeFileSync(path.join(brokenSyntaxDir, f), '{"broken_json_syntax": [', "utf-8");
      } else {
        fs.copyFileSync(path.join(backupRes.backupDir, f), path.join(brokenSyntaxDir, f));
      }
    }

    let syntaxErrorThrown = false;
    try {
      await performRestore({
        mongoUri: BACKUP_TEST_URI,
        backupDir: brokenSyntaxDir,
        snapshotsDir: TEMP_SNAPSHOTS_DIR,
        silent: true,
        closeConnection: false
      });
    } catch (err) {
      syntaxErrorThrown = true;
      assert(
        err.message.includes("cú pháp JSON không hợp lệ") || err.message.includes("candidates.json"),
        "Phát hiện và từ chối khi tệp sao lưu có cú pháp JSON hỏng"
      );
    }
    assert(syntaxErrorThrown, "Tiền kiểm tra (Pre-flight) kích hoạt thành công đối với JSON hỏng");
    assert((await Candidate.countDocuments()) === 1, "Dữ liệu MongoDB hiện tại giữ nguyên 100%, không bị xóa");

    // 3.7. Kiểm thử Lỗi khi ghi & Tự động Rollback từ Snapshot
    console.log("\n--- 3.7. Kiểm thử Sự cố Ghi Dữ liệu & Tự động Rollback từ Snapshot ---");
    const extraCand = await Candidate.create({
      fullName: "Ứng Viên Đang Có Trước Restore",
      email: "extra@test.com",
      phone: "0987654321",
      skills: ["Testing"]
    });
    assert((await Candidate.countDocuments()) === 2, "Database hiện có 2 ứng viên trước khi restore");

    let rollbackTriggered = false;
    let caughtRestoreErr = null;
    try {
      await performRestore({
        mongoUri: BACKUP_TEST_URI,
        backupDir: backupRes.backupDir,
        snapshotsDir: TEMP_SNAPSHOTS_DIR,
        simulateFailDuringWrite: (col) => col === "applications",
        silent: true,
        closeConnection: false
      });
    } catch (err) {
      rollbackTriggered = true;
      caughtRestoreErr = err;
    }

    assert(rollbackTriggered, "Phát hiện lỗi mô phỏng trong quá trình ghi dữ liệu");
    assert(caughtRestoreErr?.rollbackSuccess === true, "Rollback tự động từ snapshot thành công 100%");
    assert(
      fs.existsSync(caughtRestoreErr?.snapshotDir),
      "Thư mục snapshot vẫn được bảo lưu an toàn trên đĩa sau rollback"
    );
    const snapManifestAfterRollback = JSON.parse(
      fs.readFileSync(path.join(caughtRestoreErr.snapshotDir, "manifest.json"), "utf-8")
    );
    assert(
      snapManifestAfterRollback.status === "rollback_completed",
      "Manifest của snapshot ghi nhận trạng thái 'rollback_completed'"
    );

    // Kiểm tra dữ liệu trong DB sau rollback khớp với dữ liệu trước khi restore
    assert(
      (await Candidate.countDocuments()) === 2,
      "Dữ liệu MongoDB đã được khôi phục nguyên vẹn về trạng thái trước restore (vẫn có 2 ứng viên)"
    );
    const checkExtraCand = await Candidate.findById(extraCand._id);
    assert(checkExtraCand !== null, "Ứng viên 'Ứng Viên Đang Có Trước Restore' được khôi phục thành công");

    // 3.7.1. QA Yêu cầu 3: Nếu hậu kiểm sau restore thất bại, kích hoạt rollback từ snapshot và báo rõ kết quả
    console.log("\n--- 3.7.1. Kiểm thử Hậu kiểm sau Restore Thất bại & Kích hoạt Rollback Snapshot ---");
    const candBeforeVerifyFail = await Candidate.create({
      fullName: "Ứng Viên Trước Hậu Kiểm Thất Bại",
      email: "verify_fail@test.com",
      phone: "0999888777",
      skills: ["QA"]
    });
    const countBeforePostVerify = await Candidate.countDocuments(); // 3 ứng viên

    let postVerifyRollbackTriggered = false;
    let caughtPostVerifyErr = null;
    try {
      await performRestore({
        mongoUri: BACKUP_TEST_URI,
        backupDir: backupRes.backupDir,
        snapshotsDir: TEMP_SNAPSHOTS_DIR,
        simulateFailDuringVerification: (col) => col === "candidates",
        silent: true,
        closeConnection: false
      });
    } catch (err) {
      postVerifyRollbackTriggered = true;
      caughtPostVerifyErr = err;
    }

    assert(postVerifyRollbackTriggered, "Phát hiện lỗi mô phỏng trong quá trình hậu kiểm (Post-verification)");
    assert(
      caughtPostVerifyErr?.failureType === "VERIFICATION_FAILED",
      "Xác định đúng loại sự cố là 'VERIFICATION_FAILED'"
    );
    assert(
      caughtPostVerifyErr?.rollbackSuccess === true,
      "Hệ thống tự động kích hoạt Rollback từ snapshot và hoàn tất thành công 100%"
    );
    assert(
      fs.existsSync(caughtPostVerifyErr?.snapshotDir),
      "Snapshot được giữ nguyên trên đĩa sau rollback từ lỗi hậu kiểm"
    );
    const snapManifestVerifyRollback = JSON.parse(
      fs.readFileSync(path.join(caughtPostVerifyErr.snapshotDir, "manifest.json"), "utf-8")
    );
    assert(
      snapManifestVerifyRollback.status === "rollback_completed" &&
        snapManifestVerifyRollback.failureType === "VERIFICATION_FAILED",
      "Snapshot manifest ghi nhận 'rollback_completed' kèm failureType 'VERIFICATION_FAILED'"
    );
    assert(
      (await Candidate.countDocuments()) === countBeforePostVerify,
      "Dữ liệu MongoDB sau khi rollback khớp chính xác với trạng thái trước khi restore (đầy đủ ứng viên)"
    );
    const checkCandVerify = await Candidate.findById(candBeforeVerifyFail._id);
    assert(checkCandVerify !== null, "Ứng viên 'Ứng Viên Trước Hậu Kiểm Thất Bại' được bảo toàn nguyên vẹn");

    // 3.8. Kiểm thử Restore Thành công & Kiểm tra Toàn vẹn Quan hệ
    console.log("\n--- 3.8. Kiểm thử Khôi phục (Restore) Thành công & Toàn vẹn Khóa ngoại ---");
    const restoreSuccessRes = await performRestore({
      mongoUri: BACKUP_TEST_URI,
      backupDir: backupRes.backupDir,
      snapshotsDir: TEMP_SNAPSHOTS_DIR,
      silent: true,
      closeConnection: false
    });

    assert(restoreSuccessRes.success === true, "Lệnh performRestore hoàn tất thành công");
    assert(fs.existsSync(restoreSuccessRes.snapshotDir), "Snapshot trước khi restore vẫn được giữ an toàn trên đĩa");
    const snapManifestVerified = JSON.parse(
      fs.readFileSync(path.join(restoreSuccessRes.snapshotDir, "manifest.json"), "utf-8")
    );
    assert(
      snapManifestVerified.status === "restore_verified",
      "Snapshot manifest ghi nhận trạng thái 'restore_verified' sau khi kiểm tra xong"
    );

    // Kiểm tra số lượng bản ghi chính xác
    assert((await Department.countDocuments()) === 1, "Department khôi phục đúng 1 bản ghi");
    assert((await Position.countDocuments()) === 1, "Position khôi phục đúng 1 bản ghi");
    assert((await Candidate.countDocuments()) === 1, "Candidate khôi phục đúng 1 bản ghi");
    assert((await Application.countDocuments()) === 1, "Application khôi phục đúng 1 bản ghi");
    assert((await Interview.countDocuments()) === 1, "Interview khôi phục đúng 1 bản ghi");
    assert((await Employee.countDocuments()) === 1, "Employee khôi phục đúng 1 bản ghi");

    // Kiểm tra tính toàn vẹn quan hệ (Referential Integrity) sau restore
    const restoredPos = await Position.findOne();
    const restoredDept = await Department.findOne();
    assert(
      restoredPos.departmentId.toString() === restoredDept._id.toString(),
      "Quan hệ Position -> Department được bảo toàn chính xác sau restore"
    );

    const restoredApp = await Application.findOne();
    const restoredCand = await Candidate.findOne();
    assert(
      restoredApp.candidateId.toString() === restoredCand._id.toString(),
      "Quan hệ Application -> Candidate được bảo toàn chính xác sau restore"
    );
    assert(
      restoredApp.positionId.toString() === restoredPos._id.toString(),
      "Quan hệ Application -> Position được bảo toàn chính xác sau restore"
    );

    const restoredIv = await Interview.findOne();
    assert(
      restoredIv.applicationId.toString() === restoredApp._id.toString(),
      "Quan hệ Interview -> Application được bảo toàn chính xác sau restore"
    );

    const restoredEmp = await Employee.findOne();
    assert(
      restoredEmp.departmentId.toString() === restoredDept._id.toString(),
      "Quan hệ Employee -> Department được bảo toàn chính xác sau restore"
    );
  } finally {
    console.log("\n--- Dọn dẹp Database & Thư mục Tạm của Suite Backup/Restore ---");
    try {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        if (mongoose.connection.db && mongoose.connection.db.databaseName === BACKUP_TEST_DB) {
          await mongoose.connection.db.dropDatabase();
          console.log(`Đã drop hoàn toàn database tạm: ${BACKUP_TEST_DB}`);
        }
        await mongoose.disconnect();
      }
    } catch (dbCleanErr) {
      console.error("Lỗi khi drop DB backup test:", dbCleanErr);
    }

    try {
      if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        console.log(`Đã dọn dẹp toàn bộ thư mục file tạm: ${TEMP_DIR}`);
      }
    } catch (dirCleanErr) {
      console.error("Lỗi khi xóa thư mục tạm:", dirCleanErr);
    }
  }

  const backupPassed = totalPassed - startPart3Passed;
  console.log(`\n=> KẾT THÚC PHẦN 3: ${backupPassed} tiêu chí kiểm thử Backup & Safe Restore đạt chuẩn.`);
  return backupPassed;
}

async function main() {
  await runApiSuite();
  const backupPassed = await runBackupRestoreSuite();

  const apiPassed = totalPassed - staticPassed - backupPassed;

  // ==========================================================================
  // TỔNG KẾT BỘ KIỂM ĐỊNH TOÀN DIỆN
  // ==========================================================================
  console.log("\n================================================================");
  console.log(`TỔNG KẾT TOÀN BỘ HỆ THỐNG: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log(`  - Phần 1 (Kiểm định tĩnh tệp dữ liệu & cấu trúc): ${staticPassed} tiêu chí`);
  console.log(`  - Phần 2 (Kiểm thử hành vi API, RBAC & nghiệp vụ): ${apiPassed} tiêu chí`);
  console.log(`  - Phần 3 (Kiểm thử Backup & Safe Restore độc lập): ${backupPassed} tiêu chí`);
  console.log("================================================================");

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Lỗi khi chạy bộ kiểm thử:", err);
  process.exit(1);
});
