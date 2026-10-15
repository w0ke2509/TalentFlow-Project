import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Employee from '../models/Employee.js';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    throw new Error('LỖI CẤU HÌNH: JWT_SECRET chưa được thiết lập trong biến môi trường. Vui lòng kiểm tra file .env hoặc cấu hình TEST.');
  }
  return secret.trim();
};

export const generateToken = (payload, options = {}) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(payload, secret, { expiresIn, ...options });
};

export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.'
      });
    }

    const parts = authHeader.trim().split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      return res.status(401).json({
        success: false,
        message: 'Định dạng token không hợp lệ (chuẩn: Bearer <token>).'
      });
    }

    const token = parts[1];
    const secret = getJwtSecret();

    jwt.verify(token, secret, async (err, decoded) => {
      if (err) {
        const isExpired = err.name === 'TokenExpiredError';
        return res.status(401).json({
          success: false,
          code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
          message: isExpired
            ? 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
            : 'Token xác thực không hợp lệ.'
        });
      }

      try {
        // QA Yêu cầu 1: Bắt buộc JWT phải chứa `id` hợp lệ. Tuyệt đối không dùng `req.user = decoded` làm fallback
        if (!decoded || !decoded.id || typeof decoded.id !== 'string' || !mongoose.Types.ObjectId.isValid(decoded.id)) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'Token không hợp lệ hoặc thiếu thông tin định danh người dùng (id).'
          });
        }

        const currentEmployee = await Employee.findById(decoded.id).select('role status fullName email');
        if (!currentEmployee) {
          return res.status(401).json({
            success: false,
            code: 'USER_NOT_FOUND',
            message: 'Tài khoản liên kết với token này không tồn tại hoặc đã bị xóa.'
          });
        }

        if (currentEmployee.status === 'resigned') {
          return res.status(403).json({
            success: false,
            code: 'USER_INACTIVE',
            message: 'Tài khoản nhân viên đã ngừng hoạt động.'
          });
        }

        // Cập nhật req.user theo thông tin thực tế mới nhất từ database (phản ánh role hiện tại)
        req.user = {
          id: currentEmployee._id.toString(),
          email: currentEmployee.email,
          role: currentEmployee.role,
          fullName: currentEmployee.fullName,
          status: currentEmployee.status
        };

        next();
      } catch (dbError) {
        return res.status(500).json({
          success: false,
          message: 'Lỗi kiểm tra trạng thái tài khoản: ' + dbError.message
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi kiểm tra xác thực hệ thống.'
    });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực danh tính người dùng.'
      });
    }

    // Nhân viên thông thường (employee) bị chặn toàn diện trên toàn bộ phân hệ ATS
    if (req.user.role === 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản nhân viên thông thường không có quyền truy cập vào phân hệ Quản lý Tuyển dụng TalentFlow ATS.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Quyền truy cập bị từ chối. Vai trò [${req.user.role}] không được phép thực hiện hành động này.`
      });
    }

    next();
  };
};
