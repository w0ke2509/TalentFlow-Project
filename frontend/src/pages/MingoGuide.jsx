import React, { useState } from 'react';
import { 
  Database, 
  Layers, 
  Copy, 
  Check, 
  Zap, 
  Cpu, 
  Search, 
  RefreshCw, 
  FileCode, 
  Play
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

const comparisonCriteria = [
  {
    criterion: 'Kiến trúc phần mềm & Công nghệ cốt lõi',
    compass: 'Cần đối chiếu thông tin kiến trúc từ tài liệu chính thức.',
    mingo: 'Cần đối chiếu thông tin kiến trúc từ tài liệu chính thức.',
    winner: 'tie'
  },
  {
    criterion: 'Mức độ chiếm dụng bộ nhớ (RAM Consumption)',
    compass: 'Chưa đo trên cùng môi trường và dữ liệu.',
    mingo: 'Chưa đo trên cùng môi trường và dữ liệu.',
    winner: 'tie'
  },
  {
    criterion: 'Duyệt quan hệ tham chiếu (Smart Relations)',
    compass: 'Không tự động nhận diện khóa ngoại. Phải copy ObjectId thủ công sang collection khác để find().',
    mingo: 'Tính năng Smart Relations nhận diện ObjectId liên kết, cho phép click mở thẳng document liên quan.',
    winner: 'mingo'
  },
  {
    criterion: 'Xây dựng Aggregation Pipeline',
    compass: 'Trình dựng Aggregation Builder trực quan tiêu chuẩn, xem trước kết quả từng stage.',
    mingo: 'Aggregation Builder mạnh mẽ, chia tách các stage rõ ràng, hỗ trợ xuất code ra nhiều ngôn ngữ.',
    winner: 'tie'
  },
  {
    criterion: 'Phân tích lược đồ (Schema Analyzer)',
    compass: 'Lấy mẫu (sampling) để vẽ biểu đồ phân bố kiểu dữ liệu các trường.',
    mingo: 'Phân tích cấu trúc trực quan, cảnh báo nhanh các trường không đồng nhất kiểu dữ liệu (data anomalies).',
    winner: 'tie'
  },
  {
    criterion: 'Đồng bộ hai chiều với Web App (Two-Way Sync)',
    compass: 'Cập nhật document cần nhấn Apply, thời gian làm mới phụ thuộc vào chu kỳ polling.',
    mingo: 'Hỗ trợ chỉnh sửa inline tức thì trên bảng (In-place editing), đồng bộ thẳng vào MongoDB server.',
    winner: 'mingo'
  },
  {
    criterion: 'Hỗ trợ định dạng & Kiểu dữ liệu BSON phong phú',
    compass: 'Hỗ trợ chuẩn EJSON (Extended JSON), ObjectId, Date, Long, Double, Decimal128.',
    mingo: 'Hỗ trợ đầy đủ các kiểu BSON, hiển thị kiểu dữ liệu trực quan ngay tại thanh trạng thái.',
    winner: 'tie'
  }
];

const testScenarios = [
  {
    id: 1,
    category: 'Cơ bản & Kết nối',
    title: 'Kịch bản 1: Thiết lập & Kiểm thử kết nối tới MongoDB',
    objective: 'Xác thực chuỗi kết nối URI và kiểm tra độ trễ mạng tới cụm MongoDB.',
    explanation: 'Mở Mingo $\\rightarrow$ Add Connection $\\rightarrow$ Nhập Connection String `mongodb://localhost:27017` hoặc Atlas URI. Kiểm tra danh sách database hiển thị đầy đủ database `recruitment_db`.',
    query: `// Kiểm tra ping kết nối trong MongoDB Shell / Mingo Console
db.runCommand({ ping: 1 });`,
    expected: '{ ok: 1 } với độ trễ phản hồi < 5ms.'
  },
  {
    id: 2,
    category: 'Cơ bản & Kết nối',
    title: 'Kịch bản 2: Phân tích lược đồ (Schema Analyzer) collection candidates',
    objective: 'Kiểm tra tỷ lệ hiện diện của các trường và phát hiện các trường dị thường.',
    explanation: 'Chọn collection `candidates` trên sidebar $\\rightarrow$ Chọn tab Analyze / Schema. Quan sát các trường `fullName`, `email`, `skills` (Array), và `experience` (Array of Objects).',
    query: `// Xem thông tin thống kê kích thước collection
db.candidates.stats();`,
    expected: 'Hiển thị 100% tài liệu có đầy đủ các trường chính; không phát hiện sai lệch kiểu dữ liệu.'
  },
  {
    id: 3,
    category: 'Schema Linh Hoạt & Dữ Liệu Nhúng',
    title: 'Kịch bản 3: Kiểm chứng tính linh hoạt Schema (Flexible Schema)',
    objective: 'Bổ sung trường dữ liệu mới (custom fields) mà không làm gián đoạn hệ thống.',
    explanation: 'Thêm trường `githubProfile` và `portfolioUrl` vào một hồ sơ ứng viên bất kỳ trên Mingo. Quan sát Web App vẫn đọc và xử lý bình thường mà không cần thay đổi DDL bảng như CSDL quan hệ.',
    query: `db.candidates.updateOne(
  { email: "nguyenvanan.dev@gmail.com" },
  { 
    $set: { 
      githubProfile: "https://github.com/annguyen",
      portfolioUrl: "https://annguyen.dev" 
    } 
  }
);`,
    expected: 'Document được cập nhật ngay lập tức; các ứng viên khác không bị ảnh hưởng.'
  },
  {
    id: 4,
    category: 'Schema Linh Hoạt & Dữ Liệu Nhúng',
    title: 'Kịch bản 4: Truy vấn trên mảng Document nhúng (Embedded Experience)',
    objective: 'Tìm kiếm ứng viên có lịch sử từng công tác tại một công ty hoặc vị trí cụ thể.',
    explanation: 'Sử dụng toán tử `$elemMatch` hoặc dot notation `experience.company` để quét sâu vào mảng kinh nghiệm lồng nhau mà không cần thực hiện phép JOIN đắt đỏ.',
    query: `// Tìm ứng viên từng làm vị trí Senior Developer tại FPT Software
db.candidates.find({
  experience: {
    $elemMatch: {
      company: /FPT Software/i,
      position: /Senior/i
    }
  }
}).project({ fullName: 1, experience: 1 });`,
    expected: 'Trả về các document thỏa mãn điều kiện mảng con với thời gian thực thi < 2ms.'
  },
  {
    id: 5,
    category: 'Quan Hệ Tham Chiếu (Referencing)',
    title: 'Kịch bản 5: Smart Relations - Duyệt từ Hồ Sơ Ứng Tuyển sang Ứng Viên',
    objective: 'Kiểm chứng khả năng mở liên kết khóa ngoại ObjectId trong Mingo chỉ bằng 1 cú nhấp chuột.',
    explanation: 'Mở collection `applications` $\\rightarrow$ Di chuột vào trường `candidateId` $\\rightarrow$ Biểu tượng Smart Relations xuất hiện $\\rightarrow$ Click để nhảy trực tiếp tới document chi tiết trong collection `candidates`.',
    query: `// Truy vấn tương đương trong MongoDB Shell
var app = db.applications.findOne({ status: "interview" });
db.candidates.findOne({ _id: app.candidateId });`,
    expected: 'Document ứng viên tương ứng được mở ngay trong tab phụ của Mingo mà không cần thao tác copy-paste ID.'
  },
  {
    id: 6,
    category: 'Quan Hệ Tham Chiếu (Referencing)',
    title: 'Kịch bản 6: Smart Relations - Duyệt từ Hồ Sơ sang Vị Trí Tuyển Dụng',
    objective: 'Kiểm tra mối quan hệ N:1 giữa bảng `applications` và `positions`.',
    explanation: 'Trong collection `applications`, click vào trường `positionId` để xem chi tiết mức lương, yêu cầu tuyển dụng và phòng ban của vị trí việc làm đó.',
    query: `// Kiểm tra tính toàn vẹn tham chiếu (Referential Integrity Check)
db.applications.aggregate([
  {
    $lookup: {
      from: "positions",
      localField: "positionId",
      foreignField: "_id",
      as: "job"
    }
  },
  { $match: { job: { $size: 0 } } } // Tìm các application mồ côi (nếu có)
]);`,
    expected: 'Kết quả mồ côi trả về rỗng (0 documents), chứng minh tính toàn vẹn tham chiếu được bảo toàn.'
  },
  {
    id: 7,
    category: 'Aggregation Pipelines',
    title: 'Kịch bản 7: Pipeline thống kê số lượng hồ sơ theo trạng thái tuyển dụng',
    objective: 'Tổng hợp phân bố hồ sơ qua 6 giai đoạn tuyển dụng bằng toán tử `$group`.',
    explanation: 'Mở Aggregation Builder trên Mingo $\\rightarrow$ Thêm stage `$group` gom nhóm theo trường `status` và đếm tổng số.',
    query: `db.applications.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
]);`,
    expected: 'Trả về bảng thống kê số lượng từng giai đoạn: applied, screening, interview, offer, hired, rejected.'
  },
  {
    id: 8,
    category: 'Aggregation Pipelines',
    title: 'Kịch bản 8: Pipeline thống kê ứng viên theo Vị trí việc làm ($lookup)',
    objective: 'Kết hợp hai collection phân tán `applications` và `positions` qua toán tử `$lookup`.',
    explanation: 'Tương đương phép LEFT OUTER JOIN trong SQL nhưng trả về tài liệu BSON có nhúng thông tin vị trí.',
    query: `db.applications.aggregate([
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
      positionTitle: "$position.title",
      totalCandidates: 1,
      avgScore: { $round: ["$avgScore", 1] }
    }
  },
  { $sort: { totalCandidates: -1 } }
]);`,
    expected: 'Danh sách các vị trí đi kèm tên công việc rõ ràng và điểm số phỏng vấn trung bình.'
  },
  {
    id: 9,
    category: 'Aggregation Pipelines',
    title: 'Kịch bản 9: Pipeline bóc tách mảng kỹ năng và tìm Top Kỹ Năng ($unwind)',
    objective: 'Dùng `$unwind` để phân rã mảng `skills` của từng ứng viên thành các document độc lập trước khi gom nhóm.',
    explanation: 'Mô hình hóa dữ liệu 1-N lồng nhau và trích xuất tần suất xuất hiện của từng từ khóa công nghệ.',
    query: `db.candidates.aggregate([
  { $unwind: "$skills" },
  {
    $group: {
      _id: "$skills",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);`,
    expected: 'Xếp hạng top 10 công nghệ phổ biến nhất (ví dụ: React, Node.js, MongoDB, TypeScript).'
  },
  {
    id: 10,
    category: 'Aggregation Pipelines',
    title: 'Kịch bản 10: Phân khoảng số năm kinh nghiệm bằng toán tử gom cụm ($bucket)',
    objective: 'Phân nhóm ứng viên vào các dải năm kinh nghiệm [0-1), [1-3), [3-5), [5-10), [10+).',
    explanation: 'Thay thế các câu lệnh CASE WHEN rườm rà trong RDBMS bằng toán tử `$bucket` nguyên bản của MongoDB.',
    query: `db.candidates.aggregate([
  {
    $bucket: {
      groupBy: "$experienceYears",
      boundaries: [0, 1, 3, 5, 10],
      default: "10+ năm",
      output: {
        count: { $sum: 1 },
        candidates: { $push: "$fullName" }
      }
    }
  }
]);`,
    expected: 'Các nhóm phân bố kinh nghiệm rõ ràng, kèm danh sách ứng viên thuộc từng nhóm.'
  },
  {
    id: 11,
    category: 'Đồng Bộ Hai Chiều',
    title: 'Kịch bản 11: Kiểm nghiệm tính nhất quán dữ liệu hai chiều (Two-Way Sync)',
    objective: 'Chứng minh dữ liệu thay đổi trên Web App phản ánh tức thì trên Mingo và ngược lại.',
    explanation: 'Thêm mới một ứng viên trên Web App $\\rightarrow$ Mở Mingo kiểm tra Document xuất hiện. Sau đó sửa email trên Mingo $\\rightarrow$ Nhấn Refresh trên Web App để kiểm tra tính nhất quán.',
    query: `// Query kiểm tra document vừa sửa đổi trên Mingo
db.candidates.find({ email: /updated/i }).sort({ updatedAt: -1 }).limit(1);`,
    expected: 'Dữ liệu được cập nhật chuẩn xác không có độ trễ phân tán (Zero-Delay Consistency).'
  }
];

const MingoGuide = () => {
  const [activeTab, setActiveTab] = useState('benchmarks');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState(null);
  const toast = useToast();

  const handleRunExplain = async (type = 'compound_index', keyword = 'React') => {
    try {
      setExplainLoading(true);
      const res = await api.getExplainPlan({ type, keyword });
      if (res.success) {
        setExplainResult(res);
        toast.success(`Đã thực thi Explain Plan (${res.stage}) thành công!`);
      }
    } catch (err) {
      toast.error('Lỗi khi chạy Explain Plan: ' + err.message);
    } finally {
      setExplainLoading(false);
    }
  };

  const handleCopy = (id, query) => {
    navigator.clipboard.writeText(query);
    setCopiedId(id);
    toast.success('Đã sao chép câu lệnh MongoDB vào bộ nhớ tạm!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const categories = ['all', 'Cơ bản & Kết nối', 'Schema Linh Hoạt & Dữ Liệu Nhúng', 'Quan Hệ Tham Chiếu (Referencing)', 'Aggregation Pipelines', 'Đồng Bộ Hai Chiều'];

  const filteredScenarios = selectedCategory === 'all' 
    ? testScenarios 
    : testScenarios.filter(s => s.category === selectedCategory);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Database className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Thực Nghiệm & Khai Thác Mingo
              </h2>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Hướng dẫn Mingo · Chưa xác minh kết nối
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'benchmarks'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Đối Chuẩn Hiệu Năng (RAM & Độ Trễ)
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          Ma Trận Đối Chiếu Mingo vs Compass
        </button>

        <button
          onClick={() => setActiveTab('scenarios')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'scenarios'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <FileCode className="w-4 h-4" />
          11 Kịch Bản Thực Nghiệm Thực Tế
        </button>

        <button
          onClick={() => setActiveTab('twoway')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'twoway'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Thử Nghiệm Đồng Bộ Hai Chiều (Playground)
        </button>

        <button
          onClick={() => setActiveTab('explain')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'explain'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          Kế Hoạch Thực Thi (Explain Plan Live)
        </button>
      </div>

      {/* TAB 1: BENCHMARKS & HARDWARE COMPARISON */}
      {activeTab === 'benchmarks' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3">
          <h3 className="text-base font-bold text-amber-950">Chưa có số liệu đối chuẩn Mingo</h3>
          <p className="text-sm text-amber-900">
            Nhóm chưa đo RAM và thời gian khởi động của Mingo và MongoDB Compass trên cùng máy, cùng dữ liệu.
            Các con số sẽ được bổ sung sau khi chạy thí nghiệm và ghi lại phương pháp đo.
          </p>
          <p className="text-xs text-amber-800">Có thể xem quy trình và truy vấn ở các tab bên cạnh. Tab Explain Plan lấy kết quả từ MongoDB của dự án, không phải từ Mingo.</p>
        </div>
      )}

      {/* TAB 2: COMPARISON MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Ma Trận So Sánh Tính Năng Giữa Mingo và MongoDB Compass (Chương 2.5 & 5.6)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bảng phân tích đối chiếu chuyên sâu các tiêu chuẩn quản trị CSDL NoSQL
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              7 Tiêu Chí Đánh Giá
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-5 w-1/4">Tiêu Chí Đánh Giá</th>
                  <th className="py-3.5 px-5 w-3/8 text-slate-700">MongoDB Compass (Official GUI)</th>
                  <th className="py-3.5 px-5 w-3/8 text-indigo-700 bg-indigo-50/30">Mingo (Lightweight Client)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {comparisonCriteria.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5 font-semibold text-slate-900 align-top">
                      {item.criterion}
                    </td>
                    <td className="py-4 px-5 leading-relaxed align-top text-slate-600">
                      {item.compass}
                    </td>
                    <td className="py-4 px-5 leading-relaxed align-top text-slate-800 bg-indigo-50/20 font-medium">
                      <div className="flex items-start gap-2">
                        {item.winner === 'mingo' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                            Ưu việt
                          </span>
                        )}
                        <span>{item.mingo}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 11 TEST SCENARIOS */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat === 'all' ? 'Tất cả 11 kịch bản' : cat}
              </button>
            ))}
          </div>

          {/* Scenarios List */}
          <div className="space-y-4">
            {filteredScenarios.map((sc) => (
              <div 
                key={sc.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-indigo-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold font-mono">
                        #{sc.id}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-semibold">
                        {sc.category}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-base">{sc.title}</h4>
                  </div>

                  <button
                    onClick={() => handleCopy(sc.id, sc.query)}
                    className="self-start px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    {copiedId === sc.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sao chép Query</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 mb-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-800">Mục tiêu kiểm thử:</span>
                    <p className="mt-0.5 leading-relaxed">{sc.objective}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Cách thao tác trên Mingo:</span>
                    <p className="mt-0.5 leading-relaxed">{sc.explanation}</p>
                  </div>
                </div>

                {/* MongoDB Query Block */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1 px-1">
                    <span>MongoDB Query / Pipeline:</span>
                  </div>
                  <pre className="p-3.5 bg-slate-900 text-indigo-300 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 shadow-inner">
                    {sc.query}
                  </pre>
                </div>

                <div className="mt-3 flex items-start gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span className="font-bold text-emerald-700 shrink-0">Kết quả kỳ vọng:</span>
                  <span className="text-slate-700">{sc.expected}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TWO-WAY SYNC PLAYGROUND */}
      {activeTab === 'twoway' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-600" />
              Quy Trình Kiểm Nghiệm Đồng Bộ Hai Chiều (Bidirectional Synchronization)
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Minh chứng sự phối hợp chặt chẽ giữa ứng dụng Web giao diện người dùng và công cụ quản trị CSDL Mingo qua 4 bước khép kín
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Step 1 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between relative">
                <div>
                  <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs mb-3">
                    1
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">Tạo Dữ Liệu Trên Web</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Vào tab <strong>Ứng viên</strong> hoặc <strong>Hồ sơ tuyển dụng</strong> trên Web App, nhấn nút Thêm mới và tạo một bản ghi thử nghiệm.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                  <span>Web App $\rightarrow$ API $\rightarrow$ MongoDB</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between relative">
                <div>
                  <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs mb-3">
                    2
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">Kiểm Tra Trên Mingo</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Mở Mingo, chọn collection tương ứng. Bản ghi mới xuất hiện ngay với đầy đủ trường dữ liệu nhúng và ObjectId tự sinh.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span>Mingo đọc dữ liệu tức thì</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between relative">
                <div>
                  <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs mb-3">
                    3
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">Chỉnh Sửa Trên Mingo</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dùng tính năng In-place Edit của Mingo nhấp đúp vào ô họ tên hoặc số điện thoại, sửa giá trị mới và lưu lại.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                  <span>Mingo write directly to MongoDB</span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between relative">
                <div>
                  <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs mb-3">
                    4
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">Xác Nhận Trên Web</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Trở lại giao diện Web App, nhấn nút <strong>Làm mới</strong> hoặc chuyển trang. Dữ liệu mới sửa đổi trên Mingo được cập nhật ngay lập tức.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                  <span>Tính nhất quán hoàn hảo</span>
                </div>
              </div>
            </div>

            {/* Practical Verification Box */}
            <div className="mt-6 p-4.5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Thao tác nhanh</span>
                <h4 className="text-sm font-bold">Thử nghiệm ngay trên các collection đang hoạt động</h4>
                <p className="text-xs text-slate-300">
                  Hệ thống đang lưu trữ 6 collections: candidates, positions, applications, interviews, departments, employees.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.info('Hãy mở công cụ Mingo trên máy tính và kết nối vào mongodb://localhost:27017 để thực hiện')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Bắt đầu thử nghiệm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE EXPLAIN PLAN (IXSCAN vs COLLSCAN) */}
      {activeTab === 'explain' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Kiểm Chứng Trực Quan Kế Hoạch Thực Thi (Explain Plan)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thực thi phương thức <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600">.explain("executionStats")</code> trực tiếp trên MongoDB để đối chiếu chỉ mục tối ưu
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={explainLoading}
                  onClick={() => handleRunExplain('compound_index')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  {explainLoading ? 'Đang chạy...' : 'Explain Compound Index (Applications)'}
                </button>
                <button
                  disabled={explainLoading}
                  onClick={() => handleRunExplain('text_search', 'React')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  Explain Text Search (Candidates)
                </button>
              </div>
            </div>

            {/* Comparison Cards: IXSCAN vs COLLSCAN Theory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px]">IXSCAN</span>
                  <span>Quét Chỉ Mục (Index Scan) - Tối Ưu Nhất</span>
                </div>
                <p className="text-emerald-900/80 leading-relaxed">
                  MongoDB tìm trực tiếp trong cây B-Tree của Index. <strong>totalDocsExamined = nReturned</strong>. Không phải quét toàn bộ ổ cứng, độ trễ thường &lt; 1ms ngay cả với hàng triệu bản ghi.
                </p>
              </div>

              <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px]">COLLSCAN</span>
                  <span>Quét Toàn Bộ Collection (Table Scan) - Lãng Phí</span>
                </div>
                <p className="text-rose-900/80 leading-relaxed">
                  Thiếu chỉ mục buộc MongoDB phải duyệt từng document một từ đầu đến cuối. <strong>totalDocsExamined = Tổng số documents</strong>, gây ngốn CPU và RAM nghiêm trọng.
                </p>
              </div>
            </div>

            {/* Live Result Display */}
            {explainResult ? (
              <div className="mt-6 space-y-4 animate-in fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold">Stage Thực Thi:</span>
                    <span className="text-base font-extrabold text-indigo-600">{explainResult.stage}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold">Chỉ Mục Áp Dụng:</span>
                    <span className="text-xs font-bold text-slate-800 truncate block" title={explainResult.indexName}>
                      {explainResult.indexName || 'N/A'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold">Tài Liệu Đã Quét:</span>
                    <span className="text-base font-extrabold text-slate-900">{explainResult.totalDocsExamined} docs</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold">Thời Gian Xử Lý:</span>
                    <span className="text-base font-extrabold text-emerald-600">{explainResult.executionTimeMillis} ms</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                    <span>MongoDB Query:</span>
                    <span className="text-emerald-400">{explainResult.summary}</span>
                  </div>
                  <p className="text-indigo-300 font-semibold">{explainResult.queryDescription}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                Nhấn một trong 2 nút bên trên để gửi lệnh Explain trực tiếp tới MongoDB và xem kết quả phân tích executionStats tức thì.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MingoGuide;
