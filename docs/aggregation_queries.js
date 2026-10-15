/**
 * TẬP HỢP CÁC TRUY VẤN VÀ 6 AGGREGATION PIPELINE NÂNG CAO DEMO TRÊN MINGO
 * Hệ thống: TalentFlow ATS - Quản lý Tuyển dụng Nhân viên
 * Database: recruitment_db
 */

// ==============================================================================
// 1. TÌM KIẾM VÀ LỌC CĂN BẢN (QUERY / FILTER)
// ==============================================================================

// 1.1. Tìm ứng viên có ít nhất 2 năm kinh nghiệm và kỹ năng MongoDB:
db.candidates.find({
  experienceYears: { $gte: 2 },
  skills: "MongoDB"
});

// 1.2. Tìm các vị trí tuyển dụng đang mở có mức lương tối đa >= 25 triệu:
db.positions.find({
  status: "open",
  "salary.max": { $gte: 25000000 }
});

// 1.3. Tìm hồ sơ ứng tuyển có điểm đánh giá sơ bộ >= 80:
db.applications.find({
  score: { $gte: 80 }
});

// 1.4. Tìm kiếm toàn văn (Text Search) ứng viên theo từ khóa "Node.js" hoặc "React":
db.candidates.find({
  $text: { $search: "Node.js React" }
});

// ==============================================================================
// 2. TỔNG HỢP 6 AGGREGATION PIPELINES PHỨC TẠP PHỤC VỤ BÁO CÁO & BIỂU ĐỒ
// ==============================================================================

// ------------------------------------------------------------------------------
// PIPELINE 1: THỐNG KÊ ỨNG VIÊN THEO VỊ TRÍ TUYỂN DỤNG ($GROUP, $LOOKUP, $UNWIND)
// ------------------------------------------------------------------------------
db.applications.aggregate([
  {
    $group: {
      _id: "$positionId",
      totalCandidates: { $sum: 1 },
      avgScore: { $avg: "$score" }
    }
  },
  {
    $lookup: {
      from: "positions",
      localField: "_id",
      foreignField: "_id",
      as: "position"
    }
  },
  { $unwind: "$position" },
  {
    $project: {
      _id: 1,
      positionTitle: "$position.title",
      totalCandidates: 1,
      avgScore: { $round: ["$avgScore", 1] }
    }
  },
  { $sort: { totalCandidates: -1 } }
]);

// ------------------------------------------------------------------------------
// PIPELINE 2: TỶ LỆ CHUYỂN ĐỔI PHỄU TUYỂN DỤNG ($GROUP + $PROJECT)
// ------------------------------------------------------------------------------
db.applications.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      hired: { $sum: { $cond: [{ $eq: ["$status", "hired"] }, 1, 0] } },
      interviewed: { $sum: { $cond: [{ $in: ["$status", ["interview", "accepted", "hired"]] }, 1, 0] } },
      rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } }
    }
  },
  {
    $project: {
      _id: 0,
      total: 1,
      interviewed: 1,
      hired: 1,
      rejected: 1,
      hiringRate: {
        $cond: [
          { $gt: ["$total", 0] },
          { $round: [{ $multiply: [{ $divide: ["$hired", "$total"] }, 100] }, 1] },
          0
        ]
      }
    }
  }
]);

