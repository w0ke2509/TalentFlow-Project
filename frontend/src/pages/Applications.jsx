import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../components/ui/Modal";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Badge } from "../components/ui/Badge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { 
  Plus, 
  Briefcase, 
  Star, 
  Trash2,
  ChevronDown,
  UserCheck,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  X,
  Building,
  CheckCircle2
} from "lucide-react";

const COLUMNS = [
  { 
    id: "applied", 
    title: "Mới Nộp", 
    subTitle: "Applied", 
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    accentColor: "border-t-slate-500" 
  },
  { 
    id: "screening", 
    title: "Sơ Loại Hồ Sơ", 
    subTitle: "Screening", 
    badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
    accentColor: "border-t-amber-500" 
  },
  { 
    id: "interview", 
    title: "Phỏng Vấn", 
    subTitle: "Interview", 
    badgeColor: "bg-teal-100 text-teal-900 border-teal-200",
    accentColor: "border-t-teal-600" 
  },
  { 
    id: "accepted", 
    title: "Gửi Đề Nghị", 
    subTitle: "Offer Letter", 
    badgeColor: "bg-sky-100 text-sky-900 border-sky-200",
    accentColor: "border-t-sky-500" 
  },
  { 
    id: "hired", 
    title: "Đã Tuyển Dụng", 
    subTitle: "Hired", 
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-200",
    accentColor: "border-t-emerald-600" 
  },
  { 
    id: "rejected", 
    title: "Không Phù Hợp", 
    subTitle: "Rejected", 
    badgeColor: "bg-rose-100 text-rose-900 border-rose-200",
    accentColor: "border-t-rose-400" 
  }
];

