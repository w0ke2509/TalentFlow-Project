import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ROLE_META = {
  admin: { label: "Quản trị", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  hr: { label: "Nhân sự", className: "bg-teal-50 text-teal-700 border-teal-200" },
  interviewer: { label: "Trưởng phòng", className: "bg-amber-50 text-amber-800 border-amber-200" },
  employee: { label: "Nhân viên", className: "bg-slate-100 text-slate-700 border-slate-200" }
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Header = ({ currentTabTitle }) => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const formattedTime = currentTime.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const roleMeta = ROLE_META[user?.role] || ROLE_META.employee;

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
          {currentTabTitle || "Hệ Thống Quản Lý Tuyển Dụng"}
        </h2>
        <div className="text-[11px] text-slate-500 font-medium hidden sm:flex items-center gap-2 pt-0.5">
          <span className="capitalize">{formattedDate}</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
            {formattedTime}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold text-[11px] flex items-center justify-center">
            {getInitials(user?.fullName)}
          </div>
          <div className="text-left hidden md:block min-w-0">
            <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[160px]">
              {user?.fullName || "Nhân viên"}
            </div>
            <div className="mt-0.5">
              <span className={"inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border " + roleMeta.className}>
                {roleMeta.label}
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200" />

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};