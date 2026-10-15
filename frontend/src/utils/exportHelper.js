import * as XLSX from 'xlsx';

// Định dạng tiền tệ VNĐ: 32000000 -> "32.000.000 VNĐ"
export const formatVND = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "0 VNĐ";
  return Number(amount).toLocaleString("vi-VN") + " VNĐ";
};

// Định dạng ngày tháng: ISO Date -> "DD/MM/YYYY"
export const formatDateVN = (dateInput) => {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Tự động tính toán độ rộng tối ưu cho từng cột trong file Excel (.xlsx)
const calculateAutoColumnWidths = (headers, dataRows) => {
  return headers.map((header, colIdx) => {
    let maxLen = header ? header.toString().length : 10;
    dataRows.forEach((row) => {
      const cellVal = row[colIdx];
      if (cellVal !== undefined && cellVal !== null) {
        const strVal = cellVal.toString();
        if (strVal.length > maxLen) {
          maxLen = strVal.length;
        }
      }
    });
    // Độ rộng tối thiểu 12, tối đa 50, cộng thêm 4 ký tự đệm (padding)
    return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
  });
};

/**
 * 1. XUẤT DANH SÁCH NHÂN VIÊN RA FILE EXCEL (.xlsx)
 * Tự động căn chỉnh độ rộng cột, định dạng tiền tệ và ngày tháng chuẩn xác
 */
export const exportEmployeesData = (employees) => {
  if (!employees || employees.length === 0) {
    throw new Error('Không có dữ liệu nhân viên để xuất');
  }

  const exportTime = new Date().toLocaleString('vi-VN');
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const ROLE_MAP = {
    admin: 'Quản trị',
    hr: 'Nhân sự',
    interviewer: 'Trưởng phòng',
    employee: 'Nhân viên'
  };
  const STATUS_MAP = {
    active: 'Chính thức',
    probation: 'Thử việc',
    resigned: 'Đã nghỉ'
  };

  const headers = [
    'STT',
    'Họ và tên',
    'Email',
    'Phòng ban',
    'Vị trí công việc',
    'Vai trò',
    'Lương chính thức',
    'Ngày vào làm',
    'Trạng thái'
  ];

  const dataRows = employees.map((e, index) => {
    const deptName = e.departmentId?.name || 'Chưa phân bổ';
    const posTitle = e.positionId?.title || 'Chưa phân bổ';
    const roleLabel = ROLE_MAP[e.role] || 'Nhân viên';
    const statusLabel = STATUS_MAP[e.status] || e.status || 'Chính thức';
    const salaryFormatted = formatVND(e.officialSalary);
    const startDateFormatted = formatDateVN(e.startDate);

    return [
      index + 1,
      e.fullName || '',
      e.email || '',
      deptName,
      posTitle,
      roleLabel,
      salaryFormatted,
      startDateFormatted,
      statusLabel
    ];
  });

  const wb = XLSX.utils.book_new();
  const titleRows = [
    ['HỆ THỐNG QUẢN LÝ TUYỂN DỤNG TALENTFLOW ATS'],
    ['DANH SÁCH NHÂN SỰ & PHÂN QUYỀN HỆ THỐNG'],
    [`Thời gian xuất: ${exportTime}  |  Tổng số: ${employees.length} nhân sự`],
    [] // Hàng trống phân cách
  ];

  const allSheetData = [...titleRows, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allSheetData);

  // Căn chỉnh độ rộng cột chuyên nghiệp
  const colWidths = calculateAutoColumnWidths(headers, dataRows);
  colWidths[0] = { wch: 8 }; // Cột STT
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách nhân sự');
  XLSX.writeFile(wb, `danh_sach_nhan_vien_${dateSuffix}.xlsx`);
};

/**
 * 2. XUẤT HỒ SƠ ỨNG VIÊN RA FILE EXCEL (.xlsx)
 * Đảm bảo số điện thoại luôn giữ nguyên số 0 đầu, không bao giờ bị lỗi 9.09E+08
 */
export const exportCandidatesData = (candidates) => {
  if (!candidates || candidates.length === 0) {
    throw new Error('Không có dữ liệu ứng viên để xuất');
  }

  const exportTime = new Date().toLocaleString('vi-VN');
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const STATUS_MAP = {
    applied: 'Mới nộp',
    screening: 'Sơ loại CV',
    interview: 'Phỏng vấn',
    offered: 'Gửi đề nghị',
    hired: 'Đã tuyển dụng',
    rejected: 'Không phù hợp'
  };

  const headers = [
    'STT',
    'Họ và tên',
    'Email',
    'Số điện thoại',
    'Kinh nghiệm',
    'Trình độ học vấn',
    'Kỹ năng chuyên môn',
    'Trạng thái ứng tuyển'
  ];

  const dataRows = candidates.map((c, index) => {
    const statusLabel = STATUS_MAP[c.currentStatus] || c.currentStatus || 'Mới nộp';
    const expLabel = `${c.experienceYears || 0} năm`;
    const skillsLabel = (c.skills || []).join(', ');
    const phoneStr = c.phone || 'N/A';

    return [
      index + 1,
      c.fullName || '',
      c.email || '',
      phoneStr,
      expLabel,
      c.education || 'N/A',
      skillsLabel,
      statusLabel
    ];
  });

  const wb = XLSX.utils.book_new();
  const titleRows = [
    ['HỆ THỐNG QUẢN LÝ TUYỂN DỤNG TALENTFLOW ATS'],
    ['DANH SÁCH HỒ SƠ ỨNG VIÊN TIỀM NĂNG'],
    [`Thời gian xuất: ${exportTime}  |  Tổng số: ${candidates.length} ứng viên`],
    []
  ];

  const allSheetData = [...titleRows, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allSheetData);

  // Ép kiểu ô số điện thoại (Cột D, index 3) thành Chuỗi (Text) để Excel không biến thành 9.09E+08
  const startRow = titleRows.length + 1; // Hàng bắt đầu của data
  for (let r = startRow; r <= startRow + dataRows.length; r++) {
    const cellRef = `D${r}`;
    if (ws[cellRef]) {
      ws[cellRef].t = 's'; // Kiểu chuỗi ký tự
    }
  }

  const colWidths = calculateAutoColumnWidths(headers, dataRows);
  colWidths[0] = { wch: 8 }; // STT
  colWidths[3] = { wch: 18 }; // Số điện thoại
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách ứng viên');
  XLSX.writeFile(wb, `danh_sach_ung_vien_${dateSuffix}.xlsx`);
};

/**
 * 3. XUẤT BÁO CÁO TỔNG HỢP RA FILE EXCEL (.xlsx)
 * Tự động tạo 3 sheet riêng biệt: Vị trí, Kênh nguồn ROI, Top kỹ năng
 */
export const exportReportsData = (reportData) => {
  if (!reportData) {
    throw new Error('Không có dữ liệu báo cáo để xuất');
  }

  const exportTime = new Date().toLocaleString('vi-VN');
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Hiệu quả theo Vị trí tuyển dụng
  if (reportData.candidatesByPosition && reportData.candidatesByPosition.length > 0) {
    const posHeaders = ['STT', 'Vị trí công việc', 'Số lượng ứng viên', 'Điểm phỏng vấn trung bình'];
    const posRows = reportData.candidatesByPosition.map((item, idx) => [
      idx + 1,
      item.positionTitle || 'N/A',
      item.totalCandidates || 0,
      item.avgScore ? Number(item.avgScore).toFixed(1) : 'Chưa có'
    ]);
    const s1Data = [
      ['BÁO CÁO HIỆU QUẢ TUYỂN DỤNG THEO VỊ TRÍ'],
      [`Thời gian xuất: ${exportTime}`],
      [],
      posHeaders,
      ...posRows
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(s1Data);
    ws1['!cols'] = calculateAutoColumnWidths(posHeaders, posRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Theo vị trí');
  }

  // Sheet 2: Hiệu quả Kênh nguồn (Source ROI)
  if (reportData.sourceRoi && reportData.sourceRoi.length > 0) {
    const roiHeaders = ['STT', 'Kênh nguồn', 'Tổng hồ sơ', 'Đã tuyển dụng', 'Tỷ lệ chuyển đổi (%)', 'Điểm TB'];
    const roiRows = reportData.sourceRoi.map((item, idx) => [
      idx + 1,
      item.source || 'N/A',
      item.totalCandidates || 0,
      item.hiredCandidates || 0,
      `${item.conversionRate || 0}%`,
      item.avgScore ? Number(item.avgScore).toFixed(1) : 'Chưa có'
    ]);
    const s2Data = [
      ['BÁO CÁO ĐO LƯỜNG ROI KÊNH NGUỒN TUYỂN DỤNG'],
      [`Thời gian xuất: ${exportTime}`],
      [],
      roiHeaders,
      ...roiRows
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(s2Data);
    ws2['!cols'] = calculateAutoColumnWidths(roiHeaders, roiRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'ROI Kênh nguồn');
  }

  // Sheet 3: Top Kỹ năng
  if (reportData.topSkills && reportData.topSkills.length > 0) {
    const skillHeaders = ['STT', 'Kỹ năng chuyên môn', 'Số lượng ứng viên đáp ứng'];
    const skillRows = reportData.topSkills.map((item, idx) => [
      idx + 1,
      item._id || 'N/A',
      item.count || 0
    ]);
    const s3Data = [
      ['TOP KỸ NĂNG CHUYÊN MÔN NỔI BẬT CỦA ỨNG VIÊN'],
      [`Thời gian xuất: ${exportTime}`],
      [],
      skillHeaders,
      ...skillRows
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(s3Data);
    ws3['!cols'] = calculateAutoColumnWidths(skillHeaders, skillRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Top Kỹ năng');
  }

  XLSX.writeFile(wb, `bao_cao_tuyen_dung_${dateSuffix}.xlsx`);
};
