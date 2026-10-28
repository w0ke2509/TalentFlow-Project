import React, { useEffect, useRef } from "react";
import { useToast } from "../../context/ToastContext";

export const Modal = ({ children, label, onClose, busy = false, className }) => {
  const dialogRef = useRef(null);
  const { registerDialog } = useToast();

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog.showModal();
    // Keep feedback above the native dialog's top layer.
    const unregisterDialog = registerDialog(dialog);
    const firstField = dialog.querySelector(
      'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)'
    );
    (firstField || dialog.querySelector("[data-dialog-cancel]") || dialog.querySelector("button:not(:disabled)"))?.focus();

    return () => {
      unregisterDialog();
      if (dialog.open) dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [registerDialog]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      aria-modal="true"
      className="app-dialog fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-inherit"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex]'
        )).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className={className}>{children}</div>
    </dialog>
  );
};
