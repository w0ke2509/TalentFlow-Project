import express from 'express';
import {
  login,
  getDashboardStats,
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
  getDepartments,
  createDepartment,
  getApplications,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
  getInterviews,
  createInterview,
  updateInterview,
  deleteInterview,
  getReports,
  getEmployees,
  createEmployee,
  convertCandidateToEmployee,
  updateEmployee,
  deleteEmployee,
  updateDepartment,
  deleteDepartment,
  getExplainPlan
} from '../controllers/index.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// 1. PUBLIC ROUTES
// ============================================================================
// Đăng nhập hệ thống (kiểm tra email, password, phân quyền sơ bộ)
router.post('/auth/login', login);

// ============================================================================
// 2. PROTECTED ROUTES (Yêu cầu Token xác thực hợp lệ)
// ============================================================================
router.use(authenticateToken);

// --- 2.1. Dashboard & Thống kê ---
router.get('/dashboard', authorizeRoles('admin', 'hr', 'interviewer'), getDashboardStats);

// --- 2.2. Báo cáo Chuyên sâu & Explain Plan (Admin / HR) ---
router.get('/reports', authorizeRoles('admin', 'hr'), getReports);
router.get('/mingo/explain', authorizeRoles('admin', 'hr'), getExplainPlan);

// --- 2.3. Phòng ban (Departments) ---
router.get('/departments', authorizeRoles('admin', 'hr', 'interviewer'), getDepartments);
router.post('/departments', authorizeRoles('admin', 'hr'), createDepartment);
router.put('/departments/:id', authorizeRoles('admin', 'hr'), updateDepartment);
router.delete('/departments/:id', authorizeRoles('admin'), deleteDepartment);

// --- 2.4. Vị trí tuyển dụng (Positions) ---
router.get('/positions', authorizeRoles('admin', 'hr', 'interviewer'), getPositions);
router.post('/positions', authorizeRoles('admin', 'hr'), createPosition);
router.put('/positions/:id', authorizeRoles('admin', 'hr'), updatePosition);
router.delete('/positions/:id', authorizeRoles('admin'), deletePosition);

// --- 2.5. Hồ sơ ứng viên (Candidates) ---
router.get('/candidates', authorizeRoles('admin', 'hr', 'interviewer'), getCandidates);
router.post('/candidates', authorizeRoles('admin', 'hr'), createCandidate);
router.put('/candidates/:id', authorizeRoles('admin', 'hr'), updateCandidate);
router.delete('/candidates/:id', authorizeRoles('admin'), deleteCandidate);

// --- 2.6. Quy trình tuyển dụng & Kanban (Applications) ---
// Interviewer được phép đọc applications để nạp thông tin thí sinh cho lịch phỏng vấn
router.get('/applications', authorizeRoles('admin', 'hr', 'interviewer'), getApplications);
router.post('/applications', authorizeRoles('admin', 'hr'), createApplication);
router.patch('/applications/:id/status', authorizeRoles('admin', 'hr'), updateApplicationStatus);
router.put('/applications/:id/status', authorizeRoles('admin', 'hr'), updateApplicationStatus);
router.put('/applications/:id', authorizeRoles('admin', 'hr'), updateApplicationStatus);
router.delete('/applications/:id', authorizeRoles('admin'), deleteApplication);

// --- 2.7. Phỏng vấn (Interviews) ---
router.get('/interviews', authorizeRoles('admin', 'hr', 'interviewer'), getInterviews);
router.post('/interviews', authorizeRoles('admin', 'hr'), createInterview);
router.put('/interviews/:id', authorizeRoles('admin', 'hr', 'interviewer'), updateInterview); // Cho phép Interviewer chấm điểm
router.delete('/interviews/:id', authorizeRoles('admin', 'hr'), deleteInterview);

// --- 2.8. Quản trị nhân sự (Employees) ---
router.get('/employees', authorizeRoles('admin', 'hr'), getEmployees);
router.post('/employees', authorizeRoles('admin', 'hr'), createEmployee);
router.post('/employees/convert', authorizeRoles('admin', 'hr'), convertCandidateToEmployee);
router.put('/employees/:id', authorizeRoles('admin', 'hr'), updateEmployee);
router.delete('/employees/:id', authorizeRoles('admin'), deleteEmployee);

export default router;
