import React from "react";

export const Badge = ({ children, status = "default", className = "" }) => {
  const statusStyles = {
    applied: "bg-slate-100 text-slate-700 border-slate-200/80",
    screening: "bg-amber-50 text-amber-700 border-amber-200/80",
    interview: "bg-teal-50 text-teal-700 border-teal-200/80",
    accepted: "bg-sky-50 text-sky-700 border-sky-200/80",
    hired: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    rejected: "bg-rose-50 text-rose-700 border-rose-200/80",
    open: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
    probation: "bg-indigo-50 text-indigo-700 border-indigo-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    resigned: "bg-rose-50 text-rose-700 border-rose-200",
    admin: "bg-indigo-50 text-indigo-700 border-indigo-200",
    hr: "bg-teal-50 text-teal-700 border-teal-200",
    interviewer: "bg-amber-50 text-amber-800 border-amber-200",
    employee: "bg-slate-100 text-slate-700 border-slate-200",
    default: "bg-slate-100 text-slate-700 border-slate-200"
  };

  const style = statusStyles[status] || statusStyles.default;

  return (
    <span className={"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border " + style + " " + className}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
};

export default Badge;