// ------------------------------------------------------------------------------
// PIPELINE 3: TOP KỸ NĂNG PHỔ BIẾN NHẤT CỦA ỨNG VIÊN ($UNWIND ARRAY)
// ------------------------------------------------------------------------------
db.candidates.aggregate([
  { $unwind: "$skills" },
  {
    $group: {
      _id: "$skills",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 8 }
]);

// ------------------------------------------------------------------------------
// PIPELINE 4: PHÂN BỐ SỐ NĂM KINH NGHIỆM THEO DẢI ($BUCKET)
// ------------------------------------------------------------------------------
db.candidates.aggregate([
  {
    $bucket: {
      groupBy: "$experienceYears",
      boundaries: [0, 2, 5, 8, 20],
      default: "Other",
      output: {
        count: { $sum: 1 }
      }
    }
  }
]);

// ------------------------------------------------------------------------------
// PIPELINE 5: ĐO LƯỜNG HIỆU QUẢ VÀ ROI KÊNH NGUỒN TUYỂN DỤNG (SOURCE ROI)
// ------------------------------------------------------------------------------
db.applications.aggregate([
  {
    $group: {
      _id: "$source",
      totalCandidates: { $sum: 1 },
      hiredCandidates: {
        $sum: { $cond: [{ $eq: ["$status", "hired"] }, 1, 0] }
      },
      interviewedCount: {
        $sum: { $cond: [{ $in: ["$status", ["interview", "accepted", "hired"]] }, 1, 0] }
      },
      avgScore: { $avg: "$score" }
    }
  },
  {
    $project: {
      _id: 0,
      source: "$_id",
      totalCandidates: 1,
      hiredCandidates: 1,
      interviewedCount: 1,
      avgScore: { $round: [{ $ifNull: ["$avgScore", 0] }, 1] },
      conversionRate: {
        $cond: [
          { $eq: ["$totalCandidates", 0] },
          0,
          {
            $round: [
              { $multiply: [{ $divide: ["$hiredCandidates", "$totalCandidates"] }, 100] },
              1
            ]
          }
        ]
      }
    }
  },
  { $sort: { totalCandidates: -1 } }
]);

// ------------------------------------------------------------------------------
// PIPELINE 6: THỜI GIAN TUYỂN DỤNG TRUNG BÌNH - TIME-TO-HIRE TÍNH THEO NGÀY
// ------------------------------------------------------------------------------
db.applications.aggregate([
  {
    $match: { status: "hired" }
  },
  {
    $project: {
      daysToHire: {
        $divide: [
          { $subtract: ["$updatedAt", "$appliedAt"] },
          86400000 // Chuyển đổi mili-giây sang ngày (1000 * 60 * 60 * 24)
        ]
      }
    }
  },
  {
    $group: {
      _id: null,
      totalHired: { $sum: 1 },
      avgDays: { $avg: "$daysToHire" },
      minDays: { $min: "$daysToHire" },
      maxDays: { $max: "$daysToHire" }
    }
  },
  {
    $project: {
      _id: 0,
      totalHired: 1,
      avgDays: { $round: ["$avgDays", 1] },
      minDays: { $round: ["$minDays", 1] },
      maxDays: { $round: ["$maxDays", 1] }
    }
  }
]);

// ==============================================================================
// 3. TẠO INDEX VÀ THỰC THI EXPLAIN PLAN (IXSCAN VS COLLSCAN)
// ==============================================================================

// 3.1. Tạo Indexes chuẩn hóa
db.candidates.createIndex({ email: 1 }, { unique: true });
db.candidates.createIndex({ fullName: "text", email: "text" });
db.candidates.createIndex({ experienceYears: 1 });
db.candidates.createIndex({ skills: 1 });
db.candidates.createIndex({ currentStatus: 1 });

db.positions.createIndex({ departmentId: 1, status: 1 });
db.applications.createIndex({ positionId: 1, status: 1 });
db.applications.createIndex({ candidateId: 1 });

db.employees.createIndex({ email: 1 }, { unique: true });
db.employees.createIndex({ role: 1, status: 1 });

// 3.2. Kiểm tra kế hoạch thực thi câu truy vấn bằng Explain Plan
// Truy vấn có sử dụng Compound Index (kết quả stage: IXSCAN):
db.applications.find({
  positionId: ObjectId("66dd8f202222222222222201"),
  status: "applied"
}).explain("executionStats");

// Truy vấn toàn văn Text Search (kết quả stage: TEXT_MATCH):
db.candidates.find({
  $text: { $search: "React Node.js" }
}).explain("executionStats");
