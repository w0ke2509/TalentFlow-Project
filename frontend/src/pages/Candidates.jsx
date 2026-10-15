import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Badge } from "../components/ui/Badge";
import { SlideOver } from "../components/ui/SlideOver";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableSkeleton } from "../components/ui/Skeleton";
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Mail, 
  Phone, 
  Filter, 
  GraduationCap, 
  Briefcase,
  MapPin,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Building,
  User,
  Sparkles,
  ChevronRight,
  Download,
  FileSpreadsheet,
  X
} from "lucide-react";
import { exportCandidatesData } from "../utils/exportHelper";

const Candidates = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [minExp, setMinExp] = useState("");
  const toast = useToast();

  // SlideOver drawer xem chi tiết
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isOpenDrawer, setIsOpenDrawer] = useState(false);

  // Modal Create/Edit
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "male",
    skills: "",
    experienceYears: 0,
    education: "Đại học",
    address: "",
    notes: "",
    experienceList: []
  });

  // Confirm delete dialog
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null,
    name: "",
    loading: false
  });

  const [copiedField, setCopiedField] = useState(null);

  const getCandidateStatusLabel = (status) => {
    const map = {
      applied: "Mới nộp",
      screening: "Sơ loại CV",
      interview: "Phỏng vấn",
      accepted: "Gửi đề nghị",
      hired: "Đã tuyển dụng",
      rejected: "Không phù hợp"
    };
    return map[status?.toLowerCase()] || status || "Mới nộp";
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await api.getCandidates({
        search: search || undefined,
        skill: selectedSkill || undefined,
        minExp: minExp || undefined
      });
      if (res.success) {
        setCandidates(res.data);
      }
    } catch (err) {
      toast.error("Lỗi khi tải danh sách ứng viên: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedSkill, minExp]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      gender: "male",
      skills: "",
      experienceYears: 0,
      education: "Đại học",
      address: "",
      notes: "",
      experienceList: []
    });
    setIsOpenModal(true);
  };

  const handleOpenEdit = (cand, e) => {
    e?.stopPropagation();
    setEditingId(cand._id);
    setFormData({
      fullName: cand.fullName,
      email: cand.email,
      phone: cand.phone,
      gender: cand.gender || "male",
      skills: cand.skills?.join(", ") || "",
      experienceYears: cand.experienceYears || 0,
      education: cand.education || "Đại học",
      address: cand.address || "",
      notes: cand.notes || "",
      experienceList: cand.experience || []
    });
    setIsOpenModal(true);
  };

  const handleViewDetail = (cand) => {
    setSelectedCandidate(cand);
    setIsOpenDrawer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
      experienceYears: Number(formData.experienceYears),
      experience: formData.experienceList
    };

    try {
      if (editingId) {
        await api.updateCandidate(editingId, payload);
        toast.success("Cập nhật ứng viên thành công!");
      } else {
        await api.createCandidate(payload);
        toast.success("Thêm ứng viên mới thành công!");
      }
      setIsOpenModal(false);
      fetchCandidates();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  const handleDeleteClick = (cand, e) => {
    e?.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      id: cand._id,
      name: cand.fullName,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteConfirm((prev) => ({ ...prev, loading: true }));
      await api.deleteCandidate(deleteConfirm.id);
      toast.success("Đã xóa ứng viên " + deleteConfirm.name);
      setDeleteConfirm({ isOpen: false, id: null, name: "", loading: false });
      if (selectedCandidate?._id === deleteConfirm.id) {
        setIsOpenDrawer(false);
      }
      fetchCandidates();
    } catch (err) {
      toast.error("Lỗi khi xóa: " + err.message);
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const copyToClipboard = (text, fieldName, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.info("Đã sao chép: " + text);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExportExcel = () => {
    try {
      exportCandidatesData(candidates);
      toast.success("Đã xuất file Excel (.xlsx) thành công!");
    } catch (err) {
      toast.error(err.message || "Lỗi khi xuất dữ liệu");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hồ Sơ Ứng Viên</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={candidates.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Xuất danh sách hồ sơ ứng viên ra file Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 transition-transform group-hover:scale-110" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm Ứng Viên Mới
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <input
            type="text"
            placeholder="Lọc kỹ năng (Node.js, React...)"
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-44"
          />

          <select
            value={minExp}
            onChange={(e) => setMinExp(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          >
            <option value="">Tất cả kinh nghiệm</option>
            <option value="1">1+ năm kinh nghiệm</option>
            <option value="3">3+ năm kinh nghiệm</option>
            <option value="5">5+ năm kinh nghiệm</option>
          </select>
        </div>
      </div>

      {/* Candidates Data Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : candidates.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Không tìm thấy ứng viên nào</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc bấm thêm mới để lưu trữ hồ sơ đầu tiên
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-5">Ứng Viên</th>
                  <th className="py-3.5 px-4">Liên Hệ</th>
                  <th className="py-3.5 px-4">Kinh Nghiệm</th>
                  <th className="py-3.5 px-4">Kỹ Năng (Array Tag)</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {candidates.map((cand) => (
                  <tr
                    key={cand._id}
                    onClick={() => handleViewDetail(cand)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Tên & Avatar */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                          {cand.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {cand.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>{cand.education || "Đại học"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Liên hệ */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div
                          onClick={(e) => copyToClipboard(cand.email, cand._id + "-email", e)}
                          className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 cursor-pointer text-[11px]"
                          title="Click để copy email"
                        >
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[150px]">{cand.email}</span>
                          {copiedField === cand._id + "-email" && <Check className="w-3 h-3 text-emerald-600" />}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cand.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* Thâm niên */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-semibold text-slate-800 text-xs">
                          {cand.experienceYears > 0 ? `${cand.experienceYears} năm kinh nghiệm` : "Chưa có kinh nghiệm"}
                        </span>
                      </div>
                    </td>

                    {/* Kỹ năng */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(cand.skills || []).slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium border border-slate-200/60"
                          >
                            {skill}
                          </span>
                        ))}
                        {(cand.skills || []).length > 3 && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-100">
                            +{cand.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <Badge status={(cand.currentStatus || "applied").toLowerCase()}>
                          {getCandidateStatusLabel(cand.currentStatus)}
                        </Badge>
                        {cand.appliedPosition && (
                          <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]" title={cand.appliedPosition}>
                            {cand.appliedPosition}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => handleOpenEdit(cand, e)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {user?.role === "admin" && (
                          <button
                            onClick={(e) => handleDeleteClick(cand, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SlideOver Xem Chi Tiết Ứng Viên */}
      <SlideOver
        isOpen={isOpenDrawer}
        onClose={() => setIsOpenDrawer(false)}
        title={selectedCandidate?.fullName || "Chi tiết ứng viên"}
        subtitle={"ID: " + selectedCandidate?._id}
        footer={
          <>
            <button
              onClick={() => setIsOpenDrawer(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={(e) => {
                setIsOpenDrawer(false);
                handleOpenEdit(selectedCandidate, e);
              }}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa hồ sơ
            </button>
          </>
        }
      >
        {selectedCandidate && (
          <div className="space-y-6 text-xs text-slate-700">
            {/* Thẻ tóm tắt thông tin */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{selectedCandidate.fullName}</span>
                <Badge status={(selectedCandidate.currentStatus || "applied").toLowerCase()}>
                  {selectedCandidate.currentStatus || "Mới nộp"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{selectedCandidate.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCandidate.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCandidate.experienceYears} năm kinh nghiệm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCandidate.education || "Đại học"}</span>
                </div>
              </div>
            </div>

            {/* Mảng kỹ năng (skills array) */}
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">
                Tập Kỹ Năng (Multikey Index Array)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(selectedCandidate.skills || []).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-xs border border-indigo-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Lịch sử công tác lồng nhau (Subdocument Array) */}
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-3">
                Lịch Sử Công Tác (Embedded Subdocuments)
              </h4>
              {(selectedCandidate.experience || []).length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400">
                  Chưa có thông tin lịch sử công tác
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {selectedCandidate.experience.map((exp, idx) => (
                    <div key={idx} className="relative flex items-start gap-3.5 pl-1">
                      <div className="w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shrink-0 z-10 text-[10px] font-bold text-indigo-600">
                        {idx + 1}
                      </div>
                      <div className="flex-1 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-900">{exp.position}</h5>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {exp.startDate ? new Date(exp.startDate).getFullYear() : "N/A"} - {exp.endDate ? new Date(exp.endDate).getFullYear() : "Hiện tại"}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-indigo-700 mt-0.5 flex items-center gap-1">
                          <Building className="w-3 h-3" /> {exp.company}
                        </div>
                        {exp.description && (
                          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ghi chú */}
            {selectedCandidate.notes && (
              <div>
                <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-1">
                  Ghi Chú Đánh Giá
                </h4>
                <p className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-slate-700 leading-relaxed">
                  {selectedCandidate.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* Modal Create/Edit */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingId ? "Cập Nhật Hồ Sơ Ứng Viên" : "Thêm Ứng Viên Mới"}
              </h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="ungvien@example.com"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="0912345678"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số năm kinh nghiệm</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trình độ học vấn</label>
                  <select
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Đại học">Đại học</option>
                    <option value="Cao đẳng">Cao đẳng</option>
                    <option value="Thạc sĩ">Thạc sĩ</option>
                    <option value="Tiến sĩ">Tiến sĩ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Danh sách kỹ năng (Phân cách bởi dấu phẩy) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Node.js, React, MongoDB, Docker"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Hà Nội / TP.HCM"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú tuyển dụng</label>
                <textarea
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Nhận xét sơ lược về hồ sơ..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                  {editingId ? "Lưu Thay Đổi" : "Tạo Hồ Sơ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Xóa hồ sơ ứng viên"
        message={"Bạn có chắc chắn muốn xóa vĩnh viễn ứng viên \"" + deleteConfirm.name + "\" khỏi cơ sở dữ liệu? Thao tác này không thể hoàn tác."}
        confirmText="Xác nhận xóa"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, name: "", loading: false })}
      />
    </div>
  );
};

export default Candidates;
