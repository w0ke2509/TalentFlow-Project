import React, { useState, useEffect } from "react";
import { Modal } from "../components/ui/Modal";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { Badge } from "../components/ui/Badge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableSkeleton } from "../components/ui/Skeleton";
import { 
  Users, 
  Building2, 
  Briefcase, 
  DollarSign, 
  Calendar, 
  Mail, 
  Plus, 
  Edit3, 
  Trash2, 
  UserCheck,
  Search,
  CheckCircle2,
  X,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { exportEmployeesData } from "../utils/exportHelper";

const Employees = ({ focusEmployee, onNavigate }) => {
  const [activeTab, setActiveTab] = useState("employees"); // employees | departments
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(focusEmployee?.name || "");
  const [selectedDeptForModal, setSelectedDeptForModal] = useState(null);
  const toast = useToast();

  // Modal Employee
  const [isOpenEmpModal, setIsOpenEmpModal] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const ROLE_LABELS = {
    admin: "Quản trị",
    hr: "Nhân sự",
    interviewer: "Interviewer",
    employee: "Nhân viên"
  };

  const [empForm, setEmpForm] = useState({
    candidateId: "",
    fullName: "",
    email: "",
    role: "employee",
    departmentId: "",
    positionId: "",
    startDate: new Date().toISOString().split("T")[0],
    status: "probation",
    officialSalary: 20000000
  });

  // Modal Department
  const [isOpenDeptModal, setIsOpenDeptModal] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    description: "",
    manager: "Trưởng phòng"
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: "employee", // employee | department
    id: null,
    name: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, posRes] = await Promise.all([
        api.getEmployees(),
        api.getDepartments(),
        api.getPositions()
      ]);
      if (empRes.success) setEmployees(empRes.data);
      if (deptRes.success) setDepartments(deptRes.data);
      if (posRes.success) setPositions(posRes.data);
    } catch (err) {
      toast.error("Lỗi khi tải dữ liệu nhân sự: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler Employee
  const handleOpenCreateEmp = () => {
    setEditingEmpId(null);
    const departmentId = departments[0]?._id || "";
    const firstPosition = positions.find((position) => (position.departmentId?._id || position.departmentId) === departmentId);
    setEmpForm({
      candidateId: "",
      fullName: "",
      email: "",
      role: "employee",
      departmentId,
      positionId: firstPosition?._id || "",
      startDate: new Date().toISOString().split("T")[0],
      status: "probation",
      officialSalary: 20000000
    });
    setIsOpenEmpModal(true);
  };

  const handleOpenEditEmp = (emp) => {
    setEditingEmpId(emp._id);
    const role = emp.role || "employee";
    setEmpForm({
      candidateId: emp.candidateId?._id || "",
      fullName: emp.fullName,
      email: emp.email,
      role: role,
      departmentId: emp.departmentId?._id || emp.departmentId,
      positionId: emp.positionId?._id || emp.positionId,
      startDate: emp.startDate ? new Date(emp.startDate).toISOString().split("T")[0] : "",
      status: role !== "employee" ? "active" : (emp.status || "probation"),
      officialSalary: emp.officialSalary || 20000000
    });
    setIsOpenEmpModal(true);
  };

  const handleSubmitEmp = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...empForm,
        status: empForm.role !== "employee" ? "active" : empForm.status,
        officialSalary: Number(empForm.officialSalary)
      };
      if (!payload.candidateId) delete payload.candidateId;

      if (editingEmpId) {
        await api.updateEmployee(editingEmpId, payload);
        toast.success("Cập nhật thông tin nhân viên thành công!");
      } else {
        await api.createEmployee(payload);
        toast.success("Thêm nhân viên mới thành công!");
      }
      setIsOpenEmpModal(false);
      fetchData();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  // Handler Department
  const handleOpenCreateDept = () => {
    setEditingDeptId(null);
    setDeptForm({
      name: "",
      code: "",
      description: "",
      manager: "Trưởng phòng"
    });
    setIsOpenDeptModal(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDeptId(dept._id);
    setDeptForm({
      name: dept.name,
      code: dept.code || "",
      description: dept.description || "",
      manager: dept.manager || ""
    });
    setIsOpenDeptModal(true);
  };

  const handleSubmitDept = async (e) => {
    e.preventDefault();
    try {
      if (editingDeptId) {
        await api.updateDepartment(editingDeptId, deptForm);
        toast.success("Cập nhật phòng ban thành công!");
      } else {
        await api.createDepartment(deptForm);
        toast.success("Thêm phòng ban mới thành công!");
      }
      setIsOpenDeptModal(false);
      fetchData();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      if (deleteConfirm.type === "employee") {
        await api.deleteEmployee(deleteConfirm.id);
        toast.success("Đã xóa hồ sơ nhân viên");
      } else {
        await api.deleteDepartment(deleteConfirm.id);
        toast.success("Đã xóa phòng ban");
      }
      setDeleteConfirm({ isOpen: false, type: "employee", id: null, name: "" });
      fetchData();
    } catch (err) {
      toast.error("Lỗi khi xóa: " + err.message);
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    (!focusEmployee || ((emp.candidateId?._id || emp.candidateId) === focusEmployee.candidateId &&
      (emp.positionId?._id || emp.positionId) === focusEmployee.positionId)) &&
    (!search || emp.fullName?.toLowerCase().includes(search.toLowerCase()) || emp.email?.toLowerCase().includes(search.toLowerCase()))
  );
  const focusedEmployee = focusEmployee && employees.find((emp) =>
    (emp.candidateId?._id || emp.candidateId) === focusEmployee.candidateId &&
    (emp.positionId?._id || emp.positionId) === focusEmployee.positionId
  );

  const handleExportExcel = () => {
    try {
      exportEmployeesData(employees);
      toast.success("Đã xuất file Excel (.xlsx) thành công!");
    } catch (err) {
      toast.error(err.message || "Lỗi khi xuất dữ liệu");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Nhân Viên & Phòng Ban
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "employees" && (
            <>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={employees.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Xuất danh sách nhân sự ra file Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 transition-transform group-hover:scale-110" />
                <span>Xuất Excel</span>
              </button>
              <button
                onClick={handleOpenCreateEmp}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Thêm Nhân Viên Mới
              </button>
            </>
          )}
          {activeTab === "departments" && (
            <button
              onClick={handleOpenCreateDept}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm Phòng Ban
            </button>
          )}
        </div>
      </div>

      {/* Tabs Chuyển đổi giữa Employees và Departments */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("employees")}
            className={"px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 " + (
              activeTab === "employees"
                ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/20"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <UserCheck className="w-4 h-4" />
            <span>Nhân Viên ({employees.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={"px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 " + (
              activeTab === "departments"
                ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/20"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Cơ Cấu Phòng Ban ({departments.length})</span>
          </button>
        </div>

        {activeTab === "employees" && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        )}
      </div>

      {focusEmployee && activeTab === "employees" && !loading && (
        <div className={`rounded-xl border p-3 text-xs flex flex-wrap items-center justify-between gap-2 ${focusedEmployee ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
          <span>{focusedEmployee
            ? `Đã tìm thấy hồ sơ nhân viên của ${focusEmployee.name || focusedEmployee.fullName} bên dưới.`
            : `Chưa có hồ sơ nhân viên khớp với ${focusEmployee.name || "ứng viên này"} và vị trí đã tuyển. Dữ liệu Kanban và nhân viên cần được đối chiếu.`}</span>
          <button type="button" onClick={() => onNavigate?.("employees")} className="font-bold underline cursor-pointer">Xem tất cả nhân viên</button>
        </div>
      )}
      {/* Nội dung Tab Employees */}
      {activeTab === "employees" ? (
        loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">{focusEmployee ? "Không có hồ sơ nhân viên cho vị trí này" : search ? "Không tìm thấy nhân viên phù hợp" : "Chưa có nhân viên nào"}</h3>
            <p className="text-xs text-slate-400">
              {focusEmployee ? "Hãy đối chiếu hồ sơ đã tuyển trong Kanban trước khi cập nhật dữ liệu." : search ? "Thử tên hoặc email khác." : "Hãy bấm Thêm Nhân Viên Mới hoặc tiếp nhận ứng viên từ quy trình tuyển dụng."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-5">Nhân Viên</th>
                  <th className="py-3 px-4">Phòng Ban & Chức Danh</th>
                  <th className="py-3 px-4">Lương Chính Thức</th>
                  <th className="py-3 px-4">Ngày Nhận Việc</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100">
                          {emp.fullName?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{emp.fullName}</div>
                          <div className="text-[11px] text-slate-400">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {emp.positionId?.title || "Chuyên viên"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {emp.departmentId?.name || "Phòng ban"}
                      </div>
                    </td>
                    <td className="font-mono tabular-nums py-3.5 px-4 font-bold text-emerald-700">
                      {(emp.officialSalary || 0).toLocaleString("vi-VN")} VNĐ
                    </td>
                    <td className="font-mono tabular-nums py-3.5 px-4 text-slate-500">
                      {emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "N/A"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={emp.role || "employee"}>
                        {ROLE_LABELS[emp.role] || "Nhân viên"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={emp.status}>
                        {emp.status === "probation" ? "Thử việc" : emp.status === "active" ? "Chính thức" : "Đã nghỉ"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button aria-label="Sửa nhân viên"
                          onClick={() => handleOpenEditEmp(emp)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button aria-label="Xóa nhân viên"
                          onClick={() => setDeleteConfirm({ isOpen: true, type: "employee", id: emp._id, name: emp.fullName })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Nội dung Tab Departments */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const deptEmps = employees.filter((e) => (e.departmentId?._id || e.departmentId) === dept._id);
            const deptPositions = positions.filter((p) => (p.departmentId?._id || p.departmentId) === dept._id);

            return (
              <div
                key={dept._id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        Mã: {dept.code || "DEPT"}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">{dept.name}</h3>
                    </div>
                    <button
                      onClick={() => handleOpenEditDept(dept)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      title="Sửa phòng ban"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {dept.description || "Phòng ban phụ trách các chức năng chuyên môn trong doanh nghiệp."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Nhân sự hiện hữu:</span>
                      <span className="font-bold text-slate-800">{deptEmps.length} nhân viên</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Vị trí tuyển:</span>
                      <span className="font-bold text-indigo-600">{deptPositions.length} vị trí</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>Trưởng bộ phận:</span>
                  <span className="font-semibold text-slate-700">{dept.manager || "Đang kiện toàn"}</span>
                </div>

                {/* Nút xem danh sách nhân sự của phòng ban */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedDeptForModal(dept)}
                    className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-100"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Xem {deptEmps.length} nhân viên</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm/Sửa Employee */}
      {isOpenEmpModal && (
        <Modal label="Thông tin nhân viên" onClose={() => setIsOpenEmpModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingEmpId ? "Cập Nhật Thông Tin Nhân Viên" : "Tiếp Nhận Nhân Viên Mới"}
              </h3>
              <button aria-label="Đóng" onClick={() => setIsOpenEmpModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEmp} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={empForm.fullName}
                    onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vai trò *</label>
                <select
                  required
                  value={empForm.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setEmpForm((prev) => ({
                      ...prev,
                      role: newRole,
                      status: newRole !== "employee" ? "active" : prev.status
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="admin">Quản trị</option>
                  <option value="hr">Nhân sự</option>
                  <option value="interviewer">Interviewer</option>
                  <option value="employee">Nhân viên</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng Ban *</label>
                  <select
                    required
                    value={empForm.departmentId}
                    onChange={(e) => {
                      const departmentId = e.target.value;
                      const firstPosition = positions.find((position) => (position.departmentId?._id || position.departmentId) === departmentId);
                      setEmpForm({ ...empForm, departmentId, positionId: firstPosition?._id || "" });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chức Danh Việc Làm *</label>
                  <select
                    required
                    value={empForm.positionId}
                    onChange={(e) => setEmpForm({ ...empForm, positionId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="">-- Chọn vị trí --</option>
                    {positions.filter((p) => (p.departmentId?._id || p.departmentId) === empForm.departmentId).map((p) => (
                      <option key={p._id} value={p._id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lương Thỏa Thuận</label>
                  <input
                    type="number"
                    step="1000000"
                    value={empForm.officialSalary}
                    onChange={(e) => setEmpForm({ ...empForm, officialSalary: e.target.value })}
                    className="font-mono tabular-nums w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày Bắt Đầu</label>
                  <input
                    type="date"
                    value={empForm.startDate}
                    onChange={(e) => setEmpForm({ ...empForm, startDate: e.target.value })}
                    className="font-mono tabular-nums w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng Thái</label>
                  {empForm.role !== "employee" ? (
                    <div className="px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-slate-700 flex items-center justify-between text-xs h-[38px]">
                      <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Chính thức
                      </span>
                      <span className="text-[10px] text-slate-400 italic">(Cố định)</span>
                    </div>
                  ) : (
                    <select
                      value={empForm.status}
                      onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white h-[38px]"
                    >
                      <option value="probation">Thử việc</option>
                      <option value="active">Chính thức</option>
                      <option value="resigned">Đã nghỉ</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenEmpModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Lưu Nhân Viên
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Modal Thêm/Sửa Department */}
      {isOpenDeptModal && (
        <Modal label="Thông tin phòng ban" onClose={() => setIsOpenDeptModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingDeptId ? "Cập Nhật Phòng Ban" : "Thêm Phòng Ban Mới"}
              </h3>
              <button aria-label="Đóng" onClick={() => setIsOpenDeptModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDept} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Phòng Ban *</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="Phòng Công Nghệ Thông Tin"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Phòng Ban</label>
                  <input
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="IT_DEPT"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trưởng Phòng</label>
                  <input
                    type="text"
                    value={deptForm.manager}
                    onChange={(e) => setDeptForm({ ...deptForm, manager: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="Nguyễn Văn B"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô Tả Chức Năng</label>
                <textarea
                  rows="2"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="Mô tả nhiệm vụ trọng tâm..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenDeptModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Lưu Phòng Ban
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Modal Xem Danh Sách Nhân Viên Thuộc Phòng Ban Được Chọn */}
      {selectedDeptForModal && (
        <Modal label="Nhân viên trong phòng ban" onClose={() => setSelectedDeptForModal(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">{selectedDeptForModal.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {selectedDeptForModal.code || "DEPT"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Trưởng phòng: <span className="font-semibold text-slate-700">{selectedDeptForModal.manager || "Đang kiện toàn"}</span> • {
                      employees.filter((e) => (e.departmentId?._id || e.departmentId) === selectedDeptForModal._id).length
                    } nhân sự hiện tại
                  </p>
                </div>
              </div>
              <button aria-label="Đóng"
                onClick={() => setSelectedDeptForModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Danh sách nhân viên trong phòng */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {(() => {
                const deptEmps = employees.filter(
                  (e) => (e.departmentId?._id || e.departmentId) === selectedDeptForModal._id
                );

                if (deptEmps.length === 0) {
                  return (
                    <div className="py-12 text-center space-y-2">
                      <Users className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-600">Phòng ban này chưa có nhân viên chính thức nào</p>
                      <p className="text-[11px] text-slate-400">Bạn có thể tạo nhân viên mới hoặc chuyển ứng viên từ tuyển dụng sang</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {deptEmps.map((emp) => (
                      <div
                        key={emp._id}
                        className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 shrink-0">
                            {emp.fullName?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                              <span>{emp.fullName}</span>
                              <Badge status={emp.status}>
                                {emp.status === "probation" ? "Thử việc" : emp.status === "active" ? "Chính thức" : "Đã nghỉ"}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-medium text-indigo-600">{emp.positionId?.title || "Chuyên viên"}</span>
                              <span>•</span>
                              <span>{emp.email}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono tabular-nums text-xs font-bold text-emerald-700">
                            {(emp.officialSalary || 0).toLocaleString("vi-VN")} VNĐ
                          </div>
                          <div className="font-mono tabular-nums text-[10px] text-slate-400 mt-0.5">
                            Bắt đầu: {emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "N/A"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDeptForModal(null)}
                className="px-5 py-2 font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.type === "employee" ? "Xóa hồ sơ nhân viên" : "Xóa phòng ban"}
        message={"Bạn có chắc chắn muốn xóa " + (deleteConfirm.type === "employee" ? "nhân viên" : "phòng ban") + " \"" + deleteConfirm.name + "\"? Thao tác này sẽ cập nhật trực tiếp CSDL MongoDB."}
        confirmText="Xác nhận xóa"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: "employee", id: null, name: "" })}
      />
    </div>
  );
};

export default Employees;
