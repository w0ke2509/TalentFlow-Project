import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { 
  Users, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  RefreshCw,
  TrendingUp,
  Clock,
  ChevronRight,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";

const CHART_COLORS = ["#4F46E5", "#06B6D4", "#F59E0B", "#10B981", "#F43F5E", "#8B5CF6"];

const Dashboard = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      toast.error("Lỗi khi tải dữ liệu dashboard: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-8 h-80 rounded-2xl" />
          <Skeleton className="lg:col-span-4 h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { stats, applicationsByStatus, recentApplications, upcomingInterviews } = data || {};

  const statusMap = {
    applied: "Mới nộp",
    screening: "Sơ loại",
    interview: "Phỏng vấn",
    accepted: "Gửi đề nghị",
    hired: "Đã tuyển",
    rejected: "Từ chối"
  };

  const chartData = Object.entries(statusMap).map(([status, name]) => ({
    name,
    count: (applicationsByStatus || []).find((item) => item._id === status)?.count || 0
  }));

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Bảng Điều Khiển Tuyển Dụng
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Làm mới số liệu
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Tổng Ứng Viên"
          value={stats?.totalCandidates || 0}
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Vị Trí Đang Tuyển"
          value={stats?.openPositions || 0}
          icon={Briefcase}
          color="teal"
        />
        <StatCard
          title="Chờ Phỏng Vấn"
          value={stats?.totalInterviews || 0}
          icon={Calendar}
          color="amber"
        />
        <StatCard
          title="Đã Tuyển Dụng"
          value={stats?.hiredCount || 0}
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Phễu Tuyển Dụng & Phân Bố Trạng Thái */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ cột phân bố trạng thái */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                Hồ sơ theo trạng thái
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Số lượng hồ sơ hiện tại ở từng giai đoạn tuyển dụng
              </p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("applications")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                Mở Kanban <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} stroke="#E2E8F0" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} stroke="#E2E8F0" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#F8FAFC",
                    fontSize: "12px"
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#4F46E5">
                  {chartData.map((entry, index) => (
                    <Cell key={"cell-" + index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tỷ lệ chuyển đổi dạng tròn */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">
              Tỷ Lệ Hồ Sơ Theo Trạng Thái
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Phân tích cơ cấu ứng viên</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={"pie-" + index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#F8FAFC",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-800">{chartData.reduce((sum, item) => sum + item.count, 0)}</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase">Hồ sơ</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                <span className="truncate">{item.name}:</span>
                <span className="font-bold text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2 Bảng widgets: Hồ sơ mới nhất & Lịch phỏng vấn sắp tới */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hồ sơ mới nhất */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">Hồ Sơ Mới Tiếp Nhận</h3>
              <p className="text-xs text-slate-400 mt-0.5">Các ứng viên nộp đơn gần đây</p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("candidates")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {(recentApplications || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Chưa có hồ sơ mới</div>
            ) : (
              recentApplications.map((app) => (
                <div key={app._id} className="py-3 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                      {app.candidateId?.fullName?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{app.candidateId?.fullName || "Chưa có tên"}</h4>
                      <p className="text-[11px] text-slate-400">{app.positionId?.title || "Vị trí tuyển"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={app.status}>
                      {statusMap[app.status] || app.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lịch phỏng vấn sắp tới */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">Lịch Phỏng Vấn Sắp Tới</h3>
              <p className="text-xs text-slate-400 mt-0.5">Điều phối các hội đồng đánh giá</p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("interviews")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                Xem lịch <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {(upcomingInterviews || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Không có lịch phỏng vấn sắp tới</div>
            ) : (
              upcomingInterviews.map((iv) => {
                const dateStr = new Date(iv.scheduledAt).toLocaleString("vi-VN", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div key={iv._id} className="py-3 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-100">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          {iv.applicationId?.candidateId?.fullName || "Ứng viên"}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {iv.round} • {iv.applicationId?.positionId?.title || "Vị trí"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tabular-nums text-xs font-semibold text-slate-700">{dateStr}</div>
                      <span className="text-[10px] text-slate-400">{iv.location || "Online"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
