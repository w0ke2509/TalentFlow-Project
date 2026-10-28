import React from "react";
import { X } from "lucide-react";
import { Modal } from "./Modal";

export const SlideOver = ({ isOpen, onClose, title, subtitle, children, footer, width = "max-w-xl" }) => {
  if (!isOpen) return null;

  return (
    <Modal label={title} onClose={onClose} className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className={"w-screen " + width + " bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300"}>
          <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            </div>
            <button
              aria-label="Đóng chi tiết"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {children}
          </div>

          {footer && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SlideOver;