const defaultInterviewTime = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const Applications = ({ onNavigate }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Modal tạo hồ sơ mới
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    candidateId: "",
    positionId: "",
    source: "Website",
    score: 80,
    note: ""
  });

  // Confirm delete
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null,
    name: ""
  });
  const [statusConfirm, setStatusConfirm] = useState({ isOpen: false, appId: null, newStatus: null, name: "" });
  const [scheduleApplication, setScheduleApplication] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: "", interviewer: "", round: "Phỏng vấn kỹ thuật", location: "Google Meet / Online" });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [offerApplication, setOfferApplication] = useState(null);
  const [offerForm, setOfferForm] = useState({ offerSalary: "", offerStartDate: "", offerNote: "", offerAccepted: false });
  const [offerSaving, setOfferSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appRes, candRes, posRes, interviewRes] = await Promise.all([
        api.getApplications({ positionId: selectedPosition || undefined }),
        api.getCandidates(),
        api.getPositions(),
        api.getInterviews()
      ]);
      if (appRes.success) setApplications(appRes.data);
      if (candRes.success) setCandidates(candRes.data);
      if (posRes.success) setPositions(posRes.data);
      if (interviewRes.success) setInterviews(interviewRes.data);
    } catch (err) {
      toast.error("Lỗi khi tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPosition]);

  const pendingInterviewByApplication = useMemo(() => {
    const schedule = new Map();

    for (const interview of interviews) {
      if (interview.result !== "pending") continue;
      const applicationId = interview.applicationId?._id || interview.applicationId;
      const time = new Date(interview.scheduledAt).getTime();
      if (!applicationId || !Number.isFinite(time)) continue;

      const previous = schedule.get(applicationId);
      if (!previous) {
        schedule.set(applicationId, interview);
        continue;
      }

      const previousTime = new Date(previous.scheduledAt).getTime();
      if (time < previousTime) {
        schedule.set(applicationId, interview);
      }
    }

    return schedule;
  }, [interviews]);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      if (["accepted", "hired", "rejected"].includes(newStatus) && pendingInterviewByApplication.has(appId)) {
        toast.error("Hồ sơ còn lịch phỏng vấn đang chờ. Hãy chấm điểm hoặc hủy lịch trước khi chuyển giai đoạn.");
        return;
      }
      if (newStatus === "accepted" && !interviews.some((iv) =>
        (iv.applicationId?._id || iv.applicationId) === appId && iv.result === "pass")) {
        toast.error("Cần chấm kết quả phỏng vấn Đậu trước khi chuyển sang Gửi Đề Nghị.");
        return;
      }
      const res = await api.updateApplicationStatus(appId, { status: newStatus });
      if (res.success) {
        if (res.headcountInfo?.isFull && newStatus === 'hired') {
          toast.success(
            `🎉 Tuyệt vời! Đã tuyển đủ chỉ tiêu (${res.headcountInfo.hiredCount}/${res.headcountInfo.quantity}) cho vị trí "${res.headcountInfo.positionTitle}". Vị trí đã tự động đóng.`
          );
        } else {
          toast.success("Đã chuyển trạng thái sang: " + newStatus);
        }
        fetchData();
      }
    } catch (err) {
      toast.error("Lỗi cập nhật trạng thái: " + err.message);
    }
  };

  const openScheduleForm = (app) => {
    setScheduleApplication(app);
    setScheduleForm({ scheduledAt: defaultInterviewTime(), interviewer: "", round: "Phỏng vấn kỹ thuật", location: "Google Meet / Online" });
  };

  const openOfferForm = (app) => {
    const position = positions.find((item) => item._id === (app.positionId?._id || app.positionId));
    setOfferApplication(app);
    setOfferForm({
      offerSalary: app.offerSalary || position?.salary?.min || "",
      offerStartDate: app.offerStartDate?.slice(0, 10) || "",
      offerNote: app.offerNote || "",
      offerAccepted: Boolean(app.offerAccepted)
    });
  };

  const handleSaveOffer = async (event) => {
    event.preventDefault();
    setOfferSaving(true);
    try {
      await api.updateApplicationStatus(offerApplication._id, offerForm);
      toast.success("Đã lưu đề nghị làm việc.");
      setOfferApplication(null);
      await fetchData();
    } catch (err) {
      toast.error("Không lưu được đề nghị: " + err.message);
    } finally {
      setOfferSaving(false);
    }
  };

  const requestStatusChange = (app, newStatus) => {
    if (newStatus === "hired" && !app.offerAccepted) {
      toast.error("Hãy lưu đề nghị và xác nhận ứng viên đồng ý trước khi tuyển dụng.");
      return;
    }
    if (app.status === "screening" && newStatus === "interview" &&
        !pendingInterviewByApplication.has(app._id)) {
      openScheduleForm(app);
      return;
    }
    if (["hired", "rejected"].includes(newStatus) || app.status === "rejected") {
      setStatusConfirm({ isOpen: true, appId: app._id, newStatus, name: app.candidateId?.fullName || "ứng viên" });
      return;
    }
    handleStatusChange(app._id, newStatus);
  };

  const handleScheduleInterview = async (event) => {
    event.preventDefault();
    if (new Date(scheduleForm.scheduledAt).getTime() <= Date.now()) {
      toast.error("Hãy chọn thời gian phỏng vấn trong tương lai.");
      return;
    }
    setScheduleSaving(true);
    try {
      await api.createInterview({ applicationId: scheduleApplication._id, ...scheduleForm });
      const scheduledAt = scheduleForm.scheduledAt;
      setScheduleApplication(null);
      toast.success("Đã đặt lịch và chuyển hồ sơ sang Phỏng vấn.");
      await fetchData();
      onNavigate?.("interviews", { date: scheduledAt });
    } catch (err) {
      toast.error("Không đặt được lịch phỏng vấn: " + err.message);
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createApplication(formData);
      if (res.success) {
        toast.success("Tạo đơn ứng tuyển thành công!");
        setIsOpenModal(false);
        setFormData({
          candidateId: "",
          positionId: "",
          source: "Website",
          score: 80,
          note: ""
        });
        fetchData();
      }
    } catch (err) {
      toast.error("Lỗi tạo hồ sơ: " + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await api.deleteApplication(deleteConfirm.id);
      toast.success("Đã xóa đơn ứng tuyển");
      setDeleteConfirm({ isOpen: false, id: null, name: "" });
      fetchData();
    } catch (err) {
      toast.error("Lỗi khi xóa: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quy Trình Tuyển Dụng (Kanban)</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Lọc vị trí */}
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="w-full min-w-0 sm:w-auto sm:max-w-[260px] px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 shadow-2xs cursor-pointer"
          >
            <option value="">Tất cả vị trí việc làm</option>
            {positions.map((p) => (
              <option key={p._id} value={p._id}>
                {p.title} ({p.departmentId?.name || "Phòng ban"})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsOpenModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Nộp Hồ Sơ Mới
          </button>
        </div>
      </div>

      {/* 6 Kanban Columns */}
      <p className="md:hidden text-xs text-slate-500">Vuốt ngang để xem các giai đoạn tiếp theo.</p>
      <div className="flex gap-4 items-start overflow-x-auto pb-4">
        {COLUMNS.map((col, colIdx) => {
          const colApps = applications.filter((a) => a.status === col.id);

          return (
            <div
              key={col.id}
              className={"bg-slate-100/70 p-3 rounded-2xl border border-slate-200/80 flex flex-col min-h-[500px] min-w-[260px] flex-1 border-t-4 " + col.accentColor}
            >
              {/* Cột Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3 px-1">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 leading-tight">{col.title}</h3>
                  <span className="text-[10px] text-slate-400 font-medium">{col.subTitle}</span>
                </div>
                <span className="w-5 h-5 rounded-full bg-white text-slate-700 font-bold text-[10px] flex items-center justify-center border border-slate-200 shadow-2xs">
                  {colApps.length}
                </span>
              </div>

              {/* Danh sách Cards */}
              <div className="flex-1 space-y-3">
                {colApps.length === 0 ? (
                  <div className="py-10 text-center text-[11px] text-slate-400 italic">
                    Chưa có hồ sơ
                  </div>
                ) : (
                  colApps.map((app) => (
                    <div
                      key={app._id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all space-y-2.5 group"
                    >
                      {/* Tên ứng viên */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {app.candidateId?.fullName || "Chưa có tên"}
                          </h4>
                          <span className="text-[10px] text-indigo-700 font-medium line-clamp-1">
                            {app.positionId?.title || "Vị trí tuyển dụng"}
                          </span>
                        </div>
                        {user?.role === "admin" && (
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, id: app._id, name: app.candidateId?.fullName || "hồ sơ" })}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1 cursor-pointer"
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Điểm & Nguồn */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-600">
                          {app.source || "Website"}
                        </span>
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {app.score || 0}/100
                        </span>
                      </div>

                      {/* Ngày nộp hồ sơ và lịch phỏng vấn là hai mốc khác nhau */}
                      {(["applied", "screening", "interview"].includes(app.status) && pendingInterviewByApplication.has(app._id)) && (
                        <button type="button" onClick={() => onNavigate?.("interviews", { date: pendingInterviewByApplication.get(app._id).scheduledAt })}
                          className="text-[10px] font-semibold text-teal-700 hover:underline text-left cursor-pointer">
                          Lịch PV: {new Date(pendingInterviewByApplication.get(app._id).scheduledAt).toLocaleString("vi-VN", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </button>
                      )}

                      {app.status === "interview" && !pendingInterviewByApplication.has(app._id) &&
                        !interviews.some((iv) => (iv.applicationId?._id || iv.applicationId) === app._id && iv.result === "pass") && (
                        <button onClick={() => openScheduleForm(app)}
                          className="w-full text-[10px] font-semibold text-teal-700 hover:bg-teal-50 rounded-md py-1 cursor-pointer">
                          + Đặt lịch phỏng vấn
                        </button>
                      )}

                      {app.status === "accepted" && (
                        <button type="button" onClick={() => openOfferForm(app)} className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 underline underline-offset-2 cursor-pointer">
                            {app.offerSalary ? "Sửa đề nghị" : "Lập đề nghị"}
                        </button>
                      )}

                      {/* Phím chuyển trạng thái nhanh */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        {colIdx > 0 && colIdx < 4 &&
                          !(["interview", "accepted"].includes(app.status) && interviews.some((iv) =>
                            (iv.applicationId?._id || iv.applicationId) === app._id && iv.result === "pass")) && (
                          <button
                            onClick={() => requestStatusChange(app, COLUMNS[colIdx - 1].id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={"Lùi về " + COLUMNS[colIdx - 1].title}
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-[9px] text-slate-400 font-medium">
                          Nộp: {new Date(app.appliedAt).toLocaleDateString("vi-VN")}
                        </span>
                        {colIdx < 4 && (
                          <button
                            onClick={() => requestStatusChange(app, COLUMNS[colIdx + 1].id)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer ml-auto"
                            title={app.status === "accepted" && !app.offerAccepted ? "Lập đề nghị và xác nhận ứng viên đồng ý" : "Chuyển sang " + COLUMNS[colIdx + 1].title}
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {colIdx < 4 && (
                        <button
                          onClick={() => requestStatusChange(app, "rejected")}
                          className="w-full text-[10px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md py-1 cursor-pointer"
                        >
                          Từ chối hồ sơ
                        </button>
                      )}

                      {app.status === "rejected" && (
                        <button
                          onClick={() => requestStatusChange(app, "screening")}
                          className="w-full text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-md py-1 cursor-pointer"
                        >
                          Mở lại ở bước sơ loại
                        </button>
                      )}

                      {/* API đã tự tạo hồ sơ nhân viên khi chuyển sang hired */}
                      {app.status === "hired" && (
                        <button
                          onClick={() => onNavigate?.("employees", { employee: { candidateId: app.candidateId?._id, positionId: app.positionId?._id, name: app.candidateId?.fullName } })}
                          className="w-full mt-1.5 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Xem hồ sơ nhân viên
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {offerApplication && (
        <Modal label="Đề nghị làm việc" onClose={() => setOfferApplication(null)} busy={offerSaving} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 id="offer-title" className="font-bold text-sm text-slate-900">Đề nghị làm việc</h3>
              <button type="button" onClick={() => setOfferApplication(null)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Đóng"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-600 mt-3">{offerApplication.candidateId?.fullName} — {offerApplication.positionId?.title}</p>
            <form onSubmit={handleSaveOffer} className="space-y-4 mt-4 text-xs">
              <label className="block font-semibold text-slate-700">Lương đề nghị (VND/tháng) *
                <input type="number" required min="1" step="1" value={offerForm.offerSalary}
                  onChange={(e) => setOfferForm({ ...offerForm, offerSalary: e.target.value, offerAccepted: false })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </label>
              <label className="block font-semibold text-slate-700">Ngày nhận việc *
                <input type="date" required value={offerForm.offerStartDate}
                  onInput={(e) => setOfferForm({ ...offerForm, offerStartDate: e.target.value, offerAccepted: false })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </label>
              <label className="block font-semibold text-slate-700">Ghi chú đề nghị
                <textarea value={offerForm.offerNote} onChange={(e) => setOfferForm({ ...offerForm, offerNote: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl" rows="2" />
              </label>
              <label className="flex items-start gap-2 text-slate-700 cursor-pointer">
                <input type="checkbox" checked={offerForm.offerAccepted}
                  onChange={(e) => setOfferForm({ ...offerForm, offerAccepted: e.target.checked })} className="mt-0.5" />
                <span>Ứng viên đã đồng ý với đề nghị</span>
              </label>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" disabled={offerSaving} onClick={() => setOfferApplication(null)} className="px-4 py-2 font-semibold text-slate-600">Hủy</button>
                <button type="submit" disabled={offerSaving} className="px-5 py-2 font-semibold bg-indigo-600 text-white rounded-xl disabled:opacity-50">{offerSaving ? "Đang lưu..." : "Lưu đề nghị"}</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {scheduleApplication && (
        <Modal label="Đặt lịch phỏng vấn" onClose={() => setScheduleApplication(null)} busy={scheduleSaving} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Đặt lịch phỏng vấn</h3>
              <button type="button" onClick={() => setScheduleApplication(null)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-3">{scheduleApplication.candidateId?.fullName} — {scheduleApplication.positionId?.title}</p>
            <form onSubmit={handleScheduleInterview} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày và giờ phỏng vấn *</label>
                <input type="datetime-local" required value={scheduleForm.scheduledAt}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Người phỏng vấn *</label>
                <input type="text" required value={scheduleForm.interviewer}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl" placeholder="Tên người phỏng vấn" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vòng phỏng vấn</label>
                <input type="text" value={scheduleForm.round}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, round: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa điểm / Link họp</label>
                <input type="text" value={scheduleForm.location}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" disabled={scheduleSaving} onClick={() => setScheduleApplication(null)} className="px-4 py-2 font-semibold text-slate-600">Hủy</button>
                <button type="submit" disabled={scheduleSaving} className="px-5 py-2 font-semibold bg-indigo-600 text-white rounded-xl disabled:opacity-50">
                  {scheduleSaving ? "Đang lưu..." : "Xác nhận đặt lịch"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Modal Nộp Hồ Sơ Mới */}
      {isOpenModal && (
        <Modal label="Nộp hồ sơ mới" onClose={() => setIsOpenModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Tiếp Nhận Đơn Ứng Tuyển Mới</h3>
              <button aria-label="Đóng" onClick={() => setIsOpenModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn Ứng Viên *</label>
                <select
                  required
                  value={formData.candidateId}
                  onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Chọn ứng viên đã có trong hệ thống --</option>
                  {candidates.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.fullName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vị Trí Tuyển Dụng *</label>
                <select
                  required
                  value={formData.positionId}
                  onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Chọn vị trí việc làm --</option>
                  {positions.filter((p) => p.status === "open").map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title} - {p.departmentId?.name || "Phòng ban"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kênh Tuyển Dụng</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="Website">Website Công Ty</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="TopCV">TopCV</option>
                    <option value="VietnamWorks">VietnamWorks</option>
                    <option value="Referral">Nội Bộ Giới Thiệu</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm Đánh Giá Sơ Bộ</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi Chú Tiếp Nhận</label>
                <textarea
                  rows="2"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="Ghi chú thêm về CV..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Xác Nhận Nộp
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Xóa hồ sơ ứng tuyển"
        message={"Bạn có chắc chắn muốn xóa hồ sơ ứng tuyển của ứng viên \"" + deleteConfirm.name + "\"? Mọi kết quả phỏng vấn liên quan cũng sẽ bị xóa."}
        confirmText="Xác nhận xóa"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, name: "" })}
      />
      <ConfirmDialog
        isOpen={statusConfirm.isOpen}
        title="Xác nhận đổi trạng thái"
        message={`Chuyển hồ sơ của ${statusConfirm.name} sang ${COLUMNS.find((col) => col.id === statusConfirm.newStatus)?.title || "trạng thái mới"}?`}
        confirmText="Xác nhận chuyển"
        onConfirm={() => {
          const { appId, newStatus } = statusConfirm;
          setStatusConfirm({ isOpen: false, appId: null, newStatus: null, name: "" });
          handleStatusChange(appId, newStatus);
        }}
        onCancel={() => setStatusConfirm({ isOpen: false, appId: null, newStatus: null, name: "" })}
      />
    </div>
  );
};

export default Applications;
