import React, { useState, useEffect } from "react";
import { Modal } from "../components/ui/Modal";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Badge } from "../components/ui/Badge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableSkeleton } from "../components/ui/Skeleton";
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Briefcase, 
  Building, 
  DollarSign, 
  Users, 
  Calendar,
  X,
  MapPin,
  Clock,
  ChevronRight
} from "lucide-react";

const Positions = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const toast = useToast();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    departmentId: "",
    requirements: "",
    salaryMin: 15000000,
    salaryMax: 25000000,
    quantity: 1,
    status: "open",
    description: "",
    location: "Hà Nội",
    level: "Middle"
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null,
    title: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [posRes, deptRes, appRes] = await Promise.all([
        api.getPositions(),
        api.getDepartments(),
        api.getApplications()
      ]);
      if (posRes.success && appRes.success) {
        const hiredCount = new Map();
        for (const application of appRes.data) {
          if (application.status !== "hired") continue;
          const id = application.positionId?._id || application.positionId;
          hiredCount.set(id, (hiredCount.get(id) || 0) + 1);
        }
        setPositions(posRes.data.map((position) => ({ ...position, hiredCount: hiredCount.get(position._id) || 0 })));
      }
      if (deptRes.success) setDepartments(deptRes.data);
    } catch (err) {
      toast.error("Lỗi khi tải danh sách vị trí: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: "",
      departmentId: departments[0]?._id || "",
      requirements: "",
      salaryMin: 15000000,
      salaryMax: 25000000,
      quantity: 1,
      status: "open",
      description: "",
      location: "Hà Nội",
      level: "Middle"
    });
    setIsOpenModal(true);
  };

  const getSalaryMin = (pos) => {
    if (pos.salary && typeof pos.salary.min === "number") return pos.salary.min;
    if (typeof pos.salaryMin === "number") return pos.salaryMin;
    return 0;
  };

  const getSalaryMax = (pos) => {
    if (pos.salary && typeof pos.salary.max === "number") return pos.salary.max;
    if (typeof pos.salaryMax === "number") return pos.salaryMax;
    return 0;
  };

  const handleOpenEdit = (pos) => {
    setEditingId(pos._id);
    setFormData({
      title: pos.title,
      departmentId: pos.departmentId?._id || pos.departmentId,
      requirements: (pos.requirements || []).join(", "),
      salaryMin: getSalaryMin(pos) || 15000000,
      salaryMax: getSalaryMax(pos) || 25000000,
      quantity: pos.quantity || 1,
      status: pos.status || "open",
      description: pos.description || "",
      location: pos.location || "Hà Nội",
      level: pos.level || "Middle"
    });
    setIsOpenModal(true);
  };

  const handleToggleStatus = async (pos, e) => {
    e?.stopPropagation();
    const nextStatus = pos.status === "open" ? "closed" : "open";
    try {
      await api.updatePosition(pos._id, { status: nextStatus });
      toast.success(
        `Đã ${nextStatus === "open" ? "mở lại" : "đóng"} vị trí tuyển dụng: ${pos.title}`
      );
      fetchData();
    } catch (err) {
      toast.error("Lỗi đổi trạng thái: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sMin = Number(formData.salaryMin);
    const sMax = Number(formData.salaryMax);
    if (sMin < 0 || sMax < sMin) {
      toast.error("Mức lương tối đa phải lớn hơn hoặc bằng mức tối thiểu.");
      return;
    }
    const payload = {
      ...formData,
      requirements: formData.requirements.split(",").map((r) => r.trim()).filter(Boolean),
      salaryMin: sMin,
      salaryMax: sMax,
      quantity: Number(formData.quantity),
      salary: {
        min: sMin,
        max: sMax
      }
    };

    try {
      if (editingId) {
        await api.updatePosition(editingId, payload);
        toast.success("Cập nhật vị trí thành công!");
      } else {
        await api.createPosition(payload);
        toast.success("Đăng tin tuyển dụng thành công!");
      }
      setIsOpenModal(false);
      fetchData();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await api.deletePosition(deleteConfirm.id);
      toast.success("Đã xóa vị trí tuyển dụng");
      setDeleteConfirm({ isOpen: false, id: null, title: "" });
      fetchData();
    } catch (err) {
      toast.error("Lỗi xóa vị trí: " + err.message);
    }
  };

  const filteredPositions = positions.filter((pos) => {
    const matchSearch = pos.title?.toLowerCase().includes(search.toLowerCase());
    const deptId = pos.departmentId?._id || pos.departmentId;
    const matchDept = !selectedDept || deptId === selectedDept;
    return matchSearch && matchDept;
  });

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return "0 triệu";
    return (val / 1000000).toLocaleString("vi-VN") + " triệu";
  };

  const displaySalary = (pos) => {
    const min = getSalaryMin(pos);
    const max = getSalaryMax(pos);
    if (!min && !max) return "Thỏa thuận";
    return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Vị Trí Tuyển Dụng</h2>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Đăng Vị Trí Mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề việc làm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("grid")}
            className={"px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer " + (
              viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Dạng Lưới
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={"px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer " + (
              viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Dạng Bảng
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : filteredPositions.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Không tìm thấy vị trí tuyển dụng</h3>
          <p className="text-xs text-slate-400">Hãy tạo vị trí đầu tiên hoặc thay đổi bộ lọc</p>
        </div>
      ) : viewMode === "grid" ? (
        /* Dạng thẻ Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPositions.map((pos) => (
            <div
              key={pos._id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                {/* Hàng 1: Phòng ban (Trái) & Nút Đóng/Mở (Phải) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100/80 truncate max-w-[200px]">
                    <Building className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{pos.departmentId?.name || "Bộ phận"}</span>
                  </span>

                  <button
                    onClick={(e) => handleToggleStatus(pos, e)}
                    title={`Nhấn để chuyển sang: ${pos.status === "open" ? "Đóng vị trí này" : "Mở lại vị trí này"}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border shrink-0 ${
                      pos.status === "open"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        pos.status === "open" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    <span>{pos.status === "open" ? "Đang mở" : pos.status === "paused" ? "Tạm ngưng" : pos.closedByQuota ? "Đã đủ chỉ tiêu" : "Đã đóng"}</span>
                  </button>
                </div>

                {/* Hàng 2: Tiêu đề công việc */}
                <div>
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {pos.title}
                  </h3>

                  {/* Hàng 3: Chỉ tiêu tuyển dụng & Cấp bậc & Địa điểm */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                      <Users className="w-3 h-3 text-slate-400" />
                      Đã tuyển: <strong className="text-slate-800 font-bold">{pos.hiredCount || 0}/{pos.quantity || 1}</strong>
                    </span>
                    {pos.level && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {pos.level}
                      </span>
                    )}
                    {pos.location && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3" />
                        {pos.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mô tả ngắn */}
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {pos.description || "Chưa có mô tả công việc cụ thể."}
                </p>

                {/* Yêu cầu kỹ năng (chips) */}
                <div className="flex flex-wrap gap-1">
                  {(pos.requirements || []).slice(0, 3).map((req, i) => (
                    <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {req}
                    </span>
                  ))}
                  {(pos.requirements || []).length > 3 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                      +{pos.requirements.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Thẻ: Lương (Trái) & Nút thao tác (Phải) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="font-bold text-sm text-emerald-700">
                  {displaySalary(pos)}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(pos)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    title="Sửa vị trí"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {user?.role === "admin" && (
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, id: pos._id, title: pos.title })}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa vị trí"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Dạng bảng Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-3 px-5">Vị Trí Tuyển</th>
                <th className="py-3 px-4">Phòng Ban</th>
                <th className="py-3 px-4 text-center">Chỉ Tiêu</th>
                <th className="py-3 px-4">Mức Lương Dự Kiến</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPositions.map((pos) => (
                <tr key={pos._id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-slate-900">{pos.title}</td>
                  <td className="py-3.5 px-4">{pos.departmentId?.name || "N/A"}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      <Users className="w-3 h-3 text-slate-400" />
                      {pos.hiredCount || 0}/{pos.quantity || 1}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-700">
                    {displaySalary(pos)}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={(e) => handleToggleStatus(pos, e)}
                      title={`Nhấn để chuyển sang: ${pos.status === "open" ? "Đóng vị trí này" : "Mở lại vị trí này"}`}
                      className="cursor-pointer group/btn transition-transform hover:scale-105 active:scale-95"
                    >
                      <Badge status={pos.status}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              pos.status === "open" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          <span>{pos.status === "open" ? "Đang mở" : pos.status === "paused" ? "Tạm ngưng" : "Đã đóng"}</span>
                          <span className="text-[9px] opacity-50 group-hover/btn:opacity-100 underline ml-0.5">
                            (Đổi)
                          </span>
                        </span>
                      </Badge>
                    </button>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(pos)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {user?.role === "admin" && (
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, id: pos._id, title: pos.title })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Xóa vị trí"
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
      )}

      {/* Modal Thêm/Sửa Vị Trí */}
      {isOpenModal && (
        <Modal label="Vị trí tuyển dụng" onClose={() => setIsOpenModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingId ? "Cập Nhật Vị Trí Việc Làm" : "Đăng Tuyển Vị Trí Mới"}
              </h3>
              <button aria-label="Đóng" onClick={() => setIsOpenModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chức Danh Công Việc *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Ví dụ: Senior Backend Developer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng Ban *</label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng Thái Đăng Tuyển</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="open">Đang mở (Open)</option>
                    <option value="closed">Tạm đóng (Closed)</option>
                    <option value="paused">Tạm ngưng (Paused)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chỉ tiêu tuyển dụng *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cấp bậc</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    {["Intern", "Fresher", "Junior", "Middle", "Senior", "Lead"].map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lương Tối Thiểu (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={formData.salaryMin}
                    onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lương Tối Đa (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={formData.salaryMax}
                    onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Yêu Cầu Kỹ Năng (Phân cách bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="3+ năm Node.js, MongoDB, Docker..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô Tả Công Việc</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="Mô tả trách nhiệm chính và quyền lợi..."
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
                  Lưu Vị Trí
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Xóa vị trí việc làm"
        message={"Bạn có chắc chắn muốn xóa vị trí \"" + deleteConfirm.title + "\"? Mọi hồ sơ ứng tuyển liên quan có thể bị ảnh hưởng."}
        confirmText="Xác nhận xóa"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, title: "" })}
      />
    </div>
  );
};

export default Positions;
