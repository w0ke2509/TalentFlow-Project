import React from "react";
import { AlertTriangle, X } from "lucide-react";

export const ConfirmDialog = ({
  isOpen,
  title = "Xác nhận hành động",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  type = "danger",
  onConfirm,
  onCancel,
  loading = false
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      btn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20",
      iconBg: "bg-rose-50 text-rose-600 border-rose-100"
    },
    warning: {
      btn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100"
    },
    info: {
      btn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100"
    }
  };

  const config = typeConfig[type] || typeConfig.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all scale-100">
        <div className="flex items-start gap-4">
          <div className={"w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border " + config.iconBg}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={"px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 " + config.btn}
          >
            {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;