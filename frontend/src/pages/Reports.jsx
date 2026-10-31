import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Users, 
  Target, 
  Download, 
  RefreshCw, 
  Code2, 
  CheckCircle2, 
  Clock, 
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import StatCard from '../components/ui/StatCard';
import { useToast } from '../context/ToastContext';
import { exportReportsData } from '../utils/exportHelper';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];

const bucketLabels = {
  0: 'Dưới 1 năm',
  1: '1 - 3 năm',
  3: '3 - 5 năm',
  5: '5 - 10 năm',
  '10+ năm': 'Trên 10 năm'
};

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPipelines, setShowPipelines] = useState(false);
  const toast = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.getReports();
      if (res.success) {
        setReports(res);
      }
    } catch (err) {
      toast.error('Không thể tải dữ liệu báo cáo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportJSON = () => {
    if (!reports) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reports, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `recruitment_report_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Đã xuất file JSON thành công!');
  };

  const handleExportExcel = () => {
    if (!reports) {
      toast.warning('Không có dữ liệu báo cáo để xuất');
      return;
    }
    try {
      exportReportsData(reports);
      toast.success('Đã xuất file báo cáo Excel (.xlsx) thành công!');
    } catch (err) {
      toast.error(err.message || 'Lỗi khi xuất báo cáo');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Đang thực thi các pipeline tổng hợp NoSQL...</p>
      </div>
    );
  }

  const { 
    candidatesByPosition = [], 
    hiringRate = {}, 
    topSkills = [], 
    expDistribution = [],
    sourceRoi = [],
    timeToHire = { avgDays: 0, minDays: 0, maxDays: 0, totalHired: 0 }
  } = reports || {};

  const formattedExp = expDistribution.map(item => ({
    label: bucketLabels[item._id] || `${item._id} năm`,
    count: item.count
  }));

  const totalApps = hiringRate.total || 0;
  const interviewed = hiringRate.interviewed || 0;
  const hired = hiringRate.hired || 0;
  const rate = hiringRate.hiringRate || 0;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Báo Cáo & Phân Tích
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!reports}
            className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Xuất báo cáo tuyển dụng ra file Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất JSON
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Tổng hồ sơ ứng tuyển" 
          value={totalApps} 
          icon={Users} 
          color="indigo" 
          description="Tiếp nhận từ toàn bộ các kênh tuyển dụng"
        />
        <StatCard 
          title="Đã vào vòng phỏng vấn" 
          value={interviewed} 
          icon={Target} 
          color="cyan" 
          description={`${totalApps > 0 ? ((interviewed / totalApps) * 100).toFixed(1) : 0}% vượt qua sơ loại hồ sơ`}
        />
        <StatCard 
          title="Tuyển dụng thành công" 
          value={hired} 
          icon={CheckCircle2} 
          color="emerald" 
          description="Đã tiếp nhận vào biên chế hoặc thử việc"
        />
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-5 rounded-2xl text-white shadow-md shadow-indigo-600/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Tỷ lệ Tuyển dụng</span>
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
              <TrendingUp className="w-5 h-5 text-indigo-100" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight">{rate}%</span>
              <span className="text-xs text-indigo-200">thành công</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(rate, 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Progress Indicator Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
          Phễu chuyển đổi tuyển dụng (Recruitment Conversion Funnel)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-700">1. Tiếp nhận hồ sơ</span>
              <span className="font-bold text-slate-900">{totalApps} (100%)</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full w-full" />
            </div>
          </div>

          <div className="p-3.5 bg-cyan-50/60 border border-cyan-200/80 rounded-xl">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-cyan-900">2. Vào phỏng vấn</span>
              <span className="font-bold text-cyan-900">
                {interviewed} ({totalApps > 0 ? ((interviewed / totalApps) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className="w-full bg-cyan-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-cyan-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${totalApps > 0 ? (interviewed / totalApps) * 100 : 0}%` }} 
              />
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-emerald-900">3. Tuyển dụng thành công</span>
              <span className="font-bold text-emerald-900">{hired} ({rate}%)</span>
            </div>
            <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${rate}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Ứng viên theo Vị trí tuyển dụng */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Số Lượng Ứng Viên Theo Vị Trí
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng hợp từ <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600">$lookup</code> giữa Applications & Positions
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              {candidatesByPosition.length} vị trí
            </span>
          </div>

          <div className="h-72">
            {candidatesByPosition.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Chưa có dữ liệu thống kê vị trí
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={candidatesByPosition} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="positionTitle" type="category" width={140} tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '0.75rem', 
                      border: 'none', 
                      color: '#fff', 
                      fontSize: '12px' 
                    }}
                    formatter={(val, name) => [val, name === 'totalCandidates' ? 'Số ứng viên' : name]}
                  />
                  <Bar dataKey="totalCandidates" fill="#6366f1" radius={[0, 6, 6, 0]} name="Số ứng viên">
                    {candidatesByPosition.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Phân bố số năm kinh nghiệm */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-600" />
                Phân Bố Số Năm Kinh Nghiệm
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Thống kê gom nhóm qua toán tử <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-cyan-700">$bucket</code>
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full border border-cyan-100">
              $bucket
            </span>
          </div>

          <div className="h-72">
            {formattedExp.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Chưa có dữ liệu kinh nghiệm
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedExp} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '0.75rem', 
                      border: 'none', 
                      color: '#fff', 
                      fontSize: '12px' 
                    }} 
                    formatter={(val) => [val, 'Số ứng viên']}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Số ứng viên" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Top Kỹ Năng Phổ Biến & Bảng tổng kết */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Skills Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Top 10 Kỹ Năng Phổ Biến Nhất
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Bóc tách mảng kỹ năng nhúng (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-emerald-700">$unwind: $skills</code>)
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              {topSkills.length} kỹ năng
            </span>
          </div>

          <div className="h-64">
            {topSkills.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Chưa có dữ liệu kỹ năng
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSkills} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '0.75rem', 
                      border: 'none', 
                      color: '#fff', 
                      fontSize: '12px' 
                    }} 
                    formatter={(val) => [val, 'Số ứng viên có kỹ năng']}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} name="Số ứng viên" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Tổng Hợp Vị Trí & Điểm Phỏng Vấn
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Điểm số đánh giá bình quân của ứng viên qua từng vị trí việc làm
            </p>

            <div className="space-y-3">
              {candidatesByPosition.slice(0, 5).map((pos, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">{pos.positionTitle}</p>
                    <p className="text-[11px] text-slate-500">{pos.totalCandidates} hồ sơ tiếp nhận</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono tabular-nums inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                      ★ {pos.avgScore != null ? pos.avgScore.toFixed(1) : 'N/A'}/100
                    </span>
                  </div>
                </div>
              ))}
              {candidatesByPosition.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">Chưa có dữ liệu</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tiêu chí NoSQL:</span>
            <span className="font-medium text-slate-700">$group + $avg: score</span>
          </div>
        </div>
      </div>

      {/* Row 3: Hiệu Quả Kênh Tuyển Dụng (Source ROI) & Thời Gian Tuyển Dụng (Time-to-Hire) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Source ROI BarChart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                Hiệu Quả Kênh Nguồn Tuyển Dụng (Source ROI)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Đo lường số lượng tiếp nhận và tỷ lệ trúng tuyển qua toán tử <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600">$group: $source</code>
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              {sourceRoi.length} kênh
            </span>
          </div>

          <div className="h-64">
            {sourceRoi.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Chưa có dữ liệu kênh tuyển dụng
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceRoi} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '0.75rem', 
                      border: 'none', 
                      color: '#fff', 
                      fontSize: '12px' 
                    }} 
                    formatter={(val, name) => [val, name === 'total' ? 'Tổng nộp' : name === 'hired' ? 'Trúng tuyển' : name]}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} name="Tổng nộp" />
                  <Bar dataKey="hired" fill="#10b981" radius={[6, 6, 0, 0]} name="Trúng tuyển" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Time to Hire Metric Card */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Thời Gian Xử Lý Hồ Sơ Đã Tuyển (Ước tính)
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Từ ngày nộp đến lần cập nhật gần nhất của hồ sơ hired. Chỉ số thay đổi nếu hồ sơ được sửa sau khi tuyển.
            </p>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl text-center space-y-1">
              <div className="text-3xl font-extrabold text-emerald-700">
                {timeToHire.avgDays || 0} <span className="text-sm font-semibold text-emerald-600">ngày</span>
              </div>
              <p className="text-xs text-emerald-800 font-medium">Trung bình trên các hồ sơ đã tuyển</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Nhanh nhất:</span>
                <span className="font-bold text-slate-800">{timeToHire.minDays || 0} ngày</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Dài nhất:</span>
                <span className="font-bold text-slate-800">{timeToHire.maxDays || 0} ngày</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Toán tử NoSQL:</span>
            <span className="font-medium text-slate-700">$subtract dates + $avg</span>
          </div>
        </div>
      </div>

      {/* Collapsible Technical Pipeline Reference */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
        <button
          onClick={() => setShowPipelines(!showPipelines)}
          className="w-full p-4.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Xem 6 MongoDB Aggregation Pipelines Đang Thực Thi</h4>
              <p className="text-xs text-slate-400">Các truy vấn NoSQL chạy ngầm để tạo ra dữ liệu thống kê bên trên</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <span>{showPipelines ? 'Thu gọn' : 'Xem chi tiết'}</span>
            {showPipelines ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showPipelines && (
          <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-4 font-mono text-xs text-slate-300">
            <div>
              <span className="text-emerald-400 font-bold">// 1. Thống kê theo Vị trí ($lookup + $group + $unwind)</span>
              <pre className="mt-1.5 p-3 bg-slate-900 rounded-lg overflow-x-auto text-slate-300 border border-slate-800">
{`db.applications.aggregate([
  { $group: { _id: '$positionId', totalCandidates: { $sum: 1 }, avgScore: { $avg: '$score' } } },
  { $lookup: { from: 'positions', localField: '_id', foreignField: '_id', as: 'position' } },
  { $unwind: '$position' },
  { $project: { positionTitle: '$position.title', totalCandidates: 1, avgScore: { $round: ['$avgScore', 1] } } },
  { $sort: { totalCandidates: -1 } }
])`}
              </pre>
            </div>

            <div>
              <span className="text-cyan-400 font-bold">// 2. Top kỹ năng phổ biến ($unwind + $group)</span>
              <pre className="mt-1.5 p-3 bg-slate-900 rounded-lg overflow-x-auto text-slate-300 border border-slate-800">
{`db.candidates.aggregate([
  { $unwind: '$skills' },
  { $group: { _id: '$skills', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])`}
              </pre>
            </div>

            <div>
              <span className="text-amber-400 font-bold">// 3. Phân bố kinh nghiệm làm việc ($bucket)</span>
              <pre className="mt-1.5 p-3 bg-slate-900 rounded-lg overflow-x-auto text-slate-300 border border-slate-800">
{`db.candidates.aggregate([
  {
    $bucket: {
      groupBy: '$experienceYears',
      boundaries: [0, 1, 3, 5, 10],
      default: '10+ năm',
      output: { count: { $sum: 1 } }
    }
  }
])`}
              </pre>
            </div>

            <div>
              <span className="text-indigo-400 font-bold">// 4. Tỷ lệ tuyển dụng tổng thể ($group cond + $project hiringRate)</span>
              <pre className="mt-1.5 p-3 bg-slate-900 rounded-lg overflow-x-auto text-slate-300 border border-slate-800">
{`db.applications.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      hired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } }
    }
  },
  {
    $project: {
      _id: 0,
      hiringRate: { $round: [{ $multiply: [{ $divide: ['$hired', '$total'] }, 100] }, 1] }
    }
  }
])`}
              </pre>
            </div>

            <div>
              <span className="text-teal-400 font-bold">// 5. Hiệu quả theo kênh tuyển dụng - Source ROI ($group: $source)</span>
              <pre className="mt-1.5 p-3 bg-slate-900 rounded-lg overflow-x-auto text-slate-300 border border-slate-800">
{`db.applications.aggregate([
  {
    $group: {
      _id: '$source',
      total: { $sum: 1 },
      hired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
      avgScore: { $avg: '$score' }
    }
  },
  {
    $project: {
      source: '$_id',
      total: 1,
      hired: 1,
      conversionRate: { $round: [{ $multiply: [{ $divide: ['$hired', '$total'] }, 100] }, 1] }
    }
  },
  { $sort: { total: -1 } }
])`}
              </pre>
            </div>

            <div>
              <span className="text-rose-400 font-bold">// 6. Thời gian từ nộp đến cập nhật gần nhất ($subtract dates + $avg)</span>
              <pre className="mt-1.5 p-3 bg-slate-900 rounded-lg overflow-x-auto text-slate-300 border border-slate-800">
{`db.applications.aggregate([
  { $match: { status: 'hired' } },
  {
    $project: {
      daysToHire: {
        $divide: [
          { $subtract: ['$updatedAt', '$appliedAt'] },
          1000 * 60 * 60 * 24
        ]
      }
    }
  },
  {
    $group: {
      _id: null,
      avgDays: { $avg: '$daysToHire' },
      minDays: { $min: '$daysToHire' },
      maxDays: { $max: '$daysToHire' }
    }
  }
])`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
