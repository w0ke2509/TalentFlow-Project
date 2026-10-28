import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../components/ui/Modal";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/ui/Badge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableSkeleton } from "../components/ui/Skeleton";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Star,
  FileText,
  Search,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  LayoutGrid,
  Sun,
  Sunset,
  X,
  Sparkles,
  CalendarRange,
  ExternalLink,
  Award,
  AlertCircle,
  Mail,
  Phone
} from "lucide-react";

// Helper tính thứ 2 của tuần chứa date
const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  // Chủ nhật (0) là ngày cuối tuần, lùi 6 ngày về thứ 2 của tuần này
  const diff = day === 0 ? -6 : (1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Helper format YYYY-MM-DD cho datepicker
const formatDateKey = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper convert Date -> datetime-local string cho input form
const toDatetimeLocal = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Helper kiểm tra một ngày có thuộc về quá khứ không (trước ngày hôm nay)
const isPastDay = (d) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
};

const DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

const Interviews = ({ focusDate, onNavigate }) => {
  const { user } = useAuth();
  const isInterviewer = user?.role === "interviewer";
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Mặc định lọc là "pending" (Đang chờ kết quả)
  const [filterResult, setFilterResult] = useState("pending");
  
  // Chế độ xem: 'calendar' (Lịch tuần) hoặc 'cards' (Danh sách thẻ) - chỉ áp dụng khi xem Pending
  const [viewMode, setViewMode] = useState("calendar");
  
  // Mốc đầu tuần đang xem (Thứ 2)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMondayOfWeek(focusDate ? new Date(focusDate) : new Date()));
  const [asOf] = useState(() => Date.now());

  // Modal chi tiết khi click vào ứng viên trên lịch tuần
  const [selectedDetail, setSelectedDetail] = useState(null);

  const toast = useToast();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    applicationId: "",
    round: "Phỏng vấn kỹ thuật",
    interviewer: "Hội đồng Kỹ thuật",
    scheduledAt: toDatetimeLocal(new Date()),
    location: "Phòng họp 302 / Google Meet",
    score: 0,
    feedback: "",
    result: "pending"
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ivRes, appRes] = await Promise.all([
        api.getInterviews(),
        api.getApplications()
      ]);
      if (ivRes.success) setInterviews(ivRes.data);
      if (appRes.success) setApplications(appRes.data);
    } catch (err) {
      toast.error("Lỗi khi tải lịch phỏng vấn: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Điều hướng tuần
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekStart(getMondayOfWeek(new Date()));
  };

  const handleDatePick = (e) => {
    const val = e.target.value;
    if (val) {
      const selected = new Date(val + "T00:00:00");
      setCurrentWeekStart(getMondayOfWeek(selected));
    }
  };

  // Tạo danh sách 7 ngày trong tuần
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  // Bộ lọc kết quả (pending, pass, fail)
  const filteredInterviews = useMemo(() => {
    const visible = interviews.filter((iv) => {
      if (filterResult === "pending") {
        // Chỉ hiển thị phỏng vấn pending của các ứng viên chưa kết thúc quá trình (không phải hired, accepted, rejected)
        const appStatus = iv.applicationId?.status;
        if (appStatus && ["hired", "accepted", "rejected"].includes(appStatus)) {
          return false;
        }
        return iv.result === "pending";
      }
      return iv.result === filterResult;
    });
    return filterResult === "pending"
      ? visible.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      : visible;
  }, [interviews, filterResult]);

  // Đếm số lượng từng trạng thái
  const counts = useMemo(() => {
    return {
      pending: interviews.filter((i) => {
        const appStatus = i.applicationId?.status;
        if (appStatus && ["hired", "accepted", "rejected"].includes(appStatus)) {
          return false;
        }
        return i.result === "pending";
      }).length,
      pass: interviews.filter((i) => i.result === "pass").length,
      fail: interviews.filter((i) => i.result === "fail").length
    };
  }, [interviews]);
  const overdueCount = filteredInterviews.filter((iv) => iv.result === "pending" && new Date(iv.scheduledAt).getTime() < asOf).length;

  const handleOpenCreate = () => {
    setEditingId(null);
    // Mặc định đặt lịch vào 9:00 sáng mai (hoặc tương lai)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);
    defaultDate.setHours(9, 0, 0, 0);

    setFormData({
      applicationId: applications.find((app) => ["applied", "screening", "interview"].includes(app.status))?._id || "",
      round: "Phỏng vấn kỹ thuật",
      interviewer: "Hội đồng Kỹ thuật",
      scheduledAt: toDatetimeLocal(defaultDate),
      location: "Phòng họp 302 / Google Meet",
      score: 0,
      feedback: "",
      result: "pending"
    });
    setIsOpenModal(true);
  };

  const handleOpenCreateWithPreset = (targetDate, shift = "morning") => {
    // Chặn nghiêm ngặt không cho lên lịch vào ngày trong quá khứ
    if (isPastDay(targetDate)) {
      toast.error("Không thể lên lịch phỏng vấn cho ngày trong quá khứ!");
      return;
    }

    const d = new Date(targetDate);
    const now = new Date();
    if (isToday(d)) {
      if (shift === "morning" && now.getHours() >= 12) {
        toast.warning("Ca sáng hôm nay đã kết thúc! Vui lòng lên lịch cho ca chiều hoặc ngày tiếp theo.");
        return;
      }
      if (shift === "afternoon" && now.getHours() >= 18) {
        toast.warning("Ca chiều hôm nay đã kết thúc! Vui lòng lên lịch cho ngày tiếp theo.");
        return;
      }
    }

    if (shift === "morning") {
      d.setHours(9, 0, 0, 0);
    } else {
      d.setHours(14, 0, 0, 0);
    }

    setEditingId(null);
    setFormData({
      applicationId: applications.find((app) => ["applied", "screening", "interview"].includes(app.status))?._id || "",
      round: "Phỏng vấn kỹ thuật",
      interviewer: "Hội đồng Kỹ thuật",
      scheduledAt: toDatetimeLocal(d),
      location: "Phòng họp 302 / Google Meet",
      score: 0,
      feedback: "",
      result: "pending"
    });
    setIsOpenModal(true);
  };

  const handleOpenEdit = (iv) => {
    setSelectedDetail(null); // Đóng modal chi tiết nếu đang mở
    setEditingId(iv._id);
    setFormData({
      applicationId: iv.applicationId?._id || iv.applicationId,
      round: iv.round || "Phỏng vấn kỹ thuật",
      interviewer: iv.interviewer || "",
      scheduledAt: toDatetimeLocal(iv.scheduledAt),
      location: iv.location || "",
      score: iv.score ?? 0,
      feedback: iv.feedback || iv.comment || "",
      result: iv.result || "pending"
    });
    setIsOpenModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Chặn nếu tạo mới mà chọn thời gian trong quá khứ
      if (!editingId) {
        const scheduledTime = new Date(formData.scheduledAt).getTime();
        if (scheduledTime < Date.now() - 5 * 60 * 1000) {
          toast.error("Thời gian phỏng vấn không thể ở trong quá khứ!");
          return;
        }
      }

      const payload = isInterviewer
        ? { score: Number(formData.score) || 0, result: formData.result, feedback: formData.feedback }
        : { ...formData, score: Number(formData.score) || 0, comment: formData.feedback };

      if (editingId) {
        const response = await api.updateInterview(editingId, payload);
        toast.success(response.kanbanStatus === "accepted"
          ? "Đã chấm Đậu; hồ sơ chuyển sang Gửi Đề Nghị trên Kanban."
          : response.kanbanStatus === "interview" && formData.result === "fail"
            ? "Đã sửa thành Không đạt; hồ sơ trở lại Phỏng Vấn để có thể đặt lịch tiếp."
          : formData.result === "pending" ? "Đã cập nhật lịch phỏng vấn." : "Đã cập nhật đánh giá phỏng vấn.");
      } else {
        await api.createInterview(payload);
        toast.success("Lên lịch phỏng vấn thành công!");
      }
      setIsOpenModal(false);
      fetchData();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await api.deleteInterview(deleteConfirm.id);
      toast.success("Đã hủy lịch phỏng vấn");
      setDeleteConfirm({ isOpen: false, id: null });
      setSelectedDetail(null);
      fetchData();
    } catch (err) {
      toast.error("Lỗi khi xóa: " + err.message);
    }
  };

  const getResultBadge = (result) => {
    switch (result) {
      case "pass":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đạt (Pass)</span>;
      case "fail":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Chưa đạt (Fail)</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Chờ phỏng vấn</span>;
    }
  };

  // Helper lọc phỏng vấn theo ngày và ca
  const getInterviewsForSlot = (dayDate, shift) => {
    return filteredInterviews.filter((iv) => {
      const ivDate = new Date(iv.scheduledAt);
      const isSame = 
        ivDate.getFullYear() === dayDate.getFullYear() &&
        ivDate.getMonth() === dayDate.getMonth() &&
        ivDate.getDate() === dayDate.getDate();
      if (!isSame) return false;
      const h = ivDate.getHours();
      return shift === "morning" ? h < 13 : h >= 13;
    });
  };

  const isToday = (d) => {
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // 3 tab lọc: Đang chờ kết quả (mặc định), Đã đạt (Pass), Chưa đạt (Fail)
  const FILTER_TABS = [
    { key: "pending", label: "Đang chờ kết quả", count: counts.pending },
    { key: "pass", label: "Đã đạt (Passed)", count: counts.pass },
    { key: "fail", label: "Chưa đạt (Failed)", count: counts.fail }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-indigo-600" />
            {filterResult === "pending" 
              ? "Lịch Phỏng Vấn"
              : filterResult === "pass" 
              ? "Danh Sách Thí Sinh Đã Đạt"
              : "Danh Sách Thí Sinh Chưa Đạt"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onNavigate?.("applications")}
            className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl cursor-pointer">
            Xem Kanban
          </button>
          {/* Chỉ hiện nút chuyển Lịch tuần / Thẻ lưới khi đang ở tab "Đang chờ kết quả" */}
          {filterResult === "pending" && (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/60">
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-white text-indigo-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Lịch Tuần
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-indigo-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Thẻ Lưới
              </button>
            </div>
          )}

          {!isInterviewer && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Lên Lịch Mới
            </button>
          )}
        </div>
      </div>

      {filterResult === "pending" && overdueCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <span><strong>{overdueCount} lịch phỏng vấn đã quá giờ</strong> và vẫn chờ kết quả. Hãy chấm điểm hoặc dời lịch.</span>
          {viewMode === "calendar" && <button type="button" onClick={() => setViewMode("cards")} className="font-bold underline cursor-pointer">Xem các lịch cần xử lý</button>}
        </div>
      )}

      {/* Hộp Điều Khiển: Bộ Lọc & Điều Hướng Tuần */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        {/* Hàng 1: Bộ Lọc (Mặc định Đang chờ, bỏ Tất cả) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1">Trạng thái:</span>
            {FILTER_TABS.map(({ key, label, count }) => {
              const isSelected = filterResult === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterResult(key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/20"
                      : "text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/60"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-medium text-slate-500">
            Số lượng: <b className="text-slate-900">{filteredInterviews.length}</b> ứng viên
          </div>
        </div>

        {/* Hàng 2: Điều hướng tuần (Trái: nút tuần, Phải: chọn ngày) - Chỉ hiện khi ở tab Đang chờ + Lịch tuần */}
        {filterResult === "pending" && viewMode === "calendar" && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
            {/* Cụm nút chuyển tuần bên trái */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Xem tuần trước"
              >
                <ChevronLeft className="w-4 h-4" /> Tuần Trước
              </button>
              <button
                onClick={handleCurrentWeek}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer border border-indigo-200/60"
              >
                Tuần Này
              </button>
              <button
                onClick={handleNextWeek}
                className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Xem tuần sau"
              >
                Tuần Sau <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Chọn ngày xem tuần đem sang bên phải */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 ml-auto">
              <label htmlFor="weekDatePicker" className="font-semibold text-slate-700">
                Chọn ngày xem tuần:
              </label>
              <input
                id="weekDatePicker"
                type="date"
                value={formatDateKey(currentWeekStart)}
                onChange={handleDatePick}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Nội dung chính */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : filterResult === "pending" && viewMode === "calendar" ? (
        /* ================== 1. GIAO DIỆN LỊCH TUẦN CHO ỨNG VIÊN ĐANG CHỜ ================== */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Header 7 cột (Thứ Hai -> Chủ Nhật) */}
              <div className="grid grid-cols-[130px_repeat(7,1fr)] bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-700">
                <div className="p-3 text-center flex items-center justify-center border-r border-slate-200/80 uppercase text-[11px] tracking-wider text-slate-500">
                  Khung Giờ
                </div>
                {weekDays.map((day, idx) => {
                  const today = isToday(day);
                  const past = isPastDay(day);
                  const dateStr = `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`;
                  return (
                    <div
                      key={idx}
                      className={`p-3 text-center border-r border-slate-200/80 last:border-r-0 ${
                        today ? "bg-indigo-50/80 text-indigo-900 font-black" : past ? "bg-slate-50/40 text-slate-400" : ""
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{DAY_NAMES[idx]}</span>
                        {today && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-indigo-600 text-white rounded-full font-bold">
                            Hôm nay
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] font-semibold mt-0.5 ${today ? "text-indigo-700" : "text-slate-500"}`}>
                        {dateStr}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hàng 1: CA SÁNG (08:00 - 12:00) */}
              <div className="grid grid-cols-[130px_repeat(7,1fr)] border-b border-slate-200/80 min-h-[140px]">
                {/* Cột Tên Ca */}
                <div className="p-3 bg-amber-50/40 border-r border-slate-200/80 flex flex-col items-center justify-center text-center space-y-1">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Sun className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Ca Sáng</span>
                  <span className="text-[10px] text-slate-500 font-medium">08:00 - 12:00</span>
                </div>

                {/* 7 ô cho 7 ngày Ca Sáng */}
                {weekDays.map((day, idx) => {
                  const slotItems = getInterviewsForSlot(day, "morning");
                  const today = isToday(day);
                  const past = isPastDay(day);

                  return (
                    <div
                      key={idx}
                      className={`p-2 border-r border-slate-200/80 last:border-r-0 flex flex-col justify-between space-y-1.5 ${
                        today ? "bg-indigo-50/20" : past ? "bg-slate-50/30" : "bg-white"
                      }`}
                    >
                      <div className="space-y-1.5">
                        {slotItems.map((iv) => {
                          const candName = iv.applicationId?.candidateId?.fullName || "Ứng viên";
                          const timeStr = new Date(iv.scheduledAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit"
                          });
                          const isIvPast = past || isPastDay(iv.scheduledAt);

                          if (isIvPast) {
                            return (
                              <button
                                key={iv._id}
                                type="button"
                                onClick={() => setSelectedDetail(iv)}
                                className="w-full text-left p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 transition-all cursor-pointer group shadow-2xs"
                                title="Lịch phỏng vấn ngày trước (Đã qua - Bấm xem chi tiết)"
                              >
                                <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    {timeStr}
                                  </span>
                                  {iv.result === "pass" ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                      Đậu
                                    </span>
                                  ) : iv.result === "fail" ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded">
                                      Fail
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">
                                      Đã qua
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-slate-700 truncate mt-1 group-hover:text-slate-900">
                                  {candName}
                                </div>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={iv._id}
                              type="button"
                              onClick={() => setSelectedDetail(iv)}
                              className="w-full text-left p-2 rounded-xl bg-amber-50/90 hover:bg-amber-100 border border-amber-200/90 transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                              title="Bấm để xem chi tiết phỏng vấn"
                            >
                              <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-amber-900">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  {timeStr}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-700 transition-transform group-hover:translate-x-0.5 shrink-0" />
                              </div>
                              <div className="text-xs font-bold text-slate-900 truncate mt-1 group-hover:text-indigo-600 transition-colors">
                                {candName}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Khung ô trống: Nếu ngày đã qua thì ghi 'Đã qua' và KHÔNG cho thêm lịch */}
                      {slotItems.length === 0 && (
                        <div className={`h-full min-h-[50px] flex items-center justify-center rounded-xl transition-colors ${
                          past 
                            ? "bg-slate-50/40 border border-dashed border-slate-200/50" 
                            : "border border-dashed border-slate-100 hover:border-indigo-200"
                        }`}>
                          {past ? (
                            <span className="text-[10px] text-slate-300 font-medium italic select-none">
                              Đã qua
                            </span>
                          ) : isInterviewer ? null : (
                            <button
                              onClick={() => handleOpenCreateWithPreset(day, "morning")}
                              className="text-[10px] font-semibold text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer py-1"
                            >
                              <Plus className="w-3 h-3" /> Lên lịch
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hàng 2: CA CHIỀU (13:30 - 18:00) */}
              <div className="grid grid-cols-[130px_repeat(7,1fr)] min-h-[140px]">
                {/* Cột Tên Ca */}
                <div className="p-3 bg-indigo-50/40 border-r border-slate-200/80 flex flex-col items-center justify-center text-center space-y-1">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Sunset className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Ca Chiều</span>
                  <span className="text-[10px] text-slate-500 font-medium">13:30 - 18:00</span>
                </div>

                {/* 7 ô cho 7 ngày Ca Chiều */}
                {weekDays.map((day, idx) => {
                  const slotItems = getInterviewsForSlot(day, "afternoon");
                  const today = isToday(day);
                  const past = isPastDay(day);

                  return (
                    <div
                      key={idx}
                      className={`p-2 border-r border-slate-200/80 last:border-r-0 flex flex-col justify-between space-y-1.5 ${
                        today ? "bg-indigo-50/20" : past ? "bg-slate-50/30" : "bg-white"
                      }`}
                    >
                      <div className="space-y-1.5">
                        {slotItems.map((iv) => {
                          const candName = iv.applicationId?.candidateId?.fullName || "Ứng viên";
                          const timeStr = new Date(iv.scheduledAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit"
                          });
                          const isIvPast = past || isPastDay(iv.scheduledAt);

                          if (isIvPast) {
                            return (
                              <button
                                key={iv._id}
                                type="button"
                                onClick={() => setSelectedDetail(iv)}
                                className="w-full text-left p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 transition-all cursor-pointer group shadow-2xs"
                                title="Lịch phỏng vấn ngày trước (Đã qua - Bấm xem chi tiết)"
                              >
                                <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    {timeStr}
                                  </span>
                                  {iv.result === "pass" ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                      Đậu
                                    </span>
                                  ) : iv.result === "fail" ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded">
                                      Fail
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">
                                      Đã qua
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-slate-700 truncate mt-1 group-hover:text-slate-900">
                                  {candName}
                                </div>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={iv._id}
                              type="button"
                              onClick={() => setSelectedDetail(iv)}
                              className="w-full text-left p-2 rounded-xl bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200/90 transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                              title="Bấm để xem chi tiết phỏng vấn"
                            >
                              <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-indigo-900">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                                  {timeStr}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-700 transition-transform group-hover:translate-x-0.5 shrink-0" />
                              </div>
                              <div className="text-xs font-bold text-slate-900 truncate mt-1 group-hover:text-indigo-600 transition-colors">
                                {candName}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Khung ô trống: Nếu ngày đã qua thì ghi 'Đã qua' và KHÔNG cho thêm lịch */}
                      {slotItems.length === 0 && (
                        <div className={`h-full min-h-[50px] flex items-center justify-center rounded-xl transition-colors ${
                          past 
                            ? "bg-slate-50/40 border border-dashed border-slate-200/50" 
                            : "border border-dashed border-slate-100 hover:border-indigo-200"
                        }`}>
                          {past ? (
                            <span className="text-[10px] text-slate-300 font-medium italic select-none">
                              Đã qua
                            </span>
                          ) : isInterviewer ? null : (
                            <button
                              onClick={() => handleOpenCreateWithPreset(day, "afternoon")}
                              className="text-[10px] font-semibold text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer py-1"
                            >
                              <Plus className="w-3 h-3" /> Lên lịch
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================== 2. DANH SÁCH ỨNG VIÊN (ÁP DỤNG KHI XEM PASS / FAIL HOẶC XEM THẺ) ================== */
        filteredInterviews.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              Không có thí sinh nào ở trạng thái {filterResult === "pass" ? "Đã đạt (Passed)" : filterResult === "fail" ? "Chưa đạt (Failed)" : "Đang chờ kết quả"}
            </h3>
            <p className="text-xs text-slate-400">
              Chưa có dữ liệu thí sinh ở mục này. Bạn có thể chọn mục khác để xem.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredInterviews.map((iv) => {
              const candName = iv.applicationId?.candidateId?.fullName || "Chưa có tên";
              const posTitle = iv.applicationId?.positionId?.title || "Vị trí tuyển dụng";
              const dateStr = new Date(iv.scheduledAt).toLocaleString("vi-VN", {
                weekday: "short",
                month: "numeric",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              const isPass = iv.result === "pass";
              const isFail = iv.result === "fail";
              const isPending = iv.result === "pending";

              return (
                <div
                  key={iv._id}
                  className={`bg-white p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                    isPass 
                      ? "border-emerald-200/80 hover:border-emerald-300" 
                      : isFail 
                      ? "border-rose-200/80 hover:border-rose-300" 
                      : "border-slate-200/80"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {iv.round || "Phỏng vấn"}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 mt-1.5">
                          {candName}
                        </h3>
                        <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                          {posTitle}
                        </p>
                      </div>
                      {getResultBadge(iv.result)}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Hội đồng: {iv.interviewer}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{iv.location || "Google Meet"}</span>
                      </div>
                    </div>

                    {/* Điểm số & Nhận xét đánh giá - Chỉ hiện điểm cho Pass/Fail, Pending KHÔNG hiện điểm */}
                    {isPending ? (
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2 font-medium">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Chờ phỏng vấn • Chưa có điểm số</span>
                      </div>
                    ) : (
                      <div className={`p-3 rounded-xl border space-y-1.5 ${
                        isPass 
                          ? "bg-emerald-50/50 border-emerald-100" 
                          : "bg-rose-50/50 border-rose-100"
                      }`}>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>Điểm số đánh giá:</span>
                          <span className={`flex items-center gap-1 font-black ${
                            isPass ? "text-emerald-700" : "text-rose-700"
                          }`}>
                            <Star className={`w-3.5 h-3.5 ${
                              isPass ? "text-emerald-500 fill-emerald-500" : "text-rose-500 fill-rose-500"
                            }`} />
                            {iv.score}/100
                          </span>
                        </div>
                        {(iv.feedback || iv.comment) && (
                          <p className="text-[11px] text-slate-600 italic line-clamp-3 pt-0.5">
                            "{iv.feedback || iv.comment}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(iv)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> {isPending ? "Chấm Điểm" : "Sửa Điểm / Đổi KQ"}
                    </button>
                    {!isInterviewer && (!isPastDay(iv.scheduledAt) || isPending) && (
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, id: iv._id })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa hồ sơ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ================== MODAL XEM CHI TIẾT KHI CLICK VÀO LỊCH TUẦN ================== */}
      {selectedDetail && (
        <Modal label="Chi tiết phỏng vấn" onClose={() => setSelectedDetail(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                  {selectedDetail.round || "Phỏng vấn"}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedDetail.applicationId?.candidateId?.fullName || "Ứng viên"}
                </h3>
                <p className="text-xs text-indigo-600 font-semibold">
                  {selectedDetail.applicationId?.positionId?.title || "Vị trí tuyển dụng"}
                </p>
              </div>
              <button aria-label="Đóng"
                onClick={() => setSelectedDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chi tiết nội dung */}
            <div className="space-y-3 text-xs">
              {isPastDay(selectedDetail.scheduledAt) && (
                <div className="flex items-center gap-2 p-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{selectedDetail.result === "pending" ? "Lịch đã quá hạn, cần chấm điểm hoặc dời lịch." : "Lịch đã hoàn tất trong quá khứ."}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Thời gian hẹn:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    {new Date(selectedDetail.scheduledAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })} ({new Date(selectedDetail.scheduledAt).toLocaleDateString("vi-VN")})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Trạng thái:</span>
                  <div className="mt-0.5">
                    {getResultBadge(selectedDetail.result)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Hội đồng chấm:</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5">
                    {selectedDetail.interviewer || "Chưa phân công"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Địa điểm / Meet:</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5">
                    {selectedDetail.location || "Google Meet"}
                  </span>
                </div>
              </div>

              {/* NẾU ĐANG CHỜ (PENDING): HIỂN THỊ THÔNG TIN LIÊN HỆ & KỸ NĂNG CỦA ỨNG VIÊN */}
              {selectedDetail.result === "pending" ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Hồ Sơ & Kỹ Năng Ứng Viên</span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200/60">
                      Chờ đánh giá
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedDetail.applicationId?.candidateId?.email || "Chưa cập nhật email"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{selectedDetail.applicationId?.candidateId?.phone || "Chưa cập nhật SĐT"}</span>
                    </div>
                  </div>

                  {selectedDetail.applicationId?.candidateId?.skills?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1 items-center">
                      <span className="text-[10px] text-slate-400 font-semibold mr-1">Kỹ năng:</span>
                      {selectedDetail.applicationId.candidateId.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white text-slate-700 rounded-md text-[10px] font-medium border border-slate-200 shadow-2xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedDetail.applicationId?.note && (
                    <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-500 italic">
                      Ghi chú: "{selectedDetail.applicationId.note}"
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-3 rounded-xl border space-y-1.5 ${
                  selectedDetail.result === "pass" 
                    ? "bg-emerald-50/50 border-emerald-100" 
                    : "bg-rose-50/50 border-rose-100"
                }`}>
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Điểm số đánh giá:</span>
                    <span className={`font-black flex items-center gap-1 ${
                      selectedDetail.result === "pass" ? "text-emerald-700" : "text-rose-700"
                    }`}>
                      <Star className={`w-3.5 h-3.5 ${
                        selectedDetail.result === "pass" ? "text-emerald-500 fill-emerald-500" : "text-rose-500 fill-rose-500"
                      }`} />
                      {selectedDetail.score}/100
                    </span>
                  </div>
                  {(selectedDetail.feedback || selectedDetail.comment) ? (
                    <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-100">
                      "{selectedDetail.feedback || selectedDetail.comment}"
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">
                      Chưa có nhận xét chuyên môn
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer hành động */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {isPastDay(selectedDetail.scheduledAt) && selectedDetail.result !== "pending" ? (
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                  Lịch đã qua · vẫn có thể sửa kết quả
                </span>
              ) : !isInterviewer ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ isOpen: true, id: selectedDetail._id })}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hủy lịch
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDetail(null)}
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedDetail)}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> {selectedDetail.result === "pending" ? "Chấm Điểm / Đánh Giá" : "Sửa Điểm / Đổi KQ"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ================== MODAL THÊM LỊCH MỚI / CHẤM ĐIỂM ================== */}
      {isOpenModal && (
        <Modal label="Lịch phỏng vấn" onClose={() => setIsOpenModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {editingId ? <Edit3 className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-indigo-600" />}
                {editingId ? "Đánh Giá & Chấm Điểm Phỏng Vấn" : "Lên Lịch Phỏng Vấn Mới"}
              </h3>
              <button aria-label="Đóng" onClick={() => setIsOpenModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ứng Viên & Vị Trí *</label>
                <select
                  required
                  disabled={Boolean(editingId)}
                  value={formData.applicationId}
                  onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                >
                  <option value="">-- Chọn hồ sơ ứng tuyển --</option>
                  {applications.filter((app) => editingId ? app._id === formData.applicationId : ["applied", "screening", "interview"].includes(app.status)).map((app) => (
                    <option key={app._id} value={app._id}>
                      {app.candidateId?.fullName} - {app.positionId?.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vòng Phỏng Vấn *</label>
                  <input
                    type="text"
                    required
                    value={formData.round}
                    disabled={isInterviewer && Boolean(editingId)}
                    onChange={(e) => setFormData({ ...formData, round: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="Ví dụ: Sơ vấn nhân sự, Phỏng vấn kỹ thuật"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người Phỏng Vấn</label>
                  <input
                    type="text"
                    value={formData.interviewer}
                    disabled={isInterviewer && Boolean(editingId)}
                    onChange={(e) => setFormData({ ...formData, interviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="VD: Tech Lead, HR Manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời Gian Bắt Đầu *</label>
                  <input
                    type="datetime-local"
                    required
                    disabled={isInterviewer && Boolean(editingId)}
                    min={!editingId ? toDatetimeLocal(new Date()) : undefined}
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                  {!editingId && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      * Chỉ được chọn thời gian trong hiện tại hoặc tương lai
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Địa Điểm / Link Meet</label>
                  <input
                    type="text"
                    value={formData.location}
                    disabled={isInterviewer && Boolean(editingId)}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="Phòng 302 / meet.google.com/..."
                  />
                </div>
              </div>

              {/* Phần Chấm Điểm & Kết Quả: CHỈ HIỂN THỊ KHI ĐANG SỬA / ĐÁNH GIÁ (editingId) */}
              {editingId ? (
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Kết Quả Đánh Giá & Điểm Số</span>
                    <span className="text-[11px] font-normal text-slate-500 lowercase">(Thang điểm 0 - 100)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Điểm Số (0 - 100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.score}
                        onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold text-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kết Luận</label>
                      <select
                        value={formData.result}
                        disabled={interviews.some((iv) => iv._id === editingId && iv.applicationId?.status === "hired")}
                        onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="pending">Chờ phỏng vấn</option>
                        <option value="pass">Đậu (Pass)</option>
                        <option value="fail">Không đạt (Fail)</option>
                      </select>
                      {interviews.some((iv) => iv._id === editingId && iv.applicationId?.status === "hired") &&
                        <span className="text-[10px] text-slate-500">Đã tuyển: chỉ được sửa điểm và nhận xét.</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nhận Xét Chuyên Môn / Feedback</label>
                    <textarea
                      rows="3"
                      value={formData.feedback}
                      onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                      placeholder="Đánh giá kỹ năng chuyên môn NoSQL/Frontend, tư duy giải thuật và độ phù hợp văn hóa..."
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-900 text-xs">
                  <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Trạng thái ban đầu sẽ mặc định là <b>"Đang chờ phỏng vấn"</b>. Bạn có thể chấm điểm và ghi nhận xét sau khi buổi phỏng vấn diễn ra.</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  {editingId ? "Lưu Kết Quả" : "Xác Nhận Lên Lịch"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Hủy lịch phỏng vấn"
        message="Bạn có chắc chắn muốn hủy lịch hẹn phỏng vấn này không?"
        confirmText="Xác nhận hủy"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default Interviews;
