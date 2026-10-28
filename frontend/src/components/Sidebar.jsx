import React, { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Kanban, 
  CalendarCheck, 
  BarChart3, 
  Building2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const Sidebar = ({ currentTab, setCurrentTab }) => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("talentflow_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("talentflow_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const rawMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "candidates", label: "Hồ sơ ứng viên", icon: Users, roles: ["admin", "hr"] },
    { id: "positions", label: "Vị trí tuyển dụng", icon: Briefcase, roles: ["admin", "hr"] },
    { id: "applications", label: "Kanban ứng tuyển", icon: Kanban, roles: ["admin", "hr"] },
    { id: "interviews", label: "Lịch phỏng vấn", icon: CalendarCheck, roles: ["admin", "hr", "interviewer"] },
    { id: "employees", label: "Nhân viên & Phòng ban", icon: UserCheck, roles: ["admin", "hr"] },
    { id: "reports", label: "Báo cáo & Phân tích", icon: BarChart3, roles: ["admin", "hr"] },
  ];

  const userRole = user?.role || "employee";
  const menuItems = rawMenuItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } bg-slate-900 text-slate-200 hidden md:flex flex-col min-h-screen border-r border-slate-800 shrink-0 select-none transition-all duration-300 ease-in-out relative z-40`}
    >
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-800/80 flex items-center ${isCollapsed ? "justify-center flex-col gap-2" : "justify-between"}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm text-white leading-tight tracking-tight truncate">TalentFlow ATS</h1>
              <p className="text-[11px] text-slate-400 font-medium truncate">NoSQL Recruitment</p>
            </div>
          )}
        </div>

        {/* Nút thu gọn / mở rộng Sidebar */}
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar (Minimal)"}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {!isCollapsed && (
          <div className="px-3 pt-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Phân Hệ Chức Năng
          </div>
        )}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
              } rounded-xl text-xs transition-all text-left cursor-pointer group relative ${
                isActive
                  ? "bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-600/20"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white font-medium"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  }`}
                />
                {/* Chấm badge nhỏ khi collapsed */}
                {isCollapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-slate-900" />
                )}
              </div>

              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded border border-indigo-400/20">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

    </aside>
  );
};

export default Sidebar;